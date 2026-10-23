<?php
/**
 * AgriScan AI — 34 đơn vị hành chính cấp tỉnh (sau sáp nhập 12/6/2025).
 * Dùng để gắn cảnh báo dịch bệnh theo khu vực và để lưu vị trí người dùng.
 *
 * Giữ danh sách này đồng bộ với frontend/utils/provinces.js.
 */

require_once __DIR__ . '/text.php';
function vnProvinces() {
    return [
        'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Cần Thơ',
        'Đà Nẵng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
        'Gia Lai', 'Hà Nội', 'Hà Tĩnh', 'Hải Phòng', 'Hưng Yên',
        'Huế', 'Khánh Hòa', 'Lai Châu', 'Lạng Sơn', 'Lào Cai',
        'Lâm Đồng', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ninh',
        'Quảng Ngãi', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên',
        'Thanh Hóa', 'TP. Hồ Chí Minh', 'Tuyên Quang', 'Vĩnh Long',
    ];
}

function isVnProvince($name) {
    return in_array(trim((string) $name), vnProvinces(), true);
}

/**
 * Toạ độ tâm hành chính của 34 tỉnh/thành (dùng cho API thời tiết).
 * Sai số vài km không ảnh hưởng dự báo cấp tỉnh.
 *
 * Trả về ['Tỉnh' => [lat, lon], ...] — phải phủ đủ vnProvinces().
 */
function vnProvinceCoords() {
    return [
        'An Giang'          => [10.3864, 105.4352],
        'Bắc Ninh'          => [21.1861, 106.0763],
        'Cà Mau'            => [9.1769, 105.1524],
        'Cao Bằng'          => [22.6657, 106.2522],
        'Cần Thơ'           => [10.0452, 105.7469],
        'Đà Nẵng'           => [16.0544, 108.2022],
        'Đắk Lắk'           => [12.6667, 108.0500],
        'Điện Biên'         => [21.3860, 103.0230],
        'Đồng Nai'          => [10.9574, 106.8427],
        'Đồng Tháp'         => [10.4938, 105.6882],
        'Gia Lai'           => [13.9833, 108.0000],
        'Hà Nội'            => [21.0285, 105.8542],
        'Hà Tĩnh'           => [18.3559, 105.8878],
        'Hải Phòng'         => [20.8449, 106.6881],
        'Hưng Yên'          => [20.6464, 106.0511],
        'Huế'               => [16.4637, 107.5909],
        'Khánh Hòa'         => [12.2388, 109.1967],
        'Lai Châu'          => [22.3964, 103.4580],
        'Lạng Sơn'          => [21.8537, 106.7615],
        'Lào Cai'           => [22.4856, 103.9707],
        'Lâm Đồng'          => [11.9404, 108.4583],
        'Nghệ An'           => [18.6796, 105.6813],
        'Ninh Bình'         => [20.2506, 105.9745],
        'Phú Thọ'           => [21.3227, 105.4019],
        'Quảng Ninh'        => [20.9599, 107.0424],
        'Quảng Ngãi'        => [15.1205, 108.7923],
        'Quảng Trị'         => [16.8163, 107.1000],
        'Sơn La'            => [21.3256, 103.9188],
        'Tây Ninh'          => [11.3100, 106.0986],
        'Thái Nguyên'       => [21.5942, 105.8480],
        'Thanh Hóa'         => [19.8067, 105.7852],
        'TP. Hồ Chí Minh'   => [10.7769, 106.7009],
        'Tuyên Quang'       => [21.8236, 105.2140],
        'Vĩnh Long'         => [10.2537, 105.9722],
    ];
}


/**
 * Tên tỉnh CŨ (trước sáp nhập 2025) → tên MỚI.
 * Dùng để đọc tin báo chí vẫn ghi địa danh cũ.
 *
 * Nguồn: Nghị quyết 202/2025/QH15 (sáp nhập cấp tỉnh, hiệu lực 01/7/2025).
 * Tỉnh không sáp nhập vẫn có mặt (map về chính nó).
 */
function vnProvinceMerges() {
    return [
        'Hà Nội'            => ['Hà Nội'],

        'TP. Hồ Chí Minh'   => ['TP. Hồ Chí Minh', 'TP.Hồ Chí Minh', 'TP Hồ Chí Minh',
                                'Hồ Chí Minh', 'Sài Gòn', 'Bình Dương',
                                'Bà Rịa - Vũng Tàu', 'Bà Rịa-Vũng Tàu', 'Vũng Tàu'],

        'Hải Phòng'         => ['Hải Phòng', 'Hải Dương'],
        'Đà Nẵng'           => ['Đà Nẵng', 'Quảng Nam'],
        'Cần Thơ'           => ['Cần Thơ', 'Sóc Trăng', 'Hậu Giang'],
        'Huế'               => ['Huế', 'Thừa Thiên Huế', 'Thừa Thiên-Huế'],

        'An Giang'          => ['An Giang', 'Kiên Giang'],
        'Cà Mau'            => ['Cà Mau', 'Bạc Liêu'],
        'Đồng Tháp'         => ['Đồng Tháp', 'Tiền Giang'],
        'Vĩnh Long'         => ['Vĩnh Long', 'Bến Tre', 'Trà Vinh'],
        'Tây Ninh'          => ['Tây Ninh', 'Long An'],
        'Đồng Nai'          => ['Đồng Nai', 'Bình Phước'],
        'Lâm Đồng'          => ['Lâm Đồng', 'Đắk Nông', 'Đắc Nông', 'Bình Thuận'],
        'Đắk Lắk'           => ['Đắk Lắk', 'Đắc Lắk', 'Phú Yên'],
        'Gia Lai'           => ['Gia Lai', 'Bình Định'],
        'Khánh Hòa'         => ['Khánh Hòa', 'Khánh Hoà', 'Ninh Thuận'],
        'Quảng Ngãi'        => ['Quảng Ngãi', 'Kon Tum'],
        'Quảng Trị'         => ['Quảng Trị', 'Quảng Bình'],

        'Ninh Bình'         => ['Ninh Bình', 'Hà Nam', 'Nam Định'],
        'Hưng Yên'          => ['Hưng Yên', 'Thái Bình'],
        'Bắc Ninh'          => ['Bắc Ninh', 'Bắc Giang'],
        'Phú Thọ'           => ['Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình', 'Hoà Bình'],
        'Thái Nguyên'       => ['Thái Nguyên', 'Bắc Kạn', 'Bắc Cạn'],
        'Lào Cai'           => ['Lào Cai', 'Yên Bái'],
        'Tuyên Quang'       => ['Tuyên Quang', 'Hà Giang'],

        'Cao Bằng'          => ['Cao Bằng'],
        'Lạng Sơn'          => ['Lạng Sơn'],
        'Quảng Ninh'        => ['Quảng Ninh'],
        'Lai Châu'          => ['Lai Châu'],
        'Điện Biên'         => ['Điện Biên'],
        'Sơn La'            => ['Sơn La'],
        'Thanh Hóa'         => ['Thanh Hóa', 'Thanh Hoá'],
        'Nghệ An'           => ['Nghệ An'],
        'Hà Tĩnh'           => ['Hà Tĩnh'],
    ];
}

/**
 * Tìm mọi tỉnh được nhắc trong một đoạn text (đã map về 34 tên mới).
 *
 * - Bỏ dấu trước khi so khớp (báo chí đôi khi viết không dấu).
 * - Khớp theo ranh giới từ, ưu tiên cụm dài trước để "Bà Rịa - Vũng Tàu"
 *   không bị cắt thành "Vũng Tàu" rồi map sai.
 *
 * @return string[] tên tỉnh mới, không trùng
 */
function matchProvinces($text) {
    $hay = ' ' . vnFold($text) . ' ';
    if (trim($hay) === '') return [];

    $aliases = [];
    foreach (vnProvinceMerges() as $canonical => $names) {
        foreach ($names as $name) {
            $folded = vnFold($name);
            if ($folded !== '') $aliases[$folded] = $canonical;
        }
    }
    // Cụm dài trước: tránh khớp nhầm tỉnh ngắn nằm trong tên dài.
    uksort($aliases, fn($a, $b) => strlen($b) <=> strlen($a));

    $found = [];
    foreach ($aliases as $folded => $canonical) {
        if (strpos($hay, ' ' . $folded . ' ') !== false) {
            $found[$canonical] = true;
        }
    }
    return array_keys($found);
}
