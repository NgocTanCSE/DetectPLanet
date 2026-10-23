<?php
/**
 * AgriScan AI — Admin controller (duyệt tin chính thức — GĐ3).
 *
 * Tất cả route yêu cầu header X-Admin-Token = ADMIN_TOKEN.
 * ADMIN_TOKEN rỗng → route trả 404 (tắt hoàn toàn).
 *
 *   GET  /admin/ingest?status=pending&limit=50
 *   POST /admin/ingest/{id}/approve
 *   POST /admin/ingest/{id}/reject
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/official_feed.php';
require_once __DIR__ . '/../middleware/admin.php';

class AdminController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/ingest') {
            $this->listIngest($pdo);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/ingest/(\d+)/(approve|reject)$#', $target, $m)) {
            $this->reviewIngest($pdo, (int) $m[1], $m[2]);
            return;
        }

        if ($method === 'GET' && $target === 'admin/reports') {
            $this->listReports($pdo);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/reports/([A-Za-z0-9_]+)/(verify|reject)$#', $target, $m)) {
            $this->reviewReport($pdo, $m[1], $m[2]);
            return;
        }

        if ($method === 'POST' && $target === 'admin/ingest/fetch') {
            $this->fetchByUrl($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/ingest') {
            $this->createManual($pdo);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    /**
     * Nhập tay một cảnh báo chính thức (khi cán bộ đọc công văn/website tỉnh).
     *
     * Body: { title, disease_label, province?, crop?, disease_name?, severity?,
     *         summary?, published_at?, source_url?, auto_publish? }
     */
    private function createManual($pdo) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        $title = trim((string) ($body['title'] ?? ''));
        $label = trim((string) ($body['disease_label'] ?? ''));
        if ($title === '' || $label === '') {
            sendJson(['error' => 'invalid', 'message' => 'Thiếu title hoặc disease_label.'], 400);
        }

        $province = trim((string) ($body['province'] ?? ''));
        if ($province !== '' && !isVnProvince($province)) {
            sendJson(['error' => 'invalid province', 'message' => 'Tỉnh/thành không hợp lệ.'], 400);
        }

        $crop = trim((string) ($body['crop'] ?? 'other')) ?: 'other';
        $stmt = $pdo->prepare("SELECT 1 FROM crops WHERE slug = ?");
        $stmt->execute([$crop]);
        if (!$stmt->fetchColumn()) $crop = 'other';

        $severity = trim((string) ($body['severity'] ?? 'warning'));
        if (!in_array($severity, ['warning', 'danger'], true)) $severity = 'warning';

        $published = trim((string) ($body['published_at'] ?? ''));
        if ($published === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $published)) {
            $published = date('Y-m-d');
        }

        $sourceUrl = trim((string) ($body['source_url'] ?? ''));
        if ($sourceUrl === '') {
            $sourceUrl = 'manual-entry:' . date('YmdHis');
        }

        $summary = trim((string) ($body['summary'] ?? ''));

        $insert = $pdo->prepare(
            "INSERT INTO official_ingest
               (source_url, title, published_at, province, crop_slug, disease_name,
                disease_label, severity, summary, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
             ON CONFLICT (source_url, disease_label, province) DO NOTHING
             RETURNING id"
        );
        $insert->execute([
            mb_substr($sourceUrl, 0, 500),
            mb_substr($title, 0, 500),
            $published,
            $province,
            $crop,
            trim((string) ($body['disease_name'] ?? '')),
            mb_substr($label, 0, 120),
            $severity,
            mb_substr($summary, 0, 2000),
        ]);
        $id = $insert->fetchColumn();
        $insert->closeCursor();

        if (!$id) {
            sendJson(['error' => 'duplicate', 'message' => 'Tin này đã tồn tại.'], 409);
        }

        $autoPublish = filter_var($body['auto_publish'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $alertId = null;
        if ($autoPublish) {
            $row = [
                'id'            => (int) $id,
                'source_url'    => $sourceUrl,
                'published_at'  => $published,
                'province'      => $province,
                'crop_slug'     => $crop,
                'disease_name'  => trim((string) ($body['disease_name'] ?? '')),
                'disease_label' => $label,
                'severity'      => $severity,
                'summary'       => $summary,
            ];
            $alertId = officialPublishIngest($pdo, $row);
        }

        sendJson([
            'ok'      => true,
            'id'      => (int) $id,
            'status'  => $alertId ? 'approved' : 'pending',
            'alertId' => $alertId,
        ], 201);
    }

    /**
     * Nhập từ URL: tải bài, bóc thực thể, lưu chờ duyệt.
     * Dùng khi cán bộ dán link công văn/tin của tỉnh.
     */
    private function fetchByUrl($pdo) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $url  = trim((string) ($body['url'] ?? ''));

        if ($url === '' || !preg_match('#^https?://#i', $url)) {
            sendJson(['error' => 'invalid url'], 400);
        }
        if (!isSafeImageUrl($url)) {
            sendJson([
                'error'   => 'blocked url',
                'message' => 'Chỉ nhận URL công khai (không phải địa chỉ nội bộ).',
            ], 400);
        }

        $html = officialHttpGet($url);
        if ($html === null) {
            sendJson(['error' => 'fetch failed', 'message' => 'Không tải được bài.'], 502);
        }

        $article = officialParseArticle($html, $url);
        $extract = officialExtract($article);

        if (empty($extract['pests']) || empty($extract['provinces'])) {
            sendJson([
                'error'   => 'not enough data',
                'message' => 'Không nhận ra tỉnh hoặc dịch hại. Hãy dùng nhập tay.',
                'parsed'  => [
                    'title'     => $article['title'],
                    'provinces' => $extract['provinces'],
                    'pests'     => $extract['pests'],
                ],
            ], 422);
        }

        $provinces = count($extract['provinces']) > 3 ? [''] : $extract['provinces'];
        $insert = $pdo->prepare(
            "INSERT INTO official_ingest
               (source_url, title, published_at, province, crop_slug, disease_name,
                disease_label, severity, summary, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
             ON CONFLICT (source_url, disease_label, province) DO NOTHING
             RETURNING id"
        );

        $created = [];
        foreach (array_slice($extract['pests'], 0, 3) as $pest) {
            foreach ($provinces as $province) {
                $insert->execute([
                    mb_substr($url, 0, 500),
                    mb_substr($article['title'], 0, 500),
                    $article['published_at'],
                    $province,
                    $pest['crop'],
                    $pest['name_en'],
                    $pest['label'],
                    $extract['severity'] ?: 'warning',
                    mb_substr($extract['summary'], 0, 2000),
                ]);
                $newId = $insert->fetchColumn();
                $insert->closeCursor();
                if ($newId) $created[] = (int) $newId;
            }
        }

        sendJson([
            'ok'        => true,
            'created'   => $created,
            'resolved'  => $extract['resolved'],
            'severity'  => $extract['severity'],
            'provinces' => $provinces,
            'pests'     => array_map(fn($p) => $p['label'], $extract['pests']),
        ], 201);
    }

    /**
     * Duyệt báo cáo cộng đồng: verify (tính hệ số 2 khi gom cụm) hoặc reject.
     */
    private function listReports($pdo) {
        $status = trim((string) ($_GET['status'] ?? 'pending'));
        $limit  = max(1, min(200, (int) ($_GET['limit'] ?? 50)));

        if ($status === '' || $status === 'all') {
            $stmt = $pdo->prepare(
                "SELECT r.*, c.label AS crop_label, u.email
                   FROM disease_reports r
                   LEFT JOIN crops c ON c.id = r.crop_id
                   LEFT JOIN users u ON u.id = r.user_id
                  ORDER BY r.created_at DESC LIMIT ?"
            );
            $stmt->execute([$limit]);
        } else {
            $stmt = $pdo->prepare(
                "SELECT r.*, c.label AS crop_label, u.email
                   FROM disease_reports r
                   LEFT JOIN crops c ON c.id = r.crop_id
                   LEFT JOIN users u ON u.id = r.user_id
                  WHERE r.status = ?
                  ORDER BY r.created_at DESC LIMIT ?"
            );
            $stmt->execute([$status, $limit]);
        }

        sendJson(['items' => array_map(function ($r) {
            return [
                'id'           => $r['id'],
                'userEmail'    => $r['email'],
                'crop'         => $r['crop_slug'],
                'cropLabel'    => $r['crop_label'],
                'diseaseLabel' => $r['disease_label'],
                'province'     => $r['province'],
                'ward'         => $r['ward'],
                'note'         => $r['note'],
                'status'       => $r['status'],
                'createdAt'    => $r['created_at'],
            ];
        }, $stmt->fetchAll())]);
    }

    private function reviewReport($pdo, $id, $action) {
        $stmt = $pdo->prepare("SELECT id FROM disease_reports WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        if (!$stmt->fetchColumn()) {
            sendJson(['error' => 'not found'], 404);
        }

        $status = $action === 'verify' ? 'verified' : 'rejected';
        $pdo->prepare("UPDATE disease_reports SET status = ? WHERE id = ?")->execute([$status, $id]);

        sendJson(['ok' => true, 'status' => $status]);
    }

    private function listIngest($pdo) {
        $status = trim((string) ($_GET['status'] ?? 'pending'));
        $limit  = max(1, min(200, (int) ($_GET['limit'] ?? 50)));

        if ($status === '' || $status === 'all') {
            $stmt = $pdo->prepare("SELECT * FROM official_ingest ORDER BY created_at DESC LIMIT ?");
            $stmt->execute([$limit]);
        } else {
            $stmt = $pdo->prepare(
                "SELECT * FROM official_ingest WHERE status = ? ORDER BY created_at DESC LIMIT ?"
            );
            $stmt->execute([$status, $limit]);
        }

        sendJson(['items' => array_map([$this, 'mapRow'], $stmt->fetchAll())]);
    }

    private function reviewIngest($pdo, $id, $action) {
        $stmt = $pdo->prepare("SELECT * FROM official_ingest WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'not found', 'message' => 'Không có tin này.'], 404);
        }

        if ($action === 'reject') {
            $pdo->prepare(
                "UPDATE official_ingest
                    SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
                  WHERE id = ?"
            )->execute([$id]);

            if (!empty($row['alert_id'])) {
                $pdo->prepare(
                    "UPDATE crop_disease_alerts
                        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?"
                )->execute([$row['alert_id']]);
            }

            sendJson(['ok' => true, 'status' => 'rejected']);
        }

        if ($row['status'] === 'approved' && !empty($row['alert_id'])) {
            sendJson(['ok' => true, 'status' => 'approved', 'alertId' => $row['alert_id']]);
        }

        $alertId = officialPublishIngest($pdo, $row);
        if (!$alertId) {
            sendJson([
                'error'   => 'publish failed',
                'message' => 'Không tạo được cảnh báo (thiếu cây trồng?).',
            ], 500);
        }

        sendJson(['ok' => true, 'status' => 'approved', 'alertId' => $alertId]);
    }

    private function mapRow($r) {
        return [
            'id'            => (int) $r['id'],
            'sourceUrl'     => $r['source_url'],
            'title'         => $r['title'],
            'publishedAt'   => $r['published_at'],
            'province'      => $r['province'],
            'crop'          => $r['crop_slug'],
            'diseaseName'   => $r['disease_name'],
            'diseaseLabel'  => $r['disease_label'],
            'severity'      => $r['severity'],
            'summary'       => $r['summary'],
            'status'        => $r['status'],
            'alertId'       => $r['alert_id'],
            'createdAt'     => $r['created_at'],
            'reviewedAt'    => $r['reviewed_at'],
        ];
    }
}
