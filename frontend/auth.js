/**
 * AgriScan AI — Authentication client (Google OAuth via Linking).
 *
 * Flow (no expo-auth-session dependency needed):
 *   1. openGoogleLogin()  → opens Google consent screen in system browser
 *   2. App receives redirect via Linking → auth/redirect handler
 *   3. sendAuthCode()     → POST /auth/google (code → verified session)
 *   4. verifySession()    → GET /auth/me (checks token validity)
 *   5. logout()           → removes session token (device + server)
 *
 * Session token is persisted with expo-secure-store on native (encrypted
 * Keychain/Keystore) and localStorage on web, so the user stays signed in
 * across app restarts. verifySession() on startup validates the persisted
 * token against the backend and clears it when expired.
 */
import { Platform, Linking } from 'react-native';

// Secure persistence: SecureStore on native, localStorage on web.
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
    SecureStore = require('expo-secure-store');
  } catch { /* in-memory fallback below */ }
}

const TOKEN_KEY = 'agriscan_session_token';

// Read Google client ID from expo-constants if available, else from app.json extra
let GOOGLE_CLIENT_ID = '';
try {
  const { expoConfig } = require('expo-constants');
  if (expoConfig && expoConfig.extra && expoConfig.extra.googleClientId) {
    GOOGLE_CLIENT_ID = expoConfig.extra.googleClientId;
  }
} catch {
  /* expo-constants not installed yet */
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
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
      reject(new Error('Google Client ID not configured in app.json extra.googleClientId'));
      return;
    }

    // Must match a redirect URI registered in Google Cloud Console.
    // Mobile: custom scheme com.agriscan.ai://auth (no domain required).
    const redirectUri = 'com.agriscan.ai://auth';

    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&scope=openid email profile' +
      '&access_type=offline' +
      '&prompt=consent';

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
      if (!url || !url.startsWith(redirectUri)) return;
      cleanup();
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        if (error) {
          reject(new Error('Google auth error: ' + (urlObj.searchParams.get('error_description') || error)));
        } else if (code) {
          resolve(code);
        } else {
          reject(new Error('No authorization code received'));
        }
      } catch (e) {
        reject(new Error('Malformed redirect URL: ' + url));
      }
    };

    subscription = Linking.addEventListener('url', handler);
    // Safety timeout: abandon the flow after 5 minutes.
    timeout = setTimeout(() => { cleanup(); reject(new Error('Authentication timed out')); }, 5 * 60 * 1000);
    Linking.openURL(authUrl).catch((e) => { cleanup(); reject(e); });
  });
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
    const { expoConfig } = require('expo-constants');
    if (expoConfig && expoConfig.extra && expoConfig.extra.apiUrl) {
      return expoConfig.extra.apiUrl;
    }
  } catch {
    /* fallback below */
  }
  // The PHP API is served at the root of port 887 (no /detectplanet_api prefix);
  // extra.apiUrl (set in app.json) overrides this for production / real devices.
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
