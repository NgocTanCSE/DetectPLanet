/**
 * AgriScan AI — Local Report Storage
 *
 * Lightweight persistence layer for saved diagnostic reports.
 * Uses the same SecureStore abstraction as auth.js:
 * - Native: react-native-encrypted-storage (encrypted Keychain/Keystore)
 * - Web: localStorage
 * - Fallback: in-memory (volatile, for test/validation environments)
 *
 * Reports are stored as a JSON array under a single key, capped at 20 entries.
 */
import { Platform } from 'react-native';

// ── SecureStore init (mirrors auth.js pattern) ──────────────────────
let SecureStore = null;

if (Platform.OS === 'web') {
  try {
    SecureStore = {
      getItemAsync: async (k) => globalThis.localStorage?.getItem(k) ?? null,
      setItemAsync: async (k, v) => globalThis.localStorage?.setItem(k, v),
      deleteItemAsync: async (k) => globalThis.localStorage?.removeItem(k),
    };
  } catch {
    /* in-memory fallback */
  }
} else {
  try {
    SecureStore = require('react-native-encrypted-storage');
  } catch {
    /* in-memory fallback */
  }
}

// ── In-memory fallback (test/validation/web-no-storage environments) ──
const fallbackStore = {};

function getItem(key) {
  if (SecureStore) return SecureStore.getItemAsync(key);
  fallbackStore[key] = fallbackStore[key] || null;
  return Promise.resolve(fallbackStore[key]);
}

function setItem(key, value) {
  if (SecureStore) return SecureStore.setItemAsync(key, value);
  fallbackStore[key] = value;
  return Promise.resolve();
}

function removeItem(key) {
  if (SecureStore) return SecureStore.deleteItemAsync(key);
  delete fallbackStore[key];
  return Promise.resolve();
}

const SAVED_REPORTS_KEY = 'agriscan_saved_reports';
const MAX_SAVED = 20;

/** @returns {Promise<Array>} list of saved reports */
export async function getSavedReports() {
  try {
    const raw = await getItem(SAVED_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a report. If it already exists (by id), move it to the top.
 * @param {Object} report — the ResultReport to persist
 * @returns {Promise<Array>} updated list
 */
export async function saveReport(report) {
  try {
    const existing = await getSavedReports();
    const filtered = existing.filter((r) => r.id !== (report.id || ''));
    const updated = [report, ...filtered].slice(0, MAX_SAVED);
    await setItem(SAVED_REPORTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Remove a saved report by id.
 * @param {string} reportId
 * @returns {Promise<Array>} updated list
 */
export async function unsaveReport(reportId) {
  try {
    const existing = await getSavedReports();
    const updated = existing.filter((r) => r.id !== reportId);
    await setItem(SAVED_REPORTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/** @returns {Promise<boolean>} true if the report is saved */
export async function isReportSaved(reportId) {
  try {
    const existing = await getSavedReports();
    return existing.some((r) => r.id === reportId);
  } catch {
    return false;
  }
}

export default {
  getSavedReports,
  saveReport,
  unsaveReport,
  isReportSaved,
};
