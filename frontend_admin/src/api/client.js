import EncryptedStorage from 'react-native-encrypted-storage';
import { DEFAULT_ADMIN_TOKEN, DEFAULT_API_BASE, STORAGE_KEYS } from '../config';

let apiBase = DEFAULT_API_BASE;
let adminToken = DEFAULT_ADMIN_TOKEN;
let initialized = false;

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function initConfig() {
  if (initialized) return;
  try {
    const [storedBase, storedToken] = await Promise.all([
      EncryptedStorage.getItem(STORAGE_KEYS.apiBase),
      EncryptedStorage.getItem(STORAGE_KEYS.adminToken),
    ]);
    if (storedBase) apiBase = storedBase;
    if (storedToken) adminToken = storedToken;
  } catch {
    /* dùng giá trị build-time */
  }
  initialized = true;
}

export function getApiBase() {
  return apiBase;
}

export function getAdminToken() {
  return adminToken;
}

export async function saveConfig({ base, token }) {
  const nextBase = String(base || '').trim().replace(/\/$/, '');
  const nextToken = String(token || '').trim();
  if (!/^https?:\/\//i.test(nextBase)) {
    throw new Error('Địa chỉ API phải bắt đầu bằng http:// hoặc https://');
  }
  if (!nextToken) {
    throw new Error('Chưa nhập admin token.');
  }
  apiBase = nextBase;
  adminToken = nextToken;
  await EncryptedStorage.setItem(STORAGE_KEYS.apiBase, nextBase);
  await EncryptedStorage.setItem(STORAGE_KEYS.adminToken, nextToken);
}

function buildQuery(query) {
  if (!query) return '';
  const parts = [];
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

async function request(method, path, { query, body, timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const url = `${apiBase.replace(/\/$/, '')}${path}${buildQuery(query)}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) || `Máy chủ trả lỗi ${res.status}`;
      throw new ApiError(String(message), res.status, data);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Hết thời gian chờ máy chủ. Kiểm tra API đang chạy.', 0, null);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Không kết nối được API. Kiểm tra địa chỉ trong Cài đặt và mạng.',
      0,
      null,
    );
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: (path, query, options) => request('GET', path, { query, ...options }),
  post: (path, body, options) => request('POST', path, { body: body ?? {}, ...options }),
  patch: (path, body, options) => request('PATCH', path, { body: body ?? {}, ...options }),
  del: (path, options) => request('DELETE', path, options),
};

export function errorMessage(error) {
  if (!error) return '';
  return error.message || String(error);
}
