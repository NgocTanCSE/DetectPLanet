<?php
/**
 * AgriScan AI — Job trigger controller.
 *
 * POST /jobs/run
 *   Header: X-Job-Token: <JOB_SECRET>
 *   Body:   { "job": "weather-risk" }
 *
 * Dùng cho test/ops khi không muốn chờ scheduler. Route tự tắt (404) nếu
 * JOB_SECRET chưa được cấu hình.
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/jobs.php';

class JobController {
    public function handle($target) {
        global $pdo;
        $pdo = requireDb();

        $secret = (string) (getenv('JOB_SECRET') ?: '');
        if ($secret === '') {
            sendJson(['error' => 'not found'], 404);
        }

        $given = (string) ($_SERVER['HTTP_X_JOB_TOKEN'] ?? '');
        if ($given === '' || !hash_equals($secret, $given)) {
            sendJson([
                'error'   => 'unauthorized',
                'message' => 'Sai hoặc thiếu X-Job-Token.',
            ], 401);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $job  = trim((string) ($body['job'] ?? ''));

        $registry = jobRegistry();
        if ($job === '' || !isset($registry[$job])) {
            sendJson([
                'error' => 'unknown job',
                'jobs'  => array_keys($registry),
            ], 400);
        }

        ensureDbSchema($pdo);
        require_once $registry[$job]['file'];

        $fn = $registry[$job]['function'];
        if (!function_exists($fn)) {
            sendJson(['error' => 'job function missing', 'job' => $job], 500);
        }

        $result = jobRunSafely($pdo, $job, $fn);
        sendJson($result, ($result['status'] ?? '') === 'error' ? 500 : 200);
    }
}
