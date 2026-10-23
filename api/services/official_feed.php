<?php
/**
 * AgriScan AI — Đọc tin từ website Cục Trồng trọt & BVTV (GĐ3).
 *
 * Lưu ý đã khảo sát (xem tasks/notes-ppd.md):
 *  - ppd.gov.vn không còn mục "Cảnh báo SVGH" cập nhật (bài mới nhất 2017),
 *    không có RSS/sitemap. Tin dịch hại nằm rải rác ở "Tin mới nhất" và
 *    "Công bố dịch".
 *  - Vì vậy pipeline chỉ ĐỀ XUẤT tin cho người duyệt, không tự đăng hàng loạt.
 *
 * Không đăng lại toàn văn: chỉ lưu tiêu đề, tóm tắt ngắn và link nguồn.
 */

require_once __DIR__ . '/text.php';
require_once __DIR__ . '/provinces.php';
require_once __DIR__ . '/keywords.php';

/**
 * GET HTML với timeout, UA định danh. Trả null khi lỗi.
 */
function officialHttpGet($url, $timeout = 20) {
    for ($attempt = 1; $attempt <= 2; $attempt++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_USERAGENT      => 'AgriScanAI/1.0 (canh bao dich benh; lien he: agriscan.ai)',
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($body !== false && $code >= 200 && $code < 300) {
            return $body;
        }
        error_log("official: GET $url failed (attempt $attempt, http=$code, err=$err)");
        if ($attempt === 1) usleep(1000000);
    }
    return null;
}

function officialDom($html) {
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();
    return $doc;
}

/**
 * Text của node, đã bỏ script/style và gom khoảng trắng.
 */
function officialNodeText($node) {
    if (!$node) return '';
    $doc = $node->ownerDocument;
    $xpath = new DOMXPath($doc);
    foreach ($xpath->query('.//script|.//style|.//noscript', $node) as $n) {
        if ($n->parentNode) $n->parentNode->removeChild($n);
    }
    $text = $node->textContent;
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim($text);
}

/**
 * Ghép href tương đối thành URL tuyệt đối.
 */
function officialAbsoluteUrl($href, $baseUrl) {
    $href = trim(html_entity_decode((string) $href));
    if ($href === '' || strpos($href, 'javascript:') === 0 || strpos($href, '#') === 0) {
        return '';
    }
    if (preg_match('#^https?://#i', $href)) return $href;
    if (strpos($href, '//') === 0) return 'https:' . $href;

    $parts = parse_url($baseUrl);
    $scheme = $parts['scheme'] ?? 'https';
    $host   = $parts['host'] ?? 'ppd.gov.vn';
    if (strpos($href, '/') === 0) return "$scheme://$host$href";

    $path = $parts['path'] ?? '/';
    $dir = rtrim(dirname($path), '/');
    return "$scheme://$host$dir/$href";
}

/**
 * Lấy danh sách bài từ một trang danh mục.
 *
 * @return array<int, array{url:string,title:string}>
 */
function officialParseListing($html, $pageUrl, $allowedPrefixes = []) {
    $doc = officialDom($html);
    $xpath = new DOMXPath($doc);
    $pageHost = parse_url($pageUrl, PHP_URL_HOST);

    $items = [];
    $seen = [];

    foreach ($xpath->query('//a[@href]') as $a) {
        $href  = $a->getAttribute('href');
        $title = trim(preg_replace('/\s+/u', ' ', $a->textContent));
        if (mb_strlen($title) < 20) continue;

        $url = officialAbsoluteUrl($href, $pageUrl);
        if ($url === '' || isset($seen[$url])) continue;
        if (parse_url($url, PHP_URL_HOST) !== $pageHost) continue;

        $path = parse_url($url, PHP_URL_PATH) ?? '';
        if (substr($path, -5) !== '.html') continue;

        // Chỉ nhận bài chi tiết (>= 2 đoạn path), bỏ trang danh mục cấp 1.
        $segments = array_values(array_filter(explode('/', trim($path, '/'))));
        if (count($segments) < 2) continue;

        if (!empty($allowedPrefixes)) {
            $ok = false;
            foreach ($allowedPrefixes as $prefix) {
                if (strpos($path, $prefix) === 0) { $ok = true; break; }
            }
            if (!$ok) continue;
        }

        $seen[$url] = true;
        $items[] = ['url' => $url, 'title' => $title];
    }

    return $items;
}

/**
 * Bóc tiêu đề / ngày đăng / nội dung từ trang bài viết.
 *
 * @return array{title:string,published_at:?string,body:string,source_url:string}
 */
function officialParseArticle($html, $url) {
    $doc = officialDom($html);
    $xpath = new DOMXPath($doc);

    $title = '';
    foreach (['//h1', '//meta[@property="og:title"]/@content', '//title'] as $q) {
        $nodes = $xpath->query($q);
        if ($nodes && $nodes->length) {
            $title = trim($nodes->item(0)->textContent);
            if ($title === '') $title = trim($nodes->item(0)->nodeValue);
            if ($title !== '') break;
        }
    }

    $published = null;
    foreach (['//div[contains(@class,"date")]', '//span[contains(@class,"date")]'] as $q) {
        $nodes = $xpath->query($q);
        if ($nodes && $nodes->length) {
            if (preg_match('#(\d{1,2})/(\d{1,2})/(\d{4})#', $nodes->item(0)->textContent, $m)) {
                $published = sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
                break;
            }
        }
    }
    if ($published === null) {
        $nodes = $xpath->query('//meta[@property="article:published_time"]/@content');
        if ($nodes && $nodes->length) {
            $ts = strtotime(trim($nodes->item(0)->nodeValue));
            if ($ts) $published = date('Y-m-d', $ts);
        }
    }

    $bodyNode = null;
    foreach ([
        '//article[contains(@class,"article-detail")]',
        '//div[contains(@class,"article-detail")]',
        '//div[contains(@class,"page-content")]',
        '//body',
    ] as $q) {
        $nodes = $xpath->query($q);
        if ($nodes && $nodes->length) { $bodyNode = $nodes->item(0); break; }
    }
    $body = officialNodeText($bodyNode);

    // Bỏ tiêu đề + dòng ngày ở đầu nội dung để tóm tắt không lặp.
    if ($title !== '' && strpos($body, $title) === 0) {
        $body = trim(mb_substr($body, mb_strlen($title)));
    }
    $body = preg_replace('/^Ngày đăng:\s*\d{1,2}\/\d{1,2}\/\d{4}\s*/u', '', $body);
    $body = preg_replace('/^Lượt xem\s*\d+\s*/u', '', $body);

    return [
        'title'        => $title,
        'published_at' => $published,
        'body'         => trim($body),
        'source_url'   => $url,
    ];
}

/**
 * Rút thực thể từ một bài.
 *
 * @return array{
 *   provinces:string[], pests:array, crops:string[],
 *   severity:string, resolved:bool, summary:string
 * }
 */
function officialExtract($article) {
    $title = $article['title'] ?? '';
    $body  = $article['body'] ?? '';
    $all   = $title . '. ' . $body;

    $provinces = matchProvinces($all);
    $pests     = extractPests($all);
    $crops     = extractCrops($all);
    $severity  = severityFromText($all);
    $resolved  = isResolvedOutbreak($all);

    // Tóm tắt: ưu tiên câu đầu có chứa tên dịch hại hoặc địa danh.
    $summary = mb_substr($body, 0, 500);
    if (mb_strlen($summary) >= 500) $summary = mb_substr($summary, 0, 497) . '…';

    return [
        'provinces' => $provinces,
        'pests'     => $pests,
        'crops'     => $crops,
        'severity'  => $severity,
        'resolved'  => $resolved,
        'summary'   => $summary,
    ];
}

/**
 * Tạo (hoặc cập nhật) cảnh báo `source='official'` từ một dòng official_ingest.
 *
 * - Chỉ lưu tiêu đề + tóm tắt + link; không đăng lại toàn văn.
 * - Cảnh báo hết hạn sau 30 ngày kể từ ngày đăng bài.
 * - Tắt cảnh báo thời tiết trùng bệnh/khu vực để không hiện 2 thẻ giống nhau.
 *
 * @return string|null alert id
 */
function officialPublishIngest($pdo, array $row) {
    $cropSlug = $row['crop_slug'] ?: 'other';
    $stmt = $pdo->prepare("SELECT id FROM crops WHERE slug = ? LIMIT 1");
    $stmt->execute([$cropSlug]);
    $cropId = $stmt->fetchColumn();
    if (!$cropId) {
        $stmt->execute(['other']);
        $cropId = $stmt->fetchColumn();
    }
    if (!$cropId) return null;

    $province    = isVnProvince($row['province'] ?? '') ? $row['province'] : '';
    $published   = !empty($row['published_at']) ? $row['published_at'] : date('Y-m-d');
    $validTo     = date('Y-m-d', strtotime($published . ' +30 days'));
    $label       = $row['disease_label'] ?: ($row['disease_name'] ?: 'Cảnh báo dịch hại');
    $diseaseName = $row['disease_name'] ?: $label;

    $externalId = 'official:' . sha1($row['source_url'] . '|' . $label . '|' . $province);
    $alertId    = 'alt_o_' . substr(sha1($externalId), 0, 24);

    $description = trim((string) ($row['summary'] ?? ''));
    if ($description === '') {
        $description = $row['title'];
    }

    $recommendation = 'Theo dõi đồng ruộng thường xuyên, áp dụng phòng trừ tổng hợp (IPM). '
        . 'Đọc khuyến cáo chi tiết trong bài gốc và liên hệ khuyến nông địa phương trước khi xử lý.';

    $pdo->prepare(
        "INSERT INTO crop_disease_alerts
           (id, crop_id, disease_name, disease_label, severity, season_months, province,
            description, recommendation, is_active, source, risk_score,
            valid_from, valid_to, external_id, source_url)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, 1, 'official', 0, ?, ?, ?, ?)
         ON CONFLICT (external_id) WHERE external_id <> ''
         DO UPDATE SET severity       = EXCLUDED.severity,
                       description    = EXCLUDED.description,
                       recommendation = EXCLUDED.recommendation,
                       valid_from     = EXCLUDED.valid_from,
                       valid_to       = EXCLUDED.valid_to,
                       source_url     = EXCLUDED.source_url,
                       is_active      = 1,
                       updated_at     = CURRENT_TIMESTAMP"
    )->execute([
        $alertId,
        $cropId,
        $diseaseName,
        $label,
        $row['severity'] ?: 'warning',
        $province,
        mb_substr($description, 0, 2000),
        $recommendation,
        $published,
        $validTo,
        $externalId,
        $row['source_url'],
    ]);

    // Ẩn bản dự báo thời tiết trùng bệnh (cùng tỉnh hoặc toàn quốc).
    $pdo->prepare(
        "UPDATE crop_disease_alerts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE source = 'weather' AND is_active = 1
            AND crop_id = ?
            AND (province = ? OR province = '' OR ? = '')
            AND lower(disease_label) = lower(?)"
    )->execute([$cropId, $province, $province, $label]);

    $pdo->prepare(
        "UPDATE official_ingest
            SET status = 'approved', alert_id = ?, reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ?"
    )->execute([$alertId, $row['id']]);

    return $alertId;
}
