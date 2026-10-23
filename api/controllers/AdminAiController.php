<?php
/**
 * AgriScan AI — Admin: tổng hợp số liệu bằng AI và lưu báo cáo.
 *
 *   POST   /admin/ai/summary            {range?|from?,to?}   sinh, không lưu
 *   GET    /admin/ai/reports?page       danh sách báo cáo đã lưu
 *   GET    /admin/ai/reports/{id}       chi tiết
 *   POST   /admin/ai/reports            {range?|from?,to?,title?}  sinh + lưu
 *   DELETE /admin/ai/reports/{id}
 */

require_once __DIR__ . '/../middleware/admin.php';
require_once __DIR__ . '/../services/admin_report.php';

class AdminAiController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'POST' && $target === 'admin/ai/summary') {
            $this->summary($pdo);
            return;
        }

        if ($method === 'GET' && $target === 'admin/ai/reports') {
            $this->index($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/ai/reports') {
            $this->create($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/ai/reports/save') {
            $this->save($pdo);
            return;
        }

        if ($method === 'GET' && preg_match('#^admin/ai/reports/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->show($pdo, $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/ai/reports/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->destroy($pdo, $m[1]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    /** Khoảng ngày từ body: range hoặc from/to. */
    private function period() {
        $body = adminBody();

        $from = trim((string) ($body['from'] ?? ''));
        $to = trim((string) ($body['to'] ?? ''));

        if ($from !== '' && $to !== '') {
            $fromTs = strtotime($from);
            $toTs = strtotime($to);
            if ($fromTs === false || $toTs === false || $fromTs > $toTs) {
                sendJson(['error' => 'invalid', 'message' => 'Khoảng ngày không hợp lệ.'], 400);
            }
            return [date('Y-m-d', $fromTs), date('Y-m-d', $toTs)];
        }

        $range = (int) ($body['range'] ?? 7);
        if (!in_array($range, [7, 30, 90], true)) $range = 7;

        return [date('Y-m-d', strtotime('-' . ($range - 1) . ' days')), date('Y-m-d')];
    }

    private function summary($pdo) {
        [$from, $to] = $this->period();
        $result = adminGenerateReport($pdo, $from, $to);

        if (!$result['ok']) {
            sendJson([
                'error'   => 'ai_failed',
                'message' => $result['error'] ?? 'AI không phản hồi.',
                'metrics' => $result['metrics'],
            ], 502);
        }

        sendJson([
            'from'     => $from,
            'to'       => $to,
            'report'   => $result['report'],
            'metrics'  => $result['metrics'],
            'model'    => $result['model'],
            'generatedAt' => date('c'),
        ]);
    }

    private function index($pdo) {
        [$page, $perPage, $offset] = adminPagination(20);

        $total = (int) $pdo->query("SELECT COUNT(*) FROM admin_reports")->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT id, title, period_start, period_end, summary, model, created_at
               FROM admin_reports
              ORDER BY created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute();

        $items = array_map(function ($r) {
            return [
                'id'          => $r['id'],
                'title'       => $r['title'],
                'periodStart' => $r['period_start'],
                'periodEnd'   => $r['period_end'],
                'summary'     => $r['summary'],
                'model'       => $r['model'],
                'createdAt'   => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        adminList($items, $page, $perPage, $total);
    }

    private function show($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM admin_reports WHERE id = ?");
        $stmt->execute([$id]);
        $r = $stmt->fetch();
        if (!$r) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy báo cáo.'], 404);
        }

        sendJson([
            'id'          => $r['id'],
            'title'       => $r['title'],
            'periodStart' => $r['period_start'],
            'periodEnd'   => $r['period_end'],
            'summary'     => $r['summary'],
            'highlights'  => $r['highlights'] ? json_decode($r['highlights'], true) : [],
            'actions'     => $r['actions'] ? json_decode($r['actions'], true) : [],
            'metrics'     => $r['metrics'] ? json_decode($r['metrics'], true) : null,
            'model'       => $r['model'],
            'createdAt'   => $r['created_at'],
        ]);
    }

    private function create($pdo) {
        $body = adminBody();
        [$from, $to] = $this->period();

        $result = adminGenerateReport($pdo, $from, $to);
        if (!$result['ok']) {
            sendJson([
                'error'   => 'ai_failed',
                'message' => $result['error'] ?? 'AI không phản hồi.',
                'metrics' => $result['metrics'],
            ], 502);
        }

        $title = trim((string) ($body['title'] ?? ''));
        $id = adminSaveReport($pdo, $from, $to, $result['report'], $result['metrics'], $result['model'], $title);

        adminAudit($pdo, 'admin.report.ai_create', 'admin_reports', $id, null, [
            'from' => $from, 'to' => $to, 'title' => $title,
        ]);

        sendJson([
            'ok'      => true,
            'id'      => $id,
            'from'    => $from,
            'to'      => $to,
            'report'  => $result['report'],
            'metrics' => $result['metrics'],
            'model'   => $result['model'],
        ], 201);
    }

    /**
     * Lưu nguyên văn báo cáo đã sinh (không gọi lại AI).
     * Body: {from, to, title?, report:{summary,highlights,actions}, metrics, model}
     */
    private function save($pdo) {
        $body = adminBody();
        $from = trim((string) ($body['from'] ?? ''));
        $to = trim((string) ($body['to'] ?? ''));
        $report = $body['report'] ?? null;

        if ($from === '' || $to === '' || !is_array($report) || empty($report['summary'])) {
            sendJson(['error' => 'invalid', 'message' => 'Thiếu from/to hoặc nội dung báo cáo.'], 400);
        }

        $metrics = is_array($body['metrics'] ?? null) ? $body['metrics'] : [];
        $model = (string) ($body['model'] ?? '');
        $title = trim((string) ($body['title'] ?? ''));

        $id = adminSaveReport($pdo, $from, $to, $report, $metrics, $model, $title);

        adminAudit($pdo, 'admin.report.ai_save', 'admin_reports', $id, null, [
            'from' => $from, 'to' => $to, 'title' => $title,
        ]);

        sendJson(['ok' => true, 'id' => $id], 201);
    }

    private function destroy($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM admin_reports WHERE id = ?");
        $stmt->execute([$id]);
        $r = $stmt->fetch();
        if (!$r) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy báo cáo.'], 404);
        }

        $pdo->prepare("DELETE FROM admin_reports WHERE id = ?")->execute([$id]);
        adminAudit($pdo, 'admin.report.ai_delete', 'admin_reports', $id, ['title' => $r['title']], null);
        sendJson(['ok' => true, 'deleted' => true]);
    }
}
