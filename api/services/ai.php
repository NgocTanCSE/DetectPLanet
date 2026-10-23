<?php
/**
 * AgriScan AI — Cloudflare Workers AI service.
 * Extracted from api/index.php.
 */

require_once __DIR__ . '/../config.php';

const CF_VISION_PROMPT = 'Bạn là chuyên gia bệnh học thực vật. Hãy phân tích ảnh lá cây và CHỈ xuất một object JSON, ' .
'không markdown, không lời dẫn, không giải thích. Schema (các giá trị dưới đây chỉ là KIỂU dữ liệu — hãy thay bằng kết quả thật): ' .
'{"crop":"tên khoa học của cây","crop_label":"tên cây tiếng Việt","disease":"tên bệnh tiếng Anh, hoặc None nếu lá khỏe",' .
'"disease_label":"tên bệnh tiếng Việt, hoặc Không phát hiện bệnh nếu lá khỏe","pathogen":"tác nhân gây bệnh, để trống nếu không rõ",' .
'"severity":"healthy|warning|danger","confidence":<số 0-100>,"recommendation":"lời khuyên xử lý ngắn gọn bằng tiếng Việt",' .
'"regions":[{"top":"<phần trăm>","left":"<phần trăm>","confidence":<số 0-100>,"severity":"healthy|warning|danger"}],' .
'"topk":[{"label":"tên bệnh","display_label":"tên tiếng Việt","score":<số 0-100>}]}. ' .
'Quy tắc: "regions" là vị trí ƯỚC TÍNH của vùng bất thường trên lá — nếu lá khỏe hoặc không thấy rõ thì "regions":[] và KHÔNG bịa vị trí. ' .
'Lá khỏe: confidence=100, severity="healthy", disease="None", disease_label="Không phát hiện bệnh", regions=[]. ' .
'Chỉ nhận diện loài cây THỰC SỰ thấy trong ảnh — không mặc định là cà chua; nếu ảnh không rõ loài, ' .
'dùng crop="unknown" và crop_label="Chưa xác định". ' .
'Trả lời bằng JSON thuần, bắt đầu bằng { và kết thúc bằng }.';

/**
 * Extract the FIRST complete JSON object from a string, tracking braces while
 * ignoring braces inside strings. Models often reply with two JSON objects
 * back-to-back (or JSON followed by prose); taking "first { ... last }" then
 * produces "Extra data" and the whole diagnosis is thrown away.
 */
function extractFirstJsonObject($s) {
    $start = strpos($s, '{');
    if ($start === false) return null;

    $depth = 0;
    $inString = false;
    $escaped = false;
    $len = strlen($s);

    for ($i = $start; $i < $len; $i++) {
        $c = $s[$i];

        if ($inString) {
            if ($escaped) {
                $escaped = false;
            } elseif ($c === '\\') {
                $escaped = true;
            } elseif ($c === '"') {
                $inString = false;
            }
            continue;
        }

        if ($c === '"') { $inString = true; continue; }
        if ($c === '{') { $depth++; continue; }
        if ($c === '}') {
            $depth--;
            if ($depth === 0) {
                $json = substr($s, $start, $i - $start + 1);
                $data = json_decode($json, true);
                return (is_array($data) && !empty($data['disease'])) ? $data : null;
            }
        }
    }

    return null; // unbalanced → truncated output
}

/**
 * Parse JSON out of an LLM text reply (handles ```json fences, duplicated
 * objects, stray prose and trailing text).
 */
function parseLLMJson($text) {
    if (!is_string($text) || trim($text) === '') return null;
    $s = trim($text);

    if (preg_match_all('/```[a-zA-Z]*\s*([\s\S]*?)\s*```/', $s, $m)) {
        foreach ($m[1] as $block) {
            $data = json_decode(trim($block), true);
            if (is_array($data) && !empty($data['disease'])) return $data;
            $data = extractFirstJsonObject($block);
            if ($data !== null) return $data;
        }
    }

    $data = extractFirstJsonObject($s);
    if ($data !== null) return $data;

    $decoded = json_decode($s, true);
    return (is_array($decoded) && !empty($decoded['disease'])) ? $decoded : null;
}

/**
 * Clamp confidence to 0-100 (models sometimes return 0-1 fractions).
 */
function normalizeConfidence($value) {
    $n = is_numeric($value) ? (float) $value : 0.0;
    if ($n < 0) $n = 0.0;
    if ($n <= 1.0) $n *= 100;
    return round(min(100.0, $n), 1);
}

/**
 * Force severity into the allowed enum; derive a safe default otherwise.
 */
function normalizeSeverity($value, $confidence) {
    $sev = strtolower(trim((string) $value));
    if (in_array($sev, ['healthy', 'warning', 'danger'], true)) return $sev;
    return $confidence >= 70 ? 'warning' : 'danger';
}

/**
 * Raw POST to the Cloudflare Workers AI REST endpoint.
 * Returns decoded JSON array (with 'success' key) or null on network failure.
 */
function cfAiRun($model, array $payload) {
    global $AI;
    if ($AI['account_id'] === '' || $AI['api_token'] === '') return null;
    $url = 'https://api.cloudflare.com/client/v4/accounts/' . rawurlencode($AI['account_id'])
         . '/ai/run/' . $model;
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $AI['api_token'],
    ];
    $ctx = stream_context_create(['http' => [
        'method'         => 'POST',
        'header'         => implode("\r\n", $headers) . "\r\n",
        'content'        => json_encode($payload),
        'timeout'        => $AI['timeout'],
        'ignore_errors'  => true,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
}

/**
 * Vision diagnosis: image data-URL → ['ok'=>bool, 'prediction'=>array|null, 'error'=>string|null].
 * NO mock fallback.
 */
function aiDiagnose($imageDataUrl, $cropHint = null) {
    global $AI;
    // The vision model available on the free Workers plan misidentifies plants
    // often, so the app asks the user to confirm the crop first. When a crop is
    // supplied it is injected as a hard constraint into the prompt.
    $prompt = CF_VISION_PROMPT;
    if (is_array($cropHint) && !empty($cropHint['label'])) {
        $prompt .= ' NGƯỜI DÙNG ĐÃ XÁC NHẬN ảnh này là lá ' . $cropHint['label']
            . (!empty($cropHint['scientific']) ? ' (' . $cropHint['scientific'] . ')' : '')
            . '. Hãy chẩn đoán bệnh trên ĐÚNG loại cây này: đặt "crop":"' . $cropHint['slug']
            . '", "crop_label":"' . $cropHint['label'] . '", và chỉ nêu các bệnh phổ biến trên cây này.'
            . ' Tuyệt đối không đổi sang loài cây khác.';
    }
    // Legacy override: a self-hosted worker deployment (AI_ENDPOINT full URL).
    if ($AI['endpoint'] !== '') {
        $headers = ['Content-Type: application/json'];
        if ($AI['bearer'] !== '') $headers[] = 'Authorization: Bearer ' . $AI['bearer'];
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'header' => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode(['image' => $imageDataUrl]),
            'timeout' => $AI['timeout'], 'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents($AI['endpoint'], false, $ctx);
        $data = $resp === false ? null : json_decode($resp, true);
        if (is_array($data) && !empty($data['disease'])) {
            return ['ok' => true, 'prediction' => normalizePrediction($data), 'error' => null];
        }
        return ['ok' => false, 'prediction' => null, 'error' => 'AI worker không phản hồi hợp lệ.'];
    }

    // Primary model first, then an optional fallback — e.g. a paid multimodal
    // model set as primary while the account has not upgraded yet, or the free
    // scout model as a safety net for the upgraded one.
    // Each model gets up to two passes: vision models occasionally answer with
    // duplicated JSON objects, prose or a truncated object.
    $models = [];
    foreach ([$AI['vision_model'], $AI['vision_fallback'] ?? ''] as $candidate) {
        if ($candidate && !in_array($candidate, $models, true)) $models[] = $candidate;
    }

    $startedAt = time();
    $lastError = 'Không thể phân tích phản hồi của model.';

    foreach ($models as $model) {
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            // Keep the whole request under the client's 120s timeout.
            if ((time() - $startedAt) > 100) break 2;
            if ($attempt > 1 && (time() - $startedAt) > 45) break;

            $cf = cfAiRun($model, [
                'prompt'      => $prompt,
                'image'       => $imageDataUrl,
                'max_tokens'  => 2048,
                'temperature' => 0.3,
            ]);
            if ($cf === null) {
                $lastError = 'Không thể kết nối Cloudflare Workers AI.';
                break; // network issue — let the fallback model try
            }
            if (empty($cf['success'])) {
                $msg = $cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.';
                // "not available on the Workers Free plan" / "No route for that
                // URI" → retrying the same model is pointless, use the fallback.
                $lastError = 'Cloudflare AI lỗi: ' . mb_substr($msg, 0, 160);
                error_log('[aiDiagnose] model ' . $model . ' unavailable: ' . mb_substr($msg, 0, 200));
                break;
            }

            $llmOutput = $cf['result']['response'] ?? '';
            $parsed = (is_array($llmOutput) && isset($llmOutput['crop'])) ? $llmOutput : parseLLMJson($llmOutput);
            if ($parsed !== null && !empty($parsed['disease'])) {
                return ['ok' => true, 'prediction' => normalizePrediction($parsed), 'error' => null];
            }

            // Short snippet only (never the image) — enough to spot model drift.
            error_log('[aiDiagnose] unparsable output from ' . $model . ' (attempt ' . $attempt . '): ' . mb_substr(
                is_string($llmOutput) ? $llmOutput : json_encode($llmOutput, JSON_UNESCAPED_UNICODE), 0, 300
            ));
        }
    }

    return ['ok' => false, 'prediction' => null, 'error' => $lastError];
}

/**
 * Normalize a raw model prediction into the stable /analyze contract.
 */
function normalizePrediction(array $p) {
    $confidence = normalizeConfidence($p['confidence'] ?? 0);
    $severity   = normalizeSeverity($p['severity'] ?? '', $confidence);

    $detections = [];
    if (!empty($p['regions']) && is_array($p['regions'])) {
        foreach (array_slice($p['regions'], 0, 8) as $i => $r) {
            if (!is_array($r)) continue;
            $rc = normalizeConfidence($r['confidence'] ?? 0);
            $top  = $r['top']  ?? '50%';
            $left = $r['left'] ?? '50%';
            if (is_numeric($top))  $top  .= '%';
            if (is_numeric($left)) $left .= '%';
            $detections[] = [
                'id'         => 'd' . ($i + 1),
                'top'        => (string) $top,
                'left'       => (string) $left,
                'confidence' => confStr($rc) . '%',
                'severity'   => normalizeSeverity($r['severity'] ?? '', $rc),
            ];
        }
    }

    $topk = [];
    if (!empty($p['topk']) && is_array($p['topk'])) {
        foreach (array_slice($p['topk'], 0, 5) as $t) {
            if (!is_array($t)) continue;
            $topk[] = [
                'label'         => (string) ($t['label'] ?? ''),
                'display_label' => (string) ($t['display_label'] ?? $t['label'] ?? ''),
                'score'         => normalizeConfidence($t['score'] ?? 0),
            ];
        }
    }

    // Vision models often translate disease names literally, e.g.
    // "Sheath blight" → "Bệnh thối sheath"; map the common ones to the
    // Vietnamese names farmers actually use.
    $diseaseEn = strtolower((string) ($p['disease'] ?? ''));
    $diseaseVi = (string) ($p['disease_label'] ?? $p['disease'] ?? 'Chưa xác định');
    $viNames = [
        'sheath blight'         => 'Bệnh khô vằn',
        'rice blast'            => 'Bệnh đạo ôn',
        'blast'                 => 'Bệnh đạo ôn',
        'bacterial leaf blight' => 'Bệnh bạc lá',
        'brown spot'            => 'Bệnh đốm nâu',
        'tungro'                => 'Bệnh vàng lùn',
        'early blight'          => 'Bệnh đốm lá sớm',
        'late blight'           => 'Bệnh mốc sương',
        'leaf rust'             => 'Bệnh gỉ sắt',
        'powdery mildew'        => 'Bệnh phấn trắng',
        'downy mildew'          => 'Bệnh sương mai',
        'anthracnose'           => 'Bệnh thán thư',
        'bacterial wilt'        => 'Bệnh héo xanh',
    ];
    if ($diseaseEn !== '') {
        foreach ($viNames as $en => $vi) {
            if (strpos($diseaseEn, $en) !== false) { $diseaseVi = $vi; break; }
        }
    }

    return [
        'crop'           => (string) ($p['crop'] ?? 'plant'),
        'crop_label'     => (string) ($p['crop_label'] ?? $p['crop'] ?? 'Cây trồng'),
        'disease'        => (string) ($p['disease'] ?? $p['disease_label'] ?? 'Unknown'),
        'disease_label'  => $diseaseVi,
        'pathogen'       => (string) ($p['pathogen'] ?? ''),
        'severity'       => $severity,
        'confidence'     => $confidence,
        'recommendation' => (string) ($p['recommendation'] ?? 'Vui lòng tham khảo chuyên gia bán địa phương.'),
        'detections'     => $detections,
        'topk'           => $topk,
    ];
}

/**
 * AI chat: messages → ['ok'=>bool, 'reply'=>string|null, 'error'=>string|null].
 */
function aiChat(array $messages) {
    global $AI;
    $clean = [];
    foreach (array_slice($messages, -20) as $m) {
        if (!is_array($m)) continue;
        $role = $m['role'] ?? '';
        $content = trim((string) ($m['content'] ?? ''));
        if ($content === '' || !in_array($role, ['user', 'assistant'], true)) continue;
        $clean[] = ['role' => $role, 'content' => mb_substr($content, 0, 4000)];
    }
    if (!$clean) {
        return ['ok' => false, 'reply' => null, 'error' => 'Thiếu nội dung tin nhắn.'];
    }

    $system = [[
        'role' => 'system',
        'content' => 'Bạn là trợ lý khuyến nông của AgriScan AI, chuyên về bệnh cây trồng và canh tác. '
            . 'Trả lời ngắn gọn, thực tế, bằng tiếng Việt, dùng gạch đầu dòng khi liệt kê bước xử lý. '
            . 'Ưu tiên biện pháp canh tác và sinh học (IPM); khi cần thuốc bảo vệ thực vật thì nêu hoạt chất '
            . 'phổ biến, nhắc dùng đúng liều theo nhãn và đúng thời gian cách ly. '
            . 'Đây là tư vấn nông nghiệp hợp pháp cho nông dân — hãy trả lời thay vì từ chối.',
    ]];

    // Legacy override: a self-hosted worker deployment (CHAT_ENDPOINT full URL).
    if ($AI['chat_endpoint'] !== '') {
        $headers = ['Content-Type: application/json'];
        if ($AI['bearer'] !== '') $headers[] = 'Authorization: Bearer ' . $AI['bearer'];
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'header' => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode(['messages' => $clean]),
            'timeout' => $AI['timeout'], 'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents($AI['chat_endpoint'], false, $ctx);
        $data = $resp === false ? null : json_decode($resp, true);
        if (is_array($data) && !empty($data['content'])) {
            return ['ok' => true, 'reply' => (string) $data['content'], 'error' => null];
        }
        return ['ok' => false, 'reply' => null, 'error' => 'AI chat worker không phản hồi.'];
    }

    $cf = cfAiRun($AI['chat_model'], [
        'messages'    => array_merge($system, $clean),
        'max_tokens'  => 1024,
        'temperature' => 0.7,
        'top_p'       => 0.9,
    ]);
    if ($cf === null) {
        return ['ok' => false, 'reply' => null, 'error' => 'Không thể kết nối Cloudflare Workers AI.'];
    }
    if (empty($cf['success'])) {
        $msg = $cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.';
        return ['ok' => false, 'reply' => null, 'error' => 'Cloudflare AI lỗi: ' . $msg];
    }
    $reply = $cf['result']['response'] ?? '';
    if (!is_string($reply) || trim($reply) === '') {
        return ['ok' => false, 'reply' => null, 'error' => 'Model trả về rỗng.'];
    }
    return ['ok' => true, 'reply' => $reply, 'error' => null];
}
