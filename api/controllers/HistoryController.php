<?php
/**
 * AgriScan AI — History controller.
 * GET /history, POST /history/{id}/save, POST /history/{id}/unsave
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class HistoryController {
    public function handle($method, $target) {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        $scope = userScope($uid);

        if ($method === 'GET' && $target === 'history') {
            $this->handleGetHistory($scope);
        } elseif ($method === 'POST' && preg_match('#^history/([A-Za-z0-9_\-]+)/save$#', $target, $m)) {
            $this->handleSave($m[1], $scope);
        } elseif ($method === 'POST' && preg_match('#^history/([A-Za-z0-9_\-]+)/unsave$#', $target, $m)) {
            $this->handleUnsave($m[1], $scope);
        } else {
            sendJson(['error' => 'not found'], 404);
        }
    }

    private function handleGetHistory($scope) {
        global $pdo;
        $records = $pdo->query(
            "SELECT id, crop, crop_label, disease, confidence, severity, created_at, image
             FROM scans WHERE scan_status='done' $scope ORDER BY created_at DESC"
        )->fetchAll();

        $crops = $pdo->query(
            "SELECT DISTINCT crop, crop_label FROM scans WHERE scan_status='done' AND crop <> '' $scope ORDER BY crop"
        )->fetchAll();

        $cropIcons = ['rice' => 'eco', 'tomato' => 'favorites', 'fruit' => 'apple'];
        $filters = [['key' => 'all', 'label' => 'Tất cả', 'icon' => 'apps']];
        foreach ($crops as $c) {
            $filters[] = [
                'key' => $c['crop'],
                'label' => $c['crop_label'],
                'icon' => $cropIcons[$c['crop']] ?? 'eco',
            ];
        }
        $filters[] = ['key' => 'danger', 'label' => 'Nguy hiểm', 'icon' => 'warning'];

        sendJson([
            'records' => array_map('mapRecord', $records),
            'filters' => $filters,
        ]);
    }

    private function handleSave($id, $scope) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE scans SET is_saved = 1 WHERE id=? $scope");
        $stmt->execute([$id]);
        sendJson(['ok' => true, 'updated' => $stmt->rowCount() > 0]);
    }

    private function handleUnsave($id, $scope) {
        global $pdo;
        $stmt = $pdo->prepare("UPDATE scans SET is_saved = 0 WHERE id=? $scope");
        $stmt->execute([$id]);
        sendJson(['ok' => true, 'updated' => $stmt->rowCount() > 0]);
    }
}
