<?php
/**
 * AgriScan AI — Alert controller.
 * GET /alerts — danh sách cảnh báo cho cây trồng người dùng đang theo dõi
 * GET /user-crop-preferences — danh sách cây trồng người dùng đã chọn
 * POST /user-crop-preferences — chọn/bỏ chọn cây trồng quan tâm
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/provinces.php';
require_once __DIR__ . '/../services/schema.php';

class AlertController {
    /**
     * Cột/bảng mới được thêm tại runtime để DB cũ không cần migrate tay.
     * Toàn bộ câu lệnh idempotent — xem api/services/schema.php.
     */
    private function ensureSchema() {
        global $pdo;
        ensureDbSchema($pdo);
    }

    public function handle($method, $target) {
        global $pdo;
        $pdo = requireDb();
        $this->ensureSchema();
        $uid = getUserIdFromToken();

        if ($method === 'GET' && $target === 'alerts') {
            $this->handleGetAlerts($uid);
        } elseif ($method === 'GET' && $target === 'user-crop-preferences') {
            $this->handleGetPreferences($uid);
        } elseif ($method === 'POST' && $target === 'user-crop-preferences') {
            $this->handleSetPreference($uid);
        } elseif ($method === 'GET' && $target === 'user-location') {
            $this->handleGetLocation($uid);
        } elseif ($method === 'POST' && $target === 'user-location') {
            $this->handleSetLocation($uid);
        } else {
            sendJson(['error' => 'not found'], 404);
        }
    }

    private function handleGetLocation($uid) {
        global $pdo;
        $province = '';
        if ($uid !== null) {
            $stmt = $pdo->prepare("SELECT province FROM user_profiles WHERE user_id = ? LIMIT 1");
            $stmt->execute([$uid]);
            $row = $stmt->fetch();
            $province = $row ? (string) $row['province'] : '';
        }
        sendJson([
            'province'  => $province,
            'provinces' => vnProvinces(),
        ]);
    }

    private function handleSetLocation($uid) {
        global $pdo;
        if ($uid === null) {
            sendJson(['error' => 'No user', 'message' => 'Vui lòng đăng nhập.'], 401);
            return;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $province = trim((string) ($body['province'] ?? ''));

        if ($province !== '' && !isVnProvince($province)) {
            sendJson([
                'error'   => 'Invalid province',
                'message' => 'Tỉnh/thành không hợp lệ.',
            ], 400);
            return;
        }

        $pdo->prepare(
            "INSERT INTO user_profiles (user_id, province, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE
             SET province = EXCLUDED.province, updated_at = CURRENT_TIMESTAMP"
        )->execute([$uid, $province]);

        sendJson(['ok' => true, 'province' => $province]);
    }

    private function handleGetAlerts($uid) {
        global $pdo;
        $this->ensureSchema();

        // Khu vực người dùng đã chọn (rỗng = chưa chọn → chỉ nhận cảnh báo toàn quốc).
        $province = '';
        if ($uid !== null) {
            $locStmt = $pdo->prepare("SELECT province FROM user_profiles WHERE user_id = ? LIMIT 1");
            $locStmt->execute([$uid]);
            $locRow = $locStmt->fetch();
            $province = $locRow ? (string) $locRow['province'] : '';
        }
        // Lấy danh sách crop_id người dùng đang theo dõi
        $stmt = $pdo->prepare("SELECT crop_id FROM user_crop_preferences WHERE user_id=? AND is_active=1");
        $stmt->execute([$uid]);
        $prefs = $stmt->fetchAll();

        if (empty($prefs)) {
            sendJson([
            'alerts'   => [],
            'province' => $province,
            'message'  => 'Bạn chưa chọn cây trồng nào để theo dõi.',
        ]);
            return;
        }

        $cropIds = array_map(fn($r) => $r['crop_id'], $prefs);
        $placeholders = implode(',', array_fill(0, count($cropIds), '?'));

        $nowMonth = (int) date('n'); // tháng hiện tại 1-12

        $stmt = $pdo->prepare(
            "SELECT a.id, a.crop_id, c.slug, c.name AS crop_name, c.label AS crop_label, c.icon,
                    a.disease_name, a.disease_label, a.severity, a.season_months, a.province,
                    a.description, a.recommendation, a.is_active, a.start_date, a.end_date,
                    a.source, a.risk_score, a.valid_from, a.valid_to, a.source_url
             FROM crop_disease_alerts a
             JOIN crops c ON c.id = a.crop_id
             WHERE a.is_active = 1
               AND a.crop_id IN ($placeholders)
               AND (
                   a.season_months = ''
                   OR a.season_months LIKE '%' || ? || '%'
               )
               AND (a.province = '' OR a.province = ?)
               AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
             ORDER BY CASE WHEN a.source IN ('official', 'manual') THEN 0
                           WHEN a.source = 'community' THEN 1
                           ELSE 2 END,
                      (a.province = '') ASC,
                      a.severity DESC,
                      a.risk_score DESC,
                      a.crop_id"
        );
        $stmt->execute(array_merge($cropIds, [(string) $nowMonth, $province]));
        $alerts = $stmt->fetchAll();

        sendJson(['province' => $province, 'alerts' => array_map(function ($a) {
            return [
                'id'             => $a['id'],
                'crop_id'        => $a['crop_id'],
                'crop'           => $a['slug'],
                'cropLabel'      => $a['crop_label'],
                'cropIcon'       => $a['icon'],
                'diseaseName'    => $a['disease_name'],
                'diseaseLabel'   => $a['disease_label'],
                'severity'       => $a['severity'],
                'seasonMonths'   => $a['season_months'],
                'description'    => $a['description'],
                'recommendation' => $a['recommendation'],
                'province'       => $a['province'] ?? '',
                'source'         => $a['source'] ?? 'manual',
                'riskScore'      => (int) ($a['risk_score'] ?? 0),
                'validFrom'      => $a['valid_from'],
                'validTo'        => $a['valid_to'],
                'sourceUrl'      => $a['source_url'] ?? '',
                'isActive'       => (int) $a['is_active'],
                'startDate'      => $a['start_date'],
                'endDate'        => $a['end_date'],
            ];
        }, $alerts)]);
    }

    private function handleGetPreferences($uid) {
        global $pdo;
        // Return EVERY crop in the catalogue, with the user's flag (or 0 when
        // they never picked it). Previously this only returned rows that
        // already existed in user_crop_preferences, so a fresh account saw an
        // empty list with no way to opt in — the alert feature was unreachable.
        $stmt = $pdo->prepare(
            "SELECT c.id AS crop_id, c.slug, c.name, c.label, c.icon,
                    COALESCE(p.is_active, 0) AS is_active
             FROM crops c
             LEFT JOIN user_crop_preferences p
                    ON p.crop_id = c.id AND p.user_id = ?
             WHERE c.slug <> 'other'
             ORDER BY c.label"
        );
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll();

        sendJson(['preferences' => array_map(function ($r) {
            return [
                'cropId'   => $r['crop_id'],
                'crop'     => $r['slug'],
                'name'     => $r['name'],
                'label'    => $r['label'],
                'icon'     => $r['icon'],
                'isActive' => (int) $r['is_active'],
            ];
        }, $rows)]);
    }

    private function handleSetPreference($uid) {
        global $pdo;
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $cropId = $body['crop_id'] ?? null;
        $isActive = $body['is_active'] ?? 1;

        if (!$cropId) {
            sendJson(['error' => 'missing crop_id'], 400);
            return;
        }

        // Kiểm tra crop tồn tại
        $cropStmt = $pdo->prepare("SELECT id FROM crops WHERE id=?");
        $cropStmt->execute([$cropId]);
        $crop = $cropStmt->fetch();
        if (!$crop) {
            sendJson(['error' => 'crop not found'], 404);
            return;
        }

        $existingStmt = $pdo->prepare("SELECT 1 FROM user_crop_preferences WHERE user_id=? AND crop_id=?");
        $existingStmt->execute([$uid, $cropId]);
        $existing = $existingStmt->fetch();

        if ($existing) {
            $pdo->prepare("UPDATE user_crop_preferences SET is_active=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND crop_id=?")
                ->execute([$isActive, $uid, $cropId]);
        } else {
            $pdo->prepare("INSERT INTO user_crop_preferences (user_id, crop_id, is_active) VALUES (?, ?, ?)")
                ->execute([$uid, $cropId, $isActive]);
        }

        sendJson(['ok' => true, 'crop_id' => $cropId, 'is_active' => (int) $isActive]);
    }
}
