/**
 * AgriScan AI — Design System Theme
 *
 * Mobile-first color system derived from the original AgriScan design.
 * Emerald/green nature palette: deep forest green primary, mint/amber/red status
 * accents, clean white surfaces, charcoal text.
 *
 * Color System:
 *   1. Background     — #faf8ff (light blue-white)
 *   2. Surface        — #FFFFFF (elevated content)
 *   3. Charcoal       — #131b2e (primary text)
 *   4. Outline        — #6c7a71 + #bbcabf (borders)
 *   5. Primary        — #006c49 (forest green — CTA, active states)
 */

// ---------------------------------------------------------------------------
// 1. COLOR ROLES — nature-inspired palette
// ---------------------------------------------------------------------------
export const colors = {
  // 1. Background & surfaces
  paper: '#faf8ff',
  background: '#faf8ff',
  surface: '#ffffff',
  'pure-surface': '#ffffff',

  // 2. Text — charcoal primary, slate/muted secondary
  charcoal: '#131b2e',
  'on-surface': '#131b2e',
  'on-background': '#131b2e',
  'on-surface-variant': '#3c4a42',
  muted: '#64748b',
  'inverse-on-surface': '#eef0ff',

  // 3. Borders & dividers
  'outline': '#6c7a71',
  'outline-variant': '#bbcabf',
  'whisper-border': '#e2e8f0',
  'surface-container-low': '#f2f3ff',
  'surface-container': '#eaedff',
  'surface-container-high': '#e2e7ff',
  'surface-container-highest': '#dae2fd',

  // 4. Primary — forest green (CTA, active states, accents)
  primary: '#006c49',
  'on-primary': '#ffffff',
  'primary-container': '#10b981',
  'on-primary-container': '#00422b',
  'inverse-primary': '#4edea3',

  // Fixed interactive tints (soft green backgrounds)
  'primary-fixed': '#6ffbbe',
  'primary-fixed-dim': '#4edea3',
  'on-primary-fixed': '#002113',
  'on-primary-fixed-variant': '#005236',

  // Secondary — teal green
  secondary: '#006c4a',
  'on-secondary': '#ffffff',
  'secondary-container': '#82f5c1',
  'on-secondary-container': '#00714e',

  // Tertiary — red/orange
  tertiary: '#a43a3a',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#fc7c78',
  'on-tertiary-container': '#711419',

  // Fixed tertiary tints
  'secondary-fixed': '#85f8c4',
  'secondary-fixed-dim': '#68dba9',
  'on-secondary-fixed': '#002114',
  'on-secondary-fixed-variant': '#005137',
  'tertiary-fixed': '#ffdad7',
  'tertiary-fixed-dim': '#ffb3af',
  'on-tertiary-fixed': '#410005',
  'on-tertiary-fixed-variant': '#842225',

  // 5. Status colors
  'status-healthy': '#22c55e',
  'status-warning': '#f59e0b',
  'status-danger': '#ef4444',

  // Feedback
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  // Surface tint
  'surface-tint': '#006c49',
  'surface-variant': '#dae2fd',
};

// ---------------------------------------------------------------------------
// 2. TYPOGRAPHY — Geist headings + Plus Jakarta Sans body
// ---------------------------------------------------------------------------
export const typography = {
  // Headings — Geist (or system sans-serif fallback)
  headline: {
    xl: { fontSize: 32, lineHeight: 40, fontWeight: '700', fontFamily: 'Geist' },
    lg: { fontSize: 24, lineHeight: 32, fontWeight: '600', fontFamily: 'Geist' },
    md: { fontSize: 20, lineHeight: 28, fontWeight: '600', fontFamily: 'Geist' },
    sm: { fontSize: 18, lineHeight: 24, fontWeight: '600', fontFamily: 'Geist' },
  },
  // Body — Plus Jakarta Sans
  body: {
    lg: { fontSize: 16, lineHeight: 24, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    md: { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
    sm: { fontSize: 12, lineHeight: 16, fontWeight: '400', fontFamily: 'PlusJakartaSans-Regular' },
  },
  // Labels / captions — Plus Jakarta Sans
  label: {
    lg: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    md: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
    sm: { fontSize: 10, lineHeight: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans-Medium' },
  },
  // Metrics / confidence numbers — bold sans
  'metric-confidence': {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
};

// Backwards-compatible kebab-case aliases (screens use typography['label-sm'] etc.)
typography['headline-xl'] = typography.headline.xl;
typography['headline-lg'] = typography.headline.lg;
typography['headline-md'] = typography.headline.md;
typography['headline-sm'] = typography.headline.sm;
typography['body-lg'] = typography.body.lg;
typography['body-md'] = typography.body.md;
typography['body-sm'] = typography.body.sm;
typography['label-lg'] = typography.label.lg;
typography['label-md'] = typography.label.md;
typography['label-sm'] = typography.label.sm;

// ---------------------------------------------------------------------------
// 3. SPACING — 4px grid system
// ---------------------------------------------------------------------------
const rems = (n) => Math.round(n * 16);
export const spacing = {
  gutter: rems(1),          // 16 — page margins
  margin: rems(1),          // 16
  'space-xs': rems(0.25),   // 4
  'space-sm': rems(0.5),    // 8
  'space-md': rems(1),      // 16
  'space-lg': rems(1.5),    // 24
  'space-xl': rems(2),     // 32
};

// ---------------------------------------------------------------------------
// 4. BORDER RADIUS — soft rounded corners
// ---------------------------------------------------------------------------
export const radius = {
  sm: rems(0.25),     // 4
  DEFAULT: rems(0.5), // 8
  md: rems(0.75),     // 12
  lg: rems(1),        // 16
  xl: rems(1.5),      // 24
  '2xl': rems(1.5),   // 24
  '3xl': rems(2),     // 32
  full: 9999,
};

// ---------------------------------------------------------------------------
// 5. SHARED STYLES — soft, paper-like surfaces
// ---------------------------------------------------------------------------
export const surfaceBg = { backgroundColor: colors.paper };
export const surfaceContainerLowest = {
  backgroundColor: colors['surface-container-low'],
};
export const textOnSurface = { color: colors['on-surface'] };
export const textMuted = { color: colors.muted };

// Soft paper shadow — barely perceptible elevation
export const shadowPaper = {
  elevation: 1,
  shadowColor: '#131b2e',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
};

export const shadowCard = {
  elevation: 2,
  shadowColor: '#131b2e',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
};

export const shadowStrong = {
  elevation: 6,
  shadowColor: '#131b2e',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
};

export default {
  colors,
  typography,
  spacing,
  radius,
  shadowPaper,
  shadowCard,
  shadowStrong,
};
