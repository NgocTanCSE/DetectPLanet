<?php
/**
 * AgriScan AI — Job: nhập tin chính thức từ ppd.gov.vn (GĐ3).
 *
 * THỰC TẾ ĐÃ KHẢO SÁT:
 *  - Mục "Cảnh báo SVGH" không cập nhật từ 2017; không có RSS/sitemap.
 *  - Tin dịch hại nằm rải rác ở "Tin mới nhất" và "Công bố dịch".
 *  → Job này ĐỀ XUẤT tin (status=pending) để người duyệt, KHÔNG tự đăng.
 *    Chỉ tự đăng khi AUTO_APPROVE_OFFICIAL=true và tin có đủ tỉnh + bệnh + mức độ.
 *
 * Chạy:
 *   php jobs/run.php official-feed
 */

require_once __DIR__ . '/../services/official_feed.php';
require_once __DIR__ . '/../services/schema.php';
require_once __DIR__ . '/../services/jobs.php';

function jobOfficialFeed($pdo) {
    $enabled = strtolower((string) (getenv('OFFICIAL_ENABLED') ?: '0'));
    if (!in_array($enabled, ['1', 'true', 'on'], true)) {
        return ['status' => 'skipped', 'message' => 'OFFICIAL_ENABLED=0'];
    }

    ensureDbSchema($pdo);

    $autoApprove = in_array(
        strtolower((string) (getenv('AUTO_APPROVE_OFFICIAL') ?: 'false')),
        ['1', 'true', 'on'],
        true
    );

    $sources = [
        'https://ppd.gov.vn/cong-bo-dich.html',
        'https://ppd.gov.vn/tin-moi-nhat.html',
        'https://ppd.gov.vn/canh-bao-svgh.html',
    ];
    $prefixes = [
        '/cong-bo-dich/',
        '/tin-moi-nhat/',
        '/canh-bao-svgh/',
        '/trong-trot-va-bao-ve-thuc-vat/',
    ];

    $candidates = [];
    $seen = [];
    $listingErrors = 0;

    foreach ($sources as $pageUrl) {
        $html = officialHttpGet($pageUrl);
        if ($html === null) {
            $listingErrors++;
            continue;
        }
        $items = officialParseListing($html, $pageUrl, $prefixes);
        $kept = 0;
        foreach ($items as $item) {
            if (!isPestHeadline($item['title'])) continue;
            if (isset($seen[$item['url']])) continue;
            $seen[$item['url']] = true;
            $candidates[] = $item;
            if (++$kept >= 8) break;
        }
    }

    // Bỏ bài đã có trong official_ingest (kể cả đã duyệt/từ chối).
    $existsStmt = $pdo->prepare("SELECT 1 FROM official_ingest WHERE source_url = ? LIMIT 1");
    $fresh = [];
    foreach ($candidates as $candidate) {
        $existsStmt->execute([$candidate['url']]);
        if ($existsStmt->fetchColumn()) continue;
        $fresh[] = $candidate;
        if (count($fresh) >= 10) break; // giới hạn mỗi lượt
    }

    $inserted   = 0;
    $autoPublished = 0;
    $unusable   = 0;
    $fetchFails = 0;
    $processed  = 0;

    $insertStmt = $pdo->prepare(
        "INSERT INTO official_ingest
           (source_url, title, published_at, province, crop_slug, disease_name,
            disease_label, severity, summary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
         ON CONFLICT (source_url, disease_label, province) DO NOTHING
         RETURNING id"
    );

    $minDate = strtotime('-2 years');

    foreach ($fresh as $i => $candidate) {
        if ($i > 0) sleep(2); // lịch sự với server nhà nước

        $html = officialHttpGet($candidate['url']);
        if ($html === null) {
            $fetchFails++;
            continue;
        }

        $article  = officialParseArticle($html, $candidate['url']);
        $extract  = officialExtract($article);
        $processed++;

        // Bài quá cũ (mục Cảnh báo SVGH toàn bài 2015-2017) không có giá trị cảnh báo.
        if (!empty($article['published_at'])) {
            $ts = strtotime($article['published_at']);
            if ($ts !== false && $ts < $minDate) {
                $unusable++;
                continue;
            }
        }

        if (empty($extract['pests']) || empty($extract['provinces'])) {
            $unusable++;
            continue;
        }

        // Bài liệt kê quá nhiều tỉnh → coi là phạm vi toàn quốc.
        $provinces = $extract['provinces'];
        if (count($provinces) > 3) $provinces = [''];

        $title = mb_substr($article['title'] ?: $candidate['title'], 0, 500);

        foreach (array_slice($extract['pests'], 0, 3) as $pest) {
            foreach ($provinces as $province) {
                $insertStmt->execute([
                    $candidate['url'],
                    $title,
                    $article['published_at'],
                    $province,
                    $pest['crop'],
                    $pest['name_en'],
                    $pest['label'],
                    $extract['severity'] ?: 'warning',
                    mb_substr($extract['summary'], 0, 2000),
                ]);
                $newId = $insertStmt->fetchColumn();
                $insertStmt->closeCursor();
                if (!$newId) continue; // đã tồn tại

                $inserted++;

                // Không tự đăng tin "hết dịch" hoặc thiếu mức độ.
                if ($autoApprove && !$extract['resolved'] && $extract['severity'] !== '') {
                    $row = [
                        'id'          => (int) $newId,
                        'source_url'  => $candidate['url'],
                        'published_at'=> $article['published_at'],
                        'province'    => $province,
                        'crop_slug'   => $pest['crop'],
                        'disease_name'=> $pest['name_en'],
                        'disease_label' => $pest['label'],
                        'severity'    => $extract['severity'],
                        'summary'     => $extract['summary'],
                    ];
                    if (officialPublishIngest($pdo, $row)) $autoPublished++;
                }
            }
        }
    }

    $expired = $pdo->exec(
        "UPDATE crop_disease_alerts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE source = 'official' AND is_active = 1
            AND valid_to IS NOT NULL AND valid_to < CURRENT_DATE"
    );

    $message = sprintf(
        'trang lỗi=%d, ứng viên=%d, xử lý=%d, thêm chờ duyệt=%d, tự đăng=%d, bỏ qua=%d, lỗi tải bài=%d, hết hạn=%d',
        $listingErrors, count($fresh), $processed, $inserted, $autoPublished,
        $unusable, $fetchFails, (int) $expired
    );

    if ($listingErrors === count($sources)) {
        return ['status' => 'error', 'message' => 'Không tải được trang nguồn nào. ' . $message];
    }

    return ['status' => 'ok', 'message' => $message, 'inserted' => $inserted];
}
