<?php
/**
 * AgriScan AI — Database helpers & response utilities.
 * Extracted from api/index.php to keep the router lean.
 */

require_once __DIR__ . '/../config.php';

/**
 * Send JSON response and exit.
 */
function sendJson($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Require a working PDO connection. Returns honest 503 when DB is down.
 */
function requireDb() {
    global $pdo;
    if ($pdo === null) {
        sendJson([
            'error' => 'Cơ sở dữ liệu không khả dụng',
            'message' => 'Không thể kết nối database. Kiểm tra dịch vụ postgres.',
        ], 503);
    }
    return $pdo;
}

/**
 * Extract authenticated user ID from Bearer token.
 * Returns NULL when no/invalid token (dev mode: returns all rows).
 * When REQUIRE_AUTH=true, sends 401 and exits on missing/invalid token.
 */
function getUserIdFromToken() {
    global $pdo;
    if ($pdo === null) return null;
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
        $token = trim($m[1]);
    } else {
        $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    }
    if (!$token) {
        if (strtolower(getenv('REQUIRE_AUTH') ?: '') === 'true') {
            sendJson([
                'error'   => 'No session token',
                'message' => 'Vui lòng đăng nhập để sử dụng tính năng này.',
            ], 401);
        }
        // Dev mode fallback: return first user so POST endpoints have a
        // concrete user_id for writes (GET endpoints ignore the value via
        // userScope(null) → '').
        $dev = $pdo->prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1");
        $dev->execute();
        $devRow = $dev->fetch();
        return $devRow ? (int) $devRow['id'] : null;
    }
    $stmt = $pdo->prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW() LIMIT 1");
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) {
        if (strtolower(getenv('REQUIRE_AUTH') ?: '') === 'true') {
            sendJson([
                'error'   => 'Invalid or expired session',
                'message' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            ], 401);
        }
        // Dev mode fallback (same as above).
        $dev = $pdo->prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1");
        $dev->execute();
        $devRow = $dev->fetch();
        return $devRow ? (int) $devRow['id'] : null;
    }
    return (int) $row['user_id'];
}

/**
 * Build SQL WHERE fragment scoping scans to the authenticated user.
 */
function userScope($userId) {
    if ($userId === null || $userId === '') return '';
    return 'AND user_id = ' . (int) $userId;
}

/**
 * Validate that a URL points to a public HTTP(S) host and is NOT an
 * internal/private address (SSRF protection).
 *
 * Blocks: localhost, loopback, private ranges, link-local, reserved,
 *         and IPv6 equivalents.
 */
function isSafeImageUrl($url) {
    if (!is_string($url) || $url === '') return false;

    $parsed = parse_url($url);
    if ($parsed === false) return false;

    // Only allow http/https schemes (blocks file://, gopher://, etc.)
    $scheme = strtolower($parsed['scheme'] ?? '');
    if ($scheme !== 'http' && $scheme !== 'https') return false;

    $host = $parsed['host'] ?? '';
    if ($host === '' || $host === 'localhost') return false;

    // Resolve hostname to IP(s) and check each against private/reserved ranges.
    // gethostbynamel returns array of IPs or false on failure.
    $ips = gethostbynamel($host);
    if ($ips === false || empty($ips)) return false;

    foreach ($ips as $ip) {
        // FILTER_FLAG_NO_PRIV_RANGE blocks 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
        // FILTER_FLAG_NO_RES_RANGE blocks 127.0.0.0/8, 169.254.0.0/16, 0.0.0.0/8, etc.
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }
    }
    return true;
}

/**
 * Format relative time in Vietnamese.
 */
function fmtTime($created) {
    if (!$created) return '';
    $ts = strtotime($created);
    if (!$ts) return '';
    $diff = time() - $ts;
    if ($diff < 60)  return 'Vừa quét lúc ' . date('H:i', $ts);
    if ($diff < 3600) return (int) floor($diff / 60) . ' phút trước';
    if ($diff < 86400) return (int) floor($diff / 3600) . ' giờ trước';
    return date('d/m/Y H:i', $ts);
}

/**
 * Confidence to string with one decimal.
 */
function confStr($c) {
    return ($c === null || $c === '') ? '' : number_format((float) $c, 1);
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
        'id'        => $r['id'],
        'crop'      => $r['crop'],
        'cropLabel' => $r['crop_label'],
        'title'     => $r['disease'],
        'confidence'=> confStr($r['confidence']),
        'severity'  => $r['severity'],
        'time'      => fmtTime($r['created_at']),
        'image'     => $r['image'],
        'is_saved'  => (int) $r['is_saved'],
    ];
}

function mapPipeline($row) {
    return [
        'id'        => $row['id'],
        'icon'      => $row['icon'],
        'title'     => $row['title'],
        'desc'      => $row['descr'],
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
        'left'       => $row['left_pos'],
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
