<?php
/**
 * AgriScan API — Router.
 * Maps HTTP method + path to controller actions.
 * Extracted from api/index.php to keep the entry point lean.
 */

require_once __DIR__ . '/controllers/HomeController.php';
require_once __DIR__ . '/controllers/ScanController.php';
require_once __DIR__ . '/controllers/ResultController.php';
require_once __DIR__ . '/controllers/HistoryController.php';
require_once __DIR__ . '/controllers/GuidesController.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ChatController.php';
require_once __DIR__ . '/controllers/AlertController.php';
require_once __DIR__ . '/controllers/JobController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/controllers/AdminOverviewController.php';
require_once __DIR__ . '/controllers/AdminUsersController.php';
require_once __DIR__ . '/controllers/AdminGuidesController.php';
require_once __DIR__ . '/controllers/AdminAlertsController.php';
require_once __DIR__ . '/controllers/AdminScansController.php';
require_once __DIR__ . '/controllers/AdminNotificationsController.php';
require_once __DIR__ . '/controllers/AdminAiController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/NotificationsController.php';

/**
 * Các route của app admin (frontend_admin). Tất cả yêu cầu X-Admin-Token.
 * Trả true nếu đã xử lý (kể cả 404 của controller).
 */
function adminRoute($method, $target) {
    if (strpos($target, 'admin/') !== 0) return false;
    // Route admin cũ (duyệt tin chính thức / báo cáo cộng đồng) nằm ở block method bên dưới.
    if (preg_match('#^admin/(ingest|reports)(/|$)#', $target)) return false;

    if (strpos($target, 'admin/users') === 0) {
        (new AdminUsersController())->handle($method, $target);
        return true;
    }
    if (strpos($target, 'admin/guides') === 0) {
        (new AdminGuidesController())->handle($method, $target);
        return true;
    }
    if (strpos($target, 'admin/alerts') === 0) {
        (new AdminAlertsController())->handle($method, $target);
        return true;
    }
    if (strpos($target, 'admin/scans') === 0) {
        (new AdminScansController())->handle($method, $target);
        return true;
    }
    if (strpos($target, 'admin/notifications') === 0) {
        (new AdminNotificationsController())->handle($method, $target);
        return true;
    }
    if (strpos($target, 'admin/ai') === 0) {
        (new AdminAiController())->handle($method, $target);
        return true;
    }
    if (in_array($target, ['admin/overview', 'admin/system', 'admin/audit'], true)) {
        (new AdminOverviewController())->handle($method, $target);
        return true;
    }

    return false;
}

/**
 * Route an incoming request to the appropriate controller.
 * Returns true if a route was handled, false otherwise.
 */
function routeRequest($method, $target) {
    // Admin app routes — xử lý trước để hỗ trợ GET/POST/PATCH/DELETE.
    if (adminRoute($method, $target)) return true;

    // GET routes
    if ($method === 'GET') {
        if ($target === 'health') {
            global $AI, $pdo;

            // Trạng thái các job nền (GĐ2+) — bảng có thể chưa tồn tại ở DB cũ.
            $jobs = [];
            if ($pdo !== null) {
                try {
                    $rows = $pdo->query(
                        "SELECT name, last_run_at, last_status, last_message, last_duration_ms
                           FROM job_runs ORDER BY name"
                    )->fetchAll();
                    foreach ($rows as $r) {
                        $jobs[$r['name']] = [
                            'lastRunAt'  => $r['last_run_at'],
                            'status'     => $r['last_status'],
                            'message'    => $r['last_message'],
                            'durationMs' => (int) $r['last_duration_ms'],
                        ];
                    }
                } catch (Throwable $e) {
                    $jobs = ['_error' => 'job_runs chưa sẵn sàng'];
                }
            }

            sendJson([
                'status' => 'ok',
                'db'     => $pdo !== null,
                'jobs'   => $jobs,
                'ai'     => [
                    'configured'   => ($AI['account_id'] !== '' && $AI['api_token'] !== '')
                                       || $AI['endpoint'] !== '',
                    'vision_model' => $AI['vision_model'],
                    'chat_model'   => $AI['chat_model'],
                ],
                'time'   => date('c'),
            ]);
            return true;
        }

        if ($target === 'home' || $target === '') {
            (new HomeController())->handle();
            return true;
        }

        if ($target === 'scan/session') {
            (new ScanController())->handle('GET');
            return true;
        }

        if ($target === 'result/latest' || preg_match('#^result/([A-Za-z0-9_\-]+)$#', $target)) {
            (new ResultController())->handle($target);
            return true;
        }

        if ($target === 'history') {
            (new HistoryController())->handle('GET', $target);
            return true;
        }

        if ($target === 'guides') {
            (new GuidesController())->handle();
            return true;
        }

        if ($target === 'auth/me'
            || $target === 'auth/google/start'
            || $target === 'auth/google/callback') {
            (new AuthController())->handle('GET', $target);
            return true;
        }

        if ($target === 'chat/history') {
            (new ChatController())->handle('GET', $target);
            return true;
        }

        if ($target === 'alerts') {
            (new AlertController())->handle('GET', $target);
            return true;
        }

        if ($target === 'user-crop-preferences') {
            (new AlertController())->handle('GET', $target);
            return true;
        }

        if ($target === 'user-location') {
            (new AlertController())->handle('GET', $target);
            return true;
        }

        if ($target === 'admin/ingest') {
            (new AdminController())->handle('GET', $target);
            return true;
        }

        if ($target === 'reports') {
            (new ReportController())->handle('GET', $target);
            return true;
        }

        if ($target === 'notifications') {
            (new NotificationsController())->handle('GET', $target);
            return true;
        }

        if ($target === 'notifications/unread-count') {
            (new NotificationsController())->handle('GET', $target);
            return true;
        }

        if ($target === 'admin/reports') {
            (new AdminController())->handle('GET', $target);
            return true;
        }

        sendJson(['error' => 'not found'], 404);
        return true;
    }

    // POST routes
    if ($method === 'POST') {
        if ($target === 'analyze') {
            (new ScanController())->handle('POST');
            return true;
        }

        if ($target === 'user-crop-preferences') {
            (new AlertController())->handle('POST', $target);
            return true;
        }

        if ($target === 'user-location') {
            (new AlertController())->handle('POST', $target);
            return true;
        }

        if (preg_match('#^history/([A-Za-z0-9_\-]+)/save$#', $target)
            || preg_match('#^history/([A-Za-z0-9_\-]+)/unsave$#', $target)) {
            (new HistoryController())->handle('POST', $target);
            return true;
        }

        if ($target === 'auth/google') {
            (new AuthController())->handle('POST', $target);
            return true;
        }

        if ($target === 'auth/logout') {
            (new AuthController())->handle('POST', $target);
            return true;
        }

        if ($target === 'chat') {
            (new ChatController())->handle('POST', 'chat');
            return true;
        }

        if ($target === 'chat/history/clear') {
            (new ChatController())->handle('POST', $target);
            return true;
        }

        if ($target === 'jobs/run') {
            (new JobController())->handle($target);
            return true;
        }

        if ($target === 'admin/ingest') {
            (new AdminController())->handle('POST', $target);
            return true;
        }

        if ($target === 'admin/ingest/fetch') {
            (new AdminController())->handle('POST', $target);
            return true;
        }

        if (preg_match('#^admin/ingest/(\d+)/(approve|reject)$#', $target)) {
            (new AdminController())->handle('POST', $target);
            return true;
        }

        if ($target === 'reports') {
            (new ReportController())->handle('POST', $target);
            return true;
        }

        if (preg_match('#^reports/([A-Za-z0-9_]+)/confirm$#', $target)) {
            (new ReportController())->handle('POST', $target);
            return true;
        }

        if ($target === 'notifications/read') {
            (new NotificationsController())->handle('POST', $target);
            return true;
        }

        if (preg_match('#^admin/reports/([A-Za-z0-9_]+)/(verify|reject)$#', $target)) {
            (new AdminController())->handle('POST', $target);
            return true;
        }

        sendJson(['error' => 'not found'], 404);
        return true;
    }

    // DELETE routes
    if ($method === 'DELETE') {
        if (preg_match('#^reports/([A-Za-z0-9_]+)$#', $target)) {
            (new ReportController())->handle('DELETE', $target);
            return true;
        }
        sendJson(['error' => 'not found'], 404);
        return true;
    }

    sendJson(['error' => 'method not allowed'], 405);
    return true;
}
