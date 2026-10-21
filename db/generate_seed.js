/**
 * AgriScan AI — extended seed DATA generator (PostgreSQL).
 *
 * Generates db/seed_data.sql with:
 *   - ~200 rows in the parent `scans` table (185 done / 15 processing),
 *   - 3 scan_pipeline_steps per scan + 2 scan_detections per scan,
 *   - richer reference data: articles, guides, guide_sections.
 *
 * WHY A GENERATOR? Hand-writing 200×(3+2)=1000 child rows is error-prone.
 * This script is deterministic (fixed PRNG seed) so the output SQL is stable
 * across runs and re-runnable (every INSERT uses ON CONFLICT ... DO NOTHING).
 *
 * Run:  node db/generate_seed.js
 *
 * The emitted SQL targets PostgreSQL (matches docker-compose.yml).
 * NOTE: crop_id values 1=rice, 2=tomato, 3=fruit are assumed stable because
 * crops are inserted with ON CONFLICT DO NOTHING first (see section 1 below).
 */
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — reproducible seed data.
// ---------------------------------------------------------------------------
function mulberry32(a) {
  let s = a >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x2f3a7c1e);
const rand = (n) => Math.floor(rng() * n);            // [0, n)
const randItem = (arr) => arr[Math.floor(rng() * arr.length)];
const randRange = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pad = (n, w) => String(n).padStart(w, '0');

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const CROPS = [
  { slug: 'rice',   id: 1, name: 'Lúa nước', label: 'Lúa',    icon: 'eco',    iconBg: '#e8f5e9', iconColor: '#16a34a' },
  { slug: 'tomato', id: 2, name: 'Cà chua',  label: 'Cà chua',icon: 'nature',  iconBg: '#fff3e0', iconColor: '#c2410c' },
  { slug: 'fruit',  id: 3, name: 'Trái cây', label: 'Trái cây',icon: 'apple', iconBg: '#e3f2fd', iconColor: '#1d4ed8' },
];

// Disease templates grouped by crop. severity ∈ {danger, warning}.
// `healthy` scans are generated separately (no disease).
const DISEASES = {
  rice: [
    { disease: 'Bệnh Đốm Nâu',          pathogen: 'Bipolaris oryzae (Cochliobolus miyabeanus)', severity: 'danger',   rec: 'Phun thuốc bảo vệ thực vật (azoxystrobin + propiconazole) + cắt bỏ lá bệnh, tẩm hàng hóa khử sinh học.', spread: 'Nhanh',        stage: 'Đẻ nhánh rộ',        loss: '15 - 25%' },
    { disease: 'Bệnh Ném Sinh',         pathogen: 'Magnaporthe oryzae',                          severity: 'danger',   rec: 'Phun đạm bố (tebuconazole) + trồng giống kháng bệnh IR64/B5 hạt, luân hóa bảo đảm 3 năm.', spread: 'Rất nhanh',     stage: 'Sớm cho thu hoạch', loss: '40 - 60%' },
    { disease: 'Bệnh Cháy Lá',          pathogen: 'Xanthomonas oryzae pv. oryzae',                severity: 'warning',  rec: 'Tẩm thuốc bảo vệ thực vật (streptomycin + kasugamycin) + trồng lúa kiên trữ, tưới cách ly.', spread: 'Trung bình',    stage: 'Ra hoa',             loss: '10 - 20%' },
    { disease: 'Bệnh Đốm Tím',          pathogen: 'Rhizoctonia solani',                           severity: 'warning',  rec: 'Phun fungicid (carbendazim) + bón thán chất hữu cơ, trồng lúa cách hàng rộng.',             spread: 'Chậm',        stage: 'Đẻ trục',            loss: '5 - 10%' },
    { disease: 'Sâu Nâu Rùa',           pathogen: 'Nilaparvata lugens',                              severity: 'danger',   rec: 'Phun thuốc insecticidal (buprofezin + imidacloprid) + lăn mặt nước, dùng động vật chân đáy.', spread: 'Nhanh',        stage: 'Đẻ nhánh rộ',        loss: '20 - 30%' },
  ],
  tomato: [
    { disease: 'Bệnh Vàng Lá (Early Blight)', pathogen: 'Alternaria solani',                  severity: 'warning',  rec: 'Phun fungicid (dodine + mancozeb) + cắt tỉa lá mắt, luân câu tích 3 năm.', spread: 'Chậm',        stage: 'Đẻ trục',            loss: '10 - 20%' },
    { disease: 'Bệnh Hư hỏng',               pathogen: 'Phytophthora infestans',            severity: 'danger',   rec: 'Phun metalaxyl + mancozeb, cắt bỏ lá hư, trồng cà chua trong nhà màng, tưới từ dưới.', spread: 'Rất nhanh',     stage: 'Sớm cho thu hoạch', loss: '25 - 40%' },
    { disease: 'Bệnh Đốm Thái',              pathogen: 'Xanthomonas perforans',                 severity: 'warning',  rec: 'Tẩm copper oxychloride + khử trùng hạt giống, tránh tưới đổ lên lá.',      spread: 'Trung bình',    stage: 'Ra hoa',             loss: '10 - 15%' },
    { disease: 'Bệnh Thối Thân',             pathogen: 'Fusarium oxysporum f.sp. lycopersici', severity: 'danger',   rec: 'Trồng giống kháng bệnh (Roma), dùng chất khối nặng, thuốc trừ nấm bền.',      spread: 'Trung bình',    stage: 'Đẻ nhánh rộ',        loss: '20 - 35%' },
    { disease: 'Bệnh Sương Mai',             pathogen: 'Septoria lycopersici',                 severity: 'warning',  rec: 'Phun streptomycin + mancozeb, cắt lá nhiễm, phun đều 7 ngày.',              spread: 'Chậm',        stage: 'Đẻ trục',            loss: '5 - 12%' },
  ],
  fruit: [
    { disease: 'Bệnh Đốm Trái Cây',          pathogen: 'Colletotrichum gloeosporioides',       severity: 'warning',  rec: 'Phun thiếp địa (copper hydroxide) + cắt cành bệnh, cân bằng đẫn nhẹ.',          spread: 'Chậm',        stage: 'Đẻ trục',            loss: '8 - 15%' },
    { disease: 'Bệnh Vàng Lá Xoăn',          pathogen: 'Papaya ringspot virus (PRSV)',          severity: 'danger',   rec: 'Đánh thuốc bảo vệ thực vật (carbaryl) + kiểm soát bọ xoắn bảo vệ cây.',      spread: 'Nhanh',        stage: 'Đẻ nhánh rộ',        loss: '15 - 30%' },
    { disease: 'Bệnh Thối Thâm',            pathogen: 'Sclerotium rolfsii',                     severity: 'warning',  rec: 'Phun thiên đường (vinaxarhan) + bón phân khoá học, vườn tưới khô ổ.',        spread: 'Trung bình',    stage: 'Ra hoa',             loss: '10 - 18%' },
    { disease: 'Sâu Rệp Trái Cây',           pathogen: 'Ceratitis capitata',                      severity: 'danger',   rec: 'Gài bẫu màu vàng, dùng thuốc việt chức (GF-120), thu hoạch đúng thời điểm.',    spread: 'Nhanh',        stage: 'Sớm cho thu hoạch', loss: '25 - 45%' },
    { disease: 'Bệnh Phấn Thâm',           pathogen: 'Oidium neolycopersici',                   severity: 'warning',  rec: 'Phun sulfur + tăng độ thoáng, tránh tưới tới lá, thuốc sinh học.',          spread: 'Chậm',        stage: 'Đẻ trục',            loss: '5 - 10%' },
  ],
};

// Healthy fallback for scans with no disease.
const HEALTHY = {
  disease: 'Không phát hiện bệnh', pathogen: '—', severity: 'healthy',
  rec: 'Cây khỏe mạnh, chăm sóc bình thường, giám sát định kỳ 2 tuần/lần.',
  spread: 'Không', stage: 'Chưa biểu hiện', loss: '< 5%',
};

// Articles: label ∈ {Mới, Cảnh báo, Kinh nghiệp}, action ∈ {read, watch, learn}
const ARTICLE_TITLES = [
  'Cập nhật: Bệnh Đốm Nâu mùa hè nóng', 'Cách truyền thống trồng lúa dòng kháng hạn',
  'Mẹo: Phòng tránh Bệnh Hư hỏng cà chua bằng nhà kính nhỏ', 'AI dự báo sớm sâu rệp trái cây',
  'Kỹ thuật tẩm thuốc sinh học cho vườn nhà', 'Bản tin sâu bệnh tuần 38: Cảnh báo Đốm Tím lúa',
  'Hướng dẫn chụp ảnh lá chẩn đoán chính xác 98%', 'So sánh 5 dòng cà chua kháng bệnh tại VN',
  'Chiến lược luân hóa 3 năm tăng năng suất lúa', 'Phòng tránh Bệnh Ném Sinh bằng phủ xanh',
  'Cẩm nang chăm sóc cây trái cây vàng 2025', 'Tại sao cần dùng bón thận cho cây trẻ',
  'Bệnh viêm đốm cà chua: Nguyên nhân & xử trí tức thì', 'Dự báo thời tiết và sâu bệnh tuần tới',
  'Kỹ thuật tẩm máp túi thông minh cho vườn nhỏ', 'Bệnh vàng lá trên dâu: phòng tránh ngay',
  'Hướng dẫn dùng AgriScan AI trên smartphone', 'Top 5 loại thuốc bảo vệ thực vật sinh học',
  'Cách nhận biết sớm Bệnh Cháy Lá lúa', 'Chiến lược đánh bật sâu rệp bằng bẫy màu',
];

// Guides — one per notable disease (we pick 8).
const GUIDE_DATA = [
  { id: 'g-002', icon: 'eco',    title: 'Bệnh Đốm Nâu (Bipolaris oryzae)',            subtitle: 'Nguyên nhân & cách phòng tránh cho lúa nước' },
  { id: 'g-003', icon: 'biotech', title: 'Bệnh Ném Sinh (Magnaporthe oryzae)',        subtitle: 'Nguyên nhãn & cách điều trị bệnh' },
  { id: 'g-004', icon: 'nature',  title: 'Bệnh Hư hỏng (Phytophthora infestans)',     subtitle: 'Biện pháp phòng tránh bệnh trên cà chua' },
  { id: 'g-005', icon: 'science', title: 'Bệnh Vàng Lá & Phấn Thâm trái cây',          subtitle: 'Hướng dẫn chăm sóc & thuốc trừ sâu' },
  { id: 'g-006', icon: 'shield',  title: 'Sâu Rệp Trái Cây (Ceratitis capitata)',       subtitle: 'Cách dùng bẫy & thuốc việt chức hiệu quả' },
  { id: 'g-007', icon: 'agronheart', title: 'Bệnh Đốm Thái & Thối Thân cây họ Solanum', subtitle: 'Phòng tránh & điều trị cho cà chua trái cây' },
  { id: 'g-008', icon: 'check_circle', title: 'Bệnh Cháy Lá & Đốm Tím lúa',             subtitle: 'Từ biên bản nhiệt độ & độ ẩm' },
  { id: 'g-009', icon: 'auto_awesome', title: 'Bệnh Sâu Nâu Rùa trên lúa',              subtitle: 'Quản lý môi trường nước & động vật chân đáy' },
];

// Guide section templates (reused per guide, slightly customized).
function sectionsFor(title) {
  return [
    { icon: 'check_circle', title: 'Nguyên nhãn',            body: `Nguyên nhân gây bệnh trên ${title} liên quan tới nhiệt độ cao (>32°C), độ ẩm > 85% trong thời gian mưa thoáng qua, cùng với ánh sáng mặt trời mạnh và đất thiếu khoá học.`, badge: 'Cận thể', badgeBg: '#F0FDF4', badgeText: '#16a34a', bg: '#F0FDF4' },
    { icon: 'warning',        title: 'Triệu chứng',          body: `Lá bị đốm, vàng lá hoặc thâm thâm tại vị trí tiếp xúc, lan tỏa nhanh ra sâu thân và nhánh, đặc biệt khi thời tiết ẩm ướt và nhiệt đới.`, badge: 'Cần theo dõi', badgeBg: '#FFFBEB', badgeText: '#b45200', bg: '#FFFBEB' },
    { icon: 'agronheart',     title: 'Phòng tránh & Điều trị', body: `Bón phân đủ khoá học, cắt tỉa lá bệnh, phun thuốc bảo vệ thực vật theo nhãn, và luân hóa bảo đảm 3 năm để cắt giảm nguồn bệnh.`, badge: 'Gợi ý', badgeBg: '#ECFDF5', badgeText: '#047857', bg: '' },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Escape SQL string literal.
function sqlStr(s) {
  return "'" + String(s === null || s === undefined ? '' : s).replace(/'/g, "''") + "'";
}

// created_at is expressed relative to LOAD time via `NOW() - INTERVAL 'N minutes'`.
// This keeps the preview fresh no matter when the seed file is applied — the
// youngest scan is always "a few minutes ago" and the oldest ~14 days old.
const MAX_AGE_MIN = 14 * 24 * 60; // 14 days in minutes

// ---------------------------------------------------------------------------
// Generate scans (200)
// ---------------------------------------------------------------------------
const NUM_SCANS = 200;
const NUM_PROCESSING = 14; // scans still running the AI pipeline
const scans = [];

// Build a flat list of disease templates per crop for weighted selection.
const diseaseByCrop = {};
for (const c of CROPS) {
  diseaseByCrop[c.slug] = DISEASES[c.slug];
}

for (let i = 0; i < NUM_SCANS; i++) {
  const idx = i + 1;
  const id = 'S' + pad(idx, 4);

  // Cycle crops so each crop gets a fair share (~67 each).
  const crop = CROPS[i % CROPS.length];

  // Decide disease vs healthy: ~45% healthy.
  const healthy = rng() < 0.45;
  let disease, pathogen, severity, rec, spread, stage, loss;
  if (healthy) {
    ({ disease, pathogen, severity, rec, spread, stage, loss } = HEALTHY);
  } else {
    const d = randItem(diseaseByCrop[crop.slug]);
    ({ disease, pathogen, severity, rec, spread, stage, loss } = d);
  }

  // Confidence: healthy scans lower & broad; disease scans high & specific.
  const confidence = healthy ? randRange(7000, 8200) / 100 : randRange(8800, 9950) / 100;

  // Assign statuses. Layout (youngest -> oldest):
  //   i=0  -> done,  3 min ago  (most-recent DONE  -> /result/latest candidate)
  //   i=1  -> processing, 1 min ago (most-recent overall -> /scan/session)
  //   i=2..14 -> processing, 5..120 min ago
  //   i=15..19 -> done, 20..200 min ago
  //   i>=20 -> done (mostly), 200 min .. 14 days
  let scanStatus, ageMinutes;
  if (i === 0) {
    scanStatus = 'done'; ageMinutes = 3;
  } else if (i === 1) {
    scanStatus = 'processing'; ageMinutes = 1;
  } else if (i < NUM_PROCESSING + 1) { // i=2..14
    scanStatus = 'processing'; ageMinutes = randRange(5, 120);
  } else if (i < 20) { // i=15..19
    scanStatus = 'done'; ageMinutes = randRange(20, 200);
  } else {
    scanStatus = rng() < 0.95 ? 'done' : 'processing';
    ageMinutes = randRange(200, MAX_AGE_MIN);
  }

  // created_at emitted as a relative SQL expression (fresh on every load).
  const createdAtSQL = "NOW() - INTERVAL '" + ageMinutes + " minutes'";

  // is_saved only applies to completed scans — you can't save a result that
  // is still running through the AI pipeline.
  const isSaved = scanStatus === 'done' && rng() < 0.18 ? 1 : 0;

  scans.push({
    id, cropId: crop.id, crop: crop.slug, cropLabel: crop.name, disease, pathogen, severity,
    image: 'https://agriscan.ai/samples/leaf_' + id.toLowerCase() + '.jpg',
    confidence, recommendation: rec, status_spread: spread, status_stage: stage, status_loss: loss,
    scan_status: scanStatus, is_saved: isSaved,
    // created_at is a raw SQL expr (NOW() - INTERVAL ...) — emitted unquoted.
    created_at: createdAtSQL,
    // carry crop tint onto the scan so child pipeline steps can reuse it.
    iconBg: crop.iconBg, iconColor: crop.iconColor,
    // Associate seed scans with the seed user (resolved at SQL load time via subquery).
    userId: "(SELECT id FROM users WHERE google_id = 'seed-dev-001' LIMIT 1)",
  });
}

// ---------------------------------------------------------------------------
// Child rows
// ---------------------------------------------------------------------------
const pipelineSteps = []; // 3 per scan
const detections = [];    // 2 per scan

for (const s of scans) {
  const isDone = s.scan_status === 'done';
  // p1 — image intake (always done & active). Tinted circle per crop.
  pipelineSteps.push({ scan_id: s.id, id: 'p1', icon: 'image_search', title: 'Tiếp nhận ảnh lá', descr: '', step_status: 'Hoàn tất', is_active: 1, icon_bg: s.iconBg, icon_color: s.iconColor, sort_order: 1 });
  // p2 — AI analysis
  if (isDone) {
    pipelineSteps.push({ scan_id: s.id, id: 'p2', icon: 'biotech', title: 'Phân tích AI Vision', descr: '', step_status: 'Hoàn tất', is_active: 0, icon_bg: '', icon_color: '', sort_order: 2 });
  } else {
    const pct = randRange(30, 92);
    pipelineSteps.push({ scan_id: s.id, id: 'p2', icon: 'biotech', title: 'Phân tích AI Vision', descr: '', step_status: 'Đang phân tích (' + pct + '%)', is_active: 1, icon_bg: '#eef2ff', icon_color: '#255bb5', sort_order: 2 });
  }
  // p3 — recommendation
  pipelineSteps.push({ scan_id: s.id, id: 'p3', icon: 'agronheart', title: 'Đề xuất phòng trừ', descr: '', step_status: isDone ? 'Hoàn tất' : '', is_active: 0, icon_bg: '', icon_color: '', sort_order: 3 });

  // Detection boxes
  const det1Top = randRange(15, 65) + '%';
  const det1Left = randRange(15, 70) + '%';
  const det1Conf = randRange(85, 98) + '%';
  const det2Top = randRange(20, 75) + '%';
  const det2Left = randRange(20, 75) + '%';
  const detConf2 = randRange(78, 95) + '%';
  const detSeverity = s.severity === 'healthy' ? 'healthy' : s.severity;
  detections.push({ scan_id: s.id, id: 'd1', top: det1Top, left_pos: det1Left, confidence: det1Conf, severity: detSeverity, sort_order: 1 });
  detections.push({ scan_id: s.id, id: 'd2', top: det2Top, left_pos: det2Left, confidence: detConf2, severity: s.severity === 'healthy' ? 'healthy' : (rng() < 0.5 ? 'warning' : s.severity), sort_order: 2 });
}

// Attach icon_bg/icon_color from crop to pipeline p1 for variety (light tint).
// (Re-map above: pipelineSteps p1 icon_bg uses crop tint.)
for (let k = 0; k < pipelineSteps.length; k += 3) {
  const crop = CROPS[k / 3 % CROPS.length]; // same cycle as scans
  pipelineSteps[k].icon_bg = crop.iconBg;
  pipelineSteps[k].icon_color = crop.iconColor;
}

// ---------------------------------------------------------------------------
// Articles (20)
// ---------------------------------------------------------------------------
const articleLabels = [
  { label: 'Mới',        color: '#EF4444', bg: '#F8D7DA' },
  { label: 'Cảnh báo',   color: '#F59E0B', bg: '#FEF3C7' },
  { label: 'Kinh nghiệm', color: '#10B981', bg: '#DBEAFE' },
];
const articleActions = ['read', 'watch', 'learn'];
const articles = [];
for (let i = 0; i < 20; i++) {
  const tpl = randItem(articleLabels);
  const age = i < 6 ? randRange(1, 59) : randRange(1, 168); // minutes or hours
  const unit = i < 6 ? 'phút trước' : randRange(1, 24) === age && age <= 24 ? age + ' giờ trước' : Math.ceil(age / 24) + ' ngày trước';
  let timeStr;
  if (i < 6) timeStr = age + ' phút trước';
  else if (age <= 24) timeStr = age + ' giờ trước';
  else timeStr = Math.ceil(age / 24) + ' ngày trước';
  articles.push({
    id: 'art-' + pad(i + 2, 3),
    image: 'https://agriscan.ai/samples/article' + pad((i + 2) % 5, 1) + '.jpg',
    label: tpl.label, label_color: tpl.color, time: timeStr,
    title: randItem(ARTICLE_TITLES), action: randItem(articleActions), tag_bg: tpl.bg,
  });
}

// ---------------------------------------------------------------------------
// Guides + sections
// ---------------------------------------------------------------------------
const guides = GUIDE_DATA.map((g) => g);
const guideSections = [];
for (const g of GUIDE_DATA) {
  const secs = sectionsFor(g.title);
  secs.forEach((s, si) => guideSections.push({ guide_id: g.id, icon: s.icon, title: s.title, body: s.body, badge: s.badge, badge_bg: s.badgeBg, badge_text: s.badgeText, bg: s.bg, sort_order: si + 1 }));
}

// ---------------------------------------------------------------------------
// Emit SQL (PostgreSQL)
// ---------------------------------------------------------------------------
const L = [];
const push = (line = '') => L.push(line);

/**
 * Emit a fully idempotent INSERT.
 *   table        -> target table name
 *   cols         -> array of column names
 *   rows         -> array of strings, each the comma-joined VALUES content for one row
 *                  (already SQL-formatted via sqlStr/String; raw exprs like NOW()-INTERVAL
 *                   are passed straight through since they are NOT quoted)
 *   conflict     -> conflict target, e.g. '(id)', '(slug)', '(guide_id, sort_order)'
 *   opts.batch   -> if set, sprinkle a `-- (batch boundary)` comment every N rows
 */
function emitInsert(table, cols, rows, conflict, opts) {
  const batch = (opts && opts.batch) || 0;
  push('INSERT INTO ' + table + ' (' + cols.join(', ') + ') VALUES');
  rows.forEach((row, i) => {
    const last = i === rows.length - 1;
    push('  (' + row + ')' + (last ? '' : ','));
    if (batch && (i + 1) % batch === 0 && !last) push('-- (batch boundary)');
  });
  push('ON CONFLICT ' + conflict + ' DO NOTHING;');
  push('');
}

push('-- ===========================================================================');
push('-- AgriScan AI — extended optional seed data (PostgreSQL 16)');
push('--');
push('-- ~200 rows in the parent `scans` table + child rows (scan_pipeline_steps,');
push('-- scan_detections), plus richer reference data (articles, guides, sections).');
push('--');
push('-- Generated by db/generate_seed.js (deterministic — same output every run).');
push('-- Idempotent: every INSERT uses ON CONFLICT ... DO NOTHING so this file can');
push('-- be re-run safely on top of the base schema seed (A841 etc. are preserved).');
push('--');
push('-- Run order matters for FK integrity:');
push('--   crops -> articles -> guides -> guide_sections -> scans ->');
push('--   scan_pipeline_steps -> scan_detections');
push('-- ===========================================================================');
push('');

// 1. crops (idempotent, keeps ids 1/2/3 stable)
push('-- 0. Seed user — so authenticated demo users see seeded scans');
push("INSERT INTO users (google_id, email, name, avatar) VALUES");
push("  ('seed-dev-001', 'dev@agriscan.ai', 'Nông dân mẫu', '')");
push("ON CONFLICT (google_id) DO NOTHING;");
push('');
push('');
push('-- 1. Crops (reference data — ids 1=rice, 2=tomato, 3=fruit are assumed below)');
push('INSERT INTO crops (slug, name, label, icon) VALUES');
push("  ('rice', 'Lúa nước', 'Lúa', 'eco'),");
push("  ('tomato', 'Cà chua', 'Cà chua', 'nature'),");
push("  ('fruit', 'Trái cây', 'Trái cây', 'apple')");
push('ON CONFLICT (slug) DO NOTHING;');
push('');

// 2. articles
push('-- 2. Articles (home "tips & alerts" cards)');
emitInsert(
  'articles',
  ['id', 'image', 'label', 'label_color', 'time', 'title', 'action', 'tag_bg'],
  articles.map((a) => [sqlStr(a.id), sqlStr(a.image), sqlStr(a.label), sqlStr(a.label_color), sqlStr(a.time), sqlStr(a.title), sqlStr(a.action), sqlStr(a.tag_bg)].join(', ')),
  '(id)'
);

// 3. guides
push('-- 3. Guides (result detail accordion + /guides)');
emitInsert(
  'guides',
  ['id', 'icon', 'title', 'subtitle'],
  guides.map((g) => [sqlStr(g.id), sqlStr(g.icon), sqlStr(g.title), sqlStr(g.subtitle)].join(', ')),
  '(id)'
);

// 4. guide_sections
// NOTE: the base schema only has a SERIAL PK on guide_sections — no unique
// constraint on the natural key (guide_id, sort_order). A bare ON CONFLICT ...
// DO NOTHING therefore never collides (auto id is always new) and rows would
// duplicate on re-run. We add a unique index on (guide_id, sort_order) and
// conflict on it so the whole seed is truly idempotent. IF NOT EXISTS keeps
// this safe to re-run even if the index already exists.
push('-- 4. Guide sections (accordion body panels)');
push('CREATE UNIQUE INDEX IF NOT EXISTS uq_guide_sections_guide_sort ON guide_sections (guide_id, sort_order);');
emitInsert(
  'guide_sections',
  ['guide_id', 'icon', 'title', 'body', 'badge', 'badge_bg', 'badge_text', 'bg', 'sort_order'],
  guideSections.map((s) => [sqlStr(s.guide_id), sqlStr(s.icon), sqlStr(s.title), sqlStr(s.body), sqlStr(s.badge), sqlStr(s.badge_bg), sqlStr(s.badge_text), sqlStr(s.bg), String(s.sort_order)].join(', ')),
  '(guide_id, sort_order)'
);

// 5. scans (200) — the parent table.
// created_at is emitted as a raw `NOW() - INTERVAL 'N minutes'` expression (NOT
// quoted), so the preview "recency" is always relative to whenever the seed loads.
push('-- 5. Scans (parent table — ' + scans.length + ' rows: ' +
  scans.filter((s) => s.scan_status === 'done').length + ' done / ' +
  scans.filter((s) => s.scan_status === 'processing').length + ' processing)');
emitInsert(
  'scans',
  ['id', 'crop_id', 'user_id', 'crop', 'crop_label', 'disease', 'pathogen', 'severity', 'image', 'confidence', 'recommendation', 'status_spread', 'status_stage', 'status_loss', 'scan_status', 'is_saved', 'created_at'],
  scans.map((s) => [
    sqlStr(s.id), String(s.cropId), s.userId, sqlStr(s.crop), sqlStr(s.cropLabel), sqlStr(s.disease), sqlStr(s.pathogen),
    sqlStr(s.severity), sqlStr(s.image), String(s.confidence.toFixed(2)), sqlStr(s.recommendation),
    sqlStr(s.status_spread), sqlStr(s.status_stage), sqlStr(s.status_loss),
    sqlStr(s.scan_status), String(s.is_saved), s.created_at,
  ].join(', ')),
  '(id)',
  { batch: 25 }
);

// 6. scan_pipeline_steps (3 per scan)
push('-- 6. Scan pipeline steps (3 per scan × ' + scans.length + ' = ' + pipelineSteps.length + ')');
emitInsert(
  'scan_pipeline_steps',
  ['scan_id', 'id', 'icon', 'title', 'descr', 'step_status', 'is_active', 'icon_bg', 'icon_color', 'sort_order'],
  pipelineSteps.map((p) => [sqlStr(p.scan_id), sqlStr(p.id), sqlStr(p.icon), sqlStr(p.title), sqlStr(p.descr), sqlStr(p.step_status), String(p.is_active), sqlStr(p.icon_bg), sqlStr(p.icon_color), String(p.sort_order)].join(', ')),
  '(scan_id, id)',
  { batch: 50 }
);

// 7. scan_detections (2 per scan)
push('-- 7. Scan detections (2 per scan × ' + scans.length + ' = ' + detections.length + ')');
emitInsert(
  'scan_detections',
  ['scan_id', 'id', 'top', 'left_pos', 'confidence', 'severity', 'sort_order'],
  detections.map((d) => [sqlStr(d.scan_id), sqlStr(d.id), sqlStr(d.top), sqlStr(d.left_pos), sqlStr(d.confidence), sqlStr(d.severity), String(d.sort_order)].join(', ')),
  '(scan_id, id)',
  { batch: 50 }
);

push('-- Total: ' + scans.length + ' scans, ' + pipelineSteps.length + ' pipeline steps, ' + detections.length + ' detections, ' + articles.length + ' articles, ' + guides.length + ' guides, ' + guideSections.length + ' guide sections.');
push('-- ===========================================================================');
push('-- End of seed_data.sql');

// ---------------------------------------------------------------------------
fs.writeFileSync(path.join(__dirname, 'seed_data.sql'), L.join('\n') + '\n', 'utf8');
console.log('Wrote db/seed_data.sql');
console.log('scans=' + scans.length + ' (done=' + scans.filter(s=>s.scan_status==='done').length + ', processing=' + scans.filter(s=>s.scan_status==='processing').length + ')');
console.log('pipeline_steps=' + pipelineSteps.length);
console.log('detections=' + detections.length);
console.log('articles=' + articles.length);
console.log('guides=' + guides.length + ' sections=' + guideSections.length);
