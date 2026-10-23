/**
 * AgriScan Admin — design tokens.
 * Dùng cùng palette với app người dùng nhưng mật độ dày hơn cho bảng/biểu mẫu.
 */
export const colors = {
  background: '#f6f8fb',
  paper: '#ffffff',
  surface: '#ffffff',
  surfaceLow: '#f8fafc',
  surfaceHigh: '#f1f5f9',

  text: '#0f172a',
  textSecondary: '#475569',
  muted: '#94a3b8',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  primary: '#22c55e',
  primaryDark: '#15803d',
  primarySoft: 'rgba(34, 197, 94, 0.12)',

  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  info: '#3b82f6',
  infoSoft: 'rgba(59, 130, 246, 0.12)',
  purple: '#8b5cf6',
  purpleSoft: 'rgba(139, 92, 246, 0.12)',

  healthy: '#22c55e',
  white: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const font = {
  regular: 'Inter-Regular',
  medium: 'Inter-SemiBold',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  modal: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
};

export const severityColor = (level) => {
  if (level === 'danger' || level === 'high' || level === 'alert') return colors.danger;
  if (level === 'warning' || level === 'medium') return colors.warning;
  if (level === 'healthy' || level === 'low' || level === 'success') return colors.primary;
  return colors.muted;
};
