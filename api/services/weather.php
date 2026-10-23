<?php
/**
 * AgriScan AI — Open-Meteo adapter (GĐ2).
 *
 * Open-Meteo: miễn phí cho mục đích phi thương mại, không cần API key.
 *   https://open-meteo.com/en/docs
 *
 * Chỉ lấy dữ liệu cần cho bảng luật rủi ro:
 *   - nhiệt độ max/min/mean theo ngày
 *   - độ ẩm trung bình ngày
 *   - tổng mưa ngày
 *   - số giờ độ ẩm >= 90% (tính từ dữ liệu hourly, xấp xỉ thời gian lá ướt)
 */

/**
 * GET JSON với timeout + 1 lần thử lại. Trả null khi lỗi (không throw).
 */
function weatherHttpGet($url, $timeout = 20) {
    for ($attempt = 1; $attempt <= 2; $attempt++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT      => 'AgriScanAI/1.0 (+https://agriscan.ai)',
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($body !== false && $code >= 200 && $code < 300) {
            return $body;
        }
        error_log("weather: attempt $attempt failed (http=$code, err=$err)");
        if ($attempt === 1) usleep(800000);
    }
    return null;
}

/**
 * Lấy dự báo 7 ngày và chuẩn hoá.
 *
 * @return array|null ['days' => [['date','tmax','tmin','tmean','rh','rain','humid_hours'], ...]]
 */
function weatherFetchForecast($lat, $lon, $days = 7) {
    // Cho phép test offline bằng fixture JSON.
    $fixture = getenv('WEATHER_FIXTURE') ?: '';
    if ($fixture !== '' && is_file($fixture)) {
        $raw = json_decode((string) file_get_contents($fixture), true);
        return is_array($raw) ? weatherNormalize($raw) : null;
    }

    $base = getenv('OPEN_METEO_BASE') ?: 'https://api.open-meteo.com/v1/forecast';
    $query = http_build_query([
        'latitude'      => $lat,
        'longitude'     => $lon,
        'daily'         => 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,'
                         . 'relative_humidity_2m_mean,precipitation_sum',
        'hourly'        => 'relative_humidity_2m,precipitation',
        'timezone'      => 'Asia/Ho_Chi_Minh',
        'forecast_days' => $days,
    ]);

    $body = weatherHttpGet($base . '?' . $query);
    if ($body === null) return null;

    $raw = json_decode($body, true);
    if (!is_array($raw)) {
        error_log('weather: invalid JSON from Open-Meteo');
        return null;
    }
    return weatherNormalize($raw);
}

/**
 * Chuẩn hoá payload Open-Meteo về cấu trúc nội bộ.
 */
function weatherNormalize($raw) {
    $daily = $raw['daily'] ?? null;
    if (!is_array($daily) || empty($daily['time'])) return null;

    // Số giờ ẩm >= 90% mỗi ngày (xấp xỉ thời gian lá ướt).
    $humidByDate = [];
    $hourly = $raw['hourly'] ?? null;
    if (is_array($hourly) && !empty($hourly['time'])) {
        foreach ($hourly['time'] as $i => $ts) {
            $rh = $hourly['relative_humidity_2m'][$i] ?? null;
            if ($rh !== null && (float) $rh >= 90) {
                $date = substr((string) $ts, 0, 10);
                $humidByDate[$date] = ($humidByDate[$date] ?? 0) + 1;
            }
        }
    }

    $out = [];
    foreach ($daily['time'] as $i => $date) {
        $tmin = $daily['temperature_2m_min'][$i] ?? null;
        $tmax = $daily['temperature_2m_max'][$i] ?? null;
        if ($tmin === null || $tmax === null) continue;

        $tmean = $daily['temperature_2m_mean'][$i] ?? (($tmin + $tmax) / 2);

        $out[] = [
            'date'        => (string) $date,
            'tmax'        => round((float) $tmax, 1),
            'tmin'        => round((float) $tmin, 1),
            'tmean'       => round((float) $tmean, 1),
            'rh'          => round((float) ($daily['relative_humidity_2m_mean'][$i] ?? 0), 0),
            'rain'        => round((float) ($daily['precipitation_sum'][$i] ?? 0), 1),
            'humid_hours' => (int) ($humidByDate[(string) $date] ?? 0),
        ];
    }

    if (empty($out)) return null;

    return [
        'days'       => $out,
        'fetched_at' => gmdate('c'),
    ];
}

/**
 * Lưu bản dự báo gần nhất để debug/đối chiếu (job tự dọn bản cũ > 30 ngày).
 */
function weatherSaveSnapshot($pdo, $province, $forecast) {
    if (!is_array($forecast)) return;
    $json = json_encode($forecast, JSON_UNESCAPED_UNICODE);
    if ($json === false) return;
    $pdo->prepare("INSERT INTO weather_snapshots (province, forecast) VALUES (?, ?::jsonb)")
        ->execute([$province, $json]);
}
