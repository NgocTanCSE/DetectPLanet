/**
 * AgriScan AI — Premium Utilitarian Minimalism Design System
 *
 * Flat, text-first theme for the farmer's diagnostic tool.
 * No decorative icons. No card shadows. Single forest-green accent.
 * Warm off-white canvas with charcoal text, tightened spacing.
 *
 * Color System (collapsed from 50+ keys to 12 core roles):
 *   1. Background   — #faf8ff (warm off-white)
 *   2. Surface      — #ffffff (content cards)
 *   3. Text         — #131b2e (charcoal primary)
 *   4. Muted        — #64748b (secondary text)
 *   5. Outline      — #6c7a71 (borders, single value)
 *   6. Primary      — #006c49 (forest green — sole accent, CTAs, active)
 *   7. On-primary   — #ffffff (text on primary)
 *   8. Primary-subtle — #e8f5e9 (hover/active bg, very light green)
 *   9. Danger       — #b91c1c (alert text)
 *   10. Warning     — #ea580c (alert text)
 *   11. Danger-bg   — #fee2e2 (light red surface)
 *   12. Warning-bg  — #fef3c7 (light amber surface)
 */

// ---------------------------------------------------------------------------
// 1. COLOR ROLES — collapsed palette
// ---------------------------------------------------------------------------
export const colors = {
  // Canvas & surfaces
  paper: '#faf8ff',
  background: '#faf8ff',
  surface: '#ffffff',

  // Text
  'on-surface': '#131b2e',
  'on-surface-variant': '#3c4a42',
  muted: '#64748b',

  // Borders & dividers (single value)
  outline: '#6c7a71',
  'whisper-border': '#e2e8f0',

  // Primary — forest green (sole accent)
  primary: '#006c49',
  'on-primary': '#ffffff',
  'primary-subtle': '#e8f5e9',

  // Status (simplified)
  'status-healthy': '#22c55e',
  'status-warning': '#f59e0b',
  'status-danger': '#ef4444',
  danger: '#b91c1c',
  'on-danger': '#ffffff',
  'danger-bg': '#fee2e2',
  'on-danger-bg': '#991c1c',
  warning: '#ea580c',
  'on-warning': '#ffffff',
  'warning-bg': '#fef3c7',
  'on-warning-bg': '#92400e',

  // ── Backward-compatible aliases (removed as screens are rewritten) ──
  // These map old color keys to their closest new-system equivalents so
  // _validate.js and E2E tests stay green during the transition.
  'primary-fixed': '#e8f5e9',
  'primary-fixed-dim': '#e8f5e9',
  'on-primary-fixed': '#131b2e',
  'on-primary-fixed-variant': '#006c49',
  'primary-container': '#006c49',
  'on-primary-container': '#ffffff',
  'secondary-container': '#e8f5e9',
  'on-secondary-container': '#004d3a',
  'error-container': '#fee2e2',
  'on-error-container': '#991c1c',
  'tertiary-container': '#fef3c7',
  'on-tertiary-container': '#92400e',
  'surface-container-low': '#e8f5e9',
  'surface-container': '#e8f5e9',
  'surface-container-high': '#e8f5e9',
  'surface-container-highest': '#e8f5e9',
  'surface-tint': '#006c49',
  'surface-variant': '#e8f5e9',
  'inverse-on-surface': '#ffffff',
  'inverse-primary': '#4ade80',
  'on-secondary': '#ffffff',
  'on-tertiary': '#ffffff',
  secondary: '#006c49',
  tertiary: '#b91c1c',
  'on-background': '#131b2e',
};

// ---------------------------------------------------------------------------
// 2. TYPOGRAPHY — Geist headings + Plus Jakarta Sans body (tightened)
// ---------------------------------------------------------------------------
export const typography = {
  // Headings — Geist (slightly less heroic)
  headline: {
    xl: { fontSize: 28, lineHeight: 34, fontWeight: '600', fontFamily: 'Geist' },
    lg: { fontSize: 22, lineHeight: 28, fontWeight: '600', fontFamily: 'Geist' },
    md: { fontSize: 18, lineHeight: 24, fontWeight: '600', fontFamily: 'Geist' },
    sm: { fontSize: 16, lineHeight: 22, fontWeight: '600', fontFamily: 'Geist' },
  },
  // Body — Plus Jakarta Sans (tighter line-height, slightly larger for readability)
  body: {
    lg: { fontSize: 15, lineHeight: 22, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    md: { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    sm: { fontSize: 13, lineHeight: 18, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
  },
  // Labels — use body with weight, no separate label family
  label: {
    lg: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    md: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    sm: { fontSize: 10, lineHeight: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
  },
  // Metrics — bold sans, tabular nums
  'metric-confidence': {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
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
// 3. SPACING — tightened 4px grid
// ---------------------------------------------------------------------------
const rems = (n) => Math.round(n * 16);
export const spacing = {
  gutter: rems(0.75),      // 12 — page margins (down from 16)
  margin: rems(0.75),      // 12
  'space-xs': rems(0.25),   // 4
  'space-sm': rems(0.375), // 6  (down from 8)
  'space-md': rems(0.75),  // 12 (down from 16)
  'space-lg': rems(1.125), // 18 (down from 24)
  'space-xl': rems(1.5),   // 24 (down from 32)
};

// ---------------------------------------------------------------------------
// 4. BORDER RADIUS — flattened
// ---------------------------------------------------------------------------
export const radius = {
  sm: 2,
  DEFAULT: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

// ---------------------------------------------------------------------------
// 5. SHARED STYLES — flat, border-only surfaces
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

// Backwards-compatible aliases (screens may still reference these)
export const shadowPaper = shadowFlat;
export const shadowCard = shadowFlat;
export const shadowStrong = shadowFlat;
export const shadowElevated = shadowFlat;

// Surface container aliases (simplified to single subtle green tint)
export const surfaceContainerLowest = { backgroundColor: colors['primary-subtle'] };

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
