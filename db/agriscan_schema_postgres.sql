-- =============================================================================
-- AgriScan AI — PostgreSQL Production Schema (UTF-8)
--
-- Tables are defined in foreign-key dependency order. All tables include
-- created_at/updated_at timestamps and appropriate indexes for production
-- query patterns (user-scoped scans, recent-first ordering, status filtering).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Crops / plant types
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crops (
  id        SERIAL PRIMARY KEY,
  slug      VARCHAR(32)  NOT NULL UNIQUE,   -- 'rice','tomato','fruit'
  name      VARCHAR(64)  NOT NULL,           -- 'Lúa nước'
  label     VARCHAR(64)  NOT NULL,           -- 'Lúa' (display on pills)
  icon      VARCHAR(64)  NOT NULL DEFAULT 'eco',
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crops_slug ON crops (slug);

-- -----------------------------------------------------------------------------
-- 2. Users (Google-authenticated accounts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  google_id  VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL,
  avatar     VARCHAR(512) NOT NULL DEFAULT '',
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);

-- -----------------------------------------------------------------------------
-- 3. Sessions (7-day expiry server-side tokens)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(64) PRIMARY KEY,   -- 32-byte hex token
  user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions (user_id, expires_at);

-- -----------------------------------------------------------------------------
-- 4. Scans — single source of truth for HistoryRecord + ScanSession + ResultReport.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
  id             VARCHAR(32)    PRIMARY KEY,
  crop_id        INTEGER   REFERENCES crops(id) ON DELETE SET NULL,
  user_id        INTEGER   REFERENCES users(id) ON DELETE SET NULL,
  crop           VARCHAR(32)    NOT NULL DEFAULT '',
  crop_label     VARCHAR(64)    NOT NULL,
  disease        VARCHAR(128)   NOT NULL,
  pathogen       VARCHAR(255)   NOT NULL DEFAULT '',
  severity       VARCHAR(32)    NOT NULL DEFAULT 'healthy'
                 CHECK (severity IN ('healthy','warning','danger')),
  image          VARCHAR(255)   NOT NULL DEFAULT '',
  confidence     DECIMAL(5,2)   NOT NULL DEFAULT 0
                 CHECK (confidence >= 0 AND confidence <= 100),
  recommendation TEXT,
  status_spread  VARCHAR(64)    NOT NULL DEFAULT '',
  status_stage   VARCHAR(64)    NOT NULL DEFAULT '',
  status_loss    VARCHAR(64)    NOT NULL DEFAULT '',
  scan_status    VARCHAR(32)    NOT NULL DEFAULT 'processing'
                 CHECK (scan_status IN ('processing','done','failed')),
  is_saved       SMALLINT       NOT NULL DEFAULT 0 CHECK (is_saved IN (0,1)),
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP      NULL  -- soft delete support
);

CREATE INDEX IF NOT EXISTS idx_scans_crop      ON scans (crop);
CREATE INDEX IF NOT EXISTS idx_scans_status    ON scans (scan_status);
CREATE INDEX IF NOT EXISTS idx_scans_created   ON scans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_user      ON scans (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_status ON scans (user_id, scan_status);
CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_deleted   ON scans (deleted_at) WHERE deleted_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. Scan pipeline steps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_pipeline_steps (
  scan_id     VARCHAR(32)   NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  id          VARCHAR(32)   NOT NULL,
  icon        VARCHAR(64)   NOT NULL DEFAULT 'hourglass_empty',
  title       VARCHAR(128)  NOT NULL,
  descr       VARCHAR(255)  NOT NULL DEFAULT '',
  step_status VARCHAR(32)   NOT NULL DEFAULT '',
  is_active   SMALLINT      NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)),
  icon_bg     VARCHAR(32)   NOT NULL DEFAULT '',
  icon_color  VARCHAR(32)   NOT NULL DEFAULT '',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scan_id, id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_scan ON scan_pipeline_steps (scan_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_sort ON scan_pipeline_steps (scan_id, sort_order);

-- -----------------------------------------------------------------------------
-- 6. Detections — abnormal leaf regions from AI model
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_detections (
  scan_id    VARCHAR(32)    NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  id         VARCHAR(32)    NOT NULL,
  top        VARCHAR(16)    NOT NULL,
  left_pos   VARCHAR(16)    NOT NULL,
  confidence VARCHAR(32)    NOT NULL,
  severity   VARCHAR(32)    NOT NULL DEFAULT 'danger'
             CHECK (severity IN ('healthy','warning','danger')),
  sort_order SMALLINT       NOT NULL DEFAULT 0,
  created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scan_id, id)
);

CREATE INDEX IF NOT EXISTS idx_detection_scan ON scan_detections (scan_id);
CREATE INDEX IF NOT EXISTS idx_detection_sort ON scan_detections (scan_id, sort_order);

-- -----------------------------------------------------------------------------
-- 7. Articles — home "tips & alerts" cards
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id          VARCHAR(32)   PRIMARY KEY,
  image       VARCHAR(255)  NOT NULL,
  label       VARCHAR(64)   NOT NULL,
  label_color VARCHAR(32)   NOT NULL DEFAULT '',
  time        VARCHAR(32)   NOT NULL,
  title       VARCHAR(128)  NOT NULL,
  action      VARCHAR(32)   NOT NULL DEFAULT '',
  tag_bg      VARCHAR(32)   NOT NULL DEFAULT '',
  url         VARCHAR(255)  NOT NULL DEFAULT '',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 8. Guides — /guides endpoint & ResultReport.accordion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guides (
  id       VARCHAR(32)  PRIMARY KEY,
  icon     VARCHAR(64)  NOT NULL DEFAULT 'help',
  title    VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. Guide sections — AccordionItem.sections
-- -----------------------------------------------------------------------------
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
  sort_order SMALLINT      NOT NULL DEFAULT 0,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_section_guide   ON guide_sections (guide_id);
CREATE INDEX IF NOT EXISTS idx_section_guide_sort ON guide_sections (guide_id, sort_order);

-- -----------------------------------------------------------------------------
-- 10. Audit log — trace important actions (save/unsave/analyze/delete/login/logout)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER   REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(32)   NOT NULL,
  target_table VARCHAR(32) NOT NULL,
  target_id   VARCHAR(64)   NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log (target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log (action);

-- =============================================================================
-- 11. User Roles — vai trò hệ thống (admin, farmer, agronomist, expert)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(32)   NOT NULL UNIQUE,   -- 'admin','farmer','agronomist','expert'
  description VARCHAR(255) NOT NULL DEFAULT '',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP     NULL               -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_user_roles_name   ON user_roles (name);
CREATE INDEX IF NOT EXISTS idx_user_roles_deleted ON user_roles (deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- 12. User Profiles — hồ sơ chi tiết người dùng
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone         VARCHAR(32)  NOT NULL DEFAULT '',
  address       VARCHAR(255) NOT NULL DEFAULT '',
  province      VARCHAR(64)  NOT NULL DEFAULT '',
  district      VARCHAR(64)  NOT NULL DEFAULT '',
  ward          VARCHAR(64)  NOT NULL DEFAULT '',
  farming_area  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (farming_area >= 0),
  language      VARCHAR(8)   NOT NULL DEFAULT 'vi' CHECK (language IN ('vi','en')),
  timezone      VARCHAR(64)  NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  avatar_url    VARCHAR(512) NOT NULL DEFAULT '',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 13. User Role Assignments — liên kết user với vai trò (m-n)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_role_assignments (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER   REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_role_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_role_assignments (role_id);

-- =============================================================================
-- 14. User Devices — thiết bị đã đăng nhập (push notification, last seen)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id          VARCHAR(64) PRIMARY KEY,   -- device ID / installation ID
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(128) NOT NULL DEFAULT '',
  platform    VARCHAR(16) NOT NULL DEFAULT '' CHECK (platform IN ('android','ios','web')),
  push_token  VARCHAR(512) NOT NULL DEFAULT '',
  app_version VARCHAR(32)  NOT NULL DEFAULT '',
  last_seen   TIMESTAMP    NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL               -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push ON user_devices (push_token) WHERE push_token <> '';
CREATE INDEX IF NOT EXISTS idx_user_devices_deleted ON user_devices (deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- 15. User Activity Logs — lịch sử hoạt động (login, logout, view, share, save)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER   REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(32)   NOT NULL,            -- 'login','logout','view_result','share','save_scan','delete_scan'
  target_table VARCHAR(32) NOT NULL DEFAULT '',
  target_id   VARCHAR(64)   NOT NULL DEFAULT '',
  ip_address  VARCHAR(45)   NOT NULL DEFAULT '', -- IPv4 or IPv6
  user_agent  VARCHAR(512) NOT NULL DEFAULT '',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user   ON user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_logs (created_at DESC);

-- =============================================================================
-- 16. User Settings — cài đặt cá nhân (thông báo, ngôn ngữ, đơn vị)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id            INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications_on   SMALLINT NOT NULL DEFAULT 1 CHECK (notifications_on IN (0,1)),
  email_notifications SMALLINT NOT NULL DEFAULT 0 CHECK (email_notifications IN (0,1)),
  push_notifications  SMALLINT NOT NULL DEFAULT 1 CHECK (push_notifications IN (0,1)),
  language            VARCHAR(8)  NOT NULL DEFAULT 'vi' CHECK (language IN ('vi','en')),
  unit_system         VARCHAR(16) NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
  created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 17. Notifications — thông báo gửi cho người dùng
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT        NOT NULL,
  type        VARCHAR(32) NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','error','alert')),
  is_read     SMALLINT    NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  data        JSONB,                              -- dữ liệu kèm theo (scan_id, deep_link, …)
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at     TIMESTAMP   NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- =============================================================================
-- 18. Guide Categories — phân loại hướng dẫn bệnh (theo loại cây, nhóm bệnh)
-- =============================================================================
CREATE TABLE IF NOT EXISTS guide_categories (
  id          VARCHAR(32) PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  slug        VARCHAR(64)  NOT NULL UNIQUE,
  description TEXT         NOT NULL DEFAULT '',
  icon        VARCHAR(64)  NOT NULL DEFAULT 'help',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL               -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_guide_categories_slug ON guide_categories (slug);
CREATE INDEX IF NOT EXISTS idx_guide_categories_deleted ON guide_categories (deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- 19. Guide Category Map — liên kết hướng dẫn với phân loại (m-n)
-- =============================================================================
CREATE TABLE IF NOT EXISTS guide_category_map (
  guide_id    VARCHAR(32) NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  category_id VARCHAR(32) NOT NULL REFERENCES guide_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_category_guide ON guide_category_map (guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_category_cat   ON guide_category_map (category_id);

-- =============================================================================
-- 20. Documents — tài liệu đính kèm (PDF, video, link ngoài) cho hướng dẫn
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(32) PRIMARY KEY,
  guide_id    VARCHAR(32)   REFERENCES guides(id) ON DELETE CASCADE,
  title       VARCHAR(128) NOT NULL,
  file_url    VARCHAR(512) NOT NULL,
  file_type   VARCHAR(16)  NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf','video','link','image')),
  file_size   INTEGER      NULL,              -- bytes
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL               -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_documents_guide ON documents (guide_id);
CREATE INDEX IF NOT EXISTS idx_documents_sort  ON documents (guide_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents (deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- 21. User Crop Preferences — cây trồng mà người dùng quan tâm (để nhận cảnh báo)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_crop_preferences (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id     INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  is_active   SMALLINT NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, crop_id)
);

CREATE INDEX IF NOT EXISTS idx_user_crop_prefs_user ON user_crop_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_user_crop_prefs_crop ON user_crop_preferences (crop_id);

-- =============================================================================
-- 22. Crop Disease Alerts — cảnh báo bệnh mùa / bệnh đang xuất hiện theo cây trồng
-- =============================================================================
CREATE TABLE IF NOT EXISTS crop_disease_alerts (
  id            VARCHAR(32) PRIMARY KEY,
  crop_id       INTEGER   NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  disease_name  VARCHAR(128) NOT NULL,           -- 'Bệnh Đốm Nâu'
  disease_label VARCHAR(128) NOT NULL,           -- hiển thị cho người dùng
  severity      VARCHAR(32)   NOT NULL DEFAULT 'warning' CHECK (severity IN ('healthy','warning','danger')),
  season_months VARCHAR(64)   NOT NULL DEFAULT '', -- '1,2,3,12' = tháng 1,2,3,12 (mùa bệnh)
  province      VARCHAR(64)   NOT NULL DEFAULT '', -- '' = toàn quốc, hoặc tên tỉnh (34 đơn vị)
  description   TEXT        NOT NULL DEFAULT '', -- mô tả bệnh và triệu chứng
  recommendation TEXT       NOT NULL DEFAULT '', -- khuyên xử lý
  is_active     SMALLINT    NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  start_date    DATE        NULL,                -- bắt đầu hiệu lực (nếu có)
  end_date      DATE        NULL,                -- hết hiệu lực (nếu có)
  source        VARCHAR(16) NOT NULL DEFAULT 'manual', -- manual | official | weather | community
  risk_score    SMALLINT    NOT NULL DEFAULT 0,  -- 0-100 (chỉ cảnh báo thời tiết)
  valid_from    DATE        NULL,                -- hiệu lực từ ngày
  valid_to      DATE        NULL,                -- hết hiệu lực ngày (NULL = không hết hạn)
  external_id   VARCHAR(160) NOT NULL DEFAULT '',-- khoá chống trùng cho job
  source_url    VARCHAR(512) NOT NULL DEFAULT '',-- link nguồn (tin chính thức)
  created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crop_alerts_crop ON crop_disease_alerts (crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_alerts_active ON crop_disease_alerts (is_active);
CREATE INDEX IF NOT EXISTS idx_crop_alerts_season ON crop_disease_alerts (season_months);
CREATE INDEX IF NOT EXISTS idx_crop_alerts_province ON crop_disease_alerts (province);
CREATE INDEX IF NOT EXISTS idx_crop_alerts_valid_to ON crop_disease_alerts (valid_to);
CREATE INDEX IF NOT EXISTS idx_crop_alerts_source ON crop_disease_alerts (source);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crop_alerts_external
  ON crop_disease_alerts (external_id) WHERE external_id <> '';

-- =============================================================================
-- 20b. Weather snapshots — cache dự báo Open-Meteo theo tỉnh (GĐ2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS weather_snapshots (
  id         BIGSERIAL PRIMARY KEY,
  province   VARCHAR(64) NOT NULL,
  fetched_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  forecast   JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weather_province_time
  ON weather_snapshots (province, fetched_at DESC);

-- =============================================================================
-- 20b-2. Official ingest — tin chính thức chờ duyệt (GĐ3)
-- =============================================================================
CREATE TABLE IF NOT EXISTS official_ingest (
  id            BIGSERIAL PRIMARY KEY,
  source_url    VARCHAR(512)  NOT NULL,
  title         TEXT          NOT NULL,
  published_at  DATE          NULL,
  province      VARCHAR(64)   NOT NULL DEFAULT '',
  crop_slug     VARCHAR(32)   NOT NULL DEFAULT '',
  disease_name  VARCHAR(128)  NOT NULL DEFAULT '',
  disease_label VARCHAR(128)  NOT NULL DEFAULT '',
  severity      VARCHAR(32)   NOT NULL DEFAULT 'warning',
  summary       TEXT          NOT NULL DEFAULT '',
  status        VARCHAR(16)   NOT NULL DEFAULT 'pending',
  alert_id      VARCHAR(32)   NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at   TIMESTAMP     NULL,
  UNIQUE (source_url, disease_label, province)
);
CREATE INDEX IF NOT EXISTS idx_ingest_status ON official_ingest (status, created_at DESC);

-- =============================================================================
-- 20b-3. Báo cáo cộng đồng (GĐ4)
-- =============================================================================
CREATE TABLE IF NOT EXISTS disease_reports (
  id            VARCHAR(32)  PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id       INTEGER      NULL REFERENCES crops(id) ON DELETE SET NULL,
  crop_slug     VARCHAR(32)  NOT NULL DEFAULT '',
  disease_label VARCHAR(128) NOT NULL DEFAULT '',
  province      VARCHAR(64)  NOT NULL DEFAULT '',
  ward          VARCHAR(128) NOT NULL DEFAULT '',
  note          TEXT         NOT NULL DEFAULT '',
  image_url     VARCHAR(512) NOT NULL DEFAULT '',
  lat           DECIMAL(9,6) NULL,
  lon           DECIMAL(9,6) NULL,
  status        VARCHAR(16)  NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_cluster
  ON disease_reports (province, crop_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user
  ON disease_reports (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS disease_report_votes (
  report_id  VARCHAR(32) NOT NULL REFERENCES disease_reports(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, user_id)
);

-- =============================================================================
-- 20c. Job runs — trạng thái lần chạy gần nhất của từng job nền
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_runs (
  name             VARCHAR(48) PRIMARY KEY,
  last_run_at      TIMESTAMP   NULL,
  last_status      VARCHAR(16) NOT NULL DEFAULT '',
  last_message     TEXT        NOT NULL DEFAULT '',
  last_duration_ms INTEGER     NOT NULL DEFAULT 0
);

-- =============================================================================
-- End of extended production schema (user management + document management + safety alerts)
-- =============================================================================



-- -----------------------------------------------------------------------------
-- Chat history (per account). Created at runtime by ChatController as well,
-- so existing databases pick it up without a manual migration.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(16) NOT NULL,          -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, created_at);
