<?php
/**
 * AgriScan AI — Thông báo trong app (GĐ4a).
 *
 *   GET  /notifications?limit=50     — danh sách thông báo của tôi
 *   GET  /notifications/unread-count — số chưa đọc (badge)
 *   POST /notifications/read         — {id}? đánh dấu 1 cái, không id = tất cả
 *
 * Không cần FCM: client polling 60s khi app đang mở.
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';

class NotificationsController {
    public function handle($method, $target) {
        global $pdo;
        $pdo = requireDb();
        ensureDbSchema($pdo);

        $uid = getUserIdFromToken();
        if ($uid === null) {
            sendJson(['error' => 'unauthorized', 'message' => 'Vui lòng đăng nhập.'], 401);
        }

        if ($method === 'GET' && $target === 'notifications') {
            $this->listNotifications($uid);
            return;
        }
        if ($method === 'GET' && $target === 'notifications/unread-count') {
            $this->unreadCount($uid);
            return;
        }
        if ($method === 'POST' && $target === 'notifications/read') {
            $this->markRead($uid);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function listNotifications($uid) {
        global $pdo;
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));

        $stmt = $pdo->prepare(
            "SELECT id, title, body, type, is_read, data, created_at, read_at
               FROM notifications
              WHERE user_id = ?
              ORDER BY created_at DESC
              LIMIT " . $limit
        );
        $stmt->execute([$uid]);

        sendJson([
            'notifications' => array_map(function ($n) {
                return [
                    'id'        => $n['id'],
                    'title'     => $n['title'],
                    'body'      => $n['body'],
                    'type'      => $n['type'],
                    'isRead'    => (int) $n['is_read'] === 1,
                    'data'      => $n['data'] ? json_decode($n['data'], true) : null,
                    'createdAt' => $n['created_at'],
                    'readAt'    => $n['read_at'],
                ];
            }, $stmt->fetchAll()),
        ]);
    }

    private function unreadCount($uid) {
        global $pdo;
        $stmt = $pdo->prepare(
            "SELECT count(*) FROM notifications WHERE user_id = ? AND is_read = 0"
        );
        $stmt->execute([$uid]);
        sendJson(['unread' => (int) $stmt->fetchColumn()]);
    }

    private function markRead($uid) {
        global $pdo;
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = trim((string) ($body['id'] ?? ''));

        if ($id !== '') {
            $pdo->prepare(
                "UPDATE notifications
                    SET is_read = 1, read_at = CURRENT_TIMESTAMP
                  WHERE user_id = ? AND id = ? AND is_read = 0"
            )->execute([$uid, $id]);
        } else {
            $pdo->prepare(
                "UPDATE notifications
                    SET is_read = 1, read_at = CURRENT_TIMESTAMP
                  WHERE user_id = ? AND is_read = 0"
            )->execute([$uid]);
        }

        $stmt = $pdo->prepare(
            "SELECT count(*) FROM notifications WHERE user_id = ? AND is_read = 0"
        );
        $stmt->execute([$uid]);

        sendJson(['ok' => true, 'unread' => (int) $stmt->fetchColumn()]);
    }
}
