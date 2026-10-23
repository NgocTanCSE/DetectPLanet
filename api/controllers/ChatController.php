<?php
/**
 * AgriScan AI — Chat controller.
 * POST   /chat           → AI reply (persists the exchange per user)
 * GET    /chat/history   → lịch sử chat của tài khoản đang đăng nhập
 * DELETE /chat/history   → xoá lịch sử chat của tài khoản (nút "cuộc trò chuyện mới")
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/ai.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class ChatController {
    /** Ensures the chat tables exist on databases created before this feature. */
    private static $schemaReady = false;

    public function handle($method = 'POST', $target = 'chat') {
        if ($method === 'GET' && $target === 'chat/history') {
            return $this->handleHistory();
        }
        if ($method === 'POST' && $target === 'chat/history/clear') {
            return $this->handleClearHistory();
        }
        return $this->handleChat();
    }

    private function handleChat() {
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

        // Persist the exchange for this account. Only the newest user message
        // is stored here — earlier turns are already in the table, so the
        // client can simply reload the history instead of resending it.
        $this->storeExchange($messages, $chat['reply']);

        sendJson([
            'role'      => 'assistant',
            'content'   => $chat['reply'],
            'timestamp' => date('c'),
        ]);
    }

    private function handleHistory() {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        if ($uid === null) {
            sendJson(['messages' => []]);
            return;
        }
        $this->ensureSchema();

        $limit = (int) ($_GET['limit'] ?? 100);
        if ($limit < 1 || $limit > 200) $limit = 100;

        $stmt = $pdo->prepare(
            "SELECT role, content, created_at FROM (
                 SELECT id, role, content, created_at
                 FROM chat_messages WHERE user_id = ?
                 ORDER BY id DESC LIMIT $limit
             ) recent ORDER BY id ASC"
        );
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll();

        sendJson([
            'messages' => array_map(function ($r) {
                return [
                    'role'      => $r['role'],
                    'content'   => $r['content'],
                    'createdAt' => $r['created_at'],
                ];
            }, $rows),
        ]);
    }

    private function handleClearHistory() {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        if ($uid === null) {
            sendJson(['ok' => true, 'deleted' => 0]);
            return;
        }
        $this->ensureSchema();

        $stmt = $pdo->prepare("DELETE FROM chat_messages WHERE user_id = ?");
        $stmt->execute([$uid]);
        sendJson(['ok' => true, 'deleted' => $stmt->rowCount()]);
    }

    /**
     * Store the last user turn and the assistant reply.
     * The client sends the whole thread; only the final user message is new.
     */
    private function storeExchange(array $messages, $reply) {
        global $pdo;
        try {
            $pdo = requireDb();
            $uid = getUserIdFromToken();
            if ($uid === null) return;
            $this->ensureSchema();

            $lastUser = null;
            foreach (array_reverse($messages) as $m) {
                if (($m['role'] ?? '') === 'user' && trim((string) ($m['content'] ?? '')) !== '') {
                    $lastUser = $m;
                    break;
                }
            }
            if ($lastUser === null) return;

            $stmt = $pdo->prepare(
                "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)"
            );
            $stmt->execute([$uid, 'user', mb_substr(trim((string) $lastUser['content']), 0, 4000)]);
            $stmt->execute([$uid, 'assistant', mb_substr(trim((string) $reply), 0, 8000)]);
        } catch (Throwable $e) {
            // Chat must keep working even if persistence fails.
            error_log('[chat] could not persist exchange: ' . $e->getMessage());
        }
    }

    private function ensureSchema() {
        if (self::$schemaReady) return;
        global $pdo;
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS chat_messages (
                id         BIGSERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role       VARCHAR(16) NOT NULL,
                content    TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"
        );
        $pdo->exec(
            "CREATE INDEX IF NOT EXISTS idx_chat_messages_user
             ON chat_messages (user_id, created_at)"
        );
        self::$schemaReady = true;
    }
}
