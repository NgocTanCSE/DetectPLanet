/**
 * AgriScan AI — Cloudflare Worker (replaces FastAPI AI service)
 *
 * Provides two endpoints:
 *   POST /predict — Diagnose plant leaf disease from image (vision model)
 *   POST /chat     — AI chat for disease Q&A / agronomic advice (text model)
 *   GET  /health   — Health check for Docker compose dependency checks
 *
 * Replaces the local FastAPI + PyTorch stack with Cloudflare Workers AI.
 * The vision model (Llama 3.2-Vision 11B) replaces the custom PyTorch model.
 * No custom model training needed — the LLM reasons about plant diseases
 * from leaf images with a structured prompt.
 *
 * @see https://developers.cloudflare.com/workers-ai/
 */

// Disease classification categories (kept for reference; LLM returns labels directly)
// The vision model is a general-purpose image classifier, not plant-disease-specific,
// so we prompt-engineer it to produce structured plant disease output.

const PREDICT_PROMPT = `Bạn là chuyên gia bác học thực vật vật. Phân tích hình ảnh lá cây bên dưới.

Trả về KẾT QUẢ TRONG ĐỊNH DẠNG JSON SAU ĐÂY, không được thêm bất kỳ giải thích nào khác:

{
  "crop": "tên cây (ví dụ: rice, tomato, corn...)",
  "crop_label": "tên cây bằng tiếng Việt (ví dụ: Lúa nước, Cà chua)",
  "disease": "tên bệnh bằng tiếng Anh (ví dụ: Brown Spot, Leaf Blast, Early Blight...)",
  "disease_label": "tên bệnh bằng tiếng Việt (ví dụ: Bệnh Đốm Nâu, Bệnh Đốm Lá, Bệnh Vàng Lá...) — nếu lá khỏe thì để 'Không có bệnh'",
  "pathogen": "gây ra bởi (ví dụ: Bipolaris oryzae, Fusarium, Magnaporthe oryzae — để trống nếu không xác định được)",
  "severity": "healthy | warning | danger",
  "confidence": số thực từ 0 đến 100 (độ tin cậy dự đoán),
  "recommendation": "lời khuyên chăm sóc bằng tiếng Việt (phun trừ, bón phân, tưới nước, cắt lá bệnh...)",
  "topk": [
    {"label": "tên bệnh", "display_label": "tên hiển thị", "score": số},
    {"label": "tên bệnh 2", "display_label": "tên hiển thị 2", "score": số}
  ]
}

Các bệnh đã biết (dùng để phân loại chính xác):
- Pepper: Bacterial spot, healthy
- Potato: Early blight, Late blight, healthy
- Tomato: Bacterial spot, Early blight, Late blight, Leaf Mold, Septoria leaf spot, Spider mites, Target Spot, YellowLeaf Curl Virus, Mosaic virus, healthy
- Rice: Brown spot, Leaf smut, healthy

Nếu lá khỏe mạnh (healthy): confidence = 100, severity = "healthy", disease = "None", recommendation = "Cây khỏe, không cần điều trị.".json`;

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
 * Parse JSON from LLM response (handles code fences).
 */
function parseLLMJson(text) {
  // LLM responses may wrap JSON in ```json ... ```
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```\w*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Return a best-effort fallback
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');

    // CORS headers (restrict to same origin unless configured)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Worker is called server-side from PHP
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

    // ── Health check ──────────────────────────────────────────────────
    if (path === 'health' || path === 'api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders });
    }

    // ── POST /predict — plant disease diagnosis from leaf image ───────
    if (path === 'predict' || path === 'api/predict') {
      const body = await request.json().catch(() => ({}));

      // Accept either base64 image data or image URL
      let imageData = body.image || body.base64 || '';
      const imageUri = body.imageUri || '';

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
      const aiResponse = await env.AI.run(visionModel, {
        prompt: PREDICT_PROMPT,
        image: imageData,
        max_tokens: 2048,
        temperature: 0.3, // Low temperature for consistent classification
        raw: false,
      });

      const llmOutput = aiResponse?.response || '';
      const result = parseLLMJson(llmOutput);

      if (!result) {
        // Fallback: return a structured error that mimics the old API shape
        return Response.json(
          { error: 'Could not parse AI response', raw_output: llmOutput },
          { status: 503, headers: corsHeaders }
        );
      }

      // Build response matching the original FastAPI /predict format
      const diagnosis = {
        crop: result.crop || 'plant',
        crop_label: result.crop_label || result.crop || 'Cây trồng',
        disease: result.disease || result.disease_label || 'Unknown',
        disease_label: result.disease_label || result.disease || 'Chưa xác định',
        pathogen: result.pathogen || '',
        severity: result.severity || 'healthy',
        confidence: Math.round((result.confidence || 0) * 10) / 10,
        recommendation: result.recommendation || 'Vui lòng tham khảo chuyên gia bán địa phương.',
        topk: result.topk || [],
      };

      return Response.json(diagnosis, { headers: corsHeaders });
    }

    // ── POST /chat — AI chat for disease Q&A ──────────────────────────
    if (path === 'chat' || path === 'api/chat') {
      const body = await request.json().catch(() => ({}));
      const messages = body.messages || [];

      if (!messages.length) {
        return Response.json(
          { error: 'No messages provided. Expected: { messages: [{role, content}] }' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Prepend system prompt if not present
      if (messages[0]?.role !== 'system') {
        messages.unshift({ role: 'system', content: CHAT_SYSTEM_PROMPT });
      }

      const aiResponse = await env.AI.run(chatModel, {
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      });

      const response = aiResponse?.response || '';

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
