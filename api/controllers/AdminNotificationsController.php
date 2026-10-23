<?php
/**
 * AgriScan AI — Admin: gửi thông báo hàng loạt + lịch sử.
 *
 *   GET    /admin/notifications?page&per_page
 *   POST   /admin/notifications/preview     {target, target_value} → số người nhận
 *   POST   /admin/notifications/broadcast   {title, body, type?, target?, target_value?}
 *   GET    /admin/notifications/{id}        chi tiết + tỉ lệ đọc
 *   DELETE /admin/notifications/{id}        xóa broadcast + thông báo con
 *
 * target: all | province | crop | user
 */

require_once __DIR__ . '/../middleware/admin.php';

class AdminNotificationsController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/notifications') {
            $this->index($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/notifications/preview') {
            $this->preview($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/notifications/broadcast') {
            $this->broadcast($pdo);
            return;
        }

        if ($method === 'GET' && preg_match('#^admin/notifications/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->show($pdo, $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/notifications/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->destroy($pdo, $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function index($pdo) {
        [$page, $perPage, $offset] = adminPagination(20);

        $total = (int) $pdo->query("SELECT COUNT(*) FROM notification_broadcasts")->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT b.*,
                    (SELECT COUNT(*) FROM notifications n WHERE n.broadcast_id = b.id) AS sent_count,
                    (SELECT COUNT(*) FROM notifications n WHERE n.broadcast_id = b.id AND n.is_read = 1) AS read_count
               FROM notification_broadcasts b
              ORDER BY b.created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute();

        $items = array_map(function ($b) {
            $sent = (int) $b['sent_count'];
            $read = (int) $b['read_count'];
            return [
                'id'          => $b['id'],
                'title'       => $b['title'],
                'body'        => $b['body'],
                'type'        => $b['type'],
                'target'      => $b['target'],
                'targetValue' => $b['target_value'],
                'recipients'  => (int) $b['recipients'],
                'sent'        => $sent,
                'read'        => $read,
                'readRate'    => $sent > 0 ? round($read / $sent * 100, 1) : 0,
                'createdAt'   => $b['created_at'],
            ];
        }, $stmt->fetchAll());

        adminList($items, $page, $perPage, $total);
    }

    private function preview($pdo) {
        $body = adminBody();
        [$sql, $params] = $this->recipientQuery($pdo, $body);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendJson(['recipients' => (int) $stmt->fetchColumn()]);
    }

    private function broadcast($pdo) {
        $body = adminBody();
        adminRequireFields($body, ['title', 'body']);

        $title = mb_substr(trim((string) $body['title']), 0, 255);
        $message = (string) $body['body'];
        $type = (string) ($body['type'] ?? 'info');
        adminRequireEnum($type, ['info', 'warning', 'success', 'error', 'alert'], 'type');
        $target = (string) ($body['target'] ?? 'all');
        adminRequireEnum($target, ['all', 'province', 'crop', 'user'], 'target');
        $targetValue = trim((string) ($body['target_value'] ?? ''));

        if ($target !== 'all' && $targetValue === '') {
            sendJson(['error' => 'invalid', 'message' => 'Chọn đối tượng nhận thông báo.', 'field' => 'target_value'], 400);
        }

        [$sql, $params] = $this->recipientQuery($pdo, [
            'target' => $target,
            'target_value' => $targetValue,
        ]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $recipients = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        if (!$recipients) {
            sendJson(['error' => 'no_recipients', 'message' => 'Không có người dùng nào khớp đối tượng đã chọn.'], 400);
        }

        $broadcastId = 'bc_' . substr(adminNewId(), 0, 14);

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "INSERT INTO notification_broadcasts
                    (id, title, body, type, target, target_value, recipients)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )->execute([$broadcastId, $title, $message, $type, $target, $targetValue, count($recipients)]);

            $insert = $pdo->prepare(
                "INSERT INTO notifications (id, user_id, title, body, type, data, broadcast_id)
                 VALUES (?, ?, ?, ?, ?, ?::jsonb, ?)
                 ON CONFLICT DO NOTHING"
            );
            $i = 0;
            foreach ($recipients as $uid) {
                $noteId = 'ntf_' . substr(sha1($broadcastId . '|' . $uid), 0, 24);
                $insert->execute([
                    $noteId,
                    $uid,
                    $title,
                    $message,
                    $type,
                    json_encode(['broadcast_id' => $broadcastId], JSON_UNESCAPED_UNICODE),
                    $broadcastId,
                ]);
                $i++;
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendJson(['error' => 'server', 'message' => 'Không gửi được thông báo: ' . $e->getMessage()], 500);
        }

        adminAudit($pdo, 'admin.broadcast.create', 'notification_broadcasts', $broadcastId, null, [
            'title'      => $title,
            'target'     => $target,
            'targetValue'=> $targetValue,
            'recipients' => count($recipients),
        ]);

        sendJson(['ok' => true, 'id' => $broadcastId, 'recipients' => count($recipients)], 201);
    }

    private function show($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM notification_broadcasts WHERE id = ?");
        $stmt->execute([$id]);
        $b = $stmt->fetch();
        if (!$b) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy lần gửi thông báo.'], 404);
        }

        $statsStmt = $pdo->prepare(
            "SELECT COUNT(*) AS sent,
                    COUNT(*) FILTER (WHERE is_read = 1) AS read_count
               FROM notifications WHERE broadcast_id = ?"
        );
        $statsStmt->execute([$id]);
        $stats = $statsStmt->fetch() ?: ['sent' => 0, 'read_count' => 0];

        $recipientsStmt = $pdo->prepare(
            "SELECT n.user_id, n.is_read, n.read_at, u.name, u.email
               FROM notifications n
               JOIN users u ON u.id = n.user_id
              WHERE n.broadcast_id = ?
              ORDER BY n.is_read ASC, u.name ASC
              LIMIT 200"
        );
        $recipientsStmt->execute([$id]);

        $sent = (int) $stats['sent'];
        $read = (int) $stats['read_count'];

        sendJson([
            'broadcast' => [
                'id'          => $b['id'],
                'title'       => $b['title'],
                'body'        => $b['body'],
                'type'        => $b['type'],
                'target'      => $b['target'],
                'targetValue' => $b['target_value'],
                'recipients'  => (int) $b['recipients'],
                'createdAt'   => $b['created_at'],
            ],
            'stats' => [
                'sent'     => $sent,
                'read'     => $read,
                'unread'   => max(0, $sent - $read),
                'readRate' => $sent > 0 ? round($read / $sent * 100, 1) : 0,
            ],
            'recipients' => array_map(function ($r) {
                return [
                    'userId'  => (int) $r['user_id'],
                    'name'    => $r['name'],
                    'email'   => $r['email'],
                    'isRead'  => (int) $r['is_read'] === 1,
                    'readAt'  => $r['read_at'],
                ];
            }, $recipientsStmt->fetchAll()),
        ]);
    }

    private function destroy($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM notification_broadcasts WHERE id = ?");
        $stmt->execute([$id]);
        $b = $stmt->fetch();
        if (!$b) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy lần gửi thông báo.'], 404);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM notifications WHERE broadcast_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM notification_broadcasts WHERE id = ?")->execute([$id]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendJson(['error' => 'server', 'message' => 'Không xóa được: ' . $e->getMessage()], 500);
        }

        adminAudit($pdo, 'admin.broadcast.delete', 'notification_broadcasts', $id, $b, null);
        sendJson(['ok' => true, 'deleted' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Trả [SQL đếm/lấy user_id, params] theo target.
     * Luôn loại tài khoản đã xóa mềm hoặc đang bị khóa.
     */
    private function recipientQuery($pdo, array $body) {
        $target = (string) ($body['target'] ?? 'all');
        adminRequireEnum($target, ['all', 'province', 'crop', 'user'], 'target');
        $value = trim((string) ($body['target_value'] ?? ''));

        $base = "SELECT u.id FROM users u WHERE u.deleted_at IS NULL AND u.status = 'active'";

        if ($target === 'all') {
            return [$base, []];
        }

        if ($target === 'user') {
            return [$base . ' AND u.id = ?', [(int) $value]];
        }

        if ($target === 'province') {
            return [
                $base . ' AND EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id AND p.province = ?)',
                [$value],
            ];
        }

        // crop: nhận crop_id hoặc slug
        $cropId = (int) $value;
        if ($cropId <= 0) {
            $stmt = $pdo->prepare("SELECT id FROM crops WHERE slug = ?");
            $stmt->execute([$value]);
            $cropId = (int) ($stmt->fetchColumn() ?: 0);
        }
        if ($cropId <= 0) {
            sendJson(['error' => 'invalid', 'message' => 'Cây trồng không hợp lệ.', 'field' => 'target_value'], 400);
        }

        return [
            $base . ' AND EXISTS (SELECT 1 FROM user_crop_preferences c
                                   WHERE c.user_id = u.id AND c.crop_id = ? AND c.is_active = 1)',
            [$cropId],
        ];
    }
}
