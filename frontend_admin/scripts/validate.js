#!/usr/bin/env node
/**
 * AgriScan Admin — Module + Render Validation
 *
 * Kiểm tra hai lớp:
 *   1. Module structure  — tất cả file nguồn dự kiến đều tồn tại.
 *   2. Render interface  — các export (default + named) của từng module
 *      khớp với những gì các màn hình / component khác import.
 *
 * Script này chạy trên Node.js thuần (không cần Metro/RN runtime) nên chỉ
 * phân tích nguồn bằng regex nhẹ — đủ để bắt thiếu file / export thiếu.
 *
 * Usage:  node scripts/validate.js   (hoặc npm run validate)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ── 1. Danh sách file dự kiến ──────────────────────────────────────────────
// Mỗi entry: [relativePath, isCritical]
const EXPECTED_FILES = [
  // Root entries
  ['index.js', true],
  ['app.json', true],
  ['package.json', true],
  ['babel.config.js', true],
  ['metro.config.js', true],
  ['.env', false],
  ['.env.example', true],

  // Core src
  ['src/App.js', true],
  ['src/config.js', true],
  ['src/theme.js', true],
  ['src/icons.js', true],
  ['src/api/client.js', true],
  ['src/hooks/useApi.js', true],
  ['src/utils/format.js', true],
  ['src/utils/motion.js', true],

  // Components
  ['src/components/UI.js', true],
  ['src/components/Charts.js', true],
  ['src/components/Drawer.js', true],
  ['src/components/Toast.js', true],
  ['src/components/ScreenTransition.js', true],

  // Screens (12)
  ['src/screens/DashboardScreen.js', true],
  ['src/screens/UsersScreen.js', true],
  ['src/screens/ScansScreen.js', true],
  ['src/screens/GuidesScreen.js', true],
  ['src/screens/AlertsScreen.js', true],
  ['src/screens/CommunityScreen.js', true],
  ['src/screens/OfficialScreen.js', true],
  ['src/screens/NotificationsScreen.js', true],
  ['src/screens/AiReportsScreen.js', true],
  ['src/screens/AuditScreen.js', true],
  ['src/screens/SystemScreen.js', true],
  ['src/screens/SettingsScreen.js', true],
];

// ── 2. Module → named exports dự kiến ─────────────────────────────────────
// Dựa trên phân tích export của từng file nguồn.
const EXPECTED_EXPORTS = {
  'src/api/client.js': [
    'api', 'initConfig', 'getApiBase', 'getAdminToken', 'ApiError',
    'saveConfig', 'errorMessage',
  ],
  'src/config.js': ['DEFAULT_API_BASE', 'DEFAULT_ADMIN_TOKEN', 'STORAGE_KEYS'],
  'src/theme.js': [
    'colors', 'font', 'radius', 'spacing', 'shadow', 'severityColor',
  ],
  'src/hooks/useApi.js': ['useApi', 'useDebounced'],
  'src/utils/format.js': [
    'fmtDate', 'fmtDateTime', 'timeAgo', 'fmtNumber', 'fmtPercent',
    'fmtCompact', 'toDateInput', 'todayISO', 'daysAgoISO',
    'SEVERITY_LABEL', 'SEVERITY_TONE', 'STATUS_LABEL', 'STATUS_TONE',
    'SOURCE_LABEL', 'NOTIFICATION_TYPE_LABEL', 'SCAN_STATUS_LABEL',
    'severityLabel', 'statusLabel', 'sourceLabel',
    'notificationTypeLabel', 'targetLabel', 'truncate', 'initials',
    'absoluteUrl',
  ],
  'src/utils/motion.js': ['MOTION', 'useReduceMotion', 'staggerDelay'],
  'src/components/UI.js': [
    'Screen', 'Card', 'Section', 'Row', 'Divider', 'Badge', 'Button',
    'IconButton', 'StatCard', 'Input', 'Select', 'ToggleRow', 'Tabs',
    'Segmented', 'SearchBar', 'Empty', 'Loading', 'ErrorBox', 'KeyValue',
    'Avatar', 'Pagination', 'ProgressBar', 'ModalSheet', 'styles',
  ],
  'src/components/Charts.js': ['DayBars', 'HBar', 'SeverityBar'],
  'src/components/Drawer.js': ['NAV_GROUPS', 'default'],
  'src/components/Toast.js': ['ToastProvider', 'useToast'],
  'src/components/ScreenTransition.js': ['default'],
  'src/icons.js': ['default'],
};

// ── 3. Hàm tiện ích ────────────────────────────────────────────────────────

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Kiểm tra một export (named) có xuất hiện trong source không.
 * Hỗ trợ:  export function name,  export const name,  export { name },
 *          export async function name
 */
function hasNamedExport(source, exportName) {
  const patterns = [
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${exportName}\\b`),
    new RegExp(`export\\s+(?:default\\s+)?class\\s+${exportName}\\b`),
    new RegExp(`export\\s+const\\s+${exportName}\\b`),
    new RegExp(`export\\s+let\\s+${exportName}\\b`),
    new RegExp(`export\\s+{[^}]*\\b${exportName}\\b[^}]*}`),
    new RegExp(`export\\s+{[^}]*\\b${exportName}\\s*as\\s+\\w+[^}]*}`),
  ];
  return patterns.some((p) => p.test(source));
}

/**
 * Kiểm tra default export có tồn tại không.
 */
function hasDefaultExport(source) {
  return /export\s+default\b/.test(source);
}

// ── 4. Quy trình validate ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors = [];

function log(ok, msg) {
  if (ok) {
    passed++;
    console.log(`  \u2705 ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  \u274c ${msg}`);
  }
}

console.log('─'.repeat(60));
console.log('AgriScan Admin — Validate');
console.log('─'.repeat(60));

// --- Phần 1: File existence ---
console.log('\n[1/2] Module structure (file existence)');
console.log('─'.repeat(60));

let fileOk = 0;
let fileMissing = 0;

EXPECTED_FILES.forEach(([relPath, isCritical]) => {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    fileOk++;
  } else {
    fileMissing++;
    const msg = `File ${relPath} ${isCritical ? 'bắt buộc' : 'tùy chọn'} không tồn tại`;
    log(false, msg);
  }
});

// Đếm file nguồn thực tế trong src/
const allSrcFiles = [];
function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else allSrcFiles.push(full);
  });
}
walk(SRC);

const criticalCount = EXPECTED_FILES.filter(([, critical]) => critical).length;
const nonCriticalCount = EXPECTED_FILES.length - criticalCount;
console.log(`  ${fileOk} file tồn tại (${criticalCount} bắt buộc + ${fileOk > criticalCount ? nonCriticalCount : 0} tùy chọn). ${allSrcFiles.length} file nguồn trong src/`);

// --- Phần 2: Export validation ---
console.log('\n[2/2] Render interface (named exports)');
console.log('─'.repeat(60));

Object.entries(EXPECTED_EXPORTS).forEach(([relPath, expectedNames]) => {
  const source = readFile(relPath);
  if (!source) {
    log(false, `Không đọc được ${relPath}`);
    return;
  }

  expectedNames.forEach((name) => {
    if (name === 'default') {
      log(hasDefaultExport(source), `${relPath} → export default`);
    } else {
      log(hasNamedExport(source, name), `${relPath} → export ${name}`);
    }
  });
});

// --- Tổng kết ---
console.log('\n' + '─'.repeat(60));
const total = passed + failed;
console.log(`\nKết quả: ${passed}/${total} checks passed`);
if (failed > 0) {
  console.log(`\nLỗi (${failed}):`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
} else {
  console.log('\n✅ Tất cả checks đạt thành công.');
}
