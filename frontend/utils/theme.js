/**
 * AgriScan AI — Minimalist Design System (Green / White)
 *
 * 2 màu chủ đạo:
 *   - Trắng #ffffff — canvas / nền chính
 *   - Xanh lá #22c55e — accent / CTA / primary
 *
 * Single source of truth for colors, typography, spacing, radius,
 * and interactive (hover / focus / pressed) tokens.
 */

// ---------------------------------------------------------------------------
// 1. COLOR ROLES — green / white palette
// ---------------------------------------------------------------------------
export const colors = {
  // Canvas — pure white
  background: '#ffffff',
  paper: '#ffffff',

  // Surfaces — white cards on white canvas
  surface: '#ffffff',
  'surface-container': '#ffffff',
  'surface-container-low': '#f8fafc',
  'surface-container-high': '#f1f5f9',
  'surface-container-highest': '#e2e8f0',

  // Text — dark on light
  'on-surface': '#1e293b',
  'on-surface-variant': '#94a3a8',
  muted: '#94a3a8',

  // Borders & dividers (subtle on white)
  outline: '#e2e8f0',
  'whisper-border': '#f1f5f9',

  // Primary — green accent
  primary: '#22c55e',
  'primary-gradient': ['#4ade80', '#22c55e'],
  'on-primary': '#ffffff',
  'primary-subtle': 'rgba(34, 197, 94, 0.12)',
  'primary-glow': 'rgba(34, 197, 94, 0.30)',

  // Accent
  accentGreen: '#22c55e',
  accentWhite: '#ffffff',
  accentBlack: '#1e293b',

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
  'primary-fixed': 'rgba(34, 197, 94, 0.12)',
  'primary-fixed-dim': 'rgba(34, 197, 94, 0.06)',
  'on-primary-fixed': '#22c55e',
  'on-primary-fixed-variant': '#22c55e',
  'primary-container': '#22c55e',
  'on-primary-container': '#ffffff',
  'secondary-container': '#f8fafc',
  'on-secondary-container': '#1e293b',
  'error-container': 'rgba(239, 68, 68, 0.15)',
  'on-error-container': '#ef4444',
  'tertiary-container': 'rgba(34, 197, 94, 0.12)',
  'on-tertiary-container': '#22c55e',
  'surface-tint': '#22c55e',
  'surface-variant': '#ffffff',
  'inverse-on-surface': '#1e293b',
  'inverse-primary': '#4ade80',
  'on-secondary': '#1e293b',
  'on-tertiary': '#1e293b',
  secondary: '#22c55e',
  tertiary: '#22c55e',
  'on-background': '#1e293b',
  'on-paper': '#000000',
};

// ---------------------------------------------------------------------------
// 2. INTERACTIVE — hover / focus / pressed states (web + native feedback)
// ---------------------------------------------------------------------------
export const interactive = {
  hover: {
    primary: { backgroundColor: '#15803d' },        // darker green on hover
    surface: { backgroundColor: '#f1f5f9' },
    card: { borderWidth: 1, borderColor: '#22c55e' },
  },
  focus: {
    primary: { borderWidth: 2, borderColor: '#4ade80' },
    outline: { borderWidth: 2, borderColor: '#22c55e' },
  },
  pressed: {
    primary: { opacity: 0.88 },
    surface: { opacity: 0.92 },
  },
};

// ---------------------------------------------------------------------------
// 3. TYPOGRAPHY — Inter headings + Inter body (clean sans-serif)
// ---------------------------------------------------------------------------
export const typography = {
  headline: {
    xl: { fontSize: 30, lineHeight: 36, fontWeight: '700', fontFamily: 'Inter-Bold' },
    lg: { fontSize: 24, lineHeight: 30, fontWeight: '700', fontFamily: 'Inter-Bold' },
    md: { fontSize: 19, lineHeight: 25, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
    sm: { fontSize: 16, lineHeight: 22, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  },
  body: {
    lg: { fontSize: 15, lineHeight: 21, fontWeight: '400', fontFamily: 'Inter-Regular' },
    md: { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: 'Inter-Regular' },
    sm: { fontSize: 12, lineHeight: 17, fontWeight: '400', fontFamily: 'Inter-Regular' },
  },
  label: {
    lg: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
    md: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
    sm: { fontSize: 10, lineHeight: 14, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  },
  'metric-confidence': {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
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
// 4. SPACING — 8px grid (more generous, breathing room)
// ---------------------------------------------------------------------------
const rems = (n) => Math.round(n * 16);
export const spacing = {
  gutter: rems(1),          // 16 — page margins
  margin: rems(1),          // 16
  'space-xs': rems(0.125),  // 2
  'space-sm': rems(0.5),    // 8
  'space-md': rems(0.75),   // 12
  'space-lg': rems(1),      // 16
  'space-xl': rems(1.5),    // 24
  'space-2xl': rems(2),     // 32
  'space-3xl': rems(3),     // 48
};

// ---------------------------------------------------------------------------
// 5. BORDER RADIUS — clean rounded cards
// ---------------------------------------------------------------------------
export const radius = {
  sm: 4,
  DEFAULT: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Icon size tokens — consistent across the app (slightly larger than before)
export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
};

// ---------------------------------------------------------------------------
// 6. SHARED STYLES — white canvas, dark surfaces
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

// Surface container aliases (subtle white tints)
export const surfaceContainerLowest = { backgroundColor: colors['surface-container-low'] };

// Web hover helper — returns a style object only on web, empty on native
export function hoverStyle(styleObj) {
  if (typeof document !== 'undefined') {
    return styleObj;
  }
  return {};
}

export default {
  colors,
  typography,
  spacing,
  radius,
  iconSize,
  interactive,
  shadowFlat,
  shadowPaper,
  shadowCard,
  shadowStrong,
  shadowElevated,
  z,
  hoverStyle,
};
