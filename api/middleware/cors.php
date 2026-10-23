<?php
/**
 * AgriScan AI — CORS middleware.
 * Extracted from api/index.php.
 */

function handleCors() {
    $allowedOrigins = getenv('ALLOWED_ORIGINS') ?: '';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowOrigin = false;
    if ($origin !== '' && $allowedOrigins !== '') {
        foreach (array_map('trim', explode(',', $allowedOrigins)) as $allowed) {
            if (strtolower($allowed) === strtolower($origin)) {
                $allowOrigin = true;
                break;
            }
        }
    }
    if ($allowOrigin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
