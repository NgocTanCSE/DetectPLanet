#!/usr/bin/env php
<?php
/**
 * AgriScan AI — Job runner (CLI).
 *
 *   php jobs/run.php loop             # scheduler: chạy các job đã đến giờ (1 lượt)
 *   php jobs/run.php weather-risk     # chạy ngay một job
 *   php jobs/run.php all              # chạy tất cả job đã đăng ký
 *   php jobs/run.php help
 *
 * Không truy cập được qua HTTP — xem POST /jobs/run (JobController) nếu cần trigger từ xa.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/jobs.php';

global $pdo;
if (!$pdo) {
    fwrite(STDERR, "Không kết nối được database.\n");
    exit(1);
}

ensureDbSchema($pdo);

$argvList = $argv ?? [];
$cmd   = $argvList[1] ?? 'help';
$force = in_array('--force', $argvList, true);
$registry = jobRegistry();

/**
 * Nạp file job và chạy.
 */
function runRegisteredJob($pdo, $name, array $meta) {
    require_once $meta['file'];
    $fn = $meta['function'];
    if (!function_exists($fn)) {
        return ['job' => $name, 'status' => 'error', 'message' => "Thiếu hàm $fn"];
    }
    return jobRunSafely($pdo, $name, $fn);
}

function printResult(array $result, $json = true) {
    if ($json) {
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    } else {
        printf("[%s] %s — %s (%dms)\n",
            $result['status'] ?? '?',
            $result['job'] ?? '?',
            $result['message'] ?? '',
            $result['durationMs'] ?? 0
        );
    }
}

$exit = 0;

if ($cmd === 'help') {
    echo "Dùng: php jobs/run.php <loop|all|" . implode('|', array_keys($registry)) . "> [--force]\n";
    exit(0);
}

if ($cmd === 'loop') {
    foreach ($registry as $name => $meta) {
        // Job có lịch cố định (vd báo cáo tuần chỉ chạy thứ Hai).
        if (isset($meta['weekday']) && (int) date('N') !== (int) $meta['weekday']) {
            continue;
        }
        if (!jobIsDue($pdo, $name, (int) $meta['interval'])) {
            continue;
        }
        $result = runRegisteredJob($pdo, $name, $meta);
        printResult($result, false);
        if (($result['status'] ?? '') === 'error') $exit = 1;
    }
    exit($exit);
}

if ($cmd === 'all') {
    foreach ($registry as $name => $meta) {
        $result = runRegisteredJob($pdo, $name, $meta);
        printResult($result, true);
        if (($result['status'] ?? '') === 'error') $exit = 1;
    }
    exit($exit);
}

if (!isset($registry[$cmd])) {
    fwrite(STDERR, "Job không tồn tại: $cmd\n");
    exit(1);
}

$result = runRegisteredJob($pdo, $cmd, $registry[$cmd]);
printResult($result, true);
exit(($result['status'] ?? '') === 'error' ? 1 : 0);
