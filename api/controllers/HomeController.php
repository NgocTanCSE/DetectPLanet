<?php
/**
 * AgriScan AI — Home controller.
 * GET /home, GET /
 */

require_once __DIR__ . '/../services/database.php';

class HomeController {
    public function handle() {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        $scope = userScope($uid);

        $recent = $pdo->query(
            "SELECT id, crop_label, disease, image, confidence, severity, created_at, crop
             FROM scans WHERE scan_status='done' $scope ORDER BY created_at DESC LIMIT 4"
        )->fetchAll();

        $articles = $pdo->query(
            "SELECT id, image, label, label_color, time, title, action, tag_bg, url
             FROM articles ORDER BY time DESC LIMIT 8"
        )->fetchAll();

        $total   = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE DATE(created_at)=CURRENT_DATE $scope")->fetchColumn();
        $danger  = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE severity='danger' AND DATE(created_at)=CURRENT_DATE $scope")->fetchColumn();
        $healthy = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE severity='healthy' AND DATE(created_at)=CURRENT_DATE $scope")->fetchColumn();

        $stats = [
            ['label' => 'Tổng quan hôm nay', 'value' => (string) $total,   'icon' => 'analytics', 'color' => 'primary'],
            ['label' => 'Cần chú ý',        'value' => (string) $danger,  'icon' => 'error',     'color' => 'status-danger'],
            ['label' => 'Cây khỏe',          'value' => (string) $healthy, 'icon' => 'eco',       'color' => 'status-healthy'],
        ];

        sendJson([
            'stats'    => $stats,
            'recent'   => array_map('mapRecent', $recent),
            'articles' => array_map(function ($a) {
                return [
                    'id'         => $a['id'],
                    'image'      => $a['image'],
                    'label'      => $a['label'],
                    'label_color'=> $a['label_color'],
                    'time'       => $a['time'],
                    'title'      => $a['title'],
                    'action'     => $a['action'],
                    'tag_bg'     => $a['tag_bg'],
                    'url'        => $a['url'],
                ];
            }, $articles),
        ]);
    }
}
