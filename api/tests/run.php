<?php
/**
 * AgriScan AI — PHP test runner (không cần framework).
 *
 *   docker exec agriscan-api php /var/www/html/tests/run.php
 *
 * Offline: mọi test dùng fixture trong tests/fixtures, không gọi mạng.
 */

require_once __DIR__ . '/../services/provinces.php';
require_once __DIR__ . '/../services/weather.php';
require_once __DIR__ . '/../services/disease_risk.php';
require_once __DIR__ . '/../services/keywords.php';
require_once __DIR__ . '/../services/official_feed.php';

$pass = 0;
$fail = 0;
$failures = [];

function check($name, $condition, $detail = '') {
    global $pass, $fail, $failures;
    if ($condition) {
        $pass++;
        echo "  ✓ $name\n";
    } else {
        $fail++;
        $failures[] = $name . ($detail !== '' ? " — $detail" : '');
        echo "  ✗ $name" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

function fixture($name) {
    $path = __DIR__ . '/fixtures/' . $name;
    putenv('WEATHER_FIXTURE=' . $path);
    return weatherFetchForecast(21.0, 105.85, 7);
}

echo "── provinces ──\n";
$provinces = vnProvinces();
$coords = vnProvinceCoords();
check('có 34 tỉnh', count($provinces) === 34, 'count=' . count($provinces));
check('có toạ độ cho cả 34 tỉnh', count($coords) === 34, 'count=' . count($coords));
$missing = array_diff($provinces, array_keys($coords));
check('không thiếu toạ độ', empty($missing), implode(', ', $missing));
$extra = array_diff(array_keys($coords), $provinces);
check('không thừa tỉnh lạ', empty($extra), implode(', ', $extra));
check('toạ độ nằm trong lãnh thổ VN', (function () use ($coords) {
    foreach ($coords as [$lat, $lon]) {
        if ($lat < 8 || $lat > 24 || $lon < 102 || $lon > 110) return false;
    }
    return true;
})());

echo "── weather adapter ──\n";
$wet = fixture('open_meteo_wet.json');
check('parse được fixture ẩm', is_array($wet) && count($wet['days']) === 7, 'days=' . (is_array($wet) ? count($wet['days']) : 0));
check('có số giờ ẩm >= 10', ($wet['days'][0]['humid_hours'] ?? 0) >= 10, 'humid_hours=' . ($wet['days'][0]['humid_hours'] ?? 0));
check('có tổng mưa > 0', ($wet['days'][0]['rain'] ?? 0) > 0);

$dry = fixture('open_meteo_dry.json');
check('parse được fixture khô', is_array($dry) && count($dry['days']) === 7);

$blight = fixture('open_meteo_blight.json');
check('fixture mốc sương mát ẩm', ($blight['days'][0]['tmean'] ?? 99) <= 22 && ($blight['days'][0]['rh'] ?? 0) >= 90);

echo "── risk rules ──\n";
$rules = riskRules();
check('có 6 luật', count($rules) === 6, 'count=' . count($rules));
check('mọi luật có test + recommendation', (function () use ($rules) {
    foreach ($rules as $r) {
        if (!isset($r['test']) || !is_callable($r['test'])) return false;
        if (empty($r['recommendation'])) return false;
        if (empty($r['crop'])) return false;
    }
    return true;
})());

$blast = $rules['rice_blast'];
$wetScore = riskScore($wet, $blast);
$dryScore = riskScore($dry, $blast);
check('đạo ôn: thời tiết ẩm → nguy cơ cao', $wetScore >= 60, "score=$wetScore");
check('đạo ôn: thời tiết khô → không cảnh báo', $dryScore === 0, "score=$dryScore");
check('đạo ôn: điểm không vượt 100', $wetScore <= 100);

$sheath = $rules['rice_sheath_blight'];
check('khô vằn: fixture 25°C không kích hoạt (cần 28-32°C)', riskScore($wet, $sheath) === 0);

$lateBlight = $rules['tomato_late_blight'];
check('mốc sương: 2 ngày mát ẩm liên tiếp → nguy cơ cao', riskScore($blight, $lateBlight) >= 60, 'score=' . riskScore($blight, $lateBlight));
check('mốc sương: thời tiết nóng ẩm không kích hoạt', riskScore($wet, $lateBlight) === 0);

$singleDay = ['days' => [$blight['days'][0]]];
check('mốc sương: 1 ngày chưa đủ ngưỡng liên tiếp', riskScore($singleDay, $lateBlight) === 0);

check('severity 60 → danger', riskSeverity(60) === 'danger');
check('severity 40 → warning', riskSeverity(40) === 'warning');
check('severity 39 → không cảnh báo', riskSeverity(39) === '');

echo "── mô tả & chuẩn hoá tên ──\n";
$desc = riskDescribe($wet, $blast);
check('mô tả có số liệu (°C, %, mm)', strpos($desc, '°C') !== false && strpos($desc, '%') !== false && strpos($desc, 'mm') !== false);
check('mô tả ghi rõ là nguy cơ', mb_strpos($desc, 'nguy cơ') !== false);

check('chuẩn hoá: "Bệnh Vàng Lá (Early Blight)" chứa "early blight"',
    strpos(riskNormalizeName('Bệnh Vàng Lá (Early Blight)'), 'early blight') !== false);
check('chuẩn hoá: "Bệnh Đạo Ôn" chứa "dao on"',
    strpos(riskNormalizeName('Bệnh Đạo Ôn'), 'dao on') !== false);
check('chuẩn hoá: tên khác không khớp nhầm',
    strpos(riskNormalizeName('Bệnh Thối Trái'), 'dao on') === false);

echo "── tỉnh: map tên cũ → mới ──\n";
check('Bình Dương → TP. Hồ Chí Minh', matchProvinces('Bình Dương') === ['TP. Hồ Chí Minh']);
check('Hà Nam → Ninh Bình', matchProvinces('Hà Nam') === ['Ninh Bình']);
check('Thừa Thiên Huế → Huế', matchProvinces('Thừa Thiên Huế') === ['Huế']);
check('Bà Rịa - Vũng Tàu → TP. Hồ Chí Minh', matchProvinces('Bà Rịa - Vũng Tàu') === ['TP. Hồ Chí Minh']);
check('Kiên Giang → An Giang', matchProvinces('Kiên Giang') === ['An Giang']);
$multi = matchProvinces('Dịch xuất hiện ở Sơn La và Nghệ An');
sort($multi);
check('nhận nhiều tỉnh', $multi === ['Nghệ An', 'Sơn La'], implode(',', $multi));
check('không nhầm Hà Nội thành tỉnh khác', matchProvinces('Hà Nội') === ['Hà Nội']);
check('text không có tỉnh → rỗng', matchProvinces('giá phân bón tăng') === []);

echo "── keywords ──\n";
$pests = extractPests('Bệnh đạo ôn gây hại trên lúa');
check('nhận bệnh đạo ôn', count($pests) === 1 && $pests[0]['label'] === 'Bệnh đạo ôn');
check('cây suy ra là lúa', ($pests[0]['crop'] ?? '') === 'rice');
check('mức độ: công bố dịch → danger', severityFromText('UBND tỉnh công bố dịch trên diện rộng') === 'danger');
check('mức độ: hết dịch → rỗng', severityFromText('công bố hết dịch rệp sáp') === '');
check('phát hiện tin hết dịch', isResolvedOutbreak('công bố hết dịch chổi rồng') === true);
check('lọc tin hành chính', isPestHeadline('Danh sách tổ chức xuất khẩu quả kiwi') === false);
check('giữ tin dịch hại', isPestHeadline('Công bố dịch rệp sáp bột hồng trên cây sắn') === true);

echo "── parser tin chính thức (fixture) ──\n";
$listingHtml = (string) file_get_contents(__DIR__ . '/fixtures/ppd/listing-cong-bo-dich.html');
$listing = officialParseListing($listingHtml, 'https://ppd.gov.vn/cong-bo-dich.html', ['/cong-bo-dich/']);
check('parse được danh mục', count($listing) > 0, 'items=' . count($listing));
$allDetail = true;
foreach ($listing as $item) {
    if (strpos($item['url'], '/cong-bo-dich/') === false
        || substr($item['url'], -5) !== '.html'
        || mb_strlen($item['title']) < 20) $allDetail = false;
}
check('chỉ lấy bài chi tiết, đúng tiền tố', $allDetail);

$articleHtml = (string) file_get_contents(__DIR__ . '/fixtures/ppd/article-tay-ninh.html');
$article = officialParseArticle($articleHtml, 'https://ppd.gov.vn/tin-moi-nhat/tinh-tay-ninh-cong-bo-het-dich-rep-sap-bot-hong-tren-cay-san.html');
check('bóc tiêu đề', mb_strpos($article['title'], 'Tây Ninh') !== false, $article['title']);
check('bóc ngày đăng', $article['published_at'] === '2021-08-10', (string) $article['published_at']);
check('bóc nội dung', mb_strlen($article['body']) > 200, 'len=' . mb_strlen($article['body']));

$extract = officialExtract($article);
check('nhận tỉnh Tây Ninh', $extract['provinces'] === ['Tây Ninh'], implode(',', $extract['provinces']));
check('nhận rệp sáp bột hồng', count($extract['pests']) >= 1);
check('đánh dấu tin đã hết dịch', $extract['resolved'] === true);
check('tin hết dịch không có mức độ', $extract['severity'] === '');
check('tóm tắt <= 500 ký tự', mb_strlen($extract['summary']) <= 500);

$article2 = officialParseArticle(
    (string) file_get_contents(__DIR__ . '/fixtures/ppd/article-son-la.html'),
    'https://ppd.gov.vn/cong-bo-dich/cong-bo-het-dich-choi-rong-hai-san-tren-dia-ban-tinh-son-la.html'
);
$extract2 = officialExtract($article2);
check('bài Sơn La: nhận tỉnh', $extract2['provinces'] === ['Sơn La'], implode(',', $extract2['provinces']));
check('bài Sơn La: nhận bệnh chổi rồng', ($extract2['pests'][0]['label'] ?? '') === 'Bệnh chổi rồng');

echo "\n──────────────────────────────\n";
printf("%d passed, %d failed\n", $pass, $fail);
if ($fail > 0) {
    echo "Failures:\n";
    foreach ($failures as $f) echo " - $f\n";
    exit(1);
}
echo "OK\n";
