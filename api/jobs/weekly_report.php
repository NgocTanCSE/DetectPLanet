<?php
/**
 * AgriScan AI — Job: báo cáo tuần bằng AI (GĐ5/admin).
 *
 * Mỗi thứ Hai (scheduler gọi `php jobs/run.php loop` 30 phút/lần):
 *  - tổng hợp số liệu 7 ngày gần nhất,
 *  - gọi Cloudflare Workers AI viết tóm tắt + khuyến nghị,
 *  - lưu vào bảng admin_reports.
 *
 * Chạy tay:
 *   docker exec agriscan-api php /var/www/html/jobs/run.php weekly-ai-report
 */

require_once __DIR__ . '/../services/admin_report.php';

function jobWeeklyAiReport($pdo) {
    $result = adminWeeklyReport($pdo);

    return [
        'status'   => $result['ok'] ? 'ok' : 'error',
        'message'  => $result['message'],
        'reportId' => $result['id'],
    ];
}
