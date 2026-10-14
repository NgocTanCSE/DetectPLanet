<?php
/**
 * AgriScan AI — API router (single entry point).
 *
 * Each route maps 1:1 to a method in frontend/api.js:
 *
 *   GET  /home              -> {stats, recent, articles}
 *   GET  /scan/session      -> ScanSession + pipeline + detections
 *   GET  /result/latest     -> ResultReport + status matrix + accordion + detections
 *   GET  /history           -> {records, filters}
 *   GET  /guides            -> AccordionItem[]
 *   POST /analyze           -> ScanSession  (json body: {"imageUri":"..."})
 *   POST /history/{id}/save -> {"ok":true}
 *
 * Deploy: place index.php + config.php (+ .htaccess) in the doc-root that serves
 * https://103.139.203.43:887 so /home, /scan/session, ... reach this file.
 * In frontend/api.js set  const BASE_URL = 'https://103.139.203.43:887';
 */
header('Content-Type: application/json; charset=utf-8');

// ── CORS: restrict to configured origins (default: same-origin only) ──
// Production: ALLOWED_ORIGINS="https://agriscan.ai,https://www.agriscan.ai"
// HF Spaces: ALLOWED_ORIGINS="https://yourname-agriscan.hf.space"
$allowedOrigins = getenv('ALLOWED_ORIGINS') ?: '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $allowedOrigins !== '') {
    foreach (array_map('trim', explode(',', $allowedOrigins)) as $allowed) {
        if (strtolower($allowed) === strtolower($origin)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Vary: Origin');
            break;
        }
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


require __DIR__ . '/config.php';   // $pdo  (PDO connection)
mb_internal_encoding('UTF-8');

$method    = $_SERVER['REQUEST_METHOD'];
$path      = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir !== '' && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), '/');
}
$path   = preg_replace('#^index\.php/?#', '', $path);          // strip own prefix
$target = isset($_GET['route']) ? $_GET['route'] : $path;      // accept ?route= fallback

// Serverless MVP mode: skip DB operations when $pdo is null
$MOCK_MODE = ($pdo === null);

function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}
function confStr($c) { return ($c === null || $c === '') ? '' : number_format((float) $c, 1); }
function aiRequest(array $payload) {
    // Posts to the authenticated Colab/ngrok inference endpoint ($AI in config.php).
    // Returns the decoded JSON array, or null on any failure (so /analyze can fall
    // back to the empty session). Uses stream_context (no curl dependency).
    global $AI;
    if ($AI['endpoint'] === '') return null;
    $headers = ["Content-Type: application/json"];
    if ($AI['bearer'] !== '') {
        $headers[] = "Authorization: Bearer " . $AI['bearer'];
    } elseif ($AI['username'] !== '' || $AI['api_key'] !== '') {
        $headers[] = "Authorization: Basic " . base64_encode($AI['username'] . ':' . $AI['api_key']);
    }
    $ctx = stream_context_create(['http' => [
        'method'         => 'POST',
        'header'         => implode("\r\n", $headers) . "\r\n",
        'content'        => json_encode($payload),
        'timeout'        => $AI['timeout'],
        'ignore_errors'  => true,
    ]]);
    $resp = @file_get_contents($AI['endpoint'], false, $ctx);
    $data = $resp === false ? null : json_decode($resp, true);
    return ($data === null) ? null : $data;
}
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

$sevLabel = ['healthy' => 'Cây khỏe', 'warning' => 'Cảnh báo nhỏ', 'danger' => 'Nguy hiệm'];

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
    global $sevLabel;
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

// ─────────────────────────────────────────────────────────────────────────
// Serverless MVP — mock data (used when $pdo is null / no database)
// ─────────────────────────────────────────────────────────────────────────
$MOCK_MODE = ($pdo === null);

function mockHome() {
    return [
        'stats' => [
            ['label' => 'Tổng quan hôm nay', 'value' => '0', 'icon' => 'analytics', 'color' => 'primary'],
            ['label' => 'Cần chú ý',        'value' => '0', 'icon' => 'error',     'color' => 'status-danger'],
            ['label' => 'Cây khỏe',          'value' => '0', 'icon' => 'eco',       'color' => 'status-healthy'],
        ],
        'recent'  => [],
        'articles' => [
            ['id' => 1, 'image' => 'https://picsum.photos/seed/a/80/80', 'label' => 'Hướng dẫn', 'label_color' => '#3B82F6',
             'time' => '2 ngày trước', 'title' => 'Cách chăm sóc cây ống hoa', 'action' => 'Đọc ngay', 'tag_bg' => '#EFF6FF'],
            ['id' => 2, 'image' => 'https://picsum.photos/seed/b/80/80', 'label' => 'Kiến thức', 'label_color' => '#10B981',
             'time' => '5 ngày trước', 'title' => 'Bệnh đốm do độ ẩm', 'action' => 'Xem chi tiết', 'tag_bg' => '#D1FAE5'],
        ],
    ];
}

function mockGuides() {
    return [
        [
            'id' => 1, 'icon' => 'health', 'title' => 'Bệnh đốm do vi khuẩn',
            'subtitle' => 'Xanthomonas...',
            'sections' => [
                ['icon' => 'symptom', 'title' => 'Triệu chứng', 'body' => 'Đốm hình nâu trên lá...', 'badge' => 'Cảnh báo', 'badgeBg' => '#FEF3C7', 'badgeText' => '#D97706', 'bg' => '#FFFFFF'],
                ['icon' => 'treatment', 'title' => 'Điều trị', 'body' => 'Phun Kasugamycin...', 'badge' => 'Giải pháp', 'badgeBg' => '#DCFCE7', 'badgeText' => '#16A34A', 'bg' => '#FFFFFF'],
            ],
        ],
        [
            'id' => 2, 'icon' => 'eco', 'title' => 'Bệnh phấn đốm',
            'subtitle' => 'Septoria leaf spot',
            'sections' => [
                ['icon' => 'symptom', 'title' => 'Triệu chứng', 'body' => 'Vân đốm xanh lục...', 'badge' => 'Cảnh báo', 'badgeBg' => '#FEF3C7', 'badgeText' => '#D97706', 'bg' => '#FFFFFF'],
                ['icon' => 'treatment', 'title' => 'Điều trị', 'body' => 'Tẩy trùng và tưới nhẹ...', 'badge' => 'Giải pháp', 'badgeBg' => '#DCFCE7', 'badgeText' => '#16A34A', 'bg' => '#FFFFFF'],
            ],
        ],
    ];
}

function mockPipeline($crop, $confidence) {
    $modelName = (strcasecmp($crop ?? '', 'rice') === 0) ? 'Phân tích LLaMA Vision (Lúa)' : 'Phân tích LLaMA Vision';
    return [
        ['id' => 'p1', 'icon' => 'camera', 'title' => 'Chụp ảnh lá', 'desc' => 'Đã chụp ảnh', 'status' => 'Hoàn tất', 'active' => true,  'iconBg' => '#DBEAFE', 'iconColor' => '#2563EB', 'sort_order' => 1],
        ['id' => 'p2', 'icon' => 'biotech', 'title' => $modelName, 'desc' => 'Nhận diện bệnh', 'status' => 'Hoàn tất', 'active' => true, 'iconBg' => '#FEF3C7', 'iconColor' => '#D97706', 'sort_order' => 2],
        ['id' => 'p3', 'icon' => 'agronheart', 'title' => 'Giải pháp điều trị', 'desc' => 'Độ tin cậy: ' . confStr($confidence) . '%', 'status' => 'Hoàn tất', 'active' => true, 'iconBg' => '#DCFCE7', 'iconColor' => '#16A34A', 'sort_order' => 3],
    ];
}

function mockDetections($severity, $confidence) {
    if ($severity === 'healthy') {
        return [
            ['id' => 'd1', 'top' => '25%', 'left' => '25%', 'confidence' => confStr($confidence) . '%', 'severity' => 'healthy', 'sort_order' => 1],
        ];
    }
    return [
        ['id' => 'd1', 'top' => '32%', 'left' => '38%', 'confidence' => confStr($confidence) . '%', 'severity' => $severity, 'sort_order' => 1],
        ['id' => 'd2', 'top' => '58%', 'left' => '30%', 'confidence' => '12.4%', 'severity' => 'warning', 'sort_order' => 2],
    ];
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

// ---------------- GET ----------------
if ($method === 'GET') {
    if ($target === 'home' || $target === '') {
        if ($MOCK_MODE) send(mockHome());
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
        if ($MOCK_MODE) send(emptySession());
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
        $scanId = (!empty($m[1]) && $m[1] !== 'latest') ? $m[1] : null;
        if ($MOCK_MODE) send(emptyReport());
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
            'accordion'      => loadGuides($pdo),
            'detections'     => array_map('mapDetection', $dets->fetchAll()),
        ]);
    }

    if ($target === 'history') {
        if ($MOCK_MODE) {
            $filters = [
                ['key' => 'all',    'label' => 'Tất cả',  'icon' => 'apps'],
                ['key' => 'rice',   'label' => 'Lúa',     'icon' => 'eco'],
                ['key' => 'tomato', 'label' => 'Cà chua', 'icon' => 'favorites'],
                ['key' => 'fruit',  'label' => 'Trái cây', 'icon' => 'apple'],
                ['key' => 'danger', 'label' => 'Nguy hiểm', 'icon' => 'warning'],
            ];
            send(['records' => [], 'filters' => $filters]);
        }
        $records = $pdo->query("SELECT id, crop, crop_label, disease, confidence, severity, created_at, image
                                   FROM scans WHERE scan_status='done' ORDER BY created_at DESC")->fetchAll();
        $filters = [
            ['key' => 'all',    'label' => 'Tất cả',  'icon' => 'apps'],
            ['key' => 'rice',   'label' => 'Lúa',     'icon' => 'eco'],
            ['key' => 'tomato', 'label' => 'Cà chua',  'icon' => 'favorites'],
            ['key' => 'fruit',  'label' => 'Trái cây',  'icon' => 'apple'],
            ['key' => 'danger', 'label' => 'Nguy hiểm', 'icon' => 'warning'],
        ];
        send(['records' => array_map('mapRecord', $records), 'filters' => $filters]);
    }

    if ($target === 'guides') {
        if ($MOCK_MODE) send(mockGuides());
        send(loadGuides($pdo));
    }

    // ── GET /auth/me — verify session token, return user info ─────────
    if ($target === 'auth/me') {
        $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
            $token = trim($m[1]);
        } else {
            $token = getenv('HTTP_X_AUTH_TOKEN') ?: '';
        }

        // Serverless MVP: accept any non-empty token without DB verification
        if ($MOCK_MODE && $token !== '') {
            send([
                'user' => [
                    'email'   => 'demo@agriscan.local',
                    'name'    => 'Người dùng Demo',
                    'avatar'  => '',
                ],
                'authenticated' => true,
            ]);
        }

        if (!$token) {
            http_response_code(401);
            send(['error' => 'No session token']);
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
            http_response_code(401);
            send(['error' => 'Invalid or expired session']);
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

    http_response_code(404);
    send(['error' => 'not found']);
}

// ---------------- POST ----------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];

    if ($target === 'analyze') {
        // ── Input size guard: reject payloads > 10 MB ──────────────────
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 10 * 1024 * 1024) {
            http_response_code(413);
            send(['error' => 'Payload too large', 'message' => 'Kích thước ảnh vượ quá giới hạn 10MB.']);
        }

        $imageUri  = $body['imageUri'] ?? '';
        $rawBase64 = $body['base64'] ?? '';
        if (!$rawBase64 && preg_match('#^data:image/(\w+);base64,(.+)$#si', $imageUri, $m)) {
            $rawBase64 = $m[2];
        }

        $localPath = '';
        // Lưu ảnh thực tế vào thư mục uploads/ nếu có base64
        if ($rawBase64) {
            $decoded = base64_decode($rawBase64);
            if ($decoded !== false && strlen($decoded) > 0) {
                $filename = 'leaf_' . bin2hex(random_bytes(6)) . '.jpg';
                $dest = __DIR__ . '/uploads/' . $filename;
                if (@file_put_contents($dest, $decoded)) {
                    $localPath = $dest;
                    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                    $imageUri = "$proto://$host/detectplanet_api/uploads/$filename";
                }
            }
        }

        // Gọi AI Inference service (Cloudflare Workers AI, proxied through this API)
        $aiPayload = [
            'imageUri' => $localPath ?: $imageUri,
            'base64'   => $rawBase64,
        ];
        $pred = ($imageUri !== '' || $rawBase64 !== '') ? aiRequest($aiPayload) : null;

        // BẮT BUỘC DÙNG KẾT QUẢ THẬT TỪ AI - LOẠI BỎ TOÀN BỘ MOCK
        if (!is_array($pred) || empty($pred['disease'])) {
            http_response_code(503);
            send([
                'error'   => 'Dịch vụ AI không phản hồi',
                'message' => 'Không thể nhận diện ảnh hoặc AI server chưa sẵn sàng.',
                'detail'  => $pred,
            ]);
        }

        $finalCrop      = $pred['crop'] ?? 'plant';
        $finalCropLabel = $pred['crop_label'] ?? $pred['crop'] ?? 'Cây trồng';
        $finalDisease   = $pred['disease_label'] ?? $pred['disease'] ?? 'Chưa xác định';
        $finalPathogen  = $pred['pathogen'] ?? '—';
        $severity       = $pred['severity'] ?? 'healthy';
        $confidence     = (float) ($pred['confidence'] ?? 0.0);
        $recommendation = $pred['recommendation'] ?? '';

        $spread = ($severity === 'healthy') ? 'Không có' : (($severity === 'warning') ? 'Chậm' : 'Nhanh');
        $stage  = ($severity === 'healthy') ? 'Phát triển tốt' : (($severity === 'warning') ? 'Khởi phát' : 'Đang bộc phát');
        $loss   = ($severity === 'healthy') ? '0%' : (($severity === 'warning') ? '5 - 10%' : '15 - 30%');

        $id = 'scan_' . bin2hex(random_bytes(4));

        // ── In mock mode, skip all DB writes and return prediction directly ──
        if ($MOCK_MODE) {
            send([
                'id'             => $id,
                'crop'           => $finalCropLabel,
                'disease'        => $finalDisease,
                'pathogen'       => $finalPathogen,
                'image'          => $imageUri,
                'confidence'     => confStr($confidence),
                'severity'       => $severity,
                'recommendation' => $recommendation,
                'time'           => fmtTime(date('Y-m-d H:i:s')),
                'status'         => ['spread' => $spread, 'stage' => $stage, 'loss' => $loss],
                'pipeline'       => mockPipeline($finalCrop, $confidence),
                'detections'     => mockDetections($severity, $confidence),
                'topk'           => $pred['topk'] ?? [],
            ]);
        }

        $stmt = $pdo->prepare("INSERT INTO scans
            (id, crop, crop_label, disease, pathogen, image, confidence, severity,
             recommendation, status_spread, status_stage, status_loss, scan_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', NOW())");
        $stmt->execute([
            $id, $finalCrop, $finalCropLabel, $finalDisease, $finalPathogen, $imageUri,
            $confidence, $severity, $recommendation, $spread, $stage, $loss,
        ]);

        // Tạo pipeline steps cho phiên quét thật
        $pStmt = $pdo->prepare("INSERT INTO scan_pipeline_steps
            (scan_id, id, icon, title, descr, step_status, is_active, icon_bg, icon_color, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $modelName = (strcasecmp($finalCrop, 'rice') === 0) ? 'Phân tích Cloudflare LLaMA Vision (Lúa)' : 'Phân tích Cloudflare LLaMA Vision';
        $pStmt->execute([$id, 'p2', 'biotech', $modelName, 'Nhận diện: ' . $finalDisease, 'Hoàn tất', 1, '#FEF3C7', '#D97706', 2]);
        $pStmt->execute([$id, 'p3', 'agronheart', 'Giải pháp điều trị', 'Độ tin cậy: ' . confStr($confidence) . '%', 'Hoàn tất', 1, '#DCFCE7', '#16A34A', 3]);

        // Tạo detections (bounding boxes) dựa trên kết quả thật
        $dStmt = $pdo->prepare("INSERT INTO scan_detections
            (scan_id, id, top, left_pos, confidence, severity, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        if ($severity === 'healthy') {
            $dStmt->execute([$id, 'd1', '25%', '25%', confStr($confidence) . '%', 'healthy', 1]);
        } else {
            $dStmt->execute([$id, 'd1', '32%', '38%', confStr($confidence) . '%', $severity, 1]);
            if (!empty($pred['topk'][1]) && $pred['topk'][1]['score'] > 10) {
                $dStmt->execute([$id, 'd2', '58%', '30%', confStr($pred['topk'][1]['score']) . '%', 'warning', 2]);
            }
        }

        $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$id]);

        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$id]);

        send([
            'id'             => $id,
            'crop'           => $finalCropLabel,
            'disease'        => $finalDisease,
            'pathogen'       => $finalPathogen,
            'image'          => $imageUri,
            'confidence'     => confStr($confidence),
            'severity'       => $severity,
            'recommendation' => $recommendation,
            'time'           => fmtTime(date('Y-m-d H:i:s')),
            'status'         => ['spread' => $spread, 'stage' => $stage, 'loss' => $loss],
            'pipeline'       => array_map('mapPipeline', $steps->fetchAll()),
            'detections'     => array_map('mapDetection', $dets->fetchAll()),
            'topk'           => $pred['topk'] ?? [],
        ]);
    }

    if (preg_match('#^history/([A-Za-z0-9_\-]+)/save$#', $target, $m)) {
        if ($MOCK_MODE) send(['ok' => true]);
        $stmt = $pdo->prepare("UPDATE scans SET is_saved = 1 WHERE id=?");
        $stmt->execute([$m[1]]);
        send(['ok' => true]);
    }

    // ── Google OAuth: exchange auth code for session ─────────────────
    if ($target === 'auth/google') {
        $code = $body['code'] ?? '';
        if (!$code) {
            http_response_code(400);
            send(['error' => 'missing authorization code']);
        }

        global $GOOGLE;
        if ($GOOGLE['client_id'] === '' || $GOOGLE['client_secret'] === '') {
            http_response_code(503);
            send(['error' => 'Google OAuth not configured']);
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
            http_response_code(502);
            send(['error' => 'Google token exchange failed']);
        }

        $tokenData = json_decode($tokenResp, true);
        $idToken = $tokenData['id_token'] ?? '';
        if (!$idToken) {
            http_response_code(401);
            send(['error' => 'No id_token in Google response']);
        }

        // 2. Verify the ID token with Google
        $verifyResp = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        if ($verifyResp === false) {
            http_response_code(401);
            send(['error' => 'Google token verification failed']);
        }

        $payload = json_decode($verifyResp, true);
        if (!isset($payload['sub']) || !isset($payload['email'])) {
            http_response_code(401);
            send(['error' => 'Invalid Google token payload']);
        }

        // Verify the token is for our client ID
        if (isset($payload['aud']) && $payload['aud'] !== $GOOGLE['client_id']) {
            http_response_code(401);
            send(['error' => 'Token audience mismatch']);
        }

        // 3. Create or update user
        $googleId = $payload['sub'];
        $email    = strtolower($payload['email']);
        $name     = $payload['name'] ?? '';
        $avatar   = $payload['picture'] ?? '';

        // Serverless MVP: skip DB user/session writes, return in-memory token
        if ($MOCK_MODE) {
            $token = bin2hex(random_bytes(32));
            send([
                'token' => $token,
                'user' => [
                    'email'   => $email,
                    'name'    => $name,
                    'avatar'  => $avatar,
                ],
            ]);
        }

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

        // 4. Create session token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7); // 7 days

        $stmt = $pdo->prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$token, $userId, $expiresAt]);

        // 5. Return session + user info
        send([
            'token' => $token,
            'user' => [
                'email'   => $email,
                'name'    => $name,
                'avatar'  => $avatar,
            ],
        ]);
    }

    // ── POST /chat — proxy to Cloudflare Workers AI chat endpoint ─────
    if ($target === 'chat') {
        $messages = $body['messages'] ?? [];

        if (empty($messages)) {
            http_response_code(400);
            send(['error' => 'No messages provided']);
        }

        global $AI;
        $chatUrl = $AI['chat_endpoint'] ?: str_replace('/predict', '/chat', $AI['endpoint']);

        $headers = ["Content-Type: application/json"];
        if ($AI['bearer'] !== '') {
            $headers[] = "Authorization: Bearer " . $AI['bearer'];
        } elseif ($AI['username'] !== '' || $AI['api_key'] !== '') {
            $headers[] = "Authorization: Basic " . base64_encode($AI['username'] . ':' . $AI['api_key']);
        }

        $ctx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode(['messages' => $messages]),
            'timeout' => $AI['timeout'],
            'ignore_errors' => true,
        ]]);

        $resp = @file_get_contents($chatUrl, false, $ctx);
        $data = $resp === false ? null : json_decode($resp, true);

        if ($data === null) {
            http_response_code(503);
            send([
                'error' => 'AI chat service unavailable',
                'message' => 'Dịch vụ AI đang bận, vui lòng thử lại.',
            ]);
        }

        send($data);
    }

    http_response_code(404);
    send(['error' => 'not found']);
}

http_response_code(405);
send(['error' => 'method not allowed']);
