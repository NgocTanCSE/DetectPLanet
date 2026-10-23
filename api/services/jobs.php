<?php
/**
 * AgriScan AI — Job bookkeeping helpers (GĐ2).
 *
 * Mọi job nền ghi trạng thái vào bảng job_runs để:
 *  - scheduler biết job nào "đến giờ" (loop không cần cron hệ điều hành),
 *  - /health và admin nhìn thấy lần chạy gần nhất.
 */

/**
 * Ghi (upsert) kết quả một lần chạy.
 */
function jobRecord($pdo, $name, $status, $message, $durationMs) {
    $stmt = $pdo->prepare(
        "INSERT INTO job_runs (name, last_run_at, last_status, last_message, last_duration_ms)
         VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
         ON CONFLICT (name) DO UPDATE
            SET last_run_at      = CURRENT_TIMESTAMP,
                last_status      = EXCLUDED.last_status,
                last_message     = EXCLUDED.last_message,
                last_duration_ms = EXCLUDED.last_duration_ms"
    );
    $stmt->execute([$name, $status, mb_substr((string) $message, 0, 1000), (int) $durationMs]);
}

/**
 * Lần chạy gần nhất của job, hoặc null.
 */
function jobLastRun($pdo, $name) {
    $stmt = $pdo->prepare(
        "SELECT name, last_run_at, last_status, last_message, last_duration_ms
           FROM job_runs WHERE name = ? LIMIT 1"
    );
    $stmt->execute([$name]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Job đã đến giờ chạy chưa? (dựa trên last_run_at)
 */
function jobIsDue($pdo, $name, $intervalSeconds) {
    $last = jobLastRun($pdo, $name);
    if (!$last || empty($last['last_run_at'])) return true;
    $ts = strtotime($last['last_run_at']);
    if ($ts === false) return true;
    return (time() - $ts) >= $intervalSeconds;
}

/**
 * Chạy một hàm job, bắt mọi exception và luôn ghi job_runs.
 *
 * @param callable $fn function(PDO $pdo): array{status,message}
 */
function jobRunSafely($pdo, $name, callable $fn) {
    $start = hrtime(true);
    try {
        $result = $fn($pdo);
        $status  = $result['status']  ?? 'ok';
        $message = $result['message'] ?? '';
        $extra   = $result;
    } catch (Throwable $e) {
        $status  = 'error';
        $message = $e->getMessage();
        $extra   = [];
        error_log("job $name failed: " . $e->getMessage());
    }
    $duration = (int) round((hrtime(true) - $start) / 1e6);
    jobRecord($pdo, $name, $status, $message, $duration);

    return array_merge($extra, [
        'job'            => $name,
        'status'         => $status,
        'message'        => $message,
        'durationMs'     => $duration,
    ]);
}

/**
 * Tập luật job đã triển khai — scheduler dùng để biết job nào đến giờ.
 * Thêm job mới ở đây (GĐ3/GĐ4) là scheduler tự chạy.
 */
function jobRegistry() {
    return [
        'weather-risk' => [
            'file'     => __DIR__ . '/../jobs/weather_risk.php',
            'function' => 'jobWeatherRisk',
            'interval' => 6 * 3600,
        ],
        'official-feed' => [
            'file'     => __DIR__ . '/../jobs/official_alerts.php',
            'function' => 'jobOfficialFeed',
            'interval' => 12 * 3600,
        ],
        'aggregate-reports' => [
            'file'     => __DIR__ . '/../jobs/aggregate_reports.php',
            'function' => 'jobAggregateReports',
            'interval' => 3600,
        ],
        // Báo cáo tuần: chỉ chạy thứ Hai (weekday = 1), cách nhau 7 ngày.
        'weekly-ai-report' => [
            'file'     => __DIR__ . '/../jobs/weekly_report.php',
            'function' => 'jobWeeklyAiReport',
            'interval' => 7 * 24 * 3600,
            'weekday'  => 1,
        ],
    ];
}
