<?php
/**
 * AgriScan AI — Job: sinh cảnh báo nguy cơ bệnh theo thời tiết (GĐ2).
 *
 * Luồng: 34 tỉnh → Open-Meteo 7 ngày → chấm điểm 5 ngày đầu → upsert cảnh báo
 * (`source='weather'`) → tắt cảnh báo hết hạn.
 *
 * Chạy:
 *   php jobs/run.php weather-risk            (chạy ngay, dùng cho test/ops)
 *   php jobs/run.php loop                    (scheduler gọi mỗi 30 phút)
 */

require_once __DIR__ . '/../services/weather.php';
require_once __DIR__ . '/../services/disease_risk.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/jobs.php';

function jobWeatherRisk($pdo) {
    $enabled = strtolower((string) (getenv('WEATHER_ENABLED') ?: '1'));
    if ($enabled === '0' || $enabled === 'false' || $enabled === 'off') {
        return ['status' => 'skipped', 'message' => 'WEATHER_ENABLED=0'];
    }

    ensureDbSchema($pdo);

    $threshold = (int) (getenv('RISK_THRESHOLD') ?: 40);
    $window    = 5;

    // slug => id (bảng crops đã được ensureCrops bổ sung đủ 10 dòng).
    $cropIds = [];
    foreach ($pdo->query("SELECT id, slug FROM crops")->fetchAll() as $row) {
        $cropIds[$row['slug']] = (int) $row['id'];
    }

    $coords = vnProvinceCoords();

    // Giới hạn tỉnh khi test/ops: WEATHER_PROVINCES="Hà Nội,An Giang"
    $only = array_filter(array_map('trim', explode(',', (string) (getenv('WEATHER_PROVINCES') ?: ''))));
    if (!empty($only)) {
        $coords = array_intersect_key($coords, array_flip($only));
        if (empty($coords)) {
            return ['status' => 'error', 'message' => 'WEATHER_PROVINCES không khớp tỉnh nào.'];
        }
    }

    $rules  = riskRules();

    $created   = 0;
    $updated   = 0;
    $suppressed = 0;
    $failed    = 0;
    $alertsPerProvince = [];
    $validFrom = date('Y-m-d');
    $validTo   = date('Y-m-d', strtotime('+5 days'));

    foreach ($coords as $province => $point) {
        [$lat, $lon] = $point;

        $forecast = weatherFetchForecast($lat, $lon, 7);
        if (!$forecast) {
            $failed++;
            error_log("weather-risk: no forecast for $province");
            continue;
        }
        weatherSaveSnapshot($pdo, $province, $forecast);

        foreach ($rules as $ruleKey => $rule) {
            $cropId = $cropIds[$rule['crop']] ?? null;
            if (!$cropId) continue;

            $score = riskScore($forecast, $rule, $window);
            if ($score < $threshold) continue;

            // Đã có cảnh báo chính thức/manual cùng bệnh → không tạo bản trùng.
            if (riskHasAuthoritativeAlert($pdo, $cropId, $province, $rule)) {
                $suppressed++;
                continue;
            }

            $externalId = sprintf('weather:%s:%s:%s', $ruleKey, $province, $validFrom);
            $exists = $pdo->prepare("SELECT 1 FROM crop_disease_alerts WHERE external_id = ? LIMIT 1");
            $exists->execute([$externalId]);
            $isUpdate = (bool) $exists->fetchColumn();

            $stmt = $pdo->prepare(
                "INSERT INTO crop_disease_alerts
                   (id, crop_id, disease_name, disease_label, severity, season_months,
                    province, description, recommendation, is_active, source,
                    risk_score, valid_from, valid_to, external_id)
                 VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, 1, 'weather', ?, ?, ?, ?)
                 ON CONFLICT (external_id) WHERE external_id <> ''
                 DO UPDATE SET severity       = EXCLUDED.severity,
                               risk_score     = EXCLUDED.risk_score,
                               description    = EXCLUDED.description,
                               recommendation = EXCLUDED.recommendation,
                               valid_from     = EXCLUDED.valid_from,
                               valid_to       = EXCLUDED.valid_to,
                               is_active      = 1,
                               updated_at     = CURRENT_TIMESTAMP"
            );
            $stmt->execute([
                'alt_w_' . substr(sha1($externalId), 0, 24),
                $cropId,
                $rule['name_en'],
                $rule['label'],
                riskSeverity($score),
                $province,
                riskDescribe($forecast, $rule, $window),
                $rule['recommendation'],
                $score,
                $validFrom,
                $validTo,
                $externalId,
            ]);

            if ($isUpdate) $updated++; else $created++;
            $alertsPerProvince[$province] = ($alertsPerProvince[$province] ?? 0) + 1;
        }
    }

    // Tắt cảnh báo thời tiết đã hết hạn.
    $expired = $pdo->exec(
        "UPDATE crop_disease_alerts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE source = 'weather' AND is_active = 1
            AND valid_to IS NOT NULL AND valid_to < CURRENT_DATE"
    );

    // Dọn snapshot cũ (> 30 ngày) để bảng không phình.
    $pdo->exec("DELETE FROM weather_snapshots WHERE fetched_at < NOW() - INTERVAL '30 days'");

    $message = sprintf(
        'tỉnh=%d, tạo mới=%d, cập nhật=%d, bỏ qua do có cảnh báo chính thức=%d, lỗi mạng=%d, hết hạn=%d',
        count($coords), $created, $updated, $suppressed, $failed, (int) $expired
    );
    if ($failed === count($coords)) {
        return ['status' => 'error', 'message' => 'Không lấy được dự báo cho tỉnh nào. ' . $message];
    }

    return ['status' => 'ok', 'message' => $message, 'created' => $created, 'updated' => $updated];
}
