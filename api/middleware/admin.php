<?php
/**
 * AgriScan AI — Admin middleware.
 *
 * Dùng chung cho mọi route /admin/*:
 *   requireAdmin()   — kiểm tra header X-Admin-Token (ADMIN_TOKEN rỗng = tắt route)
 *   adminAudit()     — ghi audit_log cho thao tác ghi
 *   adminBody()      — đọc JSON body
 *   adminPagination()— chuẩn hoá page/per_page
 *   adminList()      — response danh sách thống nhất
 *
 * Không có đăng nhập admin riêng: app admin gửi token từ .env. Token nằm trong
 * bundle frontend nên chỉ phù hợp chạy nội bộ/LAN.
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';

/**
 * Chặn request nếu thiếu/sai token. Trả về PDO đã sẵn sàng.
 */
function requireAdmin() {
    global $pdo;
    $pdo = requireDb();

    $token = (string) (getenv('ADMIN_TOKEN') ?: '');
    if ($token === '') {
        sendJson(['error' => 'not found', 'message' => 'ADMIN_TOKEN chưa cấu hình — route admin đang tắt.'], 404);
    }
    $given = (string) ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
    if ($given === '' || !hash_equals($token, $given)) {
        sendJson(['error' => 'unauthorized', 'message' => 'Sai hoặc thiếu X-Admin-Token.'], 401);
    }

    ensureDbSchema($pdo);
    return $pdo;
}

/**
 * Đọc JSON body (trả [] nếu rỗng/sai định dạng).
 */
function adminBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Chuẩn hoá phân trang: ?page=1&per_page=20 (tối đa 100).
 */
function adminPagination($defaultPerPage = 20) {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = (int) ($_GET['per_page'] ?? $defaultPerPage);
    $perPage = min(100, max(1, $perPage));
    return [$page, $perPage, ($page - 1) * $perPage];
}

/**
 * Response danh sách thống nhất.
 */
function adminList(array $items, $page, $perPage, $total) {
    sendJson([
        'items'       => $items,
        'page'        => (int) $page,
        'per_page'    => (int) $perPage,
        'total'       => (int) $total,
        'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0,
    ]);
}

/**
 * Ghi audit_log. `userId` để NULL vì thao tác admin không gắn tài khoản.
 */
function adminAudit($pdo, $action, $table, $targetId, $oldValues = null, $newValues = null) {
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO audit_log (user_id, action, target_table, target_id, old_values, new_values)
             VALUES (NULL, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            mb_substr((string) $action, 0, 32),
            mb_substr((string) $table, 0, 32),
            mb_substr((string) $targetId, 0, 64),
            $oldValues === null ? null : json_encode($oldValues, JSON_UNESCAPED_UNICODE),
            $newValues === null ? null : json_encode($newValues, JSON_UNESCAPED_UNICODE),
        ]);
    } catch (Throwable $e) {
        // Audit không được làm hỏng thao tác chính.
        error_log('adminAudit failed: ' . $e->getMessage());
    }
}

/**
 * Sinh ID ngắn cho bản ghi mới (32 hex ký tự).
 */
function adminNewId() {
    return bin2hex(random_bytes(16));
}

/**
 * Trả 400 và dừng khi thiếu trường bắt buộc.
 */
function adminRequireFields(array $body, array $fields) {
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($body[$f]) || trim((string) $body[$f]) === '') {
            $missing[] = $f;
        }
    }
    if ($missing) {
        sendJson([
            'error'   => 'invalid',
            'message' => 'Thiếu trường bắt buộc: ' . implode(', ', $missing),
            'fields'  => $missing,
        ], 400);
    }
}

/**
 * Chặn giá trị ngoài enum.
 */
function adminRequireEnum($value, array $allowed, $field) {
    if (!in_array($value, $allowed, true)) {
        sendJson([
            'error'   => 'invalid',
            'message' => "Giá trị không hợp lệ cho $field.",
            'field'   => $field,
        ], 400);
    }
    return $value;
}
