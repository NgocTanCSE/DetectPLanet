<?php
/**
 * AgriScan AI — Integration test GĐ4 (cần database thật).
 *
 *   docker exec agriscan-api php /var/www/html/tests/integration_g4.php
 *
 * Chạy trong một transaction rồi ROLLBACK, nên không để lại dữ liệu rác.
 * Kiểm tra: gom cụm ≥3 người → 1 alert cộng đồng + thông báo đúng tỉnh,
 * chạy lại không nhân bản, ≥5 người → severity danger, báo cáo rejected bị bỏ.
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../jobs/aggregate_reports.php';

global $pdo;
if (!$pdo) {
    fwrite(STDERR, "Không kết nối được database.\n");
    exit(1);
}

$pass = 0;
$fail = 0;
function check($name, $ok, $detail = '') {
    global $pass, $fail;
    if ($ok) { $pass++; echo "  ✓ $name\n"; }
    else { $fail++; echo "  ✗ $name" . ($detail !== '' ? " — $detail" : '') . "\n"; }
}

ensureDbSchema($pdo);

$province = 'Sơn La';
$label = 'Bệnh thử nghiệm G4 ' . bin2hex(random_bytes(3));
$slug = 'rice';

$pdo->beginTransaction();

try {
    $cropId = (int) $pdo->query("SELECT id FROM crops WHERE slug = 'rice'")->fetchColumn();

    $makeUser = function ($i) use ($pdo, $province, $cropId) {
        $pdo->prepare(
            "INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)"
        )->execute([
            'test-g4-' . $i . '-' . bin2hex(random_bytes(4)),
            'test-g4-' . $i . '@agriscan.local',
            'Test G4 ' . $i,
        ]);
        $uid = (int) $pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO user_profiles (user_id, province, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET province = EXCLUDED.province"
        )->execute([$uid, $province]);

        $pdo->prepare(
            "INSERT INTO user_crop_preferences (user_id, crop_id, is_active)
             VALUES (?, ?, 1) ON CONFLICT (user_id, crop_id) DO UPDATE SET is_active = 1"
        )->execute([$uid, $cropId]);

        return $uid;
    };

    $makeReport = function ($uid, $status = 'pending') use ($pdo, $province, $label, $slug, $cropId) {
        $id = 'rep_' . bin2hex(random_bytes(8));
        $pdo->prepare(
            "INSERT INTO disease_reports
               (id, user_id, crop_id, crop_slug, disease_label, province, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )->execute([$id, $uid, $cropId, $slug, $label, $province, $status]);
        return $id;
    };

    $u1 = $makeUser(1);
    $u2 = $makeUser(2);
    $u3 = $makeUser(3);
    $r1 = $makeReport($u1);
    $r2 = $makeReport($u2);
    $r3 = $makeReport($u3);

    echo "── 3 người cùng tỉnh báo cùng bệnh ──\n";
    $res = jobAggregateReports($pdo);
    check('job trả ok', ($res['status'] ?? '') === 'ok', json_encode($res));

    $stmt = $pdo->prepare(
        "SELECT id, severity, description, valid_to FROM crop_disease_alerts
          WHERE source = 'community' AND province = ? AND disease_label = ?"
    );
    $stmt->execute([$province, $label]);
    $alerts = $stmt->fetchAll();
    check('đúng 1 alert cộng đồng', count($alerts) === 1, 'count=' . count($alerts));
    check('severity warning (3 người)', ($alerts[0]['severity'] ?? '') === 'warning');
    check('mô tả nêu đúng số người', mb_strpos($alerts[0]['description'] ?? '', '3 người') !== false);
    check('hiệu lực 7 ngày', ($alerts[0]['valid_to'] ?? '') === date('Y-m-d', strtotime('+7 days')));

    $stmt = $pdo->prepare(
        "SELECT count(*) FROM notifications n
          JOIN users u ON u.id = n.user_id
         WHERE n.title LIKE ?"
    );
    $stmt->execute(['%' . $label . '%']);
    check('gửi 3 thông báo', (int) $stmt->fetchColumn() === 3);

    echo "── chạy lại không nhân bản ──\n";
    $res2 = jobAggregateReports($pdo);
    check('không gửi thêm thông báo', ($res2['notifications'] ?? -1) === 0);
    $stmt->execute(['%' . $label . '%']);
    check('vẫn 3 thông báo', (int) $stmt->fetchColumn() === 3);
    $stmt = $pdo->prepare(
        "SELECT count(*) FROM crop_disease_alerts WHERE source='community' AND disease_label = ?"
    );
    $stmt->execute([$label]);
    check('vẫn 1 alert', (int) $stmt->fetchColumn() === 1);

    echo "── 5 người → danger ──\n";
    $u4 = $makeUser(4);
    $u5 = $makeUser(5);
    $makeReport($u4);
    $makeReport($u5);
    jobAggregateReports($pdo);
    $stmt = $pdo->prepare(
        "SELECT severity, description FROM crop_disease_alerts
          WHERE source='community' AND disease_label = ?"
    );
    $stmt->execute([$label]);
    $row = $stmt->fetch();
    check('nâng lên danger', ($row['severity'] ?? '') === 'danger');
    check('mô tả cập nhật 5 người', mb_strpos($row['description'] ?? '', '5 người') !== false);

    echo "── báo cáo rejected không tính ──\n";
    $pdo->prepare("UPDATE disease_reports SET status='rejected' WHERE id IN (?, ?)")
        ->execute([$r2, $r3]);
    jobAggregateReports($pdo);
    $stmt = $pdo->prepare(
        "SELECT severity, description FROM crop_disease_alerts
          WHERE source='community' AND disease_label = ?"
    );
    $stmt->execute([$label]);
    $row = $stmt->fetch();
    check('còn 3 người hợp lệ', mb_strpos($row['description'] ?? '', '3 người') !== false, $row['description'] ?? '');
    check('hạ về warning', ($row['severity'] ?? '') === 'warning');

    echo "── thông báo chỉ tới đúng tỉnh ──\n";
    $other = $makeUser(6);
    $pdo->prepare("UPDATE user_profiles SET province = 'Hà Nội' WHERE user_id = ?")->execute([$other]);
    $pdo->prepare("UPDATE disease_reports SET status='pending' WHERE id IN (?, ?)")->execute([$r2, $r3]);
    $res3 = jobAggregateReports($pdo);
    $stmt = $pdo->prepare("SELECT count(*) FROM notifications WHERE user_id = ?");
    $stmt->execute([$other]);
    check('không gửi cho người tỉnh khác', (int) $stmt->fetchColumn() === 0);
    check('không phát sinh thông báo mới', ($res3['notifications'] ?? -1) === 0);

} finally {
    $pdo->rollBack();
    echo "\n──────────────────────────────\n";
    echo "$pass passed, $fail failed\n";
    echo $fail === 0 ? "OK\n" : "FAILED\n";
}

exit($fail === 0 ? 0 : 1);
