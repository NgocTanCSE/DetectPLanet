/**
 * AgriScan AI — Authentication client (Google OAuth via Linking).
 *
 * Flow (no expo-auth-session dependency needed):
 *   1. openGoogleLogin()  → opens Google consent screen in system browser
 *   2. App receives redirect via Linking → auth/redirect handler
 *   3. sendAuthCode()     → POST /auth/google (code → verified session)
 *   4. verifySession()    → GET /auth/me (checks token validity)
 *   5. logout()           → removes session token
 *
 * Session token is stored in-memory (not localStorage for security).
 * On app restart, the client must re-authenticate or use a refresh flow.
 */
import { Platform, Linking } from 'react-native';

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

// In-memory session token (never persisted to localStorage)
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

    const redirectUri = `${Platform.select({
      ios: 'com.agriscan.ai',
      android: 'com.agriscan.ai',
      web: window.location.origin,
    })}://auth`;

    // Build the full Google OAuth URL.
    // The redirect_uri must match what's registered in Google Cloud Console:
    //   - Custom domain: https://your-domain.com/auth/callback
    //   - HF Spaces:     https://yourname-agriscan.hf.space/auth/callback
    //     (HF Spaces redirects to https://yourname.hf.space/...)
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&scope=openid email profile' +
      '&access_type=offline' +
      '&prompt=consent';

    const handler = (event) => {
      const url = event.url;
      if (!url) return;

      // Check if this is our redirect URL
      if (url.startsWith(redirectUri)) {
        Linking.removeEventListener('url', handler);
        Linking.removeEventListener('url', errorHandler);

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
      }
    };

    const errorHandler = () => {
      Linking.removeEventListener('url', handler);
      reject(new Error('Authentication flow was cancelled'));
    };

    Linking.addEventListener('url', handler);
    Linking.openURL(authUrl);
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
    throw new Error(data?.error || 'Authentication failed');
  }

  sessionToken = data.token;
  currentUser = data.user;
  notifyListeners();
  return data;
}

/**
 * GET /auth/me — verify the current session token is still valid.
 * If invalid, clears the session and returns null.
 */
export async function verifySession() {
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
      // Token invalid/expired — clear it
      sessionToken = null;
      currentUser = null;
      notifyListeners();
      return null;
    }
  } catch {
    return null;
  }
}

/** Log out: clear session token + notify listeners. */
export function logout() {
  sessionToken = null;
  currentUser = null;
  notifyListeners();
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
