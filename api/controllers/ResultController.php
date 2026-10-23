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
                'accordion'      => $this->scanAccordion($row),
                'detections'     => array_map('mapDetection', $dets->fetchAll()),
            ]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    /**
     * Accordion for one scan: diagnosis, immediate actions, prevention.
     * Previously this reused loadGuides() — the generic "Cẩm nang" library —
     * so a tomato leaf-spot result showed rice-blast treatment chapters.
     */
    private function scanAccordion(array $row) {
        $healthy = ($row['severity'] ?? '') === 'healthy';
        $disease = $row['disease'] ?: 'Chưa xác định';
        $pathogen = trim((string) ($row['pathogen'] ?? ''));
        $rec = trim((string) ($row['recommendation'] ?? ''));
        $conf = confStr($row['confidence'] ?? 0) . '%';

        $severityLabel = [
            'healthy' => 'Cây khỏe',
            'warning' => 'Cần theo dõi',
            'danger'  => 'Nguy hiểm',
        ][$row['severity'] ?? 'warning'] ?? 'Cần theo dõi';

        $dxSections = [];
        $dxSections[] = [
            'title' => 'Tác nhân',
            'badge' => null,
            'body'  => $pathogen !== ''
                ? $pathogen
                : ($healthy ? 'Không phát hiện tác nhân gây bệnh.' : 'Chưa xác định được tác nhân cụ thể.'),
        ];
        $dxSections[] = [
            'title' => 'Mức độ',
            'badge' => null,
            'body'  => $severityLabel . ' · độ tin cậy ' . $conf,
        ];

        $actions = [];
        if ($rec !== '') {
            $actions[] = ['title' => 'Khuyến nghị', 'badge' => null, 'body' => $rec];
        }
        $actions[] = [
            'title' => $healthy ? 'Duy trì' : 'Theo dõi',
            'badge' => null,
            'body'  => $healthy
                ? 'Tiếp tục tưới ẩm vừa phải, bón cân đối đạm–lân–kali và kiểm tra lá 2–3 ngày một lần.'
                : 'Kiểm tra lại vùng lá bị bệnh sau 3–5 ngày. Nếu vết bệnh lan rộng, chụp lại và cân nhắc dùng thuốc đặc trị.',
        ];

        $prevent = [[
            'title' => 'Giảm nguy cơ tái phát',
            'badge' => null,
            'body'  => 'Tỉa bớt lá gốc cho thoáng, tránh tưới lên tán lá vào chiều muộn, luân canh cây họ cà với cây họ đậu và vệ sinh dụng cụ sau mỗi lần cắt tỉa.',
        ]];

        return [
            [
                'id'       => 'dx',
                'icon'     => 'biotech',
                'title'    => $healthy ? 'Kết quả: cây khỏe' : 'Chẩn đoán: ' . $disease,
                'subtitle' => 'Tác nhân và mức độ ghi nhận từ ảnh',
                'sections' => $dxSections,
            ],
            [
                'id'       => 'actions',
                'icon'     => 'medical_services',
                'title'    => $healthy ? 'Chăm sóc định kỳ' : 'Hướng xử lý',
                'subtitle' => 'Việc cần làm trong 3–7 ngày tới',
                'sections' => $actions,
            ],
            [
                'id'       => 'prevent',
                'icon'     => 'shield',
                'title'    => 'Phòng ngừa',
                'subtitle' => 'Hạn chế bệnh quay lại vụ sau',
                'sections' => $prevent,
            ],
        ];
    }
}
