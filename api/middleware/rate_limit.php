<?php
/**
 * AgriScan AI — IP-based rate limit middleware.
 * Extracted from api/index.php.
 */

/**
 * Simple IP-based rate limit (file-backed). Returns false when limit exceeded.
 */
function rateLimit($key, $limit = 10, $window = 60) {
    $file = '/tmp/agriscan_ratelimit_' . md5($key) . '.txt';
    $now = time();
    $entries = [];
    if (is_file($file)) {
        $content = @file_get_contents($file);
        if ($content !== false) {
            $raw = explode("\n", $content);
            foreach ($raw as $line) {
                $t = (int) $line;
                if ($t > 0 && $t > $now - $window) {
                    $entries[] = $t;
                }
            }
        }
    }
    if (count($entries) >= $limit) {
        return false;
    }
    $entries[] = $now;
    $dir = dirname($file);
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    @file_put_contents($file, implode("\n", $entries) . "\n", LOCK_EX);
    return true;
}
