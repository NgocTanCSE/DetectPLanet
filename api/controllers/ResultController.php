<?php
/**
 * AgriScan AI — Result controller.
 * GET /result/latest, GET /result/{id}
 */

require_once __DIR__ . '/../services/database.php';

class ResultController {
    public function handle($target) {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        $scope = userScope($uid);

        if ($target === 'result/latest' || preg_match('#^result/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $scanId = (!empty($m[1]) && $m[1] !== 'latest') ? $m[1] : null;

            if ($scanId) {
                $stmt = $pdo->prepare("SELECT id, crop_label AS crop, disease, pathogen, image, confidence, severity, created_at,
                                               recommendation, status_spread AS spread, status_stage AS stage, status_loss AS loss,
                                               is_saved
                                         FROM scans WHERE id=? $scope LIMIT 1");
                $stmt->execute([$scanId]);
                $row = $stmt->fetch();
            } else {
                $row = $pdo->query("SELECT id, crop_label AS crop, disease, pathogen, image, confidence, severity, created_at,
                                           recommendation, status_spread AS spread, status_stage AS stage, status_loss AS loss,
                                           is_saved
                                     FROM scans WHERE scan_status='done' $scope ORDER BY created_at DESC LIMIT 1")->fetch();
            }

            if (!$row) {
                sendJson(emptyReport());
                return;
            }

            $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
            $dets->execute([$row['id']]);

            $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
            $steps->execute([$row['id']]);

            sendJson([
                'id'             => $row['id'],
                'crop'           => $row['crop'],
                'disease'        => $row['disease'],
                'pathogen'       => $row['pathogen'],
                'image'          => $row['image'],
                'confidence'     => confStr($row['confidence']),
                'severity'       => $row['severity'],
                'time'           => fmtTime($row['created_at']),
                'recommendation' => $row['recommendation'],
                'is_saved'       => (int) $row['is_saved'],
                'status'         => ['spread' => $row['spread'], 'stage' => $row['stage'], 'loss' => $row['loss']],
                'pipeline'       => array_map('mapPipeline', $steps->fetchAll()),
                'accordion'      => loadGuides($pdo),
                'detections'     => array_map('mapDetection', $dets->fetchAll()),
            ]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }
}
