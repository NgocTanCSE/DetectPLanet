/**
 * AgriScan AI — Dark Mode Design System (Online Payment Platform style)
 *
 * Deep blue canvas, dark surface cards, white/light text,
 * gradient accent accents (blue → purple → pink), rounded cards.
 * Single source of truth for colors, typography, spacing, radius.
 */

// ---------------------------------------------------------------------------
// 1. COLOR ROLES — dark palette
// ---------------------------------------------------------------------------
export const colors = {
  // Canvas — deep blue gradient background
  background: '#0f172a',
  paper: '#0f172a',

  // Surfaces — dark elevated cards
  surface: '#1e293b',
  'surface-container': '#1e293b',
  'surface-container-low': '#162135',
  'surface-container-high': '#253248',
  'surface-container-highest': '#2d3f5b',

  // Text
  'on-surface': '#f1f5f9',
  'on-surface-variant': '#94a3b8',
  muted: '#64748b',

  // Borders & dividers
  outline: '#334155',
  'whisper-border': '#1e293b',

  // Primary — gradient blue (#3b82f6 → #8b5cf6)
  primary: '#3b82f6',
  'primary-gradient': ['#3b82f6', '#8b5cf6'],
  'primary-gradient-pink': ['#8b5cf6', '#ec4899'],
  'on-primary': '#ffffff',
  'primary-subtle': 'rgba(59, 130, 246, 0.15)',
  'primary-glow': 'rgba(59, 130, 246, 0.35)',

  // Accent purple/pink for charts
  accentPurple: '#8b5cf6',
  accentPink: '#ec4899',
  accentBlue: '#3b82f6',

  // Status
  'status-healthy': '#22c55e',
  'status-warning': '#f59e0b',
  'status-danger': '#ef4444',
  danger: '#ef4444',
  'on-danger': '#ffffff',
  'danger-bg': 'rgba(239, 68, 68, 0.15)',
  'on-danger-bg': '#991c1c',
  warning: '#f59e0b',
  'on-warning': '#ffffff',
  'warning-bg': 'rgba(245, 158, 11, 0.15)',
  'on-warning-bg': '#92400e',

  // Backward-compatible aliases
  'primary-fixed': 'rgba(59, 130, 246, 0.15)',
  'primary-fixed-dim': 'rgba(59, 130, 246, 0.08)',
  'on-primary-fixed': '#f1f5f9',
  'on-primary-fixed-variant': '#3b82f6',
  'primary-container': '#3b82f6',
  'on-primary-container': '#ffffff',
  'secondary-container': '#1e293b',
  'on-secondary-container': '#f1f5f9',
  'error-container': 'rgba(239, 68, 68, 0.15)',
  'on-error-container': '#ef4444',
  'tertiary-container': 'rgba(236, 72, 153, 0.15)',
  'on-tertiary-container': '#ec4899',
  'surface-tint': '#3b82f6',
  'surface-variant': '#1e293b',
  'inverse-on-surface': '#ffffff',
  'inverse-primary': '#60a5fa',
  'on-secondary': '#ffffff',
  'on-tertiary': '#ffffff',
  secondary: '#8b5cf6',
  tertiary: '#ec4899',
  'on-background': '#f1f5f9',
};

// ---------------------------------------------------------------------------
// 2. TYPOGRAPHY — Geist headings + Plus Jakarta Sans body
// ---------------------------------------------------------------------------
export const typography = {
  headline: {
    xl: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontFamily: 'Geist' },
    lg: { fontSize: 26, lineHeight: 32, fontWeight: '600', fontFamily: 'Geist' },
    md: { fontSize: 20, lineHeight: 26, fontWeight: '600', fontFamily: 'Geist' },
    sm: { fontSize: 17, lineHeight: 22, fontWeight: '600', fontFamily: 'Geist' },
  },
  body: {
    lg: { fontSize: 16, lineHeight: 22, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    md: { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    sm: { fontSize: 12, lineHeight: 17, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
  },
  label: {
    lg: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    md: { fontSize: 11, lineHeight: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    sm: { fontSize: 9, lineHeight: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
  },
  'metric-confidence': {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    fontVariant: ['tabular-nums'],
  },
};

// Z-index scale
export const z = {
  base: 0,
  card: 1,
  header: 10,
  overlay: 10,
  badge: 11,
  nav: 20,
  toast: 30,
};

// ---------------------------------------------------------------------------
// 3. SPACING — 4px grid
// ---------------------------------------------------------------------------
const rems = (n) => Math.round(n * 16);
export const spacing = {
  gutter: rems(1),      // 16 — page margins
  margin: rems(1),      // 16
  'space-xs': rems(0.25),   // 4
  'space-sm': rems(0.5),    // 8
  'space-md': rems(0.75),   // 12
  'space-lg': rems(1),      // 16
  'space-xl': rems(1.5),    // 24
};

// ---------------------------------------------------------------------------
// 4. BORDER RADIUS — rounded cards (payment style)
// ---------------------------------------------------------------------------
export const radius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

// ---------------------------------------------------------------------------
// 5. SHARED STYLES — dark surfaces, border-only
// ---------------------------------------------------------------------------
export const surfaceBg = { backgroundColor: colors.paper };
export const textOnSurface = { color: colors['on-surface'] };
export const textMuted = { color: colors.muted };

// Flat shadow — zero elevation, border-only surfaces
export const shadowFlat = {
  elevation: 0,
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
};

// Backwards-compatible aliases
export const shadowPaper = shadowFlat;
export const shadowCard = shadowFlat;
export const shadowStrong = shadowFlat;
export const shadowElevated = shadowFlat;

// Surface container aliases (dark subtle tints)
export const surfaceContainerLowest = { backgroundColor: colors['surface-container-low'] };

export default {
  colors,
  typography,
  spacing,
  radius,
  shadowFlat,
  shadowPaper,
  shadowCard,
  shadowStrong,
  shadowElevated,
  z,
};
