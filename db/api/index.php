<?php
/**
 * AgriScan AI — API router (single entry point, PRODUCTION — no mock data).
 *
 * Each route maps 1:1 to a method in frontend/api.js:
 *
 *   GET  /health           -> {status, db, ai}                 (uptime probe)
 *   GET  /home             -> {stats, recent, articles}
 *   GET  /scan/session     -> ScanSession + pipeline + detections
 *   GET  /result/latest    -> ResultReport + status matrix + accordion + detections
 *   GET  /result/{id}      -> ResultReport for a specific scan
 *   GET  /history          -> {records, filters}
 *   GET  /guides           -> AccordionItem[]
 *   GET  /auth/me          -> {user, authenticated} (Bearer session token)
 *   POST /analyze          -> ScanSession  (json: {"imageUri":"...","base64":"..."})
 *   POST /history/{id}/save-> {"ok":true}
 *   POST /auth/google      -> {token, user} (Google OAuth code exchange)
 *   POST /chat             -> {role, content, timestamp}
 *
 * AI inference: Cloudflare Workers AI REST API called DIRECTLY from PHP
 * (vision + chat models, see $AI in config.php). NO demo/mock fallback:
 * when the AI backend or the database is unavailable the API returns an
 * honest 5xx error and the frontend shows an empty/error state.
 */
// ── CORS: allow configured origins (or wildcard if ALLOWED_ORIGINS is empty). ──
$allowedOrigins = getenv('ALLOWED_ORIGINS') ?: '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    if ($allowedOrigins !== '' && $allowedOrigins !== '*') {
        foreach (array_map('trim', explode(',', $allowedOrigins)) as $allowed) {
            if (strtolower($allowed) === strtolower($origin)) {
                header("Access-Control-Allow-Origin: $origin");
                header('Vary: Origin');
                break;
            }
        }
    } else {
        header("Access-Control-Allow-Origin: *");
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Compute routing vars early (needed by the /samples/ image route below).
$method    = $_SERVER['REQUEST_METHOD'];
$path      = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir !== '' && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), '/');
}
$path     = preg_replace('#^index\.php/?#', '', $path);
$target   = isset($_GET['route']) ? $_GET['route'] : $path;

// ── GET /samples/<name> — serve placeholder images for sample URLs that the
// public agriscan.ai domain no longer serves (they returned HTML, causing
// ERR_BLOCKED_BY_ORB in browsers).  The frontend rewrites
// agriscan.ai/samples/* → <backend>/samples/<name>. ──
if ($method === 'GET' && preg_match('#^samples/(.+)$#', $path, $sm)) {
    $name = basename($sm[1]);
    $uploadDir = __DIR__ . '/uploads';
    $realPath  = $uploadDir . '/' . $name;
    if (is_file($realPath)) {
        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
        $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
                 'png' => 'image/png', 'gif' => 'image/gif'][$ext] ?? 'application/octet-stream';
        header("Content-Type: $mime");
        header('Cache-Control: public, max-age=86400');
        readfile($realPath);
        exit;
    }
    // Fallback: serve a 280×180 light-green placeholder PNG (pre-generated,
    // no GD extension required).
    $ph = $uploadDir . '/ph.png';
    if (is_file($ph)) {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=86400');
        readfile($ph);
        exit;
    }
    http_response_code(404);
    exit;
}

header('Content-Type: application/json; charset=utf-8');


require __DIR__ . '/config.php';   // $pdo (PDO|null), $AI, $GOOGLE
mb_internal_encoding('UTF-8');

$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir !== '' && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), '/');
}
$path   = preg_replace('#^index\.php/?#', '', $path);          // strip own prefix
$target = isset($_GET['route']) ? $_GET['route'] : $path;      // accept ?route= fallback

function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// ── Root router: this is a SINGLE-root API. Reject the legacy
//    /detectplanet_api prefixed router with an honest 404. ─────────────
if (preg_match('#^detectplanet_api(/|$)#i', $target)) {
    send(['error' => 'not found'], 404);
}
function confStr($c) { return ($c === null || $c === '') ? '' : number_format((float) $c, 1); }
function fmtTime($created) {
    if (!$created) return '';
    $ts = strtotime($created);
    if (!$ts) return '';
    $diff = time() - $ts;
    if ($diff < 60)  return 'Vừa quét lúc ' . date('H:i', $ts);
    if ($diff < 3600) return (int) floor($diff / 60)  . ' phút trước';
    if ($diff < 86400) return (int) floor($diff / 3600) . ' giờ trước';
    return date('d/m/Y H:i', $ts);
}

// ─────────────────────────────────────────────────────────────────────────
// Database-unavailable guard: production NEVER serves fake data. Every DB
// route calls requireDb() first and returns an honest 503 when $pdo is null.
// ─────────────────────────────────────────────────────────────────────────
function requireDb() {
    global $pdo;
    if ($pdo === null) {
        send(['error' => 'Cơ sở dữ liệu không khả dụng',
              'message' => 'Không thể kết nối database. Kiểm tra dịch vụ postgres.'], 503);
    }
    return $pdo;
}

$sevLabel = ['healthy' => 'Cây khỏe', 'warning' => 'Cảnh báo nhỏ', 'danger' => 'Nguy hiểm'];

function mapRecent($r) {
    global $sevLabel;
    return [
        'id'         => $r['id'],
        'plant'      => $r['crop_label'],
        'disease'    => $r['disease'],
        'image'      => $r['image'],
        'confidence' => confStr($r['confidence']),
        'time'       => fmtTime($r['created_at']),
        'severity'   => $r['severity'],
        'label'      => $sevLabel[$r['severity']] ?? $r['severity'],
    ];
}
function mapRecord($r) {
    return [
        'id'         => $r['id'],
        'crop'       => $r['crop'],
        'cropLabel'  => $r['crop_label'],
        'title'      => $r['disease'],
        'confidence' => confStr($r['confidence']),
        'severity'   => $r['severity'],
        'time'       => fmtTime($r['created_at']),
        'image'      => $r['image'],
    ];
}
function mapPipeline($row) {
    return [
        'id'        => $row['id'],
        'icon'      => $row['icon'],
        'title'     => $row['title'],
        'desc'      => $row['descr'],          // `desc` is reserved -> column name is `descr`
        'status'    => $row['step_status'],
        'active'    => (bool) $row['is_active'],
        'iconBg'    => $row['icon_bg'],
        'iconColor' => $row['icon_color'],
    ];
}
function mapDetection($row) {
    return [
        'id'         => $row['id'],
        'top'        => $row['top'],
        'left'       => $row['left_pos'],     // `left` is reserved -> column name is `left_pos`
        'confidence' => $row['confidence'],
        'severity'   => $row['severity'],
    ];
}

function emptySession() {
    return ['id' => '', 'crop' => '', 'disease' => '', 'image' => '', 'confidence' => '',
            'severity' => 'healthy', 'time' => '', 'pipeline' => [], 'detections' => []];
}
function emptyReport() {
    return ['id' => '', 'crop' => '', 'disease' => '', 'pathogen' => '', 'severity' => 'healthy',
            'image' => '', 'confidence' => '', 'time' => '',
            'status' => ['spread' => '', 'stage' => '', 'loss' => ''],
            'recommendation' => '', 'accordion' => [], 'detections' => []];
}

function loadGuides($pdo) {
    $guides = $pdo->query("SELECT * FROM guides ORDER BY id")->fetchAll();
    $out = [];
    foreach ($guides as $g) {
        $secs = $pdo->prepare("SELECT * FROM guide_sections WHERE guide_id=? ORDER BY sort_order");
        $secs->execute([$g['id']]);
        $sections = array_map(function ($s) {
            return [
                'icon'      => $s['icon'],
                'title'     => $s['title'],
                'body'      => $s['body'],
                'badge'     => $s['badge'],
                'badgeBg'   => $s['badge_bg'],
                'badgeText' => $s['badge_text'],
                'bg'        => $s['bg'],
            ];
        }, $secs->fetchAll());
        $out[] = ['id' => $g['id'], 'icon' => $g['icon'], 'title' => $g['title'],
                  'subtitle' => $g['subtitle'], 'sections' => $sections];
    }
    return $out;
}


// ─────────────────────────────────────────────────────────────────────────
// AI inference — Cloudflare Workers AI REST API (called DIRECTLY, no worker)
// ─────────────────────────────────────────────────────────────────────────

const CF_VISION_PROMPT = 'Bạn là chuyên gia bác học thực vật. Phân tích hình ảnh lá cây. ' .
'Nhận diện loài cây (crop), chẩn đoán bệnh, trả về KẾT QUẢ JSON DUY NHẤT, không giải thích thêm: ' .
'{"crop":"tên khoa học cây","crop_label":"tên cây tiếng Việt","disease":"tên bệnh tiếng Anh (None nếu khỏe)",' .
'"disease_label":"tên bệnh tiếng Việt (Không có bệnh nếu khỏe)","pathogen":"một bệnh (trống nếu không rõ)",' .
'"severity":"healthy|warning|danger","confidence":số0-100,"recommendation":"lời khuyên tiếng Việt",' .
'"regions":[{"top":"32%","left":"38%","confidence":0-100,"severity":"healthy|warning|danger"}],' .
'"topk":[{"label":"tên bệnh","display_label":"tiếng Việt","score":0-100}]}. ' .
'Regions = vị trí ƯỚC TÍNH vùng bất thường trên lá; nếu lá khỏe hoặc không thấy rõ thì "regions":[] — KHÔNG BỊA vị trí. ' .
'Lá khỏe: confidence=100, severity="healthy", disease="None", regions=[].';

/** Parse JSON out of an LLM text reply (handles ```json fences + stray prose). */
function parseLLMJson($text) {
    if (!is_string($text) || trim($text) === '') return null;
    $s = trim($text);
    if (preg_match('/```[a-zA-Z]*\s*([\s\S]*?)\s*```/', $s, $m)) {
        $s = trim($m[1]);
    }
    if (strpos($s, '{') !== 0) {
        $start = strpos($s, '{');
        $end   = strrpos($s, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $s = substr($s, $start, $end - $start + 1);
        }
    }
    $data = json_decode($s, true);
    return is_array($data) ? $data : null;
}

/** Clamp confidence to 0-100 (models sometimes return 0-1 fractions). */
function normalizeConfidence($value) {
    $n = is_numeric($value) ? (float) $value : 0.0;
    if ($n < 0) $n = 0.0;
    if ($n <= 1.0) $n *= 100;
    return round(min(100.0, $n), 1);
}

/** Force severity into the allowed enum; derive a safe default otherwise. */
function normalizeSeverity($value, $confidence) {
    $sev = strtolower(trim((string) $value));
    if (in_array($sev, ['healthy', 'warning', 'danger'], true)) return $sev;
    return $confidence >= 70 ? 'warning' : 'danger';
}

/**
 * Raw POST to the Cloudflare Workers AI REST endpoint.
 * Returns decoded JSON array (with 'success' key) or null on network failure.
 * Uses stream_context (no curl dependency).
 */
function cfAiRun($model, array $payload) {
    global $AI;
    if ($AI['account_id'] === '' || $AI['api_token'] === '') return null;
    // model id contains slashes (@cf/...) — pass raw, encode only the account id
    $url = 'https://api.cloudflare.com/client/v4/accounts/' . rawurlencode($AI['account_id'])
         . '/ai/run/' . $model;
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $AI['api_token'],
    ];
    $ctx = stream_context_create(['http' => [
        'method'         => 'POST',
        'header'         => implode("\r\n", $headers) . "\r\n",
        'content'        => json_encode($payload),
        'timeout'        => $AI['timeout'],
        'ignore_errors'  => true,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
}


/**
 * Vision diagnosis: image data-URL → ['ok'=>bool, 'prediction'=>array|null, 'error'=>string|null].
 * NO mock fallback — on any failure the caller must surface the error honestly.
 */
function aiDiagnose($imageDataUrl) {
    global $AI;
    // Legacy override: a self-hosted worker deployment (AI_ENDPOINT full URL).
    if ($AI['endpoint'] !== '') {
        $headers = ['Content-Type: application/json'];
        if ($AI['bearer'] !== '') $headers[] = 'Authorization: Bearer ' . $AI['bearer'];
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'header' => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode(['image' => $imageDataUrl]),
            'timeout' => $AI['timeout'], 'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents($AI['endpoint'], false, $ctx);
        $data = $resp === false ? null : json_decode($resp, true);
        if (is_array($data) && !empty($data['disease'])) {
            return ['ok' => true, 'prediction' => normalizePrediction($data), 'error' => null];
        }
        return ['ok' => false, 'prediction' => null, 'error' => 'AI worker không phản hồi hợp lệ.'];
    }

    $cf = cfAiRun($AI['vision_model'], [
        'prompt'      => CF_VISION_PROMPT,
        'image'       => $imageDataUrl,
        'max_tokens'  => 2048,
        'temperature' => 0.3,
    ]);
    if ($cf === null) {
        return ['ok' => false, 'prediction' => null, 'error' => 'Không thể kết nối Cloudflare Workers AI.'];
    }
    if (empty($cf['success'])) {
        $msg = $cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.';
        return ['ok' => false, 'prediction' => null, 'error' => 'Cloudflare AI lỗi: ' . $msg];
    }
    $llmOutput = $cf['result']['response'] ?? '';
    $parsed = (is_array($llmOutput) && isset($llmOutput['crop'])) ? $llmOutput : parseLLMJson($llmOutput);
    if ($parsed === null || empty($parsed['disease'])) {
        return ['ok' => false, 'prediction' => null, 'error' => 'Không thể phân tích phản hồi của model.'];
    }
    return ['ok' => true, 'prediction' => normalizePrediction($parsed), 'error' => null];
}

/** Normalize a raw model prediction into the stable /analyze contract. */
function normalizePrediction(array $p) {
    $confidence = normalizeConfidence($p['confidence'] ?? 0);
    $severity   = normalizeSeverity($p['severity'] ?? '', $confidence);

    // Regions → detection boxes ONLY when the model returned them (never invent)
    $detections = [];
    if (!empty($p['regions']) && is_array($p['regions'])) {
        foreach (array_slice($p['regions'], 0, 8) as $i => $r) {
            if (!is_array($r)) continue;
            $rc = normalizeConfidence($r['confidence'] ?? 0);
            $detections[] = [
                'id'         => 'd' . ($i + 1),
                'top'        => (string) ($r['top'] ?? '50%'),
                'left'       => (string) ($r['left'] ?? '50%'),
                'confidence' => confStr($rc) . '%',
                'severity'   => normalizeSeverity($r['severity'] ?? '', $rc),
            ];
        }
    }

    $topk = [];
    if (!empty($p['topk']) && is_array($p['topk'])) {
        foreach (array_slice($p['topk'], 0, 5) as $t) {
            if (!is_array($t)) continue;
            $topk[] = [
                'label'         => (string) ($t['label'] ?? ''),
                'display_label' => (string) ($t['display_label'] ?? $t['label'] ?? ''),
                'score'         => normalizeConfidence($t['score'] ?? 0),
            ];
        }
    }

    return [
        'crop'           => (string) ($p['crop'] ?? 'plant'),
        'crop_label'     => (string) ($p['crop_label'] ?? $p['crop'] ?? 'Cây trồng'),
        'disease'        => (string) ($p['disease'] ?? $p['disease_label'] ?? 'Unknown'),
        'disease_label'  => (string) ($p['disease_label'] ?? $p['disease'] ?? 'Chưa xác định'),
        'pathogen'       => (string) ($p['pathogen'] ?? ''),
        'severity'       => $severity,
        'confidence'     => $confidence,
        'recommendation' => (string) ($p['recommendation'] ?? 'Vui lòng tham khảo chuyên gia bán địa phương.'),
        'detections'     => $detections,
        'topk'           => $topk,
    ];
}


/** AI chat: messages → ['ok'=>bool, 'reply'=>string|null, 'error'=>string|null]. */
function aiChat(array $messages) {
    global $AI;
    // Keep only supported roles; cap history to the last 20 turns.
    $clean = [];
    foreach (array_slice($messages, -20) as $m) {
        if (!is_array($m)) continue;
        $role = $m['role'] ?? '';
        $content = trim((string) ($m['content'] ?? ''));
        if ($content === '' || !in_array($role, ['user', 'assistant'], true)) continue;
        $clean[] = ['role' => $role, 'content' => mb_substr($content, 0, 4000)];
    }
    if (!$clean) {
        return ['ok' => false, 'reply' => null, 'error' => 'Thiếu nội dung tin nhắn.'];
    }

    $system = [[
        'role' => 'system',
        'content' => 'Bạn là trợ lý AI chuyên về nông nghiệp và điều trị bệnh thực vật. '
            . 'Trả lời ngắn gọn, thực tế, bằng tiếng Việt. Luôn ưu tiên giải pháp hữu cơ và an toàn cho môi trường.',
    ]];

    // Legacy override: a self-hosted worker deployment (CHAT_ENDPOINT full URL).
    if ($AI['chat_endpoint'] !== '') {
        $headers = ['Content-Type: application/json'];
        if ($AI['bearer'] !== '') $headers[] = 'Authorization: Bearer ' . $AI['bearer'];
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'header' => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode(['messages' => $clean]),
            'timeout' => $AI['timeout'], 'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents($AI['chat_endpoint'], false, $ctx);
        $data = $resp === false ? null : json_decode($resp, true);
        if (is_array($data) && !empty($data['content'])) {
            return ['ok' => true, 'reply' => (string) $data['content'], 'error' => null];
        }
        return ['ok' => false, 'reply' => null, 'error' => 'AI chat worker không phản hồi.'];
    }

    $cf = cfAiRun($AI['chat_model'], [
        'messages'    => array_merge($system, $clean),
        'max_tokens'  => 1024,
        'temperature' => 0.7,
        'top_p'       => 0.9,
    ]);
    if ($cf === null) {
        return ['ok' => false, 'reply' => null, 'error' => 'Không thể kết nối Cloudflare Workers AI.'];
    }
    if (empty($cf['success'])) {
        $msg = $cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.';
        return ['ok' => false, 'reply' => null, 'error' => 'Cloudflare AI lỗi: ' . $msg];
    }
    $reply = $cf['result']['response'] ?? '';
    if (!is_string($reply) || trim($reply) === '') {
        return ['ok' => false, 'reply' => null, 'error' => 'Model trả về rỗng.'];
    }
    return ['ok' => true, 'reply' => $reply, 'error' => null];
}


// ─────────────────────────────────────────────────────────────────────────
// GET routes
// ─────────────────────────────────────────────────────────────────────────
if ($method === 'GET') {

    // ── GET /health — uptime probe (no auth, checks DB + AI config) ────
    if ($target === 'health') {
        global $AI;
        send([
            'status' => 'ok',
            'db'     => $pdo !== null,
            'ai'     => [
                'configured'   => ($AI['account_id'] !== '' && $AI['api_token'] !== '')
                                   || $AI['endpoint'] !== '',
                'vision_model' => $AI['vision_model'],
                'chat_model'   => $AI['chat_model'],
            ],
            'time'   => date('c'),
        ]);
    }

    if ($target === 'home' || $target === '') {
        $pdo = requireDb();
        $recent   = $pdo->query("SELECT id, crop_label, disease, image, confidence, severity, created_at, crop
                                   FROM scans WHERE scan_status='done' ORDER BY created_at DESC LIMIT 4")->fetchAll();
        $articles = $pdo->query("SELECT id, image, label, label_color, time, title, action, tag_bg
                                   FROM articles ORDER BY time DESC LIMIT 8")->fetchAll();
        $total   = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE DATE(created_at)=CURRENT_DATE")->fetchColumn();
        $danger  = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE severity='danger' AND DATE(created_at)=CURRENT_DATE")->fetchColumn();
        $healthy = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE severity='healthy' AND DATE(created_at)=CURRENT_DATE")->fetchColumn();
        $stats = [
            ['label' => 'Tổng quan hôm nay', 'value' => (string) $total,   'icon' => 'analytics', 'color' => 'primary'],
            ['label' => 'Cần chú ý',        'value' => (string) $danger,  'icon' => 'error',     'color' => 'status-danger'],
            ['label' => 'Cây khỏe',          'value' => (string) $healthy, 'icon' => 'eco',       'color' => 'status-healthy'],
        ];
        send([
            'stats'    => $stats,
            'recent'   => array_map('mapRecent', $recent),
            'articles' => array_map(function ($a) {
                return ['id' => $a['id'], 'image' => $a['image'], 'label' => $a['label'], 'label_color' => $a['label_color'],
                        'time' => $a['time'], 'title' => $a['title'], 'action' => $a['action'], 'tag_bg' => $a['tag_bg']];
            }, $articles),
        ]);
    }

    if ($target === 'scan/session') {
        $pdo = requireDb();
        $row = $pdo->query("SELECT id, crop_label AS crop, disease, image, confidence, severity, created_at
                              FROM scans WHERE scan_status='processing' ORDER BY created_at DESC LIMIT 1")->fetch();
        if (!$row) send(emptySession());
        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$row['id']]);
        $dets  = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$row['id']]);
        send([
            'id'         => $row['id'],
            'crop'       => $row['crop'],
            'disease'    => $row['disease'],
            'image'      => $row['image'],
            'confidence' => confStr($row['confidence']),
            'severity'   => $row['severity'],
            'time'       => fmtTime($row['created_at']),
            'pipeline'   => array_map('mapPipeline', $steps->fetchAll()),
            'detections' => array_map('mapDetection', $dets->fetchAll()),
        ]);
    }


    if ($target === 'result/latest' || preg_match('#^result/([A-Za-z0-9_\-]+)$#', $target, $m)) {
        $pdo = requireDb();
        $scanId = (!empty($m[1]) && $m[1] !== 'latest') ? $m[1] : null;
        if ($scanId) {
            $stmt = $pdo->prepare("SELECT id, crop_label AS crop, disease, pathogen, image, confidence, severity, created_at,
                                           recommendation, status_spread AS spread, status_stage AS stage, status_loss AS loss
                                      FROM scans WHERE id=? LIMIT 1");
            $stmt->execute([$scanId]);
            $row = $stmt->fetch();
        } else {
            $row = $pdo->query("SELECT id, crop_label AS crop, disease, pathogen, image, confidence, severity, created_at,
                                       recommendation, status_spread AS spread, status_stage AS stage, status_loss AS loss
                                  FROM scans WHERE scan_status='done' ORDER BY created_at DESC LIMIT 1")->fetch();
        }
        if (!$row) send(emptyReport());
        $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$row['id']]);
        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$row['id']]);
        send([
            'id'             => $row['id'],
            'crop'           => $row['crop'],
            'disease'        => $row['disease'],
            'pathogen'       => $row['pathogen'],
            'image'          => $row['image'],
            'confidence'     => confStr($row['confidence']),
            'severity'       => $row['severity'],
            'time'           => fmtTime($row['created_at']),
            'recommendation' => $row['recommendation'],
            'status'         => ['spread' => $row['spread'], 'stage' => $row['stage'], 'loss' => $row['loss']],
            'pipeline'       => array_map('mapPipeline', $steps->fetchAll()),
            'accordion'      => loadGuides($pdo),
            'detections'     => array_map('mapDetection', $dets->fetchAll()),
        ]);
    }

    if ($target === 'history') {
        $pdo = requireDb();
        $records = $pdo->query("SELECT id, crop, crop_label, disease, confidence, severity, created_at, image
                                   FROM scans WHERE scan_status='done' ORDER BY created_at DESC")->fetchAll();
        // Build filter pills from the crops that actually exist in the data
        $crops = $pdo->query("SELECT DISTINCT crop, crop_label FROM scans WHERE scan_status='done' AND crop <> '' ORDER BY crop")->fetchAll();
        $cropIcons = ['rice' => 'eco', 'tomato' => 'favorites', 'fruit' => 'apple'];
        $filters = [['key' => 'all', 'label' => 'Tất cả', 'icon' => 'apps']];
        foreach ($crops as $c) {
            $filters[] = ['key' => $c['crop'], 'label' => $c['crop_label'],
                          'icon' => $cropIcons[$c['crop']] ?? 'eco'];
        }
        $filters[] = ['key' => 'danger', 'label' => 'Nguy hiểm', 'icon' => 'warning'];
        send(['records' => array_map('mapRecord', $records), 'filters' => $filters]);
    }

    if ($target === 'guides') {
        $pdo = requireDb();
        send(loadGuides($pdo));
    }

    // ── GET /auth/me — verify session token, return user info ──────────
    if ($target === 'auth/me') {
        $pdo = requireDb();   // production: session MUST be verified against DB
        $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
            $token = trim($m[1]);
        } else {
            $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
        }
        if (!$token) {
            send(['error' => 'No session token'], 401);
        }

        $stmt = $pdo->prepare("
            SELECT u.id, u.email, u.name, u.avatar
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ? AND s.expires_at > NOW()
            LIMIT 1
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            send(['error' => 'Invalid or expired session'], 401);
        }

        send([
            'user' => [
                'email'  => $user['email'],
                'name'   => $user['name'],
                'avatar' => $user['avatar'],
            ],
            'authenticated' => true,
        ]);
    }

    send(['error' => 'not found'], 404);
}


// ─────────────────────────────────────────────────────────────────────────
// POST routes
// ─────────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];

    if ($target === 'analyze') {
        $pdo = requireDb();   // production: every scan must be persisted

        // ── Input size guard: reject payloads > 10 MB ──────────────────
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 10 * 1024 * 1024) {
            send(['error' => 'Payload too large',
                  'message' => 'Kích thước ảnh vượt quá giới hạn 10MB.'], 413);
        }

        $imageUri  = $body['imageUri'] ?? '';
        $rawBase64 = $body['base64'] ?? '';
        if (!$rawBase64 && preg_match('#^data:image/(\w+);base64,(.+)$#si', $imageUri, $m)) {
            $rawBase64 = $m[2];
        }

        // When the client only sent a URL (e.g. already-uploaded image), fetch
        // it server-side so the model always receives bytes, never a bare URL
        // that Cloudflare cannot reach (LAN/local addresses).
        if (!$rawBase64 && $imageUri !== '' && preg_match('#^https?://#i', $imageUri)) {
            $imgCtx = stream_context_create(['http' => ['timeout' => 20, 'ignore_errors' => true]]);
            $bytes  = @file_get_contents($imageUri, false, $imgCtx);
            if ($bytes !== false && strlen($bytes) > 0 && strlen($bytes) <= 10 * 1024 * 1024) {
                $rawBase64 = base64_encode($bytes);
            }
        }

        if ($rawBase64 === '') {
            send(['error' => 'No image provided',
                  'message' => 'Không nhận được ảnh. Hãy chụp ảnh lá hoặc chọn ảnh từ thư viện.'], 400);
        }

        // Persist the upload, then build a PUBLIC url for the record.
        $decoded = base64_decode($rawBase64, true);
        if ($decoded === false || strlen($decoded) === 0) {
            send(['error' => 'Invalid image data', 'message' => 'Dữ liệu ảnh không hợp lệ.'], 400);
        }
        $filename = 'leaf_' . bin2hex(random_bytes(6)) . '.jpg';
        $dest = __DIR__ . '/uploads/' . $filename;
        if (!is_dir(__DIR__ . '/uploads')) { @mkdir(__DIR__ . '/uploads', 0775, true); }
        if (@file_put_contents($dest, $decoded) === false) {
            send(['error' => 'Upload failed', 'message' => 'Không thể lưu ảnh lên máy chủ.'], 500);
        }
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $proto = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                  || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') ? 'https' : 'http';
        $imageUri = "$proto://$host/uploads/$filename";

        // Real AI inference via Cloudflare Workers AI — NO mock/demo fallback.
        // On any failure we return an honest 503 so the frontend shows an
        // error state instead of inventing diagnosis data.
        $diag = aiDiagnose('data:image/jpeg;base64,' . $rawBase64);
        if (!$diag['ok']) {
            send(['error'   => 'Dịch vụ AI không phản hồi',
                  'message' => $diag['error'] ?? 'Không thể nhận diện ảnh. Vui lòng thử lại.'],
                 503);
        }
        $pred = $diag['prediction'];


        $finalCrop      = $pred['crop'];
        $finalCropLabel = $pred['crop_label'];
        $finalDisease   = $pred['disease_label'];
        $severity       = $pred['severity'];
        $confidence     = $pred['confidence'];
        $recommendation = $pred['recommendation'];

        $spread = ($severity === 'healthy') ? 'Không có' : (($severity === 'warning') ? 'Chậm' : 'Nhanh');
        $stage  = ($severity === 'healthy') ? 'Phát triển tốt' : (($severity === 'warning') ? 'Khởi phát' : 'Đang bộc phát');
        $loss   = ($severity === 'healthy') ? '0%' : (($severity === 'warning') ? '5 - 10%' : '15 - 30%');

        $id = 'scan_' . bin2hex(random_bytes(4));


        // Persist scan + pipeline steps + detections (REAL data from the model)
        $stmt = $pdo->prepare("INSERT INTO scans
            (id, crop, crop_label, disease, pathogen, image, confidence, severity,
             recommendation, status_spread, status_stage, status_loss, scan_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', NOW())");
        $stmt->execute([
            $id, $finalCrop, $finalCropLabel, $finalDisease, $pred['pathogen'], $imageUri,
            $confidence, $severity, $recommendation, $spread, $stage, $loss,
        ]);

        $pStmt = $pdo->prepare("INSERT INTO scan_pipeline_steps
            (scan_id, id, icon, title, descr, step_status, is_active, icon_bg, icon_color, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $modelName = (strcasecmp($finalCrop, 'rice') === 0)
            ? 'Phân tích Cloudflare LLaMA Vision (Lúa)' : 'Phân tích Cloudflare LLaMA Vision';
        $pStmt->execute([$id, 'p1', 'camera',     'Chụp ảnh lá', 'Đã chụp ảnh', 'Hoàn tất', 1, '#DBEAFE', '#2563EB', 1]);
        $pStmt->execute([$id, 'p2', 'biotech',    $modelName, 'Nhận diện: ' . $finalDisease, 'Hoàn tất', 1, '#FEF3C7', '#D97706', 2]);
        $pStmt->execute([$id, 'p3', 'agronheart', 'Giải pháp điều trị', 'Độ tin cậy: ' . confStr($confidence) . '%', 'Hoàn tất', 1, '#DCFCE7', '#16A34A', 3]);

        // Detections come from the model's regions ONLY — never invented.
        $dStmt = $pdo->prepare("INSERT INTO scan_detections
            (scan_id, id, top, left_pos, confidence, severity, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($pred['detections'] as $i => $d) {
            $dStmt->execute([$id, $d['id'], $d['top'], $d['left'], $d['confidence'], $d['severity'], $i + 1]);
        }

        $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$id]);
        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$id]);

        send([
            'id'             => $id,
            'crop'           => $finalCropLabel,
            'disease'        => $finalDisease,
            'pathogen'       => $pred['pathogen'],
            'image'          => $imageUri,
            'confidence'     => confStr($confidence),
            'severity'       => $severity,
            'recommendation' => $recommendation,
            'time'           => fmtTime(date('Y-m-d H:i:s')),
            'status'         => ['spread' => $spread, 'stage' => $stage, 'loss' => $loss],
            'pipeline'       => array_map('mapPipeline', $steps->fetchAll()),
            'detections'     => array_map('mapDetection', $dets->fetchAll()),
            'topk'           => $pred['topk'],
        ]);
    }

    if (preg_match('#^history/([A-Za-z0-9_\-]+)/save$#', $target, $m)) {
        $pdo = requireDb();
        $stmt = $pdo->prepare("UPDATE scans SET is_saved = 1 WHERE id=?");
        $stmt->execute([$m[1]]);
        send(['ok' => true, 'updated' => $stmt->rowCount() > 0]);
    }

    // ── Google OAuth: exchange auth code for session ─────────────────
    if ($target === 'auth/google') {
        $pdo = requireDb();   // production: users + sessions live in the DB
        $code = $body['code'] ?? '';
        if (!$code) {
            send(['error' => 'missing authorization code'], 400);
        }

        global $GOOGLE;
        if ($GOOGLE['client_id'] === '' || $GOOGLE['client_secret'] === '') {
            send(['error' => 'Google OAuth not configured',
                  'message' => 'Server chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.'], 503);
        }

        // 1. Exchange authorization code for tokens via Google's token endpoint
        $tokenResp = @file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query([
                    'client_id'     => $GOOGLE['client_id'],
                    'client_secret' => $GOOGLE['client_secret'],
                    'code'          => $code,
                    'grant_type'    => 'authorization_code',
                    'redirect_uri'  => $GOOGLE['redirect_uri'],
                ]),
                'timeout' => 15,
            ]
        ]));

        if ($tokenResp === false) {
            send(['error' => 'Google token exchange failed'], 502);
        }

        $tokenData = json_decode($tokenResp, true);
        $idToken = $tokenData['id_token'] ?? '';
        if (!$idToken) {
            send(['error' => 'No id_token in Google response'], 401);
        }

        // 2. Verify the ID token with Google
        $verifyResp = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        if ($verifyResp === false) {
            send(['error' => 'Google token verification failed'], 401);
        }

        $payload = json_decode($verifyResp, true);
        if (!isset($payload['sub']) || !isset($payload['email'])) {
            send(['error' => 'Invalid Google token payload'], 401);
        }
        if (isset($payload['aud']) && $payload['aud'] !== $GOOGLE['client_id']) {
            send(['error' => 'Token audience mismatch'], 401);
        }

        // 3. Create or update user
        $googleId = $payload['sub'];
        $email    = strtolower($payload['email']);
        $name     = $payload['name'] ?? '';
        $avatar   = $payload['picture'] ?? '';

        $stmt = $pdo->prepare("SELECT id FROM users WHERE google_id=? LIMIT 1");
        $stmt->execute([$googleId]);
        $row = $stmt->fetch();

        if ($row) {
            $userId = $row['id'];
            $stmt = $pdo->prepare("UPDATE users SET email=?, name=?, avatar=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$email, $name, $avatar, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)");
            $stmt->execute([$googleId, $email, $name, $avatar]);
            $userId = (int) $pdo->lastInsertId();
        }

        // 4. Create session token (7 days)
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7);
        $stmt = $pdo->prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$token, $userId, $expiresAt]);

        // 5. Return session + user info
        send([
            'token' => $token,
            'user'  => ['email' => $email, 'name' => $name, 'avatar' => $avatar],
        ]);
    }

    // ── POST /auth/logout — revoke the server-side session ────────────
    if ($target === 'auth/logout') {
        $pdo = requireDb();
        $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
            $token = trim($m[1]);
        } else {
            $token = '';
        }
        if ($token) {
            $stmt = $pdo->prepare("DELETE FROM sessions WHERE id=?");
            $stmt->execute([$token]);
        }
        send(['ok' => true]);
    }

    // ── POST /chat — real AI chat via Cloudflare Workers AI ───────────
    if ($target === 'chat') {
        $messages = $body['messages'] ?? [];
        if (empty($messages) || !is_array($messages)) {
            send(['error' => 'No messages provided'], 400);
        }

        $chat = aiChat($messages);
        if (!$chat['ok']) {
            send(['error'   => 'AI chat service unavailable',
                  'message' => $chat['error'] ?? 'Dịch vụ AI đang bận, vui lòng thử lại.'],
                 503);
        }

        send([
            'role'      => 'assistant',
            'content'   => $chat['reply'],
            'timestamp' => date('c'),
        ]);
    }

    send(['error' => 'not found'], 404);
}

