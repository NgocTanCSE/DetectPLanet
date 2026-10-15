/**
 * AgriScan AI — data-access layer (API client).
 *
 * Thin wrapper over the platform `fetch` (built-in to React Native and Node 18+,
 * so no extra dependency is required). Every method resolves with the *empty
 * value* of its DTO when no backend is reachable, so the UI degrades to honest
 * empty states instead of crashing on a missing/unconfigured backend.
 *
 * Base URL resolution (see the config block below):
 *   1. `expo.extra.apiUrl` in app.json  -> production / real device / LAN dev.
 *   2. Dev fallback `http://<host>:887` (Android emulator 10.0.2.2 / localhost).
 *
 * IMPORTANT: the PHP API is served at the ROOT of port 887 — there is NO
 * `/detectplanet_api` (or `/api`) path prefix. Appending one 404s every call.
 * On a *physical phone* neither localhost nor 10.0.2.2 is reachable, so set
 * `extra.apiUrl` to your dev machine's LAN IP (e.g. http://192.168.1.42:887).
 */

import { Platform } from 'react-native';
import { emptyReport, emptyScanSession } from './dto';

// API URL configuration (Expo SDK 57 / unified package versioning):
//  - Production / real device: set "extra.apiUrl" in app.json to your backend URL,
//    e.g. http://<dev-machine-LAN-IP>:887  (find it with `hostname -I` on Linux).
//    The try/catch below picks it up automatically via expo-constants.
//  - Dev fallback (used only when extra.apiUrl is empty):
//        http://10.0.2.2:887    -> Android *emulator* (-> host localhost)
//        http://localhost:887   -> iOS simulator / web on the host machine.
//    NOTE: 10.0.2.2 and localhost are NOT reachable from a *physical* phone — set
//    extra.apiUrl to your LAN IP for on-device testing.
//  - The PHP API is served at the ROOT of port 887: the Docker doc-root is
//    /var/www/html (index.php + .htaccess route every non-static path to the
//    router), so NO path prefix is used. The old "/detectplanet_api" prefix was
//    inherited from the project's original name and 404s against this router
//    (`GET /detectplanet_api/home` -> 404, `GET /home` -> 200). Do NOT re-add it.
//  - Port 887 is the PHP/Apache web server, NOT 5432 (PostgreSQL).
const _DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const _DEV_URL  = `http://${_DEV_HOST}:887`;

let BASE_URL = _DEV_URL;
try {
  const { expoConfig } = require('expo-constants');
  if (expoConfig && expoConfig.extra && expoConfig.extra.apiUrl) {
    BASE_URL = expoConfig.extra.apiUrl;
  }
} catch {
  /* expo-constants not installed yet — using dev default (localhost:887) */
}

const DEFAULT_TIMEOUT_MS = 15000;
const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };

/**
 * @returns {Promise<any|null>} parsed JSON, or `null` when unreachable / no
 *   base URL configured / non-2xx / timeout / network error.
 */
async function request(path, options = {}) {
  // No backend configured -> callers resolve with the empty value of their DTO.
  if (!BASE_URL) return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort?.(), DEFAULT_TIMEOUT_MS);
  try {
    // Merge caller-supplied headers (e.g. Authorization) without dropping the
    // JSON content-type defaults. Previously `headers: jsonHeaders` silently
    // overwrote any custom headers, breaking auth routes like /auth/me.
    const res = await fetch(BASE_URL + path, {
      ...options,
      headers: { ...jsonHeaders, ...(options.headers || {}) },
      signal: controller?.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return data || { error: `HTTP ${res.status}` };
    }
    return data;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---- Home ---- */
/** @returns {Promise<{stats: HealthStat[], recent: RecentScan[], articles: Article[]}>} */
export async function fetchHome() {
  const json = await request('/home');
  return json ? json : { stats: [], recent: [], articles: [] };
}

/* ---- Scan session (leaf image + AI pipeline steps) ---- */
/** @returns {Promise<ScanSession>} */
export async function fetchScanSession() {
  const json = await request('/scan/session');
  return json ? json : emptyScanSession();
}

/* ---- Latest or specific diagnosis report ---- */
/** @param {string} [id]
 *  @returns {Promise<ResultReport>} */
export async function fetchResultReport(id = '') {
  const path = id ? `/result/${encodeURIComponent(id)}` : '/result/latest';
  const json = await request(path);
  return json && !json.error ? json : emptyReport();
}

/* ---- History ---- */
/** @returns {Promise<{records: HistoryRecord[], filters: FilterPill[]}>} */
export async function fetchHistory() {
  const json = await request('/history');
  return json ? json : { records: [], filters: [] };
}

/* ---- Guides / help accordion ---- */
/** @returns {Promise<AccordionItem[]>} */
export async function fetchGuides() {
  const json = await request('/guides');
  return json ? json : [];
}

/* ---- Mutating actions ---- */
/** @returns {Promise<{ok: boolean}>} */
export async function saveRecord(id) {
  const json = await request(`/history/${encodeURIComponent(id)}/save`, { method: 'POST' });
  return json ? json : { ok: true };
}

/** @returns {Promise<ScanSession>} */
export async function analyzeImage(imageUri, base64 = '') {
  const json = await request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUri, base64 }),
  });
  return json ? json : emptyScanSession();
}

/* ---- Auth (Google OAuth) ---- */
/**
 * @param {string} code — Google authorization code received via deep link
 * @returns {Promise<{token: string, user: {email: string, name: string, avatar: string}}>}
 */
export async function googleLogin(code) {
  const json = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (!json || json.error) {
    throw new Error(json?.error || 'Google login failed');
  }
  return json;
}

/** @returns {Promise<{user: {email: string, name: string, avatar: string}}|null>} */
export async function verifySession(token) {
  const json = await request('/auth/me', {
    headers: { Authorization: 'Bearer ' + (token || '') },
  });
  if (!json || json.error) return null;
  return json;
}

/* ---- AI Chat (Cloudflare Workers AI) ---- */
/**
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{role: string, content: string}>}
 */
export async function chatWithAI(messages) {
  const json = await request('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
  return json && !json.error
    ? json
    : { role: 'assistant', content: 'Xin lỗi, tôi không thể trả lời ngay lúc này. Vui lòng thử lại sau.' };
}

export default {
  fetchHome,
  fetchScanSession,
  fetchResultReport,
  fetchHistory,
  fetchGuides,
  saveRecord,
  analyzeImage,
  googleLogin,
  verifySession,
  chatWithAI,
};
