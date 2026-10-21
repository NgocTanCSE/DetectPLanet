<?php
/**
 * AgriScan AI — Alert controller.
 * GET /alerts — danh sách cảnh báo cho cây trồng người dùng đang theo dõi
 * GET /user-crop-preferences — danh sách cây trồng người dùng đã chọn
 * POST /user-crop-preferences — chọn/bỏ chọn cây trồng quan tâm
 */

require_once __DIR__ . '/../services/database.php';

class AlertController {
    public function handle($method, $target) {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();

        if ($method === 'GET' && $target === 'alerts') {
            $this->handleGetAlerts($uid);
        } elseif ($method === 'GET' && $target === 'user-crop-preferences') {
            $this->handleGetPreferences($uid);
        } elseif ($method === 'POST' && $target === 'user-crop-preferences') {
            $this->handleSetPreference($uid);
        } else {
            sendJson(['error' => 'not found'], 404);
        }
    }

    private function handleGetAlerts($uid) {
        global $pdo;
        // Lấy danh sách crop_id người dùng đang theo dõi
        $prefs = $pdo->query(
            "SELECT crop_id FROM user_crop_preferences WHERE user_id=? AND is_active=1",
            [$uid]
        )->fetchAll();

        if (empty($prefs)) {
            sendJson(['alerts' => [], 'message' => 'Bạn chưa chọn cây trồng nào để theo dõi.']);
            return;
        }

        $cropIds = array_map(fn($r) => $r['crop_id'], $prefs);
        $placeholders = implode(',', array_fill(0, count($cropIds), '?'));

        $nowMonth = (int) date('n'); // tháng hiện tại 1-12

        $alerts = $pdo->query(
            "SELECT a.id, a.crop_id, c.slug, c.name AS crop_name, c.label AS crop_label, c.icon,
                    a.disease_name, a.disease_label, a.severity, a.season_months,
                    a.description, a.recommendation, a.is_active, a.start_date, a.end_date
             FROM crop_disease_alerts a
             JOIN crops c ON c.id = a.crop_id
             WHERE a.is_active = 1
               AND a.crop_id IN ($placeholders)
               AND (
                   a.season_months = ''
                   OR a.season_months LIKE '%' || ? || '%'
               )
             ORDER BY a.severity DESC, a.crop_id",
            array_merge($cropIds, [(string) $nowMonth])
        )->fetchAll();

        sendJson(['alerts' => array_map(function ($a) {
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
                'isActive'       => (int) $a['is_active'],
                'startDate'      => $a['start_date'],
                'endDate'        => $a['end_date'],
            ];
        }, $alerts)]);
    }

    private function handleGetPreferences($uid) {
        global $pdo;
        $rows = $pdo->query(
            "SELECT p.crop_id, c.slug, c.name, c.label, c.icon, p.is_active, p.created_at
             FROM user_crop_preferences p
             JOIN crops c ON c.id = p.crop_id
             WHERE p.user_id=?
             ORDER BY c.label",
            [$uid]
        )->fetchAll();

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
        $crop = $pdo->prepare("SELECT id FROM crops WHERE id=?")->execute([$cropId])->fetch();
        if (!$crop) {
            sendJson(['error' => 'crop not found'], 404);
            return;
        }

        $existing = $pdo->prepare("SELECT id FROM user_crop_preferences WHERE user_id=? AND crop_id=?")
            ->execute([$uid, $cropId])->fetch();

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
