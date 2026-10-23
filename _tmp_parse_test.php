<?php
$html = file_get_contents(__DIR__ . '/api/tests/fixtures/ppd/article-tay-ninh.html');
$doc = new DOMDocument();
libxml_use_internal_errors(true);
$doc->loadHTML('<?xml encoding="UTF-8">' . $html);
libxml_clear_errors();
$x = new DOMXPath($doc);
foreach ([
  '//div[contains(@class,"article-detail")]',
  '//article[contains(@class,"article-detail")]',
  '//div[contains(@class,"page-content")]',
  '//div[contains(@class,"n-title")]/following-sibling::*',
] as $q) {
  $nodes = $x->query($q);
  echo "QUERY $q -> " . $nodes->length . "\n";
  if ($nodes->length) {
    $t = preg_replace('/\s+/u', ' ', $nodes->item(0)->textContent);
    echo "  len=" . mb_strlen($t) . " | " . mb_substr(trim($t), 0, 350) . "\n";
  }
}
