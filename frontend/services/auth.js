/**
 * AgriScan AI — Authentication client (Google OAuth via Linking).
 *
 * Flow (uses react-native-app-auth under the hood; no Expo Auth Session):
 *   1. openGoogleLogin()  → opens Google consent screen in system browser
 *   2. App receives redirect via Linking → auth/redirect handler
 *   3. sendAuthCode()     → POST /auth/google (code → verified session)
 *   4. verifySession()    → GET /auth/me (checks token validity)
 *   5. logout()           → removes session token (device + server)
 *
 * Session token is persisted with react-native-encrypted-storage on native
 * (encrypted Keychain/Keystore) and localStorage on web, so the user stays
 * signed in across app restarts. verifySession() on startup validates the
 * persisted token against the backend and clears it when expired.
 */
import { Platform, Linking } from 'react-native';

// Secure persistence: EncryptedStorage on native, localStorage on web.
let SecureStore = null;
if (Platform.OS === 'web') {
  try {
    SecureStore = {
      getItemAsync: async (k) => globalThis.localStorage?.getItem(k) ?? null,
      setItemAsync: async (k, v) => globalThis.localStorage?.setItem(k, v),
      deleteItemAsync: async (k) => globalThis.localStorage?.removeItem(k),
    };
  } catch { /* in-memory fallback below */ }
} else {
  try {
    SecureStore = require('react-native-encrypted-storage');
  } catch { /* in-memory fallback below */ }
}

const TOKEN_KEY = 'agriscan_session_token';

// Read Google client ID from react-native-config (set GOOGLE_CLIENT_ID in .env /
// gradle.properties at build time).
let GOOGLE_CLIENT_ID = '';
try {
  const Config = require('react-native-config');
  if (Config && Config.GOOGLE_CLIENT_ID) {
    GOOGLE_CLIENT_ID = Config.GOOGLE_CLIENT_ID;
  }
} catch {
  /* react-native-config not configured yet */
}

// Session state (persisted via SecureStore when available)
let sessionToken = null;
let currentUser = null;
const listeners = new Set();

/**
 * Open Google OAuth consent screen in the system browser.
 * Uses the app's custom scheme (agriscan://auth) as redirect URI.
 * Returns a Promise that resolves with the authorization code
 * (or rejects on error/cancel).
 */
export function openGoogleLogin() {
  return new Promise((resolve, reject) => {
    // The browser round-trip goes through the API (which holds the client
    // secret and converts the code into a session). Google only accepts an
    // http(s) redirect for "Web application" clients, so the API receives
    // the code at /auth/google/callback and deep-links back into the app.
    const startUrl = googleStartUrl();
    const deepLink = 'com.agriscan.ai://auth';

    // RN 0.86: Linking.addEventListener returns a subscription object.
    // Linking.removeEventListener was REMOVED — always call sub.remove().
    let subscription = null;
    let timeout = null;
    const cleanup = () => {
      if (subscription) { try { subscription.remove(); } catch { /* already removed */ } }
      if (timeout) clearTimeout(timeout);
    };

    const handler = (event) => {
      const url = event.url;
      if (!url || !url.startsWith(deepLink)) return;
      cleanup();
      const params = parseQueryString(url);
      const { token, code, error } = params;
      if (error) {
        reject(new Error(params.error_description || error));
      } else if (token) {
        resolve({ token });
      } else if (code) {
        resolve({ code });
      } else {
        reject(new Error('Không nhận được thông tin đăng nhập từ Google.'));
      }
    };

    subscription = Linking.addEventListener('url', handler);
    // Safety timeout: abandon the flow after 5 minutes.
    timeout = setTimeout(() => { cleanup(); reject(new Error('Phiên đăng nhập đã hết thời gian chờ.')); }, 5 * 60 * 1000);
    Linking.openURL(startUrl).catch((e) => { cleanup(); reject(e); });
  });
}

/**
 * Finish a Google login started by openGoogleLogin().
 * - { token } → the API already exchanged the code; store the session.
 * - { code }  → legacy path: exchange it here.
 */
/**
 * URL that begins the OAuth relay.
 *
 * Google rejects private-IP redirect URIs for web clients ("device_id and
 * device_name are required for private IP"). On an Android emulator the API
 * lives at 10.0.2.2:887, so we swap the host to localhost and rely on
 * `adb reverse tcp:887 tcp:887` — localhost is a permitted redirect host.
 * Set EXPO-less override: react-native-config GOOGLE_OAUTH_BASE if needed.
 */
function isPrivateHost(host) {
  const h = String(host || '').toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(h);
}

/** Parse `scheme://host/path?k=v&k2=v2` without relying on URL. */
function parseQueryString(url) {
  const out = {};
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return out;
  url.slice(qIndex + 1).split('&').forEach((pair) => {
    if (!pair) return;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal.replace(/\+/g, ' '));
    } catch { /* skip malformed pair */ }
  });
  return out;
}

function googleStartUrl() {
  let base = getApiBase();
  try {
    const Config = require('react-native-config');
    if (Config && Config.GOOGLE_OAUTH_BASE) return Config.GOOGLE_OAUTH_BASE + '/auth/google/start';
  } catch { /* config not available */ }

  // 1887 is the second published port (docker-compose) — ports below 1024
  // cannot be reversed with `adb reverse`, hence 887 → 1887. Google only
  // accepts the exact registered redirect URI, so EVERY dev host (localhost,
  // 127.x, 10.0.2.2, LAN IP) must start the flow on the registered host:port.
  // `adb reverse tcp:1887 tcp:1887` routes it back to the API container.
  const match = /^https?:\/\/(\[[^\]]+\]|[^/:]+)(?::(\d+))?/.exec(base);
  if (match && isPrivateHost(match[1])) {
    base = 'http://localhost:1887';
  }

  return base + '/auth/google/start';
}

/**
 * Friendly extra hint for the most common Google setup failure. The browser
 * shows Google's own error page, so the app only sees "timeout" — this tells
 * the developer exactly which console field to fill in.
 */
export function googleErrorHint(err) {
  const msg = (err && err.message) || '';
  if (/hết thời gian/i.test(msg) || /timed? ?out/i.test(msg)) {
    return 'Kiểm tra Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs, '
      + 'phải có http://localhost:1887/auth/google/callback (emulator) hoặc '
      + 'https://<domain>/auth/google/callback (production).';
  }
  return '';
}

export async function finishGoogleLogin(result) {
  if (result && result.token) {
    sessionToken = result.token;
    try { await SecureStore?.setItemAsync(TOKEN_KEY, result.token); } catch { /* non-fatal */ }
    const user = await verifySession();
    notifyListeners();
    return { token: result.token, user };
  }
  if (result && result.code) {
    return sendAuthCode(result.code);
  }
  throw new Error('Không nhận được thông tin đăng nhập từ Google.');
}

/**
 * POST the auth code to the backend /auth/google endpoint.
 * Backend exchanges code → Google tokens → verifies → creates session.
 * Returns { token, user: { email, name, avatar } }.
 */
export async function sendAuthCode(code) {
  const res = await fetch(getApiBase() + '/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.token) {
    throw new Error(data?.message || data?.error || 'Authentication failed');
  }

  sessionToken = data.token;
  currentUser = data.user;
  try { await SecureStore?.setItemAsync(TOKEN_KEY, data.token); } catch { /* non-fatal */ }
  notifyListeners();
  return data;
}

/**
 * GET /auth/me — verify the current session token is still valid.
 * On startup (token from storage, user null) this rehydrates the session.
 * If invalid, clears the persisted token and returns null.
 */
export async function verifySession() {
  // Rehydrate the token from secure storage when the app cold-starts.
  if (!sessionToken && SecureStore) {
    try { sessionToken = await SecureStore.getItemAsync(TOKEN_KEY); } catch { /* ignore */ }
  }
  if (!sessionToken) return null;

  try {
    const res = await fetch(getApiBase() + '/auth/me', {
      headers: {
        Authorization: 'Bearer ' + sessionToken,
        Accept: 'application/json',
      },
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && data.authenticated) {
      currentUser = data.user;
      notifyListeners();
      return currentUser;
    } else {
      // Token invalid/expired — clear it (memory + storage)
      sessionToken = null;
      currentUser = null;
      try { await SecureStore?.deleteItemAsync(TOKEN_KEY); } catch { /* ignore */ }
      notifyListeners();
      return null;
    }
  } catch {
    // Network error: keep the token (may be offline) but report no session.
    return null;
  }
}

/** Log out: clear session token (memory + storage) + notify listeners. */
export async function logout() {
  const token = sessionToken;
  sessionToken = null;
  currentUser = null;
  try { await SecureStore?.deleteItemAsync(TOKEN_KEY); } catch { /* ignore */ }
  notifyListeners();
  // Best-effort server-side session revocation (fire and forget).
  if (token) {
    try {
      fetch(getApiBase() + '/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      }).catch(() => {});
    } catch { /* ignore */ }
  }
}

/** @returns {{email: string, name: string, avatar: string}|null} current user */
export function getCurrentUser() {
  return currentUser;
}

/** @returns {string|null} session token */
export function getSessionToken() {
  return sessionToken;
}

/** @returns {boolean} */
export function isAuthenticated() {
  return sessionToken !== null && currentUser !== null;
}

/**
 * Subscribe to auth state changes.
 * @returns {() => void} unsubscribe function
 */
export function onAuthStateChanged(callback) {
  const listener = { fn: callback };
  listeners.add(listener);
  callback(currentUser);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((l) => l.fn(currentUser));
}

function getApiBase() {
  try {
    const Config = require('react-native-config');
    if (Config && Config.API_URL) {
      return Config.API_URL;
    }
  } catch {
    /* fallback below */
  }
  // The PHP API is served at the root of port 887 (no /detectplanet_api prefix);
  // API_URL (in .env / gradle.properties) overrides this for production / real devices.
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:887`;
}

export default {
  openGoogleLogin,
  sendAuthCode,
  verifySession,
  logout,
  getCurrentUser,
  getSessionToken,
  isAuthenticated,
  onAuthStateChanged,
};
