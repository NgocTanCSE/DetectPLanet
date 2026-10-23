<?php
/**
 * AgriScan AI — Từ điển cây trồng / dịch hại cho tin chính thức (GĐ3).
 *
 * Mục tiêu: từ tiêu đề + nội dung bài báo, rút ra (tỉnh, cây, bệnh, mức độ)
 * một cách thận trọng. Không đoán bừa: không khớp từ điển thì để trống và
 * chuyển cho người duyệt.
 */

require_once __DIR__ . '/text.php';

/**
 * Danh mục dịch hại nhận diện được.
 * `label` dùng làm disease_label khi tạo cảnh báo (khớp với nhãn ở GĐ2).
 */
function pestCatalog() {
    return [
        'rice_blast' => [
            'label'   => 'Bệnh đạo ôn',
            'name_en' => 'Rice blast',
            'crop'    => 'rice',
            'aliases' => ['đạo ôn', 'bệnh đạo ôn', 'blast'],
        ],
        'rice_sheath_blight' => [
            'label'   => 'Bệnh khô vằn',
            'name_en' => 'Sheath blight',
            'crop'    => 'rice',
            'aliases' => ['khô vằn', 'bệnh khô vằn'],
        ],
        'rice_bacterial_blight' => [
            'label'   => 'Bệnh bạc lá',
            'name_en' => 'Bacterial blight',
            'crop'    => 'rice',
            'aliases' => ['bạc lá', 'bệnh bạc lá', 'cháy bìa lá'],
        ],
        'rice_grassy_stunt' => [
            'label'   => 'Bệnh vàng lùn, lùn xoắn lá',
            'name_en' => 'Grassy stunt',
            'crop'    => 'rice',
            'aliases' => ['vàng lùn', 'lùn xoắn lá', 'lùn xoắn'],
        ],
        'brown_planthopper' => [
            'label'   => 'Rầy nâu',
            'name_en' => 'Brown planthopper',
            'crop'    => 'rice',
            'aliases' => ['rầy nâu', 'ray nau'],
        ],
        'leaf_folder' => [
            'label'   => 'Sâu cuốn lá nhỏ',
            'name_en' => 'Leaf folder',
            'crop'    => 'rice',
            'aliases' => ['sâu cuốn lá', 'cuốn lá nhỏ'],
        ],
        'golden_snail' => [
            'label'   => 'Ốc bươu vàng',
            'name_en' => 'Golden apple snail',
            'crop'    => 'rice',
            'aliases' => ['ốc bươu vàng'],
        ],
        'rodent' => [
            'label'   => 'Chuột hại',
            'name_en' => 'Rodent',
            'crop'    => 'rice',
            'aliases' => ['chuột hại', 'chuột phá', 'diệt chuột'],
        ],

        'late_blight' => [
            'label'   => 'Bệnh mốc sương',
            'name_en' => 'Late blight',
            'crop'    => 'tomato',
            'aliases' => ['mốc sương', 'bệnh mốc sương', 'late blight'],
        ],
        'early_blight' => [
            'label'   => 'Bệnh đốm lá sớm',
            'name_en' => 'Early blight',
            'crop'    => 'tomato',
            'aliases' => ['đốm lá sớm', 'bệnh đốm lá', 'early blight'],
        ],

        'coffee_rust' => [
            'label'   => 'Bệnh gỉ sắt',
            'name_en' => 'Coffee rust',
            'crop'    => 'coffee',
            'aliases' => ['gỉ sắt', 'bệnh gỉ sắt', 'rỉ sắt'],
        ],
        'anthracnose' => [
            'label'   => 'Bệnh thán thư',
            'name_en' => 'Anthracnose',
            'crop'    => 'pepper',
            'aliases' => ['thán thư', 'bệnh thán thư'],
        ],
        'fall_armyworm' => [
            'label'   => 'Sâu keo mùa thu',
            'name_en' => 'Fall armyworm',
            'crop'    => 'maize',
            'aliases' => ['sâu keo mùa thu', 'sâu keo'],
        ],
        'dragon_fruit_canker' => [
            'label'   => 'Bệnh chổi rồng',
            'name_en' => 'Witches broom',
            'crop'    => 'fruit',
            'aliases' => ['chổi rồng', 'bệnh chổi rồng'],
        ],
        'pink_mealybug' => [
            'label'   => 'Rệp sáp bột hồng',
            'name_en' => 'Pink cassava mealybug',
            'crop'    => 'other',
            'aliases' => ['rệp sáp bột hồng', 'rệp sáp', 'rệp bột hồng'],
        ],
    ];
}

/**
 * Cây trồng nhận diện từ text → slug trong bảng crops.
 */
function cropCatalog() {
    return [
        'rice'      => ['lúa', 'lúa nước', 'cây lúa'],
        'tomato'    => ['cà chua'],
        'maize'     => ['ngô', 'bắp', 'cây ngô'],
        'potato'    => ['khoai tây'],
        'coffee'    => ['cà phê', 'cây cà phê'],
        'pepper'    => ['hồ tiêu', 'cây tiêu', 'tiêu'],
        'soybean'   => ['đậu nành', 'đậu tương'],
        'vegetable' => ['rau cải', 'rau màu', 'rau'],
        'fruit'     => ['cây ăn trái', 'cây ăn quả', 'nhãn', 'xoài', 'thanh long', 'sầu riêng', 'cam', 'bưởi'],
        'other'     => ['sắn', 'khoai mì', 'mía', 'điều', 'cao su'],
    ];
}

/**
 * @return array<int, array{label:string,name_en:string,crop:string,key:string}>
 */
function extractPests($text) {
    $hits = [];
    foreach (pestCatalog() as $key => $pest) {
        foreach ($pest['aliases'] as $alias) {
            if (vnContains($text, $alias)) {
                $hits[] = [
                    'key'     => $key,
                    'label'   => $pest['label'],
                    'name_en' => $pest['name_en'],
                    'crop'    => $pest['crop'],
                ];
                break;
            }
        }
    }
    return $hits;
}

/**
 * @return string[] slug cây trồng
 */
function extractCrops($text) {
    $found = [];
    foreach (cropCatalog() as $slug => $aliases) {
        foreach ($aliases as $alias) {
            if (vnContains($text, $alias)) {
                $found[$slug] = true;
                break;
            }
        }
    }
    return array_keys($found);
}

/**
 * Mức độ cảnh báo từ nội dung bài.
 *
 * 'danger'  — công bố dịch / bùng phát / diện rộng
 * 'warning' — xuất hiện, gây hại, cần phòng trừ
 * ''        — không đủ căn cứ (hoặc tin "hết dịch")
 */
function severityFromText($text) {
    if (vnContains($text, 'hết dịch') || vnContains($text, 'dập dịch')
        || vnContains($text, 'khống chế dịch') || vnContains($text, 'công bố hết dịch')) {
        return '';
    }

    $danger = ['công bố dịch', 'bùng phát', 'diện rộng', 'nguy cơ cao', 'lây lan mạnh', 'thành dịch'];
    foreach ($danger as $needle) {
        if (vnContains($text, $needle)) return 'danger';
    }

    $warning = ['xuất hiện', 'gây hại', 'nhiễm bệnh', 'phòng trừ', 'xâm nhập', 'tăng cường'];
    foreach ($warning as $needle) {
        if (vnContains($text, $needle)) return 'warning';
    }

    return '';
}

/**
 * Tin có phải "hết dịch" (đã khống chế) — job không tạo cảnh báo mới.
 */
function isResolvedOutbreak($text) {
    return vnContains($text, 'hết dịch')
        || vnContains($text, 'dập dịch')
        || vnContains($text, 'khống chế dịch');
}

/**
 * Tiêu đề có dấu hiệu là tin dịch hại (lọc bớt tin hành chính/xuất khẩu).
 */
function isPestHeadline($title) {
    return !empty(extractPests($title)) || vnContains($title, 'dịch hại');
}
