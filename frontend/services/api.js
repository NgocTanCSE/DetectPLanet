/**
 * AgriScan AI — data-access layer (API client).
 *
 * Thin wrapper over the platform `fetch` (built-in to React Native and Node 18+,
 * so no extra dependency is required). Every method resolves with the *empty
 * value* of its DTO when no backend is reachable, so the UI degrades to honest
 * empty states instead of crashing on a missing/unconfigured backend.
 *
 * Base URL resolution (see the config block below):
 *   1. `react-native-config` (API_URL) — consumed by dotenv.gradle at build time.
 *      Set API_URL in .env for the backend URL.
 *   2. Dev fallback `http://<host>:887` (Android emulator 10.0.2.2 / localhost).
 *
 * IMPORTANT: the PHP API is served at the ROOT of port 887 — there is NO
 * `/detectplanet_api` (or `/api`) path prefix. Appending one 404s every call.
 * On a *physical phone* neither localhost nor 10.0.2.2 is reachable, so set
 * `extra.apiUrl` to your dev machine's LAN IP (e.g. http://192.168.1.42:887).
 */

import { Platform } from "react-native";
import { emptyReport, emptyScanSession } from "../utils/dto";
import { getSessionToken } from "./auth";

// API URL configuration (React Native CLI):
//  - Production / real device: set API_URL in .env (consumed by react-native-config)
//    e.g. http://<dev-machine-LAN-IP>:887  (find it with `hostname -I` on Linux).
//    The code below picks it up automatically via react-native-config.
//  - Dev fallback (used only when API_URL is empty):
//        http://10.0.2.2:887    -> Android *emulator* (-> host localhost)
//        http://localhost:887   -> iOS simulator / web on the host machine.
//    NOTE: 10.0.2.2 and localhost are NOT reachable from a *physical* phone — set
//    API_URL in .env to your LAN IP for on-device testing.
//  - The PHP API is served at the ROOT of port 887: the Docker doc-root is
//    /var/www/html (index.php + .htaccess route every non-static path to the
//    router), so NO path prefix is used. The old "/detectplanet_api" prefix was
//    inherited from the project's original name and 404s against this router
//    (`GET /detectplanet_api/home` -> 404, `GET /home` -> 200). Do NOT re-add it.
//  - Port 887 is the PHP/Apache web server, NOT 5432 (PostgreSQL).
const _DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const _DEV_URL = `http://${_DEV_HOST}:887`;

let BASE_URL = _DEV_URL;
try {
  const Config = require("react-native-config");
  if (Config && Config.API_URL) {
    BASE_URL = Config.API_URL;
  }
} catch {
  /* react-native-config not installed yet — using dev default (localhost:887) */
}

// Exposed for diagnostics (Settings → Máy chủ API): shows the URL actually in
// use, including the dev fallback when react-native-config has no API_URL.
export const API_BASE_URL = BASE_URL;

const DEFAULT_TIMEOUT_MS = 15000;
const jsonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Rewrite image/report URLs in API responses so they are reachable from the
 * current runtime:
 *  - On web/iOS the backend may return host-relative images pointing at the
 *    Android emulator alias `10.0.2.2`, which is unreachable there.  We swap
 *    the host to the platform's dev host.
 *  - Sample images originally hosted on the public `agriscan.ai/samples/`
 *    domain are not always served correctly.  We rewrite them through our own
 *    backend proxy so CORS / ORB issues are avoided.
 */
function normalizeImageUrl(url) {
  if (typeof url !== "string" || url.length === 0) return url;
  let u = url;
  // Replace Android-emulator-only host with the host-appropriate value.
  if (_DEV_HOST === "localhost" && u.includes("10.0.2.2:887")) {
    u = u.replace(/https?:\/\/10\.0\.2\.2:887/, BASE_URL.split("?")[0].replace(/\/$/, ""));
  }
  // Proxy agriscan.ai/samples/* through the local backend so the browser can
  // fetch them with proper CORS headers.
  if (u.includes("agriscan.ai/samples/")) {
    const name = u.split("agriscan.ai/samples/").pop();
    u = BASE_URL.replace(/\/$/, "") + "/samples/" + name;
  }
  return u;
}

/** Recursively rewrite every `image` (and similar) string field in a response. */
function normalizeImages(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(normalizeImages);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && (k === "image" || k === "avatar" || k.endsWith("_image")) && v.startsWith("http")) {
      out[k] = normalizeImageUrl(v);
    } else {
      out[k] = normalizeImages(v);
    }
  }
  return out;
}

/**
 * @returns {Promise<any|null>} parsed JSON, or an error object `{error, type}`
 *   when the backend is unreachable / non-2xx / timeout / network error.
 * @param {Object} [options] fetch options; `options.timeoutMs` overrides the
 *   default 15s timeout (use 120000 for /analyze — vision inference can take
 *   up to AI_TIMEOUT server-side). `options.retries` overrides the default
 *   retry count (1 for GET, 0 for mutating methods).
 */
async function request(path, options = {}) {
  // No backend configured -> callers resolve with an honest network error.
  if (!BASE_URL) {
    return { error: 'No backend URL configured', type: 'network' };
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _ignored, retries: optRetries, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const maxRetries = optRetries !== undefined ? optRetries : (method === 'GET' ? 1 : 0);

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;

  // Auto-attach session token when available so every protected endpoint
  // receives auth credentials without each caller needing to pass headers.
  const token = getSessionToken();
  const authHeaders = token ? { Authorization: "Bearer " + token } : {};

  let lastResult = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timer = setTimeout(() => controller?.abort?.(), timeoutMs);
    try {
      const res = await fetch(BASE_URL + path, {
        ...fetchOptions,
        headers: { ...jsonHeaders, ...authHeaders, ...(options.headers || {}) },
        signal: controller?.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        lastResult = normalizeImages(data) || {
          error: `HTTP ${res.status}`,
          type: 'http',
          status: res.status,
        };
        // Never retry 4xx client errors
        if (res.status >= 400 && res.status < 500) {
          return lastResult;
        }
        // Retry 5xx if attempts remain
        if (attempt < maxRetries) {
          continue;
        }
        return lastResult;
      }
      return normalizeImages(data);
    } catch (err) {
      lastResult = { error: 'Network error or timeout', type: 'network' };
      if (attempt < maxRetries) {
        continue;
      }
      return lastResult;
    } finally {
      clearTimeout(timer);
    }
  }
  return lastResult;
}

/* ---- Home ---- */
/** @returns {Promise<{stats: HealthStat[], recent: RecentScan[], articles: Article[]}>} */
export async function fetchHome() {
  const json = await request("/home");
  // Real backend only: degrade to empty state (not mock data) when unreachable.
  return json && !json.error
    ? json
    : { stats: [], recent: [], articles: [] };
}

/* ---- Scan session (leaf image + AI pipeline steps) ---- */
/** @returns {Promise<ScanSession>} */
export async function fetchScanSession() {
  const json = await request("/scan/session");
  return json && !json.error ? json : emptyScanSession();
}

/* ---- Latest or specific diagnosis report ---- */
/** @param {string} [id]
 *  @returns {Promise<ResultReport>} */
export async function fetchResultReport(id = "") {
  // Always hit the backend for the requested scan so a freshly analyzed result
  // (scan_XXXX) is reflected on screen. Previously this returned a hard-coded
  // local sample regardless of `id`, which masked the real /result/{id} path.
  const json = await request("/result/" + encodeURIComponent(id));
  return json && !json.error ? json : emptyReport();
}

/* ---- History ---- */
/** @returns {Promise<{records: HistoryRecord[], filters: FilterPill[]}>} */
export async function fetchHistory() {
  const json = await request("/history");
  return json && !json.error ? json : { records: [], filters: [] };
}

/* ---- Guides / help accordion ---- */
/** @returns {Promise<AccordionItem[]>} */
export async function fetchGuides() {
  const json = await request("/guides");
  return json && !json.error ? json : [];
}

/* ---- Mutating actions ---- */
/** @returns {Promise<Record<string,string>>} headers incl. Authorization if logged in */
async function getAuthHeaders() {
  const token = await getSessionToken();
  return token ? { Authorization: "Bearer " + token } : {};
}

/** @returns {Promise<{ok: boolean}>} */
export async function saveRecord(id) {
  const json = await request(`/history/${encodeURIComponent(id)}/save`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  // When the API is unreachable, request() returns null — do NOT report success.
  return json && !json.error ? json : { ok: false, error: "network" };
}

/** @returns {Promise<{ok: boolean}>} */
export async function unsaveRecord(id) {
  const json = await request(`/history/${encodeURIComponent(id)}/unsave`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return json && !json.error ? json : { ok: false, error: "network" };
}

/** @returns {Promise<ScanSession>} */
export async function analyzeImage(imageUri, base64 = "", crop = "", cropLabel = "") {
  const json = await request("/analyze", {
    method: "POST",
    body: JSON.stringify({ imageUri, base64, crop, crop_label: cropLabel }),
    headers: await getAuthHeaders(),
    timeoutMs: 120000, // vision inference can take up to AI_TIMEOUT (90s) server-side
  });
  return json ? json : emptyScanSession();
}

/* ---- Auth (Google OAuth) ---- */
/**
 * @param {string} code — Google authorization code received via deep link
 * @returns {Promise<{token: string, user: {email: string, name: string, avatar: string}}>}
 */
export async function googleLogin(code) {
  const json = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!json || json.error) {
    throw new Error(json?.error || "Google login failed");
  }
  return json;
}

/** @returns {Promise<{user: {email: string, name: string, avatar: string}}|null>} */
export async function verifySession(token) {
  const json = await request("/auth/me", {
    headers: { Authorization: "Bearer " + (token || "") },
  });
  if (!json || json.error) return null;
  return json;
}

/* ---- AI Chat (Cloudflare Workers AI) ---- */
/**
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{role: string, content: string}>}
 */
/* ---- Alerts + location ---- */
export async function fetchAlerts() {
  const json = await request("/alerts", { method: "GET", headers: await getAuthHeaders() });
  return json && Array.isArray(json.alerts) ? json : { alerts: [], province: "" };
}

export async function fetchCropPreferences() {
  const json = await request("/user-crop-preferences", {
    method: "GET",
    headers: await getAuthHeaders(),
  });
  return json && Array.isArray(json.preferences) ? json : { preferences: [] };
}

export async function saveCropPreference(cropId, isActive) {
  const json = await request("/user-crop-preferences", {
    method: "POST",
    body: JSON.stringify({ crop_id: cropId, is_active: isActive ? 1 : 0 }),
    headers: await getAuthHeaders(),
  });
  return json || { ok: false };
}

export async function fetchUserLocation() {
  const json = await request("/user-location", { method: "GET", headers: await getAuthHeaders() });
  return json && typeof json.province === "string"
    ? { province: json.province, provinces: json.provinces || [] }
    : { province: "", provinces: [] };
}

export async function saveUserLocation(province) {
  const json = await request("/user-location", {
    method: "POST",
    body: JSON.stringify({ province }),
    headers: await getAuthHeaders(),
  });
  return json || { ok: false };
}

/* ---- Chat history (per account) ---- */
export async function fetchChatHistory(limit = 100) {
  const json = await request(`/chat/history?limit=${limit}`, {
    method: "GET",
    headers: await getAuthHeaders(),
  });
  return json && Array.isArray(json.messages) ? json : { messages: [] };
}

export async function clearChatHistory() {
  const json = await request("/chat/history/clear", {
    method: "POST",
    body: JSON.stringify({}),
    headers: await getAuthHeaders(),
  });
  return json || { ok: false };
}

export async function chatWithAI(messages) {
  const json = await request("/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
    timeoutMs: 90000, // text inference can take up to AI_TIMEOUT (90s) server-side
  });
  // Real AI only — surface the error honestly when the backend is unreachable
  // or the AI service returns a 503.
  if (!json || json.error) {
    return {
      role: "assistant",
      content:
        "Xin lỗi, tôi không thể trả lời ngay lúc này. Vui lòng thử lại sau.",
    };
  }
  return json;
}

/* ---- Báo cáo cộng đồng (GĐ4) ---- */
/**
 * Gửi báo cáo dịch. Trả { ok, id } hoặc { error, message }.
 */
export async function createReport({ crop, cropId, diseaseLabel, province, ward, note, imageUrl }) {
  const json = await request("/reports", {
    method: "POST",
    body: JSON.stringify({
      crop: crop || "",
      crop_id: cropId || undefined,
      disease_label: diseaseLabel || "",
      province: province || "",
      ward: ward || "",
      note: note || "",
      image_url: imageUrl || "",
    }),
  });
  return json || { error: "network", message: "Không kết nối được máy chủ." };
}

/** @returns {Promise<{reports: Array}>} */
export async function fetchReports(province = "", days = 30) {
  const params = new URLSearchParams();
  if (province) params.set("province", province);
  params.set("days", String(days));
  const json = await request(`/reports?${params.toString()}`, { method: "GET" });
  return { reports: (json && json.reports) || [] };
}

export async function confirmReport(id) {
  const json = await request(`/reports/${encodeURIComponent(id)}/confirm`, { method: "POST" });
  return json || { error: "network" };
}

/* ---- Thông báo trong app (GĐ4a) ---- */
export async function fetchNotifications(limit = 50) {
  const json = await request(`/notifications?limit=${limit}`, { method: "GET" });
  return { notifications: (json && json.notifications) || [] };
}

export async function fetchUnreadCount() {
  const json = await request("/notifications/unread-count", { method: "GET" });
  return { unread: (json && Number(json.unread)) || 0 };
}

export async function markNotificationsRead(id = "") {
  const json = await request("/notifications/read", {
    method: "POST",
    body: JSON.stringify(id ? { id } : {}),
  });
  return json || { error: "network" };
}

export { normalizeImageUrl };

export default {
  fetchHome,
  fetchScanSession,
  fetchResultReport,
  fetchHistory,
  fetchGuides,
  saveRecord,
  unsaveRecord,
  analyzeImage,
  googleLogin,
  verifySession,
  chatWithAI,
  fetchChatHistory,
  clearChatHistory,
  fetchAlerts,
  fetchCropPreferences,
  saveCropPreference,
  fetchUserLocation,
  saveUserLocation,
  createReport,
  fetchReports,
  confirmReport,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsRead,
};
