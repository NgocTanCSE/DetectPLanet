<?php
/**
 * AgriScan AI — Admin: nhật ký quét cây (log).
 *
 *   GET    /admin/scans?q&crop&severity&status&from&to&page&per_page&include_deleted
 *   GET    /admin/scans/{id}          chi tiết + detections + pipeline
 *   DELETE /admin/scans/{id}          xóa mềm
 *   POST   /admin/scans/{id}/restore  khôi phục
 */

require_once __DIR__ . '/../middleware/admin.php';

class AdminScansController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/scans') {
            $this->index($pdo);
            return;
        }

        if ($method === 'GET' && preg_match('#^admin/scans/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->show($pdo, $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/scans/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->destroy($pdo, $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/scans/([A-Za-z0-9_\-]+)/restore$#', $target, $m)) {
            $this->restore($pdo, $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    private function index($pdo) {
        [$page, $perPage, $offset] = adminPagination(25);

        $where = [];
        $params = [];

        if (empty($_GET['include_deleted'])) {
            $where[] = 's.deleted_at IS NULL';
        }

        $q = trim((string) ($_GET['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(s.disease ILIKE ? OR s.crop_label ILIKE ? OR s.id ILIKE ? OR u.email ILIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        $crop = trim((string) ($_GET['crop'] ?? ''));
        if ($crop !== '') {
            $where[] = 's.crop = ?';
            $params[] = $crop;
        }

        $severity = trim((string) ($_GET['severity'] ?? ''));
        if ($severity !== '') {
            adminRequireEnum($severity, ['healthy', 'warning', 'danger'], 'severity');
            $where[] = 's.severity = ?';
            $params[] = $severity;
        }

        $status = trim((string) ($_GET['status'] ?? ''));
        if ($status !== '') {
            adminRequireEnum($status, ['processing', 'done', 'failed'], 'status');
            $where[] = 's.scan_status = ?';
            $params[] = $status;
        }

        $from = $this->dateOrNull($_GET['from'] ?? null);
        if ($from) {
            $where[] = 's.created_at >= ?::date';
            $params[] = $from;
        }
        $to = $this->dateOrNull($_GET['to'] ?? null);
        if ($to) {
            $where[] = 's.created_at < (?::date + INTERVAL \'1 day\')';
            $params[] = $to;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM scans s LEFT JOIN users u ON u.id = s.user_id $whereSql"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT s.id, s.crop, s.crop_label, s.disease, s.severity, s.confidence,
                    s.image, s.scan_status, s.is_saved, s.created_at, s.deleted_at,
                    s.user_id, u.name AS user_name, u.email AS user_email
               FROM scans s
               LEFT JOIN users u ON u.id = s.user_id
               $whereSql
              ORDER BY s.created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);

        adminList(array_map([$this, 'mapScan'], $stmt->fetchAll()), $page, $perPage, $total);
    }

    private function show($pdo, $id) {
        $stmt = $pdo->prepare(
            "SELECT s.*, u.name AS user_name, u.email AS user_email
               FROM scans s LEFT JOIN users u ON u.id = s.user_id
              WHERE s.id = ?"
        );
        $stmt->execute([$id]);
        $scan = $stmt->fetch();
        if (!$scan) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy lượt quét.'], 404);
        }

        $detStmt = $pdo->prepare(
            "SELECT id, top, left_pos, confidence, severity, sort_order
               FROM scan_detections WHERE scan_id = ? ORDER BY sort_order"
        );
        $detStmt->execute([$id]);
        $detections = array_map(function ($d) {
            return [
                'id'         => $d['id'],
                'top'        => $d['top'],
                'left'       => $d['left_pos'],
                'confidence' => $d['confidence'],
                'severity'   => $d['severity'],
            ];
        }, $detStmt->fetchAll());

        $pipeStmt = $pdo->prepare(
            "SELECT id, icon, title, descr, step_status, is_active, sort_order
               FROM scan_pipeline_steps WHERE scan_id = ? ORDER BY sort_order"
        );
        $pipeStmt->execute([$id]);
        $pipeline = array_map(function ($p) {
            return [
                'id'       => $p['id'],
                'icon'     => $p['icon'],
                'title'    => $p['title'],
                'descr'    => $p['descr'],
                'status'   => $p['step_status'],
                'isActive' => (int) $p['is_active'] === 1,
            ];
        }, $pipeStmt->fetchAll());

        $mapped = $this->mapScan($scan);
        $mapped['pathogen']       = $scan['pathogen'];
        $mapped['recommendation'] = $scan['recommendation'];
        $mapped['statusSpread']   = $scan['status_spread'];
        $mapped['statusStage']    = $scan['status_stage'];
        $mapped['statusLoss']     = $scan['status_loss'];
        $mapped['updatedAt']      = $scan['updated_at'];

        sendJson([
            'scan'       => $mapped,
            'detections' => $detections,
            'pipeline'   => $pipeline,
        ]);
    }

    private function destroy($pdo, $id) {
        $scan = $this->requireScan($pdo, $id);
        $pdo->prepare(
            "UPDATE scans SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )->execute([$id]);

        adminAudit($pdo, 'admin.scan.delete', 'scans', $id,
            ['disease' => $scan['disease'], 'crop' => $scan['crop_label']],
            ['deleted' => true]);

        sendJson(['ok' => true, 'deleted' => true]);
    }

    private function restore($pdo, $id) {
        $scan = $this->requireScan($pdo, $id);
        $pdo->prepare(
            "UPDATE scans SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )->execute([$id]);

        adminAudit($pdo, 'admin.scan.restore', 'scans', $id, ['deleted' => true], ['deleted' => false]);

        sendJson(['ok' => true, 'deleted' => false]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function requireScan($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM scans WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy lượt quét.'], 404);
        }
        return $row;
    }

    private function dateOrNull($value) {
        $value = trim((string) $value);
        if ($value === '') return null;
        $ts = strtotime($value);
        return $ts === false ? null : date('Y-m-d', $ts);
    }

    private function mapScan(array $s) {
        return [
            'id'         => $s['id'],
            'crop'       => $s['crop'],
            'cropLabel'  => $s['crop_label'],
            'disease'    => $s['disease'],
            'severity'   => $s['severity'],
            'confidence' => (float) $s['confidence'],
            'image'      => $s['image'],
            'status'     => $s['scan_status'],
            'isSaved'    => (int) $s['is_saved'] === 1,
            'createdAt'  => $s['created_at'],
            'deletedAt'  => $s['deleted_at'] ?? null,
            'userId'     => $s['user_id'] !== null ? (int) $s['user_id'] : null,
            'userName'   => $s['user_name'] ?? '',
            'userEmail'  => $s['user_email'] ?? '',
        ];
    }
}
