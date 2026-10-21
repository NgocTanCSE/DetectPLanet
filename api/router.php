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

/**
 * Route an incoming request to the appropriate controller.
 * Returns true if a route was handled, false otherwise.
 */
function routeRequest($method, $target) {
    // GET routes
    if ($method === 'GET') {
        if ($target === 'health') {
            global $AI, $pdo;
            sendJson([
                'status' => 'ok',
                'db'     => $pdo !== null,
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

        if ($target === 'auth/me') {
            (new AuthController())->handle('GET', $target);
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
            (new ChatController())->handle();
            return true;
        }

        sendJson(['error' => 'not found'], 404);
        return true;
    }

    sendJson(['error' => 'method not allowed'], 405);
    return true;
}
