/**
 * AgriScan AI — Report Storage Adapter (API-backed)
 *
 * Previously this module persisted saved reports to localStorage /
 * react-native-encrypted-storage — a local-only mock that bypassed the
 * backend entirely and was not visible across devices.
 *
 * It now delegates to the backend API so saved/unsaved state is
 * account-scoped and consistent across sessions:
 *   - getSavedReports()   →  GET /history  (returns saved subset)
 *   - saveReport(id)      →  POST /history/{id}/save    (api.saveRecord)
 *   - unsaveReport(id)    →  POST /history/{id}/unsave  (api.unsaveRecord)
 *   - isReportSaved(id)    →  checks the cached /history response
 *
 * A small in-memory cache of the most recent /history call is kept so that
 * isReportSaved() can answer synchronously without re-fetching. Components
 * that need fresh data should call getSavedReports() which always re-fetches.
 *
 * The session token is obtained from auth.js and forwarded automatically
 * by api.js — callers never need to attach headers manually.
 */
import { fetchHistory, saveRecord, unsaveRecord } from './api';

// Cache of the most recent history response so isReportSaved() is fast.
// Invalidated by saveReport / unsaveReport.
let _historyCache = null;

/**
 * @typedef {Object} SavedReportRef
 * @property {string} id
 * @property {string} crop_label
 * @property {string} disease
 * @property {number} confidence
 * @property {string} severity
 * @property {string} image
 * @property {string} created_at
 */

/**
 * Fetch the user's saved reports from the backend.
 * Always re-fetches (does not use cache) so the UI stays in sync.
 * @returns {Promise<SavedReportRef[]>}
 */
export async function getSavedReports() {
  try {
    const { records = [] } = await fetchHistory();
    const saved = records.filter((r) => r.is_saved);
    _historyCache = saved;
    return saved;
  } catch {
    return [];
  }
}

/**
 * Save a report to the backend (POST /history/{id}/save).
 * If `report` is an object with an `id`, that id is used; if it's a string,
 * it's treated as the scan id directly.
 * @param {string|Object} report
 * @returns {Promise<SavedReportRef[]>} updated saved list
 */
export async function saveReport(report) {
  const id = typeof report === 'string' ? report : report.id;
  if (!id) return { ok: false, error: 'missing id' };
  try {
    const result = await saveRecord(id);
    _historyCache = null; // invalidate cache so isReportSaved() re-fetches next time
    return result;
  } catch (e) {
    return { ok: false, error: e?.message || 'network' };
  }
}

/**
 * Remove a saved report from the backend (POST /history/{id}/unsave).
 * @param {string} reportId
 * @returns {Promise<SavedReportRef[]>} updated saved list
 */
export async function unsaveReport(reportId) {
  try {
    const result = await unsaveRecord(reportId);
    _historyCache = null; // invalidate cache
    return result;
  } catch (e) {
    return { ok: false, error: e?.message || 'network' };
  }
}

/**
 * Check whether a report is currently saved, using the in-memory cache when
 * available to avoid an extra network round-trip.
 * @param {string} reportId
 * @returns {Promise<boolean>}
 */
export async function isReportSaved(reportId) {
  if (!_historyCache) {
    await getSavedReports();
  }
  return (_historyCache || []).some((r) => r.id === reportId);
}

export default {
  getSavedReports,
  saveReport,
  unsaveReport,
  isReportSaved,
};
