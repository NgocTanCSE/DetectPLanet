/**
 * AgriScan AI — Cloudflare Worker (replaces FastAPI AI service)
 *
 * Provides three endpoints:
 *   POST /predict — Diagnose plant leaf disease from image (vision model)
 *   POST /chat    — AI chat for disease Q&A / agronomic advice (text model)
 *   GET  /health  — Health check for Docker compose dependency checks
 *
 * Security: when the AI_SHARED_SECRET secret is set on this worker
 * (`wrangler secret put AI_SHARED_SECRET`), every /predict and /chat request
 * must include `Authorization: Bearer <secret>`. The PHP API sends this via
 * its AI_BEARER env var. /health stays open for uptime probes.
 *
 * @see https://developers.cloudflare.com/workers-ai/
 */

const PREDICT_PROMPT = `Bạn là chuyên gia bác học thực vật. Phân tích hình ảnh lá cây bên dưới.

Trước tiên nhận diện loài cây (crop), sau đó chẩn đoán bệnh và đưa ra lời khuyên điều trị.

Trả về KẾT QUẢ TRONG ĐỊNH DẠNG JSON SAU ĐÂY, không được thêm bất kỳ giải thích nào khác:

{
  "crop": "tên khoa học của cây (ví dụ: rice, tomato, corn, bean, cassava, cotton, soybean...)",
  "crop_label": "tên cây bằng tiếng Việt (ví dụ: Lúa nước, Cà chua, Đậu đũa...)",
  "disease": "tên bệnh bằng tiếng Anh (ví dụ: Brown Spot, Leaf Blast, Early Blight, Leaf Rust...) — nếu lá khỏe thì để 'None'",
  "disease_label": "tên bệnh bằng tiếng Việt (ví dụ: Bệnh Đốm Nâu, Bệnh Vàng Lá, Bệnh Rùa...) — nếu lá khỏe thì để 'Không có bệnh'",
  "pathogen": "gây ra bởi (ví dụ: Bipolaris oryzae, Fusarium, Magnaporthe oryzae, Colletotrichum — để trống nếu không xác định được)",
  "severity": "healthy | warning | danger",
  "confidence": số thực từ 0 đến 100 (độ tin cậy dự đoán),
  "recommendation": "lời khuyên chăm sóc bằng tiếng Việt (phun thuốc, bón phân, tưới nước, cắt lá bệnh, đất, ánh sáng...)",
  "regions": [
    {"top": "32%", "left": "38%", "confidence": số từ 0 đến 100, "severity": "healthy | warning | danger"}
  ],
  "topk": [
    {"label": "tên bệnh", "display_label": "tên hiển thị", "score": số từ 0 đến 100},
    {"label": "tên bệnh 2", "display_label": "tên hiển thị 2", "score": số từ 0 đến 100}
  ]
}

Về "regions": xác định vị trí ƯỚC TÍNH các vùng bất thường trên lá (đốm bệnh, vàng lá, cháy lá...) và biểu diễn bằng toạ độ phần trăm relative đến ảnh. Nếu lá khỏe hoặc không thấy vùng bất thường rõ ràng thì "regions": [] (mảng rỗng — KHÔNG ĐƯỢC bịa vị trí).

Hỗ trợ nhận diện mọi loài cây: lúa, cà chua, đậu, khoai tây, bắp, ngô, cây công nghiệp, chè, cà phê, chuối, xoài, dưa chuột, dâu, dưa hấu, và các cây trồng khác.

Nếu lá khỏe mạnh (healthy): confidence = 100, severity = "healthy", disease = "None", regions = [], recommendation = "Cây khỏe, không cần điều trị.".json`;

const CHAT_SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên về nông nghiệp, điều trị bệnh thực vật. Trả lời ngắn gọn, thực tế, bằng tiếng Việt. Luôn ưu tiên giải pháp hữu cơ và an toàn cho môi trường.`;

/**
 * Fetch an image from a URL and convert to base64.
 */
async function fetchImageAsBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  // Workers-native base64 encoding (no Buffer needed)
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000; // process in chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunk));
  }
  const base64 = btoa(binary);
  const mimeType = resp.headers.get('content-type') || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Parse JSON from LLM response (handles code fences + stray prose around JSON).
 */
function parseLLMJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```[a-zA-Z]*\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  if (!jsonStr.startsWith('{')) {
    // Model added prose around the JSON — extract the outermost {...} block.
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

/** Clamp confidence to a 0-100 number (handles models returning 0-1 fractions). */
function normalizeConfidence(value) {
  const n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.round(Math.min(100, pct) * 10) / 10;
}

/** Force severity into the allowed enum; derive a safe default when invalid. */
function normalizeSeverity(value, confidence) {
  const sev = String(value || '').toLowerCase();
  if (sev === 'healthy' || sev === 'warning' || sev === 'danger') return sev;
  return confidence >= 70 ? 'warning' : 'danger';
}

/**
 * Optional shared-secret auth: when AI_SHARED_SECRET is set on the worker,
 * every /predict and /chat request must carry `Authorization: Bearer <secret>`.
 * Without the secret configured the worker stays open (local dev) — production
 * MUST set it via `wrangler secret put AI_SHARED_SECRET`.
 */
function isAuthorized(request, env) {
  if (!env.AI_SHARED_SECRET) return true;
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${env.AI_SHARED_SECRET}`;
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');

    // CORS headers (worker is called server-side from PHP)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const visionModel = env.VISION_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct';
    const chatModel = env.CHAT_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8';

    // ── Health check (open — used by Docker healthchecks / uptime probes) ──
    if (path === 'health' || path === 'api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders });
    }

    // ── POST /predict — plant disease diagnosis from leaf image ───────
    if (path === 'predict' || path === 'api/predict') {
      if (!isAuthorized(request, env)) {
        return Response.json(
          { error: 'Unauthorized', message: 'Missing or invalid Authorization bearer token.' },
          { status: 401, headers: corsHeaders }
        );
      }

      const body = await request.json().catch(() => ({}));

      // Accept either base64 image data or image URL
      let imageData = body.image || body.base64 || '';
      const imageUri = body.imageUri || '';

      // Workers AI vision model expects a data URL (data:image/jpeg;base64,...).
      if (imageData && !imageData.startsWith('data:image/')) {
        imageData = `data:image/jpeg;base64,${imageData}`;
      }

      if (!imageData && imageUri) {
        try {
          imageData = await fetchImageAsBase64(imageUri);
        } catch (e) {
          return Response.json(
            { error: 'Could not load image', detail: e.message },
            { status: 502, headers: corsHeaders }
          );
        }
      }

      if (!imageData) {
        return Response.json(
          { error: 'No image provided', message: 'Please provide base64 image data or imageUri.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Call Workers AI vision model
      let aiResponse;
      try {
        aiResponse = await env.AI.run(visionModel, {
          prompt: PREDICT_PROMPT,
          image: imageData,
          max_tokens: 2048,
          temperature: 0.3,
        });
      } catch (e) {
        return Response.json(
          { error: 'AI inference failed', detail: e.message },
          { status: 502, headers: corsHeaders }
        );
      }

      const llmOutput = aiResponse?.response || '';

      // Vision model may return a parsed object or a text string — handle both.
      let result;
      if (typeof llmOutput === 'object' && llmOutput !== null && llmOutput.crop !== undefined) {
        result = llmOutput;
      } else {
        result = parseLLMJson(llmOutput);
      }

      if (!result) {
        return Response.json(
          { error: 'Could not parse AI response', raw_output: llmOutput },
          { status: 503, headers: corsHeaders }
        );
      }

      // Normalize + validate every field (models are non-deterministic)
      const confidence = normalizeConfidence(result.confidence);
      const severity = normalizeSeverity(result.severity, confidence);

      // Regions → validated detection boxes ONLY when the model returned them
      const regions = Array.isArray(result.regions) ? result.regions : [];
      const detections = regions
        .filter((r) => r && typeof r === 'object')
        .slice(0, 8) // cap bounding boxes to avoid abuse
        .map((r, i) => {
          const regConf = normalizeConfidence(r.confidence);
          return {
            id: 'd' + (i + 1),
            top: String(r.top || '50%'),
            left: String(r.left || '50%'),
            confidence: regConf + '%',
            severity: normalizeSeverity(r.severity, regConf),
          };
        });

      // topk — normalized scores 0-100
      const topk = (Array.isArray(result.topk) ? result.topk : [])
        .slice(0, 5)
        .map((t) => ({
          label: t?.label || '',
          display_label: t?.display_label || t?.label || '',
          score: normalizeConfidence(t?.score),
        }));

      // Build response matching the PHP /analyze contract
      const diagnosis = {
        crop: result.crop || 'plant',
        crop_label: result.crop_label || result.crop || 'Cây trồng',
        disease: result.disease || result.disease_label || 'Unknown',
        disease_label: result.disease_label || result.disease || 'Chưa xác định',
        pathogen: result.pathogen || '',
        severity,
        confidence,
        recommendation: result.recommendation || 'Vui lòng tham khảo chuyên gia bán địa phương.',
        detections,
        topk,
      };

      return Response.json(diagnosis, { headers: corsHeaders });
    }

    // ── POST /chat — AI chat for disease Q&A ──────────────────────────
    if (path === 'chat' || path === 'api/chat') {
      if (!isAuthorized(request, env)) {
        return Response.json(
          { error: 'Unauthorized', message: 'Missing or invalid Authorization bearer token.' },
          { status: 401, headers: corsHeaders }
        );
      }

      const body = await request.json().catch(() => ({}));
      const messages = body.messages || [];

      if (!Array.isArray(messages) || !messages.length) {
        return Response.json(
          { error: 'No messages provided. Expected: { messages: [{role, content}] }' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Prepend system prompt if not present
      if (messages[0]?.role !== 'system') {
        messages.unshift({ role: 'system', content: CHAT_SYSTEM_PROMPT });
      }

      let aiResponse;
      try {
        aiResponse = await env.AI.run(chatModel, {
          messages,
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
        });
      } catch (e) {
        return Response.json(
          { error: 'AI chat inference failed', detail: e.message },
          { status: 502, headers: corsHeaders }
        );
      }

      const responseRaw = aiResponse?.response || '';
      const response = typeof responseRaw === 'string' ? responseRaw : JSON.stringify(responseRaw);

      return Response.json({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders });
    }

    // ── 404 ───────────────────────────────────────────────────────────
    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  },
};

