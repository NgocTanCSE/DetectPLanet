<?php
/**
 * AgriScan AI — Scan controller.
 * GET /scan/session, POST /analyze
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../services/ai.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class ScanController {
    public function handle($method) {
        if ($method === 'GET') {
            $this->handleGetScanSession();
        } elseif ($method === 'POST') {
            $this->handleAnalyze();
        } else {
            sendJson(['error' => 'not found'], 404);
        }
    }

    private function handleGetScanSession() {
        global $pdo;
        $pdo = requireDb();
        $uid = getUserIdFromToken();
        $scope = userScope($uid);

        $row = $pdo->query(
            "SELECT id, crop_label AS crop, disease, image, confidence, severity, created_at
             FROM scans WHERE scan_status='processing' $scope ORDER BY created_at DESC LIMIT 1"
        )->fetch();

        if (!$row) {
            sendJson(emptySession());
            return;
        }

        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$row['id']]);

        $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$row['id']]);

        sendJson([
            'id'         => $row['id'],
            'crop'       => $row['crop'],
            'disease'    => $row['disease'],
            'image'      => $row['image'],
            'confidence' => confStr($row['confidence']),
            'severity'   => $row['severity'],
            'time'       => fmtTime($row['created_at']),
            'pipeline'   => array_map('mapPipeline', $steps->fetchAll()),
            'detections' => array_map('mapDetection', $dets->fetchAll()),
        ]);
    }

    private function handleAnalyze() {
        global $pdo;
        $rlKey = (($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ':analyze');
        if (!rateLimit($rlKey)) {
            sendJson([
                'error'   => 'Rate limit exceeded',
                'message' => 'Quá nhiều yêu cầu phân tích. Vui lòng thử lại sau.',
            ], 429);
            return;
        }

        $pdo = requireDb();
        $uid = getUserIdFromToken();

        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 10 * 1024 * 1024) {
            sendJson([
                'error'   => 'Payload too large',
                'message' => 'Kích thước ảnh vượt quá giới hạn 10MB.',
            ], 413);
            return;
        }

        $imageUri  = $body['imageUri'] ?? '';
        $rawBase64 = $body['base64'] ?? '';
        if (!$rawBase64 && preg_match('#^data:image/(\w+);base64,(.+)$#si', $imageUri, $m)) {
            $rawBase64 = $m[2];
        }

        if (!$rawBase64 && $imageUri !== '' && preg_match('#^https?://#i', $imageUri)) {
            $imgCtx = stream_context_create(['http' => ['timeout' => 20, 'ignore_errors' => true]]);
            $bytes  = @file_get_contents($imageUri, false, $imgCtx);
            if ($bytes !== false && strlen($bytes) > 0 && strlen($bytes) <= 10 * 1024 * 1024) {
                $rawBase64 = base64_encode($bytes);
            }
        }

        if ($rawBase64 === '') {
            sendJson([
                'error'   => 'No image provided',
                'message' => 'Không nhận được ảnh. Hãy chụp ảnh lá hoặc chọn ảnh từ thư viện.',
            ], 400);
            return;
        }

        $decoded = base64_decode($rawBase64, true);
        if ($decoded === false || strlen($decoded) === 0) {
            sendJson([
                'error'   => 'Invalid image data',
                'message' => 'Dữ liệu ảnh không hợp lệ.',
            ], 400);
            return;
        }

        $filename = 'leaf_' . bin2hex(random_bytes(6)) . '.jpg';
        $dest = __DIR__ . '/../../uploads/' . $filename;
        if (!is_dir(__DIR__ . '/../../uploads')) {
            @mkdir(__DIR__ . '/../../uploads', 0775, true);
        }
        if (@file_put_contents($dest, $decoded) === false) {
            sendJson([
                'error'   => 'Upload failed',
                'message' => 'Không thể lưu ảnh lên máy chủ.',
            ], 500);
            return;
        }

        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $proto = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                  || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') ? 'https' : 'http';
        $imageUri = "$proto://$host/uploads/$filename";

        $diag = aiDiagnose('data:image/jpeg;base64,' . $rawBase64);
        if (!$diag['ok']) {
            sendJson([
                'error'   => 'Dịch vụ AI không phản hồi',
                'message' => $diag['error'] ?? 'Không thể nhận diện ảnh. Vui lòng thử lại.',
            ], 503);
            return;
        }
        $pred = $diag['prediction'];

        $finalCrop      = $pred['crop'];
        $finalCropLabel = $pred['crop_label'];
        $finalDisease   = $pred['disease_label'];
        $severity       = $pred['severity'];
        $confidence     = $pred['confidence'];
        $recommendation = $pred['recommendation'];

        $spread = ($severity === 'healthy') ? 'Không có' : (($severity === 'warning') ? 'Chậm' : 'Nhanh');
        $stage  = ($severity === 'healthy') ? 'Phát triển tốt' : (($severity === 'warning') ? 'Khởi phát' : 'Đang bộc phát');
        $loss   = ($severity === 'healthy') ? '0%' : (($severity === 'warning') ? '5 - 10%' : '15 - 30%');

        $id = 'scan_' . bin2hex(random_bytes(4));

        $stmt = $pdo->prepare("INSERT INTO scans
            (id, crop, crop_label, disease, pathogen, image, confidence, severity,
             recommendation, status_spread, status_stage, status_loss, scan_status, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', ?, NOW())");
        $stmt->execute([
            $id, $finalCrop, $finalCropLabel, $finalDisease, $pred['pathogen'], $imageUri,
            $confidence, $severity, $recommendation, $spread, $stage, $loss, $uid,
        ]);

        $pStmt = $pdo->prepare("INSERT INTO scan_pipeline_steps
            (scan_id, id, icon, title, descr, step_status, is_active, icon_bg, icon_color, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $modelName = (strcasecmp($finalCrop, 'rice') === 0)
            ? 'Phân tích Cloudflare LLaMA Vision (Lúa)' : 'Phân tích Cloudflare LLaMA Vision';
        $pStmt->execute([$id, 'p1', 'camera',     'Chụp ảnh lá', 'Đã chụp ảnh', 'Hoàn tất', 1, '#DBEAFE', '#2563EB', 1]);
        $pStmt->execute([$id, 'p2', 'biotech',    $modelName, 'Nhận diện: ' . $finalDisease, 'Hoàn tất', 1, '#FEF3C7', '#D97706', 2]);
        $pStmt->execute([$id, 'p3', 'agronheart', 'Giải pháp điều trị', 'Độ tin cậy: ' . confStr($confidence) . '%', 'Hoàn tất', 1, '#DCFCE7', '#16A34A', 3]);

        $dStmt = $pdo->prepare("INSERT INTO scan_detections
            (scan_id, id, top, left_pos, confidence, severity, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($pred['detections'] as $i => $d) {
            $dStmt->execute([$id, $d['id'], $d['top'], $d['left'], $d['confidence'], $d['severity'], $i + 1]);
        }

        $dets = $pdo->prepare("SELECT * FROM scan_detections WHERE scan_id=? ORDER BY sort_order");
        $dets->execute([$id]);
        $steps = $pdo->prepare("SELECT * FROM scan_pipeline_steps WHERE scan_id=? ORDER BY sort_order");
        $steps->execute([$id]);

        sendJson([
            'id'             => $id,
            'crop'           => $finalCropLabel,
            'disease'        => $finalDisease,
            'pathogen'       => $pred['pathogen'],
            'image'          => $imageUri,
            'confidence'     => confStr($confidence),
            'severity'       => $severity,
            'recommendation' => $recommendation,
            'time'           => fmtTime(date('Y-m-d H:i:s')),
            'status'         => ['spread' => $spread, 'stage' => $stage, 'loss' => $loss],
            'pipeline'       => array_map('mapPipeline', $steps->fetchAll()),
            'detections'     => array_map('mapDetection', $dets->fetchAll()),
            'topk'           => $pred['topk'],
        ]);
    }
}
