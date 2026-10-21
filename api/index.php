<?php
/**
 * AgriScan AI — API entry point (single router).
 * Delegates to api/router.php for controller dispatch.
 */

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/router.php';

// ── CORS ──────────────────────────────────────────────────────────────
handleCors();

// ── GET /samples/<name> — serve placeholder images ────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET'
    && preg_match('#^samples/(.+)$#', trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/'), $sm)) {
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

// ── Compute routing vars ──────────────────────────────────────────────
$method    = $_SERVER['REQUEST_METHOD'];
$path      = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir !== '' && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), '/');
}
$path   = preg_replace('#^index\.php/?#', '', $path);
$target = isset($_GET['route']) ? $_GET['route'] : $path;

// ── Reject legacy /detectplanet_api prefix ────────────────────────────
if (preg_match('#^detectplanet_api(/|$)#i', $target)) {
    sendJson(['error' => 'not found'], 404);
}

// ── Load config (PDO, AI, Google) ─────────────────────────────────────
require_once __DIR__ . '/config.php';
mb_internal_encoding('UTF-8');

// ── Dispatch ──────────────────────────────────────────────────────────
routeRequest($method, $target);
