<?php
/**
 * AgriScan AI — Job: gom báo cáo cộng đồng thành cảnh báo (GĐ4).
 *
 * Cứ mỗi giờ:
 *   1. Nhóm báo cáo 7 ngày qua theo (tỉnh, cây, bệnh).
 *   2. Nhóm có >= COMMUNITY_MIN_USERS người khác nhau → upsert alert
 *      source='community', hiệu lực 7 ngày.
 *   3. Gửi thông báo trong app cho người cùng tỉnh đang theo dõi cây đó
 *      (mỗi người 1 thông báo/alert, không gửi lại).
 *   4. Tắt alert cộng đồng đã hết hạn.
 *
 * Chạy: php jobs/run.php aggregate-reports
 */

require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/jobs.php';

function jobAggregateReports($pdo) {
    ensureDbSchema($pdo);

    $minUsers = (int) (getenv('COMMUNITY_MIN_USERS') ?: 3);
    if ($minUsers < 2) $minUsers = 2;

    // "verified" (>=2 người xác nhận) tính hệ số 2 khi xét mức độ.
    $stmt = $pdo->prepare(
        "SELECT province, crop_slug, disease_label,
                count(DISTINCT user_id) AS users,
                sum(CASE WHEN status = 'verified' THEN 2 ELSE 1 END) AS weight
           FROM disease_reports
          WHERE status <> 'rejected'
            AND province <> ''
            AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY province, crop_slug, disease_label
         HAVING count(DISTINCT user_id) >= ?
          ORDER BY users DESC"
    );
    $stmt->execute([$minUsers]);
    $clusters = $stmt->fetchAll();

    $upsert = $pdo->prepare(
        "INSERT INTO crop_disease_alerts
           (id, crop_id, disease_name, disease_label, severity, season_months, province,
            description, recommendation, is_active, source, risk_score,
            valid_from, valid_to, external_id, source_url)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, 1, 'community', 0, ?, ?, ?, '')
         ON CONFLICT (external_id) WHERE external_id <> ''
         DO UPDATE SET severity       = EXCLUDED.severity,
                       description    = EXCLUDED.description,
                       recommendation = EXCLUDED.recommendation,
                       valid_from     = EXCLUDED.valid_from,
                       valid_to       = EXCLUDED.valid_to,
                       is_active      = 1,
                       updated_at     = CURRENT_TIMESTAMP"
    );

    $cropStmt = $pdo->prepare("SELECT id, label FROM crops WHERE slug = ? LIMIT 1");

    $today = date('Y-m-d');
    $validTo = date('Y-m-d', strtotime('+7 days'));

    $alerts = 0;
    $notifications = 0;

    foreach ($clusters as $c) {
        $cropStmt->execute([$c['crop_slug'] ?: 'other']);
        $crop = $cropStmt->fetch();
        if (!$crop) continue;

        $users = (int) $c['users'];
        $severity = $users >= 5 ? 'danger' : 'warning';
        $province = $c['province'];
        $label = $c['disease_label'];

        $externalId = 'community:' . sha1($province . '|' . $c['crop_slug'] . '|' . $label);
        $alertId = 'alt_c_' . substr(sha1($externalId), 0, 24);

        $description = sprintf(
            '%d người tại %s báo cáo %s trên %s trong 7 ngày qua.',
            $users,
            $province,
            $label,
            $crop['label']
        );
        $recommendation = 'Đây là tín hiệu từ cộng đồng, chưa phải kết luận của cơ quan chuyên môn. '
            . 'Kiểm tra đồng ruộng, đối chiếu với khuyến nông địa phương và chỉ xử lý khi xác định đúng bệnh.';

        $upsert->execute([
            $alertId,
            (int) $crop['id'],
            $label,
            $label,
            $severity,
            $province,
            $description,
            $recommendation,
            $today,
            $validTo,
            $externalId,
        ]);
        $alerts++;

        // Người cùng tỉnh đang theo dõi cây này → 1 thông báo/alert/người.
        $recipients = $pdo->prepare(
            "SELECT DISTINCT u.id
               FROM users u
               JOIN user_profiles p ON p.user_id = u.id AND p.province = ?
               JOIN user_crop_preferences pref
                    ON pref.user_id = u.id AND pref.crop_id = ? AND pref.is_active = 1
              WHERE NOT EXISTS (
                    SELECT 1 FROM notifications n
                     WHERE n.user_id = u.id
                       AND n.data->>'alertId' = ?
              )"
        );
        $recipients->execute([$province, (int) $crop['id'], $alertId]);

        $insertNote = $pdo->prepare(
            "INSERT INTO notifications (id, user_id, title, body, type, data)
             VALUES (?, ?, ?, ?, 'alert', ?::jsonb)
             ON CONFLICT DO NOTHING"
        );

        foreach ($recipients->fetchAll() as $u) {
            $uid = (int) $u['id'];
            $noteId = 'ntf_' . substr(sha1($alertId . '|' . $uid), 0, 24);
            $insertNote->execute([
                $noteId,
                $uid,
                'Cảnh báo cộng đồng: ' . $label . ' — ' . $crop['label'],
                $description . ' Mở mục Cảnh báo để xem chi tiết.',
                json_encode([
                    'alertId'  => $alertId,
                    'deepLink' => 'alerts',
                    'province' => $province,
                ], JSON_UNESCAPED_UNICODE),
            ]);
            if ($insertNote->rowCount() > 0) $notifications++;
        }
    }

    $expired = $pdo->exec(
        "UPDATE crop_disease_alerts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE source = 'community' AND is_active = 1
            AND valid_to IS NOT NULL AND valid_to < CURRENT_DATE"
    );

    return [
        'status'  => 'ok',
        'message' => sprintf(
            'cụm=%d, alert=%d, thông báo mới=%d, hết hạn=%d',
            count($clusters),
            $alerts,
            $notifications,
            (int) $expired
        ),
        'alerts'        => $alerts,
        'notifications' => $notifications,
    ];
}
