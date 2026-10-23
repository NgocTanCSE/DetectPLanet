<?php
/**
 * AgriScan AI — Admin: quản lý cảnh báo dịch bệnh (crop_disease_alerts).
 *
 *   GET    /admin/alerts?q&source&province&crop&active&page&per_page
 *   GET    /admin/alerts/meta            danh mục cây trồng + tỉnh + nguồn
 *   POST   /admin/alerts                 {crop_id, disease_name, disease_label, severity, ...}
 *   PATCH  /admin/alerts/{id}
 *   DELETE /admin/alerts/{id}
 *   POST   /admin/alerts/{id}/toggle     bật/tắt hiệu lực
 */

require_once __DIR__ . '/../middleware/admin.php';
require_once __DIR__ . '/../services/provinces.php';

class AdminAlertsController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/alerts') {
            $this->index($pdo);
            return;
        }

        if ($method === 'GET' && $target === 'admin/alerts/meta') {
            $this->meta($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/alerts') {
            $this->create($pdo);
            return;
        }

        if ($method === 'PATCH' && preg_match('#^admin/alerts/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->update($pdo, $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/alerts/([A-Za-z0-9_\-]+)/toggle$#', $target, $m)) {
            $this->toggle($pdo, $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/alerts/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->destroy($pdo, $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function index($pdo) {
        [$page, $perPage, $offset] = adminPagination(20);

        $where = [];
        $params = [];

        $q = trim((string) ($_GET['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(a.disease_label ILIKE ? OR a.disease_name ILIKE ? OR a.description ILIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        $source = trim((string) ($_GET['source'] ?? ''));
        if ($source !== '') {
            adminRequireEnum($source, ['manual', 'weather', 'official', 'community'], 'source');
            $where[] = 'a.source = ?';
            $params[] = $source;
        }

        $province = trim((string) ($_GET['province'] ?? ''));
        if ($province !== '') {
            $where[] = 'a.province = ?';
            $params[] = $province;
        }

        $crop = (int) ($_GET['crop'] ?? 0);
        if ($crop > 0) {
            $where[] = 'a.crop_id = ?';
            $params[] = $crop;
        }

        if (isset($_GET['active']) && $_GET['active'] !== '') {
            $where[] = 'a.is_active = ?';
            $params[] = (int) (bool) $_GET['active'];
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM crop_disease_alerts a $whereSql");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT a.*, c.label AS crop_label, c.slug AS crop_slug
               FROM crop_disease_alerts a
               LEFT JOIN crops c ON c.id = a.crop_id
               $whereSql
              ORDER BY a.is_active DESC, a.created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);

        adminList(array_map([$this, 'mapAlert'], $stmt->fetchAll()), $page, $perPage, $total);
    }

    private function meta($pdo) {
        $crops = $pdo->query("SELECT id, slug, label FROM crops ORDER BY label")->fetchAll();
        sendJson([
            'crops'     => array_map(function ($c) {
                return ['id' => (int) $c['id'], 'slug' => $c['slug'], 'label' => $c['label']];
            }, $crops),
            'provinces' => vnProvinces(),
            'sources'   => ['manual', 'weather', 'official', 'community'],
            'severities'=> ['healthy', 'warning', 'danger'],
        ]);
    }

    private function create($pdo) {
        $body = adminBody();
        adminRequireFields($body, ['disease_name', 'disease_label']);

        $cropId = $this->resolveCropId($pdo, $body);
        $severity = adminRequireEnum((string) ($body['severity'] ?? 'warning'), ['healthy', 'warning', 'danger'], 'severity');
        $source = adminRequireEnum((string) ($body['source'] ?? 'manual'), ['manual', 'weather', 'official', 'community'], 'source');

        $id = 'alert_' . substr(adminNewId(), 0, 12);
        $stmt = $pdo->prepare(
            "INSERT INTO crop_disease_alerts
                (id, crop_id, disease_name, disease_label, severity, season_months,
                 description, recommendation, is_active, start_date, end_date,
                 province, source, risk_score, valid_from, valid_to, source_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            $cropId,
            mb_substr(trim((string) $body['disease_name']), 0, 128),
            mb_substr(trim((string) $body['disease_label']), 0, 128),
            $severity,
            mb_substr(trim((string) ($body['season_months'] ?? '')), 0, 64),
            (string) ($body['description'] ?? ''),
            (string) ($body['recommendation'] ?? ''),
            !empty($body['is_active']) ? 1 : 0,
            $this->dateOrNull($body['start_date'] ?? null),
            $this->dateOrNull($body['end_date'] ?? null),
            mb_substr(trim((string) ($body['province'] ?? '')), 0, 64),
            $source,
            max(0, min(100, (int) ($body['risk_score'] ?? 0))),
            $this->dateOrNull($body['valid_from'] ?? null),
            $this->dateOrNull($body['valid_to'] ?? null),
            mb_substr(trim((string) ($body['source_url'] ?? '')), 0, 512),
        ]);

        adminAudit($pdo, 'admin.alert.create', 'crop_disease_alerts', $id, null, [
            'disease'  => $body['disease_label'],
            'province' => $body['province'] ?? '',
            'severity' => $severity,
        ]);

        sendJson(['ok' => true, 'id' => $id], 201);
    }

    private function update($pdo, $id) {
        $body = adminBody();
        $alert = $this->requireAlert($pdo, $id);

        $fields = [];
        $params = [];

        $textFields = [
            'disease_name'   => 128,
            'disease_label'  => 128,
            'season_months'  => 64,
            'province'       => 64,
            'source_url'     => 512,
        ];
        foreach ($textFields as $field => $max) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $params[] = mb_substr(trim((string) $body[$field]), 0, $max);
            }
        }

        foreach (['description', 'recommendation'] as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $params[] = (string) $body[$field];
            }
        }

        if (array_key_exists('severity', $body)) {
            $fields[] = 'severity = ?';
            $params[] = adminRequireEnum((string) $body['severity'], ['healthy', 'warning', 'danger'], 'severity');
        }
        if (array_key_exists('source', $body)) {
            $fields[] = 'source = ?';
            $params[] = adminRequireEnum((string) $body['source'], ['manual', 'weather', 'official', 'community'], 'source');
        }
        if (array_key_exists('crop_id', $body) || array_key_exists('crop', $body)) {
            $fields[] = 'crop_id = ?';
            $params[] = $this->resolveCropId($pdo, $body);
        }
        if (array_key_exists('risk_score', $body)) {
            $fields[] = 'risk_score = ?';
            $params[] = max(0, min(100, (int) $body['risk_score']));
        }
        if (array_key_exists('is_active', $body)) {
            $fields[] = 'is_active = ?';
            $params[] = !empty($body['is_active']) ? 1 : 0;
        }
        foreach (['start_date', 'end_date', 'valid_from', 'valid_to'] as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $params[] = $this->dateOrNull($body[$field]);
            }
        }

        if (!$fields) {
            sendJson(['error' => 'invalid', 'message' => 'Không có trường nào để cập nhật.'], 400);
        }

        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE crop_disease_alerts SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        adminAudit($pdo, 'admin.alert.update', 'crop_disease_alerts', $id, $alert, $body);
        sendJson(['ok' => true]);
    }

    private function toggle($pdo, $id) {
        $alert = $this->requireAlert($pdo, $id);
        $next = (int) $alert['is_active'] === 1 ? 0 : 1;

        $stmt = $pdo->prepare(
            "UPDATE crop_disease_alerts SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        );
        $stmt->execute([$next, $id]);

        adminAudit($pdo, 'admin.alert.toggle', 'crop_disease_alerts', $id,
            ['is_active' => (int) $alert['is_active']],
            ['is_active' => $next]);

        sendJson(['ok' => true, 'isActive' => $next === 1]);
    }

    private function destroy($pdo, $id) {
        $alert = $this->requireAlert($pdo, $id);
        $pdo->prepare("DELETE FROM crop_disease_alerts WHERE id = ?")->execute([$id]);
        adminAudit($pdo, 'admin.alert.delete', 'crop_disease_alerts', $id, $alert, null);
        sendJson(['ok' => true, 'deleted' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function requireAlert($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM crop_disease_alerts WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy cảnh báo.'], 404);
        }
        return $row;
    }

    /** Nhận crop_id (số) hoặc crop (slug). */
    private function resolveCropId($pdo, array $body) {
        $cropId = (int) ($body['crop_id'] ?? 0);
        if ($cropId > 0) {
            $stmt = $pdo->prepare("SELECT id FROM crops WHERE id = ?");
            $stmt->execute([$cropId]);
            if ($stmt->fetch()) return $cropId;
        }

        $slug = trim((string) ($body['crop'] ?? ''));
        if ($slug !== '') {
            $stmt = $pdo->prepare("SELECT id FROM crops WHERE slug = ?");
            $stmt->execute([$slug]);
            $row = $stmt->fetch();
            if ($row) return (int) $row['id'];
        }

        sendJson(['error' => 'invalid', 'message' => 'Chọn cây trồng hợp lệ (crop_id hoặc crop).', 'field' => 'crop_id'], 400);
    }

    private function dateOrNull($value) {
        $value = trim((string) $value);
        if ($value === '') return null;
        $ts = strtotime($value);
        return $ts === false ? null : date('Y-m-d', $ts);
    }

    private function mapAlert(array $a) {
        return [
            'id'             => $a['id'],
            'cropId'         => (int) $a['crop_id'],
            'cropLabel'      => $a['crop_label'] ?? '',
            'cropSlug'       => $a['crop_slug'] ?? '',
            'diseaseName'    => $a['disease_name'],
            'diseaseLabel'   => $a['disease_label'],
            'severity'       => $a['severity'],
            'seasonMonths'   => $a['season_months'],
            'description'    => $a['description'],
            'recommendation' => $a['recommendation'],
            'isActive'       => (int) $a['is_active'] === 1,
            'startDate'      => $a['start_date'],
            'endDate'        => $a['end_date'],
            'province'       => $a['province'],
            'source'         => $a['source'],
            'riskScore'      => (int) $a['risk_score'],
            'validFrom'      => $a['valid_from'],
            'validTo'        => $a['valid_to'],
            'sourceUrl'      => $a['source_url'],
            'createdAt'      => $a['created_at'],
            'updatedAt'      => $a['updated_at'],
        ];
    }
}
