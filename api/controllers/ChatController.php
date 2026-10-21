<?php
/**
 * AgriScan AI — Chat controller.
 * POST /chat
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/ai.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class ChatController {
    public function handle() {
        global $pdo;
        $rlKey = (($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ':chat');
        if (!rateLimit($rlKey)) {
            sendJson([
                'error'   => 'Rate limit exceeded',
                'message' => 'Quá nhiều yêu cầu chat. Vui lòng thử lại sau.',
            ], 429);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $messages = $body['messages'] ?? [];
        if (empty($messages) || !is_array($messages)) {
            sendJson(['error' => 'No messages provided'], 400);
            return;
        }

        $chat = aiChat($messages);
        if (!$chat['ok']) {
            sendJson([
                'error'   => 'AI chat service unavailable',
                'message' => $chat['error'] ?? 'Dịch vụ AI đang bận, vui lòng thử lại.',
            ], 503);
            return;
        }

        sendJson([
            'role'      => 'assistant',
            'content'   => $chat['reply'],
            'timestamp' => date('c'),
        ]);
    }
}
