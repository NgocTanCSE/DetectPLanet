<?php
/**
 * AgriScan AI — Báo cáo cộng đồng (GĐ4).
 *
 *   POST /reports                — gửi báo cáo dịch (tối đa 3/ngày/user)
 *   GET  /reports?province=&days= — danh sách báo cáo gần đây (ẩn danh)
 *   POST /reports/{id}/confirm    — "Tôi cũng thấy" (xác nhận chéo)
 *
 * Nguyên tắc riêng tư: response KHÔNG trả user_id, email hay tên. Chỉ trả
 * `mine` để client biết báo cáo nào của chính mình.
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/provinces.php';

class ReportController {
    private const DAILY_LIMIT = 3;
    private const VERIFY_VOTES = 2;

    public function handle($method, $target) {
        global $pdo;
        $pdo = requireDb();
        ensureDbSchema($pdo);

        $uid = getUserIdFromToken();
        if ($uid === null) {
            sendJson(['error' => 'unauthorized', 'message' => 'Vui lòng đăng nhập.'], 401);
        }

        if ($method === 'POST' && $target === 'reports') {
            $this->create($uid);
            return;
        }
        if ($method === 'GET' && $target === 'reports') {
            $this->listReports($uid);
            return;
        }
        if ($method === 'POST' && preg_match('#^reports/([A-Za-z0-9_]+)/confirm$#', $target, $m)) {
            $this->confirm($uid, $m[1]);
            return;
        }
        if ($method === 'DELETE' && preg_match('#^reports/([A-Za-z0-9_]+)$#', $target, $m)) {
            $this->deleteOwn($uid, $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function create($uid) {
        global $pdo;
        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        $label = trim((string) ($body['disease_label'] ?? ''));
        if (mb_strlen($label) < 3 || mb_strlen($label) > 120) {
            sendJson([
                'error'   => 'invalid disease_label',
                'message' => 'Tên bệnh/dịch hại cần từ 3 đến 120 ký tự.',
            ], 400);
        }

        // Giới hạn 3 báo cáo/ngày/user — chống spam.
        $stmt = $pdo->prepare(
            "SELECT count(*) FROM disease_reports
              WHERE user_id = ? AND created_at >= CURRENT_DATE"
        );
        $stmt->execute([$uid]);
        if ((int) $stmt->fetchColumn() >= self::DAILY_LIMIT) {
            sendJson([
                'error'   => 'rate limited',
                'message' => 'Bạn đã gửi 3 báo cáo hôm nay. Vui lòng thử lại ngày mai.',
            ], 429);
        }

        // Cây trồng: nhận crop_id hoặc slug, không hợp lệ thì 'other'.
        $cropId = isset($body['crop_id']) ? (int) $body['crop_id'] : 0;
        $cropSlug = trim((string) ($body['crop'] ?? ''));
        $crop = null;
        if ($cropId > 0) {
            $stmt = $pdo->prepare("SELECT id, slug FROM crops WHERE id = ? LIMIT 1");
            $stmt->execute([$cropId]);
            $crop = $stmt->fetch() ?: null;
        }
        if (!$crop && $cropSlug !== '') {
            $stmt = $pdo->prepare("SELECT id, slug FROM crops WHERE slug = ? LIMIT 1");
            $stmt->execute([$cropSlug]);
            $crop = $stmt->fetch() ?: null;
        }
        if (!$crop) {
            $stmt = $pdo->prepare("SELECT id, slug FROM crops WHERE slug = 'other' LIMIT 1");
            $stmt->execute();
            $crop = $stmt->fetch() ?: null;
        }
        if (!$crop) {
            sendJson(['error' => 'crop not found'], 400);
        }

        // Tỉnh: mặc định lấy từ hồ sơ người dùng.
        $province = trim((string) ($body['province'] ?? ''));
        if ($province === '') {
            $stmt = $pdo->prepare("SELECT province FROM user_profiles WHERE user_id = ? LIMIT 1");
            $stmt->execute([$uid]);
            $row = $stmt->fetch();
            $province = $row ? (string) $row['province'] : '';
        }
        if ($province !== '' && !isVnProvince($province)) {
            sendJson([
                'error'   => 'invalid province',
                'message' => 'Tỉnh/thành không hợp lệ.',
            ], 400);
        }
        if ($province === '') {
            sendJson([
                'error'   => 'missing province',
                'message' => 'Vui lòng chọn tỉnh/thành trước khi báo dịch.',
            ], 400);
        }

        $ward = mb_substr(trim((string) ($body['ward'] ?? '')), 0, 120);
        $note = mb_substr(trim((string) ($body['note'] ?? '')), 0, 1000);
        $imageUrl = trim((string) ($body['image_url'] ?? ''));
        if ($imageUrl !== '' && !isSafeImageUrl($imageUrl)) {
            $imageUrl = '';
        }

        $lat = isset($body['lat']) && is_numeric($body['lat']) ? (float) $body['lat'] : null;
        $lon = isset($body['lon']) && is_numeric($body['lon']) ? (float) $body['lon'] : null;
        if ($lat !== null && ($lat < -90 || $lat > 90)) $lat = null;
        if ($lon !== null && ($lon < -180 || $lon > 180)) $lon = null;

        $id = 'rep_' . bin2hex(random_bytes(8));

        $pdo->prepare(
            "INSERT INTO disease_reports
               (id, user_id, crop_id, crop_slug, disease_label, province, ward,
                note, image_url, lat, lon, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
        )->execute([
            $id,
            $uid,
            (int) $crop['id'],
            $crop['slug'],
            $label,
            $province,
            $ward,
            $note,
            mb_substr($imageUrl, 0, 500),
            $lat,
            $lon,
        ]);

        sendJson([
            'ok'           => true,
            'id'           => $id,
            'status'       => 'pending',
            'province'     => $province,
            'crop'         => $crop['slug'],
            'diseaseLabel' => $label,
        ], 201);
    }

    private function listReports($uid) {
        global $pdo;

        $days = (int) ($_GET['days'] ?? 30);
        $days = max(1, min(90, $days));
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));

        $province = trim((string) ($_GET['province'] ?? ''));
        if ($province !== '' && !isVnProvince($province)) {
            sendJson(['error' => 'invalid province'], 400);
        }

        $sql = "SELECT r.id, r.crop_slug, r.disease_label, r.province, r.ward, r.note,
                       r.image_url, r.status, r.created_at, r.user_id,
                       c.label AS crop_label, c.icon,
                       (SELECT count(*) FROM disease_report_votes v WHERE v.report_id = r.id) AS votes,
                       EXISTS (SELECT 1 FROM disease_report_votes v
                                WHERE v.report_id = r.id AND v.user_id = ?) AS voted
                  FROM disease_reports r
                  LEFT JOIN crops c ON c.id = r.crop_id
                 WHERE r.status <> 'rejected'
                   AND r.created_at >= ?";
        $cutoff = date('Y-m-d H:i:s', strtotime('-' . $days . ' days'));
        $params = [$uid, $cutoff];

        if ($province !== '') {
            $sql .= " AND r.province = ?";
            $params[] = $province;
        }

        $sql .= " ORDER BY r.created_at DESC LIMIT " . $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $items = array_map(function ($r) use ($uid) {
            $mine = ((int) $r['user_id'] === (int) $uid);
            return [
                'id'           => $r['id'],
                'crop'         => $r['crop_slug'],
                'cropLabel'    => $r['crop_label'] ?: 'Cây trồng',
                'cropIcon'     => $r['icon'] ?: 'eco',
                'diseaseLabel' => $r['disease_label'],
                'province'     => $r['province'],
                'ward'         => $r['ward'],
                'note'         => $r['note'],
                'imageUrl'     => $r['image_url'],
                'status'       => $r['status'],
                'createdAt'    => $r['created_at'],
                'votes'        => (int) $r['votes'],
                'mine'         => $mine,
                'canConfirm'   => !$mine && !((bool) $r['voted']),
            ];
        }, $stmt->fetchAll());

        sendJson(['reports' => $items, 'days' => $days, 'province' => $province]);
    }

    /**
     * Người dùng xoá báo cáo của chính mình (quyền xoá dữ liệu cá nhân).
     * Báo cáo của người khác → 403, không tiết lộ có tồn tại hay không.
     */
    private function deleteOwn($uid, $reportId) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT user_id FROM disease_reports WHERE id = ? LIMIT 1");
        $stmt->execute([$reportId]);
        $owner = $stmt->fetchColumn();
        if ($owner === false) {
            sendJson(['error' => 'not found'], 404);
        }
        if ((int) $owner !== (int) $uid) {
            sendJson([
                'error'   => 'forbidden',
                'message' => 'Bạn chỉ xoá được báo cáo của mình.',
            ], 403);
        }
        $pdo->prepare("DELETE FROM disease_reports WHERE id = ?")->execute([$reportId]);
        sendJson(['ok' => true]);
    }

    private function confirm($uid, $reportId) {
        global $pdo;

        $stmt = $pdo->prepare("SELECT id, user_id, status FROM disease_reports WHERE id = ? LIMIT 1");
        $stmt->execute([$reportId]);
        $report = $stmt->fetch();
        if (!$report) {
            sendJson(['error' => 'not found', 'message' => 'Không có báo cáo này.'], 404);
        }
        if ((int) $report['user_id'] === (int) $uid) {
            sendJson([
                'error'   => 'own report',
                'message' => 'Bạn không thể tự xác nhận báo cáo của mình.',
            ], 400);
        }
        if ($report['status'] === 'rejected') {
            sendJson(['error' => 'rejected report'], 400);
        }

        $pdo->prepare(
            "INSERT INTO disease_report_votes (report_id, user_id)
             VALUES (?, ?) ON CONFLICT DO NOTHING"
        )->execute([$reportId, $uid]);

        $stmt = $pdo->prepare("SELECT count(*) FROM disease_report_votes WHERE report_id = ?");
        $stmt->execute([$reportId]);
        $votes = (int) $stmt->fetchColumn();

        // Đủ 2 người khác xác nhận → đánh dấu đã kiểm chứng.
        if ($votes >= self::VERIFY_VOTES && $report['status'] === 'pending') {
            $pdo->prepare(
                "UPDATE disease_reports SET status = 'verified' WHERE id = ? AND status = 'pending'"
            )->execute([$reportId]);
        }

        $stmt = $pdo->prepare("SELECT status FROM disease_reports WHERE id = ?");
        $stmt->execute([$reportId]);

        sendJson([
            'ok'     => true,
            'votes'  => $votes,
            'status' => $stmt->fetchColumn(),
        ]);
    }
}
