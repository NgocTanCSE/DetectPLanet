<?php
/**
 * AgriScan AI — Cloudflare Workers AI service.
 * Extracted from api/index.php.
 */

require_once __DIR__ . '/../config.php';

const CF_VISION_PROMPT = 'Bạn là chuyên gia bác học thực vật. Phân tích hình ảnh lá cây. ' .
'Nhận diện loài cây (crop), chẩn đoán bệnh, trả về KẾT QUẢ JSON DUY NHẤT, không giải thích thêm: ' .
'{"crop":"tên khoa học cây","crop_label":"tên cây tiếng Việt","disease":"tên bệnh tiếng Anh (None nếu khỏe)",' .
'"disease_label":"tên bệnh tiếng Việt (Không có bệnh nếu khỏe)","pathogen":"một bệnh (trống nếu không rõ)",' .
'"severity":"healthy|warning|danger","confidence":số0-100,"recommendation":"lời khuyên tiếng Việt",' .
'"regions":[{"top":"32%","left":"38%","confidence":0-100,"severity":"healthy|warning|danger"}],' .
'"topk":[{"label":"tên bệnh","display_label":"tiếng Việt","score":0-100}]}. ' .
'Regions = vị trí ƯỚC TÍNH vùng bất thường trên lá; nếu lá khỏe hoặc không thấy rõ thì "regions":[] — KHÔNG BỊA vị trí. ' .
'Lá khỏe: confidence=100, severity="healthy", disease="None", regions=[].';

/**
 * Parse JSON out of an LLM text reply (handles ```json fences + stray prose).
 */
function parseLLMJson($text) {
    if (!is_string($text) || trim($text) === '') return null;
    $s = trim($text);
    if (preg_match('/```[a-zA-Z]*\s*([\s\S]*?)\s*```/', $s, $m)) {
        $s = trim($m[1]);
    }
    if (strpos($s, '{') !== 0) {
        $start = strpos($s, '{');
        $end   = strrpos($s, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $s = substr($s, $start, $end - $start + 1);
        }
    }
    $data = json_decode($s, true);
    return is_array($data) ? $data : null;
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
function aiDiagnose($imageDataUrl) {
    global $AI;
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

    $cf = cfAiRun($AI['vision_model'], [
        'prompt'      => CF_VISION_PROMPT,
        'image'       => $imageDataUrl,
        'max_tokens'  => 2048,
        'temperature' => 0.3,
    ]);
    if ($cf === null) {
        return ['ok' => false, 'prediction' => null, 'error' => 'Không thể kết nối Cloudflare Workers AI.'];
    }
    if (empty($cf['success'])) {
        $msg = $cf['errors'][0]['message'] ?? 'Lỗi không xác định từ Cloudflare AI.';
        return ['ok' => false, 'prediction' => null, 'error' => 'Cloudflare AI lỗi: ' . $msg];
    }
    $llmOutput = $cf['result']['response'] ?? '';
    $parsed = (is_array($llmOutput) && isset($llmOutput['crop'])) ? $llmOutput : parseLLMJson($llmOutput);
    if ($parsed === null || empty($parsed['disease'])) {
        return ['ok' => false, 'prediction' => null, 'error' => 'Không thể phân tích phản hồi của model.'];
    }
    return ['ok' => true, 'prediction' => normalizePrediction($parsed), 'error' => null];
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
            $detections[] = [
                'id'         => 'd' . ($i + 1),
                'top'        => (string) ($r['top'] ?? '50%'),
                'left'       => (string) ($r['left'] ?? '50%'),
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

    return [
        'crop'           => (string) ($p['crop'] ?? 'plant'),
        'crop_label'     => (string) ($p['crop_label'] ?? $p['crop'] ?? 'Cây trồng'),
        'disease'        => (string) ($p['disease'] ?? $p['disease_label'] ?? 'Unknown'),
        'disease_label'  => (string) ($p['disease_label'] ?? $p['disease'] ?? 'Chưa xác định'),
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
        'content' => 'Bạn là trợ lý AI chuyên về nông nghiệp và điều trị bệnh thực vật. '
            . 'Trả lời ngắn gọn, thực tế, bằng tiếng Việt. Luôn ưu tiên giải pháp hữu cơ và an toàn cho môi trường.',
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
