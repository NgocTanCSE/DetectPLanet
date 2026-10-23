<?php
/**
 * AgriScan AI — Vietnamese text helpers.
 *
 * Một chỗ duy nhất để bỏ dấu tiếng Việt, tránh mỗi service tự viết một bảng map
 * (dẫn tới so khớp lệch nhau giữa cảnh báo thời tiết và tin chính thức).
 */

/**
 * Bỏ dấu + lowercase + gom mọi ký tự không phải chữ/số thành một khoảng trắng.
 *
 * "Bệnh Đạo Ôn" → "benh dao on"
 */
function vnFold($value) {
    $value = mb_strtolower(trim((string) $value), 'UTF-8');

    static $map = null;
    if ($map === null) {
        $map = [
            'à' => 'a', 'á' => 'a', 'ả' => 'a', 'ã' => 'a', 'ạ' => 'a',
            'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a', 'ặ' => 'a',
            'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ậ' => 'a',
            'è' => 'e', 'é' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ẹ' => 'e',
            'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ể' => 'e', 'ễ' => 'e', 'ệ' => 'e',
            'ì' => 'i', 'í' => 'i', 'ỉ' => 'i', 'ĩ' => 'i', 'ị' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ọ' => 'o',
            'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ộ' => 'o',
            'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ở' => 'o', 'ỡ' => 'o', 'ợ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ụ' => 'u',
            'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ử' => 'u', 'ữ' => 'u', 'ự' => 'u',
            'ỳ' => 'y', 'ý' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'ỵ' => 'y',
            'đ' => 'd',
            'ß' => 'ss',
        ];
    }

    $value = strtr($value, $map);
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value);

    return trim(preg_replace('/\s+/', ' ', $value));
}

/**
 * Text có chứa cụm từ khoá không (so khớp sau khi bỏ dấu, theo ranh giới từ).
 */
function vnContains($haystack, $needle) {
    $hay = ' ' . vnFold($haystack) . ' ';
    $needle = vnFold($needle);
    if ($needle === '') return false;
    return strpos($hay, ' ' . $needle . ' ') !== false;
}
