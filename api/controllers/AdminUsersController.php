<?php
/**
 * AgriScan AI — Admin: quản lý người dùng.
 *
 *   GET    /admin/users?q&status&page&per_page&include_deleted
 *   GET    /admin/users/{id}
 *   PATCH  /admin/users/{id}                 {name?, email?}
 *   POST   /admin/users/{id}/suspend         {reason?}
 *   POST   /admin/users/{id}/unsuspend
 *   DELETE /admin/users/{id}                 xóa mềm (deleted_at)
 *   POST   /admin/users/{id}/restore         khôi phục
 */

require_once __DIR__ . '/../middleware/admin.php';

class AdminUsersController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/users') {
            $this->index($pdo);
            return;
        }

        if ($method === 'GET' && preg_match('#^admin/users/(\d+)$#', $target, $m)) {
            $this->show($pdo, (int) $m[1]);
            return;
        }

        if ($method === 'PATCH' && preg_match('#^admin/users/(\d+)$#', $target, $m)) {
            $this->update($pdo, (int) $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/users/(\d+)/suspend$#', $target, $m)) {
            $this->suspend($pdo, (int) $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/users/(\d+)/unsuspend$#', $target, $m)) {
            $this->unsuspend($pdo, (int) $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/users/(\d+)/restore$#', $target, $m)) {
            $this->restore($pdo, (int) $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/users/(\d+)$#', $target, $m)) {
            $this->destroy($pdo, (int) $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function index($pdo) {
        [$page, $perPage, $offset] = adminPagination(20);

        $where = [];
        $params = [];

        if (empty($_GET['include_deleted'])) {
            $where[] = 'u.deleted_at IS NULL';
        }

        $q = trim((string) ($_GET['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(u.name ILIKE ? OR u.email ILIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        $status = trim((string) ($_GET['status'] ?? ''));
        if ($status !== '') {
            adminRequireEnum($status, ['active', 'suspended', 'deleted'], 'status');
            if ($status === 'deleted') {
                $where[] = 'u.deleted_at IS NOT NULL';
            } else {
                $where[] = 'u.status = ?';
                $params[] = $status;
            }
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u $whereSql");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT u.id, u.name, u.email, u.avatar, u.status, u.created_at,
                    u.suspended_at, u.suspended_reason, u.deleted_at,
                    (SELECT COUNT(*) FROM scans s
                      WHERE s.user_id = u.id AND s.deleted_at IS NULL) AS scan_count,
                    (SELECT MAX(s.created_at) FROM scans s
                      WHERE s.user_id = u.id AND s.deleted_at IS NULL) AS last_scan_at
               FROM users u
               $whereSql
              ORDER BY u.created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);

        $items = array_map([$this, 'mapUser'], $stmt->fetchAll());
        adminList($items, $page, $perPage, $total);
    }

    private function show($pdo, $id) {
        $stmt = $pdo->prepare(
            "SELECT id, google_id, name, email, avatar, status, created_at, updated_at,
                    suspended_at, suspended_reason, deleted_at
               FROM users WHERE id = ?"
        );
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy người dùng.'], 404);
        }

        $stats = [
            'scans'        => $this->scalar($pdo, "SELECT COUNT(*) FROM scans WHERE user_id = ? AND deleted_at IS NULL", [$id]),
            'scans_saved'  => $this->scalar($pdo, "SELECT COUNT(*) FROM scans WHERE user_id = ? AND deleted_at IS NULL AND is_saved = 1", [$id]),
            'reports'      => $this->scalar($pdo, "SELECT COUNT(*) FROM disease_reports WHERE user_id = ?", [$id]),
            'notifications'=> $this->scalar($pdo, "SELECT COUNT(*) FROM notifications WHERE user_id = ?", [$id]),
        ];

        $bySeverity = [];
        $sevStmt = $pdo->prepare(
            "SELECT severity, COUNT(*) AS c FROM scans
              WHERE user_id = ? AND deleted_at IS NULL GROUP BY severity"
        );
        $sevStmt->execute([$id]);
        foreach ($sevStmt->fetchAll() as $r) {
            $bySeverity[$r['severity']] = (int) $r['c'];
        }
        $stats['by_severity'] = $bySeverity;

        $recentStmt = $pdo->prepare(
            "SELECT id, crop_label, disease, severity, confidence, scan_status, created_at
               FROM scans WHERE user_id = ? AND deleted_at IS NULL
              ORDER BY created_at DESC LIMIT 10"
        );
        $recentStmt->execute([$id]);

        $recent = array_map(function ($r) {
            return [
                'id'         => $r['id'],
                'cropLabel'  => $r['crop_label'],
                'disease'    => $r['disease'],
                'severity'   => $r['severity'],
                'confidence' => (float) $r['confidence'],
                'status'     => $r['scan_status'],
                'createdAt'  => $r['created_at'],
            ];
        }, $recentStmt->fetchAll());

        sendJson([
            'user'   => $this->mapUser($user) + ['googleId' => $user['google_id'], 'updatedAt' => $user['updated_at']],
            'stats'  => $stats,
            'recent' => $recent,
        ]);
    }

    private function update($pdo, $id) {
        $body = adminBody();
        $this->requireUser($pdo, $id);

        $fields = [];
        $params = [];

        if (array_key_exists('name', $body)) {
            $name = trim((string) $body['name']);
            if ($name === '' || mb_strlen($name) > 255) {
                sendJson(['error' => 'invalid', 'message' => 'Tên không hợp lệ.', 'field' => 'name'], 400);
            }
            $fields[] = 'name = ?';
            $params[] = $name;
        }

        if (array_key_exists('email', $body)) {
            $email = trim((string) $body['email']);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
                sendJson(['error' => 'invalid', 'message' => 'Email không hợp lệ.', 'field' => 'email'], 400);
            }
            $dup = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1");
            $dup->execute([$email, $id]);
            if ($dup->fetch()) {
                sendJson(['error' => 'duplicate', 'message' => 'Email đã được dùng bởi tài khoản khác.', 'field' => 'email'], 409);
            }
            $fields[] = 'email = ?';
            $params[] = $email;
        }

        if (!$fields) {
            sendJson(['error' => 'invalid', 'message' => 'Không có trường nào để cập nhật.'], 400);
        }

        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $id;

        $before = $this->userRow($pdo, $id);
        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        adminAudit($pdo, 'admin.user.update', 'users', $id, $before, $this->userRow($pdo, $id));

        sendJson(['ok' => true, 'user' => $this->mapUser($this->userRow($pdo, $id))]);
    }

    private function suspend($pdo, $id) {
        $body = adminBody();
        $user = $this->requireUser($pdo, $id);
        $reason = mb_substr(trim((string) ($body['reason'] ?? '')), 0, 500);

        $stmt = $pdo->prepare(
            "UPDATE users
                SET status = 'suspended', suspended_at = CURRENT_TIMESTAMP,
                    suspended_reason = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?"
        );
        $stmt->execute([$reason, $id]);

        // Thu hồi mọi phiên đang hoạt động.
        $pdo->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$id]);

        adminAudit($pdo, 'admin.user.suspend', 'users', $id,
            ['status' => $user['status']],
            ['status' => 'suspended', 'reason' => $reason]);

        sendJson(['ok' => true, 'status' => 'suspended']);
    }

    private function unsuspend($pdo, $id) {
        $user = $this->requireUser($pdo, $id);

        $stmt = $pdo->prepare(
            "UPDATE users
                SET status = 'active', suspended_at = NULL, suspended_reason = '',
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = ?"
        );
        $stmt->execute([$id]);

        adminAudit($pdo, 'admin.user.unsuspend', 'users', $id,
            ['status' => $user['status']],
            ['status' => 'active']);

        sendJson(['ok' => true, 'status' => 'active']);
    }

    private function destroy($pdo, $id) {
        $user = $this->requireUser($pdo, $id);

        $stmt = $pdo->prepare(
            "UPDATE users
                SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted',
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = ?"
        );
        $stmt->execute([$id]);
        $pdo->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$id]);

        adminAudit($pdo, 'admin.user.delete', 'users', $id,
            ['email' => $user['email'], 'status' => $user['status']],
            ['status' => 'deleted']);

        sendJson(['ok' => true, 'deleted' => true]);
    }

    private function restore($pdo, $id) {
        $user = $this->requireUser($pdo, $id, true);

        $stmt = $pdo->prepare(
            "UPDATE users
                SET deleted_at = NULL, status = 'active', updated_at = CURRENT_TIMESTAMP
              WHERE id = ?"
        );
        $stmt->execute([$id]);

        adminAudit($pdo, 'admin.user.restore', 'users', $id,
            ['status' => 'deleted'],
            ['status' => 'active']);

        sendJson(['ok' => true, 'status' => 'active']);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function scalar($pdo, $sql, array $params) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    private function userRow($pdo, $id) {
        $stmt = $pdo->prepare(
            "SELECT id, name, email, avatar, status, created_at,
                    suspended_at, suspended_reason, deleted_at
               FROM users WHERE id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    private function requireUser($pdo, $id, $allowDeleted = false) {
        $user = $this->userRow($pdo, $id);
        if (!$user) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy người dùng.'], 404);
        }
        if (!$allowDeleted && !empty($user['deleted_at'])) {
            sendJson(['error' => 'deleted', 'message' => 'Tài khoản đã bị xóa mềm. Khôi phục trước khi thao tác.'], 409);
        }
        return $user;
    }

    private function mapUser(array $r) {
        return [
            'id'              => (int) $r['id'],
            'name'            => $r['name'],
            'email'           => $r['email'],
            'avatar'          => $r['avatar'] ?? '',
            'status'          => $r['status'] ?? 'active',
            'createdAt'       => $r['created_at'] ?? null,
            'suspendedAt'     => $r['suspended_at'] ?? null,
            'suspendedReason' => $r['suspended_reason'] ?? '',
            'deletedAt'       => $r['deleted_at'] ?? null,
            'scanCount'       => isset($r['scan_count']) ? (int) $r['scan_count'] : 0,
            'lastScanAt'      => $r['last_scan_at'] ?? null,
        ];
    }
}
