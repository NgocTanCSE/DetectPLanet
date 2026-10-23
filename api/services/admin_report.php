<?php
/**
 * AgriScan AI — Admin: số liệu tổng hợp + sinh báo cáo bằng AI.
 *
 * Dùng chung cho:
 *   - POST /admin/ai/summary        (xem trước, không lưu)
 *   - POST /admin/ai/reports        (sinh + lưu)
 *   - job weekly-ai-report          (tự động mỗi thứ Hai)
 *
 * Nguyên tắc: chỉ gửi số liệu ĐÃ TỔNG HỢP cho model — không gửi email,
 * tên người dùng hay ảnh. Prompt yêu cầu chỉ dùng số liệu được cấp.
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/ai.php';

/**
 * Số liệu tổng hợp trong khoảng [from, to] (bao gồm 2 đầu, YYYY-MM-DD).
 */
function adminMetrics($pdo, $from, $to) {
    $params = [$from, $to];

    $scalar = function ($sql, array $p = []) use ($pdo) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($p);
        return (int) $stmt->fetchColumn();
    };

    $rows = function ($sql, array $p = []) use ($pdo) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($p);
        return $stmt->fetchAll();
    };

    $byDay = function ($table, $extraWhere = '') use ($pdo, $from, $to) {
        $sql = "SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS c
                  FROM $table
                 WHERE created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')
                   $extraWhere
                 GROUP BY 1 ORDER BY 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$from, $to]);

        $counts = [];
        foreach ($stmt->fetchAll() as $r) {
            $counts[$r['day']] = (int) $r['c'];
        }

        // Lấp đầy ngày không có dữ liệu để model thấy đúng xu hướng.
        $out = [];
        $totalDays = (int) floor((strtotime($to) - strtotime($from)) / 86400) + 1;
        for ($i = 0; $i < $totalDays; $i++) {
            $day = date('Y-m-d', strtotime($from . ' +' . $i . ' days'));
            $out[] = ['date' => $day, 'count' => $counts[$day] ?? 0];
        }
        return $out;
    };

    // ── Người dùng ────────────────────────────────────────────────────
    $users = [
        'total'     => $scalar("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"),
        'new'       => $scalar(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL
              AND created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')",
            $params
        ),
        'suspended' => $scalar("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'suspended'"),
        'active_7d' => $scalar(
            "SELECT COUNT(DISTINCT user_id) FROM scans
              WHERE deleted_at IS NULL AND user_id IS NOT NULL
                AND created_at >= CURRENT_DATE - INTERVAL '7 days'"
        ),
    ];

    // ── Lượt quét ─────────────────────────────────────────────────────
    $scanWhere = "deleted_at IS NULL AND created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')";
    $scanTotal = $scalar("SELECT COUNT(*) FROM scans WHERE $scanWhere", $params);

    $bySeverity = [];
    foreach ($rows(
        "SELECT severity AS k, COUNT(*) AS c FROM scans
          WHERE $scanWhere AND scan_status = 'done' GROUP BY severity",
        $params
    ) as $r) {
        $bySeverity[$r['k']] = (int) $r['c'];
    }

    $topDiseases = array_map(function ($r) {
        return ['name' => $r['name'], 'count' => (int) $r['count']];
    }, $rows(
        "SELECT disease AS name, COUNT(*) AS count FROM scans
          WHERE $scanWhere AND severity <> 'healthy'
          GROUP BY disease ORDER BY count DESC LIMIT 6",
        $params
    ));

    $topCrops = array_map(function ($r) {
        return ['name' => $r['name'], 'count' => (int) $r['count']];
    }, $rows(
        "SELECT crop_label AS name, COUNT(*) AS count FROM scans
          WHERE $scanWhere GROUP BY crop_label ORDER BY count DESC LIMIT 6",
        $params
    ));

    $topProvinces = array_map(function ($r) {
        return ['name' => $r['name'], 'count' => (int) $r['count']];
    }, $rows(
        "SELECT COALESCE(NULLIF(p.province, ''), 'Chưa rõ') AS name, COUNT(*) AS count
           FROM scans s
           LEFT JOIN user_profiles p ON p.user_id = s.user_id
          WHERE s.deleted_at IS NULL
            AND s.created_at >= ?::date AND s.created_at < (?::date + INTERVAL '1 day')
          GROUP BY 1 ORDER BY count DESC LIMIT 6",
        $params
    ));

    $avgStmt = $pdo->prepare(
        "SELECT COALESCE(AVG(confidence), 0) FROM scans
          WHERE $scanWhere AND scan_status = 'done'"
    );
    $avgStmt->execute($params);
    $avgConfidence = round((float) $avgStmt->fetchColumn(), 1);

    $scans = [
        'total'          => $scanTotal,
        'failed'         => $scalar(
            "SELECT COUNT(*) FROM scans WHERE $scanWhere AND scan_status = 'failed'",
            $params
        ),
        'avg_confidence' => $avgConfidence,
        'by_severity'    => $bySeverity,
        'top_diseases'   => $topDiseases,
        'top_crops'      => $topCrops,
        'top_provinces'  => $topProvinces,
        'by_day'         => $byDay('scans', 'AND deleted_at IS NULL'),
    ];

    // ── Cảnh báo ──────────────────────────────────────────────────────
    $alertBySource = [];
    foreach ($rows(
        "SELECT source AS k, COUNT(*) AS c FROM crop_disease_alerts WHERE is_active = 1 GROUP BY source"
    ) as $r) {
        $alertBySource[$r['k']] = (int) $r['c'];
    }

    $alerts = [
        'active' => $scalar(
            "SELECT COUNT(*) FROM crop_disease_alerts
              WHERE is_active = 1 AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)"
        ),
        'expiring_soon' => $scalar(
            "SELECT COUNT(*) FROM crop_disease_alerts
              WHERE is_active = 1 AND valid_to IS NOT NULL
                AND valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'"
        ),
        'by_source' => $alertBySource,
        'top_provinces' => array_map(function ($r) {
            return ['name' => $r['name'], 'count' => (int) $r['count']];
        }, $rows(
            "SELECT province AS name, COUNT(*) AS count FROM crop_disease_alerts
              WHERE is_active = 1 AND province <> ''
              GROUP BY province ORDER BY count DESC LIMIT 6"
        )),
    ];

    // ── Cộng đồng / tin chính thức ────────────────────────────────────
    $community = [
        'pending'  => $scalar("SELECT COUNT(*) FROM disease_reports WHERE status = 'pending'"),
        'verified' => $scalar(
            "SELECT COUNT(*) FROM disease_reports
              WHERE status = 'verified'
                AND created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')",
            $params
        ),
        'by_province' => array_map(function ($r) {
            return ['name' => $r['name'], 'count' => (int) $r['count']];
        }, $rows(
            "SELECT province AS name, COUNT(*) AS count FROM disease_reports
              WHERE province <> ''
                AND created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')
              GROUP BY province ORDER BY count DESC LIMIT 6",
            $params
        )),
    ];

    $official = [
        'pending'   => $scalar("SELECT COUNT(*) FROM official_ingest WHERE status = 'pending'"),
        'published' => $scalar("SELECT COUNT(*) FROM official_ingest WHERE status = 'approved'"),
    ];

    // ── Thông báo ─────────────────────────────────────────────────────
    $sent = $scalar(
        "SELECT COUNT(*) FROM notifications
          WHERE created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')",
        $params
    );
    $read = $scalar(
        "SELECT COUNT(*) FROM notifications
          WHERE is_read = 1 AND created_at >= ?::date AND created_at < (?::date + INTERVAL '1 day')",
        $params
    );

    return [
        'period' => ['from' => $from, 'to' => $to],
        'users'  => $users,
        'scans'  => $scans,
        'alerts' => $alerts,
        'community' => $community,
        'official'  => $official,
        'notifications' => [
            'sent'      => $sent,
            'read'      => $read,
            'read_rate' => $sent > 0 ? round($read / $sent * 100, 1) : 0,
        ],
    ];
}

/**
 * Trích object JSON đầu tiên trong text model trả về.
 */
function adminExtractJson($text) {
    if (!is_string($text)) return null;
    $s = trim($text);
    if ($s === '') return null;

    // Bỏ ```json fences nếu có.
    if (preg_match('/```[a-zA-Z]*\s*([\s\S]*?)\s*```/', $s, $m)) {
        $s = trim($m[1]);
    }

    $start = strpos($s, '{');
    if ($start === false) return null;

    $depth = 0;
    $inString = false;
    $escaped = false;
    $len = strlen($s);
    for ($i = $start; $i < $len; $i++) {
        $c = $s[$i];
        if ($inString) {
            if ($escaped) { $escaped = false; }
            elseif ($c === '\\') { $escaped = true; }
            elseif ($c === '"') { $inString = false; }
            continue;
        }
        if ($c === '"') { $inString = true; continue; }
        if ($c === '{') { $depth++; continue; }
        if ($c === '}') {
            $depth--;
            if ($depth === 0) {
                $json = substr($s, $start, $i - $start + 1);
                $data = json_decode($json, true);
                return is_array($data) ? $data : null;
            }
        }
    }
    return null;
}

/**
 * Sinh báo cáo bằng AI từ số liệu tổng hợp.
 * Trả ['ok'=>bool, 'report'=>?array, 'metrics'=>array, 'model'=>string, 'error'=>?string].
 */
function adminGenerateReport($pdo, $from, $to) {
    global $AI;

    $metrics = adminMetrics($pdo, $from, $to);

    $system = [
        'role' => 'system',
        'content' =>
            "Bạn là chuyên gia phân tích dữ liệu nông nghiệp của AgriScan AI (Việt Nam). "
            . "Nhiệm vụ: đọc số liệu tổng hợp và viết báo cáo ngắn cho quản trị viên. "
            . "Quy tắc bắt buộc: chỉ dùng số liệu được cung cấp, không bịa thêm con số hay sự kiện; "
            . "nếu số liệu quá ít thì nói rõ là ít dữ liệu; viết tiếng Việt, giọng điềm tĩnh, cụ thể. "
            . "Trả về DUY NHẤT một object JSON hợp lệ, không kèm giải thích ngoài JSON, đúng schema:\n"
            . '{"summary":"150-250 từ","highlights":[{"title":"","detail":"","level":"info|warning|danger"}],'
            . '"actions":[{"title":"","detail":"","priority":"high|medium|low"}]}',
    ];

    $user = [
        'role' => 'user',
        'content' =>
            "Khoảng thời gian: {$from} → {$to}.\n"
            . "Số liệu:\n" . json_encode($metrics, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            . "\n\nHãy viết: summary (tổng quan xu hướng + điểm bất thường), "
            . "highlights (3-5 gạch đầu dòng), actions (3 khuyến nghị ưu tiên). "
            . "CHỈ trả về JSON thuần, không markdown, không lời dẫn.",
    ];

    // Thử tối đa 2 lần: model đôi khi trả prose thay vì JSON.
    $parsed = null;
    $raw = '';
    $lastError = '';

    for ($attempt = 1; $attempt <= 2; $attempt++) {
        $messages = [$system, $user];
        if ($attempt === 2) {
            $messages[] = [
                'role' => 'user',
                'content' => 'Lần trước không đúng định dạng. Hãy trả lại DUY NHẤT object JSON '
                    . 'bắt đầu bằng { và kết thúc bằng }, không dùng ``` và không viết thêm chữ nào.',
            ];
        }

        $cf = cfAiRun($AI['chat_model'], [
            'messages'    => $messages,
            'max_tokens'  => 1200,
            'temperature' => 0.3,
            'top_p'       => 0.9,
        ]);

        if ($cf === null) {
            $lastError = 'Không kết nối được Cloudflare Workers AI.';
            continue;
        }
        if (empty($cf['success'])) {
            $lastError = 'Cloudflare AI lỗi: ' . ($cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.');
            continue;
        }

        $raw = $cf['result']['response'] ?? '';

        // Cloudflare đôi khi trả `response` dạng object/array (model xuất JSON
        // trực tiếp) thay vì string — chấp nhận cả hai.
        if (is_array($raw)) {
            $parsed = !empty($raw['summary'])
                ? $raw
                : adminExtractJson(json_encode($raw, JSON_UNESCAPED_UNICODE));
        } else {
            $parsed = adminExtractJson((string) $raw);
        }

        if ($parsed && !empty($parsed['summary'])) {
            break;
        }
        $lastError = 'Model không trả về JSON đúng định dạng. Thử lại.';
        $preview = is_string($raw) ? $raw : json_encode($raw, JSON_UNESCAPED_UNICODE);
        error_log('admin AI report parse failed (attempt ' . $attempt . '): ' . mb_substr((string) $preview, 0, 500));
    }

    if (!$parsed || empty($parsed['summary'])) {
        return ['ok' => false, 'report' => null, 'metrics' => $metrics, 'model' => $AI['chat_model'],
                'error' => $lastError !== '' ? $lastError : 'Model không trả về JSON đúng định dạng. Thử lại.'];
    }

    $highlights = [];
    foreach ((array) ($parsed['highlights'] ?? []) as $h) {
        if (!is_array($h)) continue;
        $level = in_array(($h['level'] ?? ''), ['info', 'warning', 'danger'], true) ? $h['level'] : 'info';
        $highlights[] = [
            'title'  => mb_substr(trim((string) ($h['title'] ?? '')), 0, 200),
            'detail' => mb_substr(trim((string) ($h['detail'] ?? '')), 0, 800),
            'level'  => $level,
        ];
    }

    $actions = [];
    foreach ((array) ($parsed['actions'] ?? []) as $a) {
        if (!is_array($a)) continue;
        $priority = in_array(($a['priority'] ?? ''), ['high', 'medium', 'low'], true) ? $a['priority'] : 'medium';
        $actions[] = [
            'title'    => mb_substr(trim((string) ($a['title'] ?? '')), 0, 200),
            'detail'   => mb_substr(trim((string) ($a['detail'] ?? '')), 0, 800),
            'priority' => $priority,
        ];
    }

    return [
        'ok'    => true,
        'model' => $AI['chat_model'],
        'error' => null,
        'metrics' => $metrics,
        'report'  => [
            'summary'    => mb_substr(trim((string) $parsed['summary']), 0, 4000),
            'highlights' => array_slice($highlights, 0, 6),
            'actions'    => array_slice($actions, 0, 5),
        ],
    ];
}

/**
 * Lưu báo cáo vào admin_reports. Trả id.
 */
function adminSaveReport($pdo, $from, $to, array $report, array $metrics, $model, $title = '') {
    $id = 'rpt_' . substr(bin2hex(random_bytes(12)), 0, 20);
    if ($title === '') {
        $title = 'Báo cáo ' . date('d/m/Y', strtotime($from)) . ' – ' . date('d/m/Y', strtotime($to));
    }

    $stmt = $pdo->prepare(
        "INSERT INTO admin_reports
            (id, title, period_start, period_end, summary, highlights, actions, metrics, model)
         VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?)"
    );
    $stmt->execute([
        $id,
        mb_substr($title, 0, 255),
        $from,
        $to,
        (string) $report['summary'],
        json_encode($report['highlights'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($report['actions'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($metrics, JSON_UNESCAPED_UNICODE),
        mb_substr((string) $model, 0, 128),
    ]);

    return $id;
}

/**
 * Job: báo cáo tuần tự động (7 ngày gần nhất) và lưu lại.
 * Trả ['ok'=>bool, 'message'=>string, 'id'=>?string].
 */
function adminWeeklyReport($pdo) {
    $to = date('Y-m-d');
    $from = date('Y-m-d', strtotime('-6 days'));

    $result = adminGenerateReport($pdo, $from, $to);
    if (!$result['ok']) {
        return ['ok' => false, 'message' => $result['error'] ?? 'Lỗi không xác định', 'id' => null];
    }

    $id = adminSaveReport(
        $pdo,
        $from,
        $to,
        $result['report'],
        $result['metrics'],
        $result['model'],
        'Báo cáo tuần ' . date('d/m/Y', strtotime($from)) . ' – ' . date('d/m/Y', strtotime($to))
    );

    return ['ok' => true, 'message' => 'Đã tạo báo cáo tuần ' . $id, 'id' => $id];
}
