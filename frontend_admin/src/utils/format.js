/** Định dạng ngày giờ / số / nhãn dùng chung cho app admin. */

const pad = (n) => String(n).padStart(2, '0');

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

export function fmtNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmtPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toFixed(digits).replace('.', ',')}%`;
}

export function fmtCompact(value) {
  const n = Number(value) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k`;
  return fmtNumber(n);
}

export function toDateInput(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toDateInput(new Date());
}

export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateInput(d);
}

export const SEVERITY_LABEL = {
  healthy: 'Khỏe',
  warning: 'Cảnh báo',
  danger: 'Nguy hiểm',
};

export const SEVERITY_TONE = {
  healthy: 'green',
  warning: 'amber',
  danger: 'red',
};

export const STATUS_LABEL = {
  active: 'Hoạt động',
  suspended: 'Đã khoá',
  deleted: 'Đã xoá',
  pending: 'Chờ duyệt',
  verified: 'Đã xác minh',
  rejected: 'Từ chối',
  approved: 'Đã duyệt',
  published: 'Đã đăng',
  processing: 'Đang xử lý',
  done: 'Hoàn tất',
  failed: 'Lỗi',
};

export const STATUS_TONE = {
  active: 'green',
  suspended: 'amber',
  deleted: 'slate',
  pending: 'amber',
  verified: 'green',
  rejected: 'slate',
  approved: 'green',
  published: 'green',
  processing: 'blue',
  done: 'green',
  failed: 'red',
};

export const SOURCE_LABEL = {
  manual: 'Thủ công',
  weather: 'Thời tiết',
  official: 'Chính thức',
  community: 'Cộng đồng',
};

export const NOTIFICATION_TYPE_LABEL = {
  info: 'Thông tin',
  warning: 'Cảnh báo',
  success: 'Thành công',
  error: 'Lỗi',
  alert: 'Cảnh báo dịch',
};

export const SCAN_STATUS_LABEL = {
  processing: 'Đang xử lý',
  done: 'Hoàn tất',
  failed: 'Lỗi',
};

export function severityLabel(value) {
  return SEVERITY_LABEL[value] || value || '—';
}

export function statusLabel(value) {
  return STATUS_LABEL[value] || value || '—';
}

export function sourceLabel(value) {
  return SOURCE_LABEL[value] || value || '—';
}

export function notificationTypeLabel(value) {
  return NOTIFICATION_TYPE_LABEL[value] || value || '—';
}

export function targetLabel(target, value, crops = []) {
  if (target === 'all') return 'Tất cả người dùng';
  if (target === 'province') return `Tỉnh: ${value}`;
  if (target === 'crop') {
    const crop = crops.find((c) => String(c.id) === String(value));
    return `Cây trồng: ${crop ? crop.label : value}`;
  }
  if (target === 'user') return `Người dùng #${value}`;
  return target || '—';
}

export function truncate(text, max = 120) {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function initials(name, email) {
  const source = String(name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function absoluteUrl(base, url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${String(base).replace(/\/$/, '')}${url}`;
  return `${String(base).replace(/\/$/, '')}/${url}`;
}
