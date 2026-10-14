-- AgriScan AI — PostgreSQL Schema (UTF-8)

-- 1. Crops / plant types
CREATE TABLE IF NOT EXISTS crops (
  id    SERIAL PRIMARY KEY,
  slug  VARCHAR(32) NOT NULL UNIQUE,
  name  VARCHAR(64) NOT NULL,
  label VARCHAR(64) NOT NULL,
  icon  VARCHAR(64) NOT NULL DEFAULT 'eco'
);

-- 2. Scans — single source of truth for HistoryRecord + ScanSession + ResultReport.
CREATE TABLE IF NOT EXISTS scans (
  id             VARCHAR(32)    PRIMARY KEY,
  crop_id        INTEGER        REFERENCES crops(id) ON DELETE SET NULL,
  crop           VARCHAR(32)    NOT NULL DEFAULT '',
  crop_label     VARCHAR(64)    NOT NULL,
  disease        VARCHAR(128)   NOT NULL,
  pathogen       VARCHAR(255)   NOT NULL DEFAULT '',
  severity       VARCHAR(32)    NOT NULL DEFAULT 'healthy',
  image          VARCHAR(255)   NOT NULL DEFAULT '',
  confidence     DECIMAL(5,2)   NOT NULL DEFAULT 0,
  recommendation TEXT,
  status_spread  VARCHAR(64)    NOT NULL DEFAULT '',
  status_stage   VARCHAR(64)    NOT NULL DEFAULT '',
  status_loss    VARCHAR(64)    NOT NULL DEFAULT '',
  scan_status    VARCHAR(32)    NOT NULL DEFAULT 'processing',
  is_saved       SMALLINT       NOT NULL DEFAULT 0,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_crop ON scans (crop);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans (scan_status);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans (created_at);

-- 3. Scan pipeline steps
CREATE TABLE IF NOT EXISTS scan_pipeline_steps (
  scan_id     VARCHAR(32)   NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  id          VARCHAR(32)   NOT NULL,
  icon        VARCHAR(64)   NOT NULL DEFAULT 'hourglass_empty',
  title       VARCHAR(128)  NOT NULL,
  descr       VARCHAR(255)  NOT NULL DEFAULT '',
  step_status VARCHAR(32)   NOT NULL DEFAULT '',
  is_active   SMALLINT      NOT NULL DEFAULT 0,
  icon_bg     VARCHAR(32)   NOT NULL DEFAULT '',
  icon_color  VARCHAR(32)   NOT NULL DEFAULT '',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (scan_id, id)
);

-- 4. Detections
CREATE TABLE IF NOT EXISTS scan_detections (
  scan_id    VARCHAR(32)    NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  id         VARCHAR(32)    NOT NULL,
  top        VARCHAR(16)    NOT NULL,
  left_pos   VARCHAR(16)    NOT NULL,
  confidence VARCHAR(32)    NOT NULL,
  severity   VARCHAR(32)    NOT NULL DEFAULT 'danger',
  sort_order SMALLINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (scan_id, id)
);

-- 5. Articles
CREATE TABLE IF NOT EXISTS articles (
  id          VARCHAR(32)   PRIMARY KEY,
  image       VARCHAR(255)  NOT NULL,
  label       VARCHAR(64)   NOT NULL,
  label_color VARCHAR(32)   NOT NULL DEFAULT '',
  time        VARCHAR(32)   NOT NULL,
  title       VARCHAR(128)  NOT NULL,
  action      VARCHAR(32)   NOT NULL DEFAULT '',
  tag_bg      VARCHAR(32)   NOT NULL DEFAULT ''
);

-- 6. Guides
CREATE TABLE IF NOT EXISTS guides (
  id       VARCHAR(32)  PRIMARY KEY,
  icon     VARCHAR(64)  NOT NULL DEFAULT 'help',
  title    VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT ''
);

-- 7. Guide sections
CREATE TABLE IF NOT EXISTS guide_sections (
  id         SERIAL        PRIMARY KEY,
  guide_id   VARCHAR(32)   NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  icon       VARCHAR(64)   NOT NULL DEFAULT 'lens_blur',
  title      VARCHAR(128)  NOT NULL DEFAULT '',
  body       TEXT          NOT NULL,
  badge      VARCHAR(64)   NOT NULL DEFAULT '',
  badge_bg   VARCHAR(32)   NOT NULL DEFAULT '',
  badge_text VARCHAR(32)   NOT NULL DEFAULT '',
  bg         VARCHAR(32)   NOT NULL DEFAULT '',
  sort_order SMALLINT      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_section_guide ON guide_sections (guide_id);

-- 8. Users (Google-authenticated)
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  google_id  VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL,
  avatar     VARCHAR(512) NOT NULL DEFAULT '',
  created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(64) PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users (email);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- Optional seed data
INSERT INTO crops (slug, name, label, icon) VALUES
  ('rice', 'Lúa nước', 'Lúa', 'eco'),
  ('tomato', 'Cà chua', 'Cà chua', 'nature'),
  ('fruit', 'Trái cây', 'Trái cây', 'apple')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO scans
  (id, crop_id, crop, crop_label, disease, pathogen, severity, image, confidence, recommendation, status_spread, status_stage, status_loss, scan_status, is_saved, created_at)
VALUES
  ('A841', 1, 'rice', 'Lúa nước', 'Bệnh Đốm Nâu', 'Bipolaris oryzae (Cochliobolus miyabeanus)',
   'danger', 'https://agriscan.ai/samples/leaf_a841.jpg', 96.40,
   'Phun thuốc bảo vệ thực vật + cắt bỏ lá bệnh.',
   'Nhanh', 'Đẻ nhánh rộ', '15 - 25%', 'done', 1, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO scan_pipeline_steps
  (scan_id, id, icon, title, descr, step_status, is_active, icon_bg, icon_color, sort_order)
VALUES
  ('A841', 'p1', 'image_search', 'Tiếp nhận ảnh lá', '', 'Hoàn tất', 1, '', '', 1),
  ('A841', 'p2', 'biotech', 'Phân tích LLaMA Vision', '', '', 0, '', '', 2),
  ('A841', 'p3', 'agronheart', 'Đề xuất phòng trừ', '', '', 0, '', '', 3)
ON CONFLICT (scan_id, id) DO NOTHING;

INSERT INTO scan_detections (scan_id, id, top, left_pos, confidence, severity, sort_order) VALUES
  ('A841', 'd1', '32%', '42%', '96%', 'danger', 1),
  ('A841', 'd2', '55%', '25%', '96%', 'warning', 2)
ON CONFLICT (scan_id, id) DO NOTHING;

INSERT INTO articles (id, image, label, label_color, time, title, action, tag_bg) VALUES
  ('art-001', 'https://agriscan.ai/samples/article1.jpg', 'Mới', '#EF4444', '2 giờ trước', 'Cập nhật: Bệnh Đốm Nâu mùa hè nóng', 'read', '#F8D7DA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO guides (id, icon, title, subtitle) VALUES
  ('g-001', 'eco', 'Bệnh Đốm Nâu (Bipolaris oryzae)', 'Nguyên nhân & cách phòng tránh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO guide_sections (guide_id, icon, title, body, badge, badge_bg, badge_text, bg, sort_order) VALUES
  ('g-001', 'check_circle', 'Nguyên nhân', 'Nhiệt độ cao + độ ẩm > 85% vào thời gian mưa thoáng qua.', '', '#F0FDF4', '#16a34a', '', 1)
ON CONFLICT DO NOTHING;
