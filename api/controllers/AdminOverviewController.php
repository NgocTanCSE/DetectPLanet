<?php
/**
 * AgriScan AI — Admin: tổng quan, hệ thống, audit log.
 *
 *   GET /admin/overview?range=7|30|90   — KPI + chuỗi theo ngày + phân bố + top list
 *   GET /admin/system                   — health, job runs, cấu hình AI, dung lượng dữ liệu
 *   GET /admin/audit?page&action&table  — lịch sử thao tác
 */

require_once __DIR__ . '/../middleware/admin.php';

class AdminOverviewController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/overview') {
            $this->overview($pdo);
            return;
        }
        if ($method === 'GET' && $target === 'admin/system') {
            $this->system($pdo);
            return;
        }
        if ($method === 'GET' && $target === 'admin/audit') {
            $this->audit($pdo);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    /** Khoảng ngày hợp lệ: 7 | 30 | 90. */
    private function rangeDays() {
        $range = (int) ($_GET['range'] ?? 7);
        return in_array($range, [7, 30, 90], true) ? $range : 7;
    }

    private function overview($pdo) {
        $days = $this->rangeDays();
        $from = date('Y-m-d', strtotime("-" . ($days - 1) . " days"));

        // ── Người dùng ────────────────────────────────────────────────
        $users = [
            'total' => (int) $pdo->query(
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"
            )->fetchColumn(),
            'new' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= ?::date",
                [$from]
            ),
            'suspended' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'suspended'"
            ),
            'active_7d' => $this->scalar(
                $pdo,
                "SELECT COUNT(DISTINCT user_id) FROM scans
                  WHERE deleted_at IS NULL AND user_id IS NOT NULL
                    AND created_at >= CURRENT_DATE - INTERVAL '7 days'"
            ),
        ];

        // ── Lượt quét ─────────────────────────────────────────────────
        $scanTotal = $this->scalar(
            $pdo,
            "SELECT COUNT(*) FROM scans WHERE deleted_at IS NULL AND created_at >= ?::date",
            [$from]
        );
        $scans = [
            'total' => $scanTotal,
            'today' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM scans WHERE deleted_at IS NULL AND DATE(created_at) = CURRENT_DATE"
            ),
            'failed' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM scans
                  WHERE deleted_at IS NULL AND scan_status = 'failed' AND created_at >= ?::date",
                [$from]
            ),
            'avg_confidence' => round((float) $this->scalar(
                $pdo,
                "SELECT COALESCE(AVG(confidence), 0) FROM scans
                  WHERE deleted_at IS NULL AND scan_status = 'done' AND created_at >= ?::date",
                [$from]
            ), 1),
            'by_severity' => $this->mapCounts(
                $pdo,
                "SELECT severity AS k, COUNT(*) AS c FROM scans
                  WHERE deleted_at IS NULL AND scan_status = 'done' AND created_at >= ?::date
                  GROUP BY severity",
                [$from]
            ),
            'by_day' => $this->seriesByDay(
                $pdo,
                "SELECT DATE(created_at) AS day, COUNT(*) AS c FROM scans
                  WHERE deleted_at IS NULL AND created_at >= ?::date GROUP BY 1",
                $from,
                $days
            ),
            'top_diseases' => $this->topList(
                $pdo,
                "SELECT disease AS name, COUNT(*) AS count FROM scans
                  WHERE deleted_at IS NULL AND severity <> 'healthy' AND created_at >= ?::date
                  GROUP BY disease ORDER BY count DESC LIMIT 8",
                [$from]
            ),
            'by_crop' => $this->topList(
                $pdo,
                "SELECT crop_label AS name, COUNT(*) AS count FROM scans
                  WHERE deleted_at IS NULL AND created_at >= ?::date
                  GROUP BY crop_label ORDER BY count DESC LIMIT 8",
                [$from]
            ),
            // Tỉnh suy ra từ hồ sơ người dùng (app không gửi GPS).
            'top_provinces' => $this->topList(
                $pdo,
                "SELECT COALESCE(NULLIF(p.province, ''), 'Chưa rõ') AS name, COUNT(*) AS count
                   FROM scans s
                   LEFT JOIN user_profiles p ON p.user_id = s.user_id
                  WHERE s.deleted_at IS NULL AND s.created_at >= ?::date
                  GROUP BY 1 ORDER BY count DESC LIMIT 8",
                [$from]
            ),
        ];

        // ── Cảnh báo ──────────────────────────────────────────────────
        $alerts = [
            'active' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM crop_disease_alerts
                  WHERE is_active = 1 AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)"
            ),
            'expiring_soon' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM crop_disease_alerts
                  WHERE is_active = 1 AND valid_to IS NOT NULL
                    AND valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'"
            ),
            'by_source' => $this->mapCounts(
                $pdo,
                "SELECT source AS k, COUNT(*) AS c FROM crop_disease_alerts
                  WHERE is_active = 1 GROUP BY source"
            ),
            'by_severity' => $this->mapCounts(
                $pdo,
                "SELECT severity AS k, COUNT(*) AS c FROM crop_disease_alerts
                  WHERE is_active = 1 GROUP BY severity"
            ),
        ];

        // ── Cộng đồng / tin chính thức ────────────────────────────────
        $community = [
            'pending' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM disease_reports WHERE status = 'pending'"
            ),
            'verified' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM disease_reports
                  WHERE status = 'verified' AND created_at >= ?::date",
                [$from]
            ),
            'by_province' => $this->topList(
                $pdo,
                "SELECT province AS name, COUNT(*) AS count FROM disease_reports
                  WHERE province <> '' AND created_at >= ?::date
                  GROUP BY province ORDER BY count DESC LIMIT 8",
                [$from]
            ),
        ];

        $official = [
            'pending' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM official_ingest WHERE status = 'pending'"
            ),
            'published' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM official_ingest WHERE status = 'approved'"
            ),
        ];

        // ── Thông báo ─────────────────────────────────────────────────
        $notifications = [
            'broadcasts' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM notification_broadcasts WHERE created_at >= ?::date",
                [$from]
            ),
            'sent' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM notifications WHERE created_at >= ?::date",
                [$from]
            ),
            'read' => $this->scalar(
                $pdo,
                "SELECT COUNT(*) FROM notifications WHERE is_read = 1 AND created_at >= ?::date",
                [$from]
            ),
        ];
        $notifications['read_rate'] = $notifications['sent'] > 0
            ? round($notifications['read'] / $notifications['sent'] * 100, 1)
            : 0;

        // ── Người dùng mới theo ngày ──────────────────────────────────
        $users['by_day'] = $this->seriesByDay(
            $pdo,
            "SELECT DATE(created_at) AS day, COUNT(*) AS c FROM users
              WHERE deleted_at IS NULL AND created_at >= ?::date GROUP BY 1",
            $from,
            $days
        );

        sendJson([
            'range' => $days,
            'from'  => $from,
            'to'    => date('Y-m-d'),
            'users'         => $users,
            'scans'         => $scans,
            'alerts'        => $alerts,
            'community'     => $community,
            'official'      => $official,
            'notifications' => $notifications,
            'activity'      => $this->activity($pdo),
        ]);
    }

    /** Gộp hoạt động gần đây từ quét / cảnh báo / báo cáo cộng đồng. */
    private function activity($pdo) {
        $rows = [];

        $scans = $pdo->query(
            "SELECT id, crop_label, disease, severity, created_at
               FROM scans WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8"
        )->fetchAll();
        foreach ($scans as $r) {
            $rows[] = [
                'type'      => 'scan',
                'id'        => $r['id'],
                'title'     => trim(($r['crop_label'] ?? '') . ' — ' . ($r['disease'] ?? '')),
                'level'     => $r['severity'] ?? 'healthy',
                'createdAt' => $r['created_at'],
            ];
        }

        $alerts = $pdo->query(
            "SELECT id, disease_label, crop_id, severity, created_at
               FROM crop_disease_alerts ORDER BY created_at DESC LIMIT 6"
        )->fetchAll();
        foreach ($alerts as $r) {
            $rows[] = [
                'type'      => 'alert',
                'id'        => $r['id'],
                'title'     => 'Cảnh báo: ' . ($r['disease_label'] ?? ''),
                'level'     => $r['severity'] ?? 'warning',
                'createdAt' => $r['created_at'],
            ];
        }

        $reports = $pdo->query(
            "SELECT id, disease_label, province, status, created_at
               FROM disease_reports ORDER BY created_at DESC LIMIT 6"
        )->fetchAll();
        foreach ($reports as $r) {
            $rows[] = [
                'type'      => 'report',
                'id'        => $r['id'],
                'title'     => 'Báo cáo cộng đồng: ' . ($r['disease_label'] ?: 'Chưa rõ')
                               . ($r['province'] ? ' · ' . $r['province'] : ''),
                'level'     => $r['status'] === 'verified' ? 'healthy' : 'warning',
                'createdAt' => $r['created_at'],
            ];
        }

        usort($rows, function ($a, $b) {
            return strtotime($b['createdAt']) <=> strtotime($a['createdAt']);
        });

        return array_slice($rows, 0, 12);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function scalar($pdo, $sql, array $params = []) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    /** {key: count} — luôn có đủ khoá truyền vào (nếu cần). */
    private function mapCounts($pdo, $sql, array $params = []) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $out = [];
        foreach ($stmt->fetchAll() as $r) {
            $out[(string) $r['k']] = (int) $r['c'];
        }
        return $out;
    }

    private function topList($pdo, $sql, array $params = []) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map(function ($r) {
            return ['name' => (string) $r['name'], 'count' => (int) $r['count']];
        }, $stmt->fetchAll());
    }

    /** Chuỗi theo ngày, lấp đầy ngày không có dữ liệu bằng 0. */
    private function seriesByDay($pdo, $sql, $from, $days) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$from]);
        $counts = [];
        foreach ($stmt->fetchAll() as $r) {
            $counts[(string) $r['day']] = (int) $r['c'];
        }

        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $day = date('Y-m-d', strtotime($from . ' +' . $i . ' days'));
            $out[] = ['date' => $day, 'count' => $counts[$day] ?? 0];
        }
        return $out;
    }

    // ── /admin/system ─────────────────────────────────────────────────

    private function system($pdo) {
        global $AI;

        $jobs = [];
        foreach ($pdo->query(
            "SELECT name, last_run_at, last_status, last_message, last_duration_ms
               FROM job_runs ORDER BY name"
        )->fetchAll() as $r) {
            $jobs[] = [
                'name'       => $r['name'],
                'lastRunAt'  => $r['last_run_at'],
                'status'     => $r['last_status'],
                'message'    => $r['last_message'],
                'durationMs' => (int) $r['last_duration_ms'],
            ];
        }

        $counts = [];
        foreach (['users', 'scans', 'guides', 'crop_disease_alerts', 'disease_reports', 'notifications', 'admin_reports'] as $table) {
            $counts[$table] = (int) $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        }

        sendJson([
            'db'   => ['connected' => true],
            'ai'   => [
                'configured'   => ($AI['account_id'] !== '' && $AI['api_token'] !== '') || $AI['endpoint'] !== '',
                'chat_model'   => $AI['chat_model'],
                'vision_model' => $AI['vision_model'],
                'timeout'      => $AI['timeout'],
            ],
            'auth' => [
                'require_auth'  => strtolower(getenv('REQUIRE_AUTH') ?: '') === 'true',
                'require_login' => strtolower(getenv('REQUIRE_LOGIN') ?: '') === 'true',
                'admin_token'   => (string) (getenv('ADMIN_TOKEN') ?: '') !== '',
            ],
            'jobs'   => $jobs,
            'counts' => $counts,
            'time'   => date('c'),
        ]);
    }

    // ── /admin/audit ──────────────────────────────────────────────────

    private function audit($pdo) {
        [$page, $perPage, $offset] = adminPagination(30);

        $where = [];
        $params = [];
        $action = trim((string) ($_GET['action'] ?? ''));
        if ($action !== '') {
            $where[] = 'action = ?';
            $params[] = $action;
        }
        $table = trim((string) ($_GET['table'] ?? ''));
        if ($table !== '') {
            $where[] = 'target_table = ?';
            $params[] = $table;
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_log $whereSql");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT id, user_id, action, target_table, target_id, old_values, new_values, created_at
               FROM audit_log $whereSql
              ORDER BY created_at DESC
              LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);

        $items = array_map(function ($r) {
            return [
                'id'          => (int) $r['id'],
                'userId'      => $r['user_id'] !== null ? (int) $r['user_id'] : null,
                'action'      => $r['action'],
                'targetTable' => $r['target_table'],
                'targetId'    => $r['target_id'],
                'oldValues'   => $r['old_values'] ? json_decode($r['old_values'], true) : null,
                'newValues'   => $r['new_values'] ? json_decode($r['new_values'], true) : null,
                'createdAt'   => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        adminList($items, $page, $perPage, $total);
    }
}
