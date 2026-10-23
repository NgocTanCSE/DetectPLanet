<?php
/**
 * AgriScan AI — Bảng luật rủi ro bệnh theo thời tiết (GĐ2).
 *
 * NGUYÊN TẮC:
 *  - Chỉ đưa vào những bệnh có ngưỡng nhiệt độ/độ ẩm được hướng dẫn BVTV
 *    phổ biến mô tả rõ. Cây chưa đủ căn cứ thì KHÔNG đoán.
 *  - Kết quả là "nguy cơ", không phải "đã có dịch". UI phải ghi rõ điều này.
 *  - Ngưỡng cần chuyên gia nông nghiệp duyệt trước khi bật cho người dùng thật.
 *
 * Điểm: cộng dồn theo ngày trong cửa sổ 5 ngày, tối đa 100.
 *   >= 60  -> danger
 *   40-59  -> warning
 *   < 40   -> không tạo cảnh báo
 */

require_once __DIR__ . '/text.php';

function riskRules() {
    return [
        'rice_blast' => [
            'crop'       => 'rice',
            'name_en'    => 'Rice blast',
            'label'      => 'Bệnh đạo ôn',
            'pathogen'   => 'Pyricularia oryzae',
            'aliases'    => ['rice blast', 'bệnh đạo ôn', 'đạo ôn'],
            'points'     => 25,
            'consecutive'=> 0,
            // Đêm mát 20-26°C + ẩm cao + mưa/sương là điều kiện bào tử nảy mầm.
            'test'       => function (array $d) {
                return $d['tmin'] >= 20 && $d['tmin'] <= 26
                    && $d['rh'] >= 90
                    && ($d['rain'] > 0 || $d['humid_hours'] >= 10);
            },
            'recommendation' => 'Thăm đồng 2–3 ngày/lần, chú ý lá già và vết bệnh hình thoi. '
                . 'Giữ nước nông, bón cân đối đạm–lân–kali, tránh bón đạm muộn. '
                . 'Khi bệnh chớm xuất hiện có thể dùng thuốc chứa hoạt chất tricyclazole '
                . 'hoặc isoprothiolane theo liều khuyến cáo trên nhãn.',
        ],

        'rice_sheath_blight' => [
            'crop'       => 'rice',
            'name_en'    => 'Sheath blight',
            'label'      => 'Bệnh khô vằn',
            'pathogen'   => 'Rhizoctonia solani',
            'aliases'    => ['sheath blight', 'bệnh khô vằn', 'khô vằn'],
            'points'     => 20,
            'consecutive'=> 0,
            // Nóng ẩm + mưa to là điều kiện lan nhanh của khô vằn.
            'test'       => function (array $d) {
                return $d['tmean'] >= 28 && $d['tmean'] <= 32
                    && $d['rh'] >= 85
                    && $d['rain'] >= 5;
            },
            'recommendation' => 'Vệ sinh đồng ruộng, xử lý rơm rạ trước vụ. '
                . 'Tránh để ruộng quá ẩm kéo dài, bón cân đối đạm. '
                . 'Khi bệnh chớm, có thể dùng thuốc chứa hexaconazole hoặc validamycin '
                . 'theo liều khuyến cáo.',
        ],

        'rice_bacterial_blight' => [
            'crop'       => 'rice',
            'name_en'    => 'Bacterial blight',
            'label'      => 'Bệnh bạc lá',
            'pathogen'   => 'Xanthomonas oryzae',
            'aliases'    => ['bacterial blight', 'bệnh bạc lá', 'bạc lá'],
            'points'     => 15,
            'consecutive'=> 0,
            // Mưa lớn + ấm là điều kiện lây lan qua nước.
            'test'       => function (array $d) {
                return $d['tmean'] >= 25 && $d['tmean'] <= 30 && $d['rain'] >= 10;
            },
            'recommendation' => 'Hạn chế bón đạm muộn, giữ mực nước hợp lý và thoát nước sau mưa lớn. '
                . 'Khi bệnh chớm có thể dùng thuốc chứa validamycin hoặc oxolinic acid '
                . 'theo liều khuyến cáo; không phun khi trời sắp mưa.',
        ],

        'tomato_late_blight' => [
            'crop'       => 'tomato',
            'name_en'    => 'Late blight',
            'label'      => 'Bệnh mốc sương',
            'pathogen'   => 'Phytophthora infestans',
            'aliases'    => ['late blight', 'bệnh mốc sương', 'mốc sương'],
            'points'     => 35,
            'consecutive'=> 2, // cần >= 2 ngày liên tiếp mát + ẩm cao
            'test'       => function (array $d) {
                return $d['tmean'] >= 15 && $d['tmean'] <= 22 && $d['rh'] >= 90;
            },
            'recommendation' => 'Tỉa lá gốc, tăng thông thoáng và che mưa cho luống. '
                . 'Khi thời tiết mát ẩm kéo dài, phun phòng bằng hoạt chất mancozeb '
                . 'hoặc chlorothalonil; luân phiên hoạt chất để tránh kháng thuốc.',
        ],

        'tomato_early_blight' => [
            'crop'       => 'tomato',
            'name_en'    => 'Early blight',
            'label'      => 'Bệnh đốm lá sớm',
            'pathogen'   => 'Alternaria solani',
            'aliases'    => ['early blight', 'bệnh vàng lá (early blight)', 'đốm lá sớm', 'bệnh đốm lá sớm'],
            'points'     => 15,
            'consecutive'=> 0,
            'test'       => function (array $d) {
                return $d['tmean'] >= 24 && $d['tmean'] <= 29
                    && $d['rh'] >= 85
                    && $d['rain'] > 0;
            },
            'recommendation' => 'Luân canh với cây khác họ, dọn tàn dư lá bệnh. '
                . 'Tỉa lá gốc để hạn chế bắn đất. Khi bệnh chớm có thể dùng mancozeb '
                . 'hoặc difenoconazole theo liều khuyến cáo.',
        ],

        'potato_late_blight' => [
            'crop'       => 'potato',
            'name_en'    => 'Late blight',
            'label'      => 'Bệnh mốc sương',
            'pathogen'   => 'Phytophthora infestans',
            'aliases'    => ['late blight', 'bệnh mốc sương', 'mốc sương'],
            'points'     => 35,
            'consecutive'=> 2,
            'test'       => function (array $d) {
                return $d['tmean'] >= 15 && $d['tmean'] <= 22 && $d['rh'] >= 90;
            },
            'recommendation' => 'Vun luống cao, thoát nước tốt, không tưới lên lá vào chiều tối. '
                . 'Khi thời tiết mát ẩm kéo dài, phun phòng mancozeb hoặc chlorothalonil '
                . 'và luân phiên hoạt chất.',
        ],
    ];
}

/**
 * Điểm rủi ro 0-100 cho một luật, dựa trên N ngày đầu của dự báo.
 */
function riskScore($forecast, array $rule, $window = 5) {
    $days = array_slice($forecast['days'] ?? [], 0, $window);
    if (empty($days)) return 0;

    $test = $rule['test'];
    $hits = [];
    foreach ($days as $d) {
        $hits[] = (bool) $test($d);
    }

    // Một số bệnh cần chuỗi ngày liên tiếp (ví dụ mốc sương >= 2 ngày).
    $need = (int) ($rule['consecutive'] ?? 0);
    if ($need > 0) {
        $best = 0;
        $run = 0;
        foreach ($hits as $hit) {
            $run = $hit ? $run + 1 : 0;
            $best = max($best, $run);
        }
        if ($best < $need) return 0;
    }

    $score = 0;
    foreach ($hits as $hit) {
        if ($hit) $score += (int) $rule['points'];
    }
    return min(100, $score);
}

function riskSeverity($score) {
    if ($score >= 60) return 'danger';
    if ($score >= 40) return 'warning';
    return '';
}

/**
 * Mô tả có số liệu cụ thể (không dùng câu chung chung).
 */
function riskDescribe($forecast, array $rule, $window = 5) {
    $days = array_slice($forecast['days'] ?? [], 0, $window);
    if (empty($days)) return '';

    $test = $rule['test'];
    $hits = array_values(array_filter($days, function ($d) use ($test) {
        return (bool) $test($d);
    }));
    if (empty($hits)) return '';

    $tmin = min(array_column($hits, 'tmin'));
    $rh   = max(array_column($hits, 'rh'));
    $rain = array_sum(array_column($hits, 'rain'));

    return sprintf(
        'Dự báo %d ngày tới có %d ngày thuận lợi cho bệnh phát triển: '
        . 'nhiệt độ thấp nhất %.0f°C, độ ẩm tới %.0f%%, tổng mưa %.0f mm. '
        . 'Đây là nguy cơ theo thời tiết, chưa phải xác nhận có dịch.',
        $window,
        count($hits),
        $tmin,
        $rh,
        $rain
    );
}

/**
 * Chuẩn hoá tên bệnh để so khớp giữa cảnh báo manual (tiếng Anh) và weather.
 */
function riskNormalizeName($value) {
    return vnFold($value);
}

/**
 * Đã có cảnh báo "có thẩm quyền" trùng bệnh chưa?
 *
 * - `official`: chặn ở mọi phạm vi (toàn quốc hoặc đúng tỉnh) — tin có nguồn.
 * - `manual`: chỉ chặn khi đúng tỉnh. Các dòng manual cấp toàn quốc là dữ liệu
 *   catalogue/demo, không phải xác nhận dịch, nên không được che dự báo địa phương.
 */
function riskHasAuthoritativeAlert($pdo, $cropId, $province, array $rule) {
    $stmt = $pdo->prepare(
        "SELECT disease_name, disease_label, source, province
           FROM crop_disease_alerts
          WHERE crop_id = ?
            AND source IN ('manual', 'official')
            AND is_active = 1
            AND (province = '' OR province = ?)
            AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)"
    );
    $stmt->execute([$cropId, $province]);

    $aliases = array_map('riskNormalizeName', $rule['aliases']);
    $aliases[] = riskNormalizeName($rule['label']);

    foreach ($stmt->fetchAll() as $row) {
        if ($row['source'] === 'manual' && ($row['province'] ?? '') === '') {
            continue;
        }
        $a = riskNormalizeName($row['disease_name']);
        $b = riskNormalizeName($row['disease_label']);
        foreach ($aliases as $alias) {
            if ($alias === '') continue;
            if (strpos($a, $alias) !== false || strpos($b, $alias) !== false) {
                return true;
            }
        }
    }
    return false;
}
