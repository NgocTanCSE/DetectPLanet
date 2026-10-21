/**
 * AgriScan AI — MySQL 8.0+ schema (utf8mb4)
 *
 * Generates the database that backs `frontend/api.js` AND mirrors the field
 * names in `frontend/dto.js` 1:1, so the API can map rows straight onto DTOs
 * without renaming anything.
 *
 * phpMyAdmin: open DB `sql_nhom53_itimi` (read from your URL db=sql_nhom53_itimi),
 *
 * Endpoint -> table map:
 *   GET  /home              -> scans (recent) + articles (stats = aggregates)
 *   GET  /scan/session     -> scans{scan_status='processing'} + pipeline + detections
 *   GET  /result/latest    -> scans{scan_status='done'} + status_* + guides/accordion + detections
 *   GET  /history          -> scans (records)  [filters are config, not stored]
 *   GET  /guides           -> guides + guide_sections
 *   POST /history/{id}/save-> scans.is_saved
 *   POST /analyze          -> scans (insert) + pipeline + detections
 *   POST /auth/google      -> users (create/update) + sessions (create)
 *   GET  /auth/me          -> sessions verification + users
 */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Your hosted DB from the phpMyAdmin URL: db=sql_nhom53_itimi
USE `sql_nhom53_itimi`;

-- ---------------------------------------------------------------------------
-- 1. Crops / plant types
--    Drives the history filter pills (all / rice / tomato / fruit).
--    (The `danger` pill is a synthetic severity filter handled in the API.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `crops` (
  `id`    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`  VARCHAR(32)  NOT NULL,                 -- 'rice','tomato','fruit'  (DTO.crop filter key)
  `name`  VARCHAR(64)  NOT NULL,                 -- 'Lúa nước','Cà chua'
  `label` VARCHAR(64)  NOT NULL,                 -- human label shown on pills ('Lúa')
  `icon`  VARCHAR(64)  NOT NULL DEFAULT 'eco',   -- Icon name from frontend/icons.js
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_crops_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. Scans — single source of truth for HistoryRecord + ScanSession + ResultReport.
--    A scan starts as `processing` (ScanSession) then becomes `done` (ResultReport).
--    `time` (DTO) is formatted by the API from `created_at` (no redundant column).
--    `user_id` scopes data to the authenticated user (nullable for shared/public scans).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scans` (
  `id`             VARCHAR(32)    NOT NULL,            -- DTO.id  (e.g. 'A841')
  `crop_id`        TINYINT UNSIGNED DEFAULT NULL,      -- FK -> crops.id
  `user_id`        INT UNSIGNED DEFAULT NULL,          -- FK -> users.id (NULL = unauthenticated/public)
  `crop`           VARCHAR(32)    NOT NULL DEFAULT '',-- DTO.crop  (filter key, e.g. 'rice')
  `crop_label`     VARCHAR(64)    NOT NULL,            -- DTO.cropLabel (e.g. 'Lúa nước')
  `disease`        VARCHAR(128)   NOT NULL,            -- DTO.title / DTO.disease (e.g. 'Bệnh Đốm Nâu')
  `pathogen`       VARCHAR(255)   NOT NULL DEFAULT '',-- DTO.pathogen
  `severity`       ENUM('healthy','warning','danger') NOT NULL DEFAULT 'healthy',
  `image`          VARCHAR(255)   NOT NULL DEFAULT '',-- DTO.image (leaf photo url)
  `confidence`     DECIMAL(5,2)   NOT NULL DEFAULT 0,-- DTO.confidence ('96.4' -> 96.40; API formats to "96.4")
  `recommendation` TEXT,                               -- DTO.recommendation
  `status_spread`  VARCHAR(64)    NOT NULL DEFAULT '',-- DTO.status.spread
  `status_stage`   VARCHAR(64)    NOT NULL DEFAULT '',-- DTO.status.stage
  `status_loss`    VARCHAR(64)    NOT NULL DEFAULT '',-- DTO.status.loss
  `scan_status`    ENUM('processing','done','failed') NOT NULL DEFAULT 'processing',
  `is_saved`       TINYINT(1)     NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scans_crop`      (`crop`),
  KEY `idx_scans_status`    (`scan_status`),
  KEY `idx_scans_created`   (`created_at`),
  KEY `idx_scans_user`      (`user_id`),
  CONSTRAINT `fk_scans_crop` FOREIGN KEY (`crop_id`) REFERENCES `crops`(`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_scans_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Scan pipeline steps  -> ScanSession.pipeline  (ScanPipelineStep[])
--    `descr` (not DESC) and `step_status` (not STATUS) dodge MySQL reserved words.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scan_pipeline_steps` (
  `scan_id`    VARCHAR(32)   NOT NULL,
  `id`         VARCHAR(32)   NOT NULL,            -- DTO.id
  `icon`       VARCHAR(64)   NOT NULL DEFAULT 'hourglass_empty',
  `title`      VARCHAR(128)  NOT NULL,
  `descr`      VARCHAR(255)  NOT NULL DEFAULT '',
  `step_status`VARCHAR(32)   NOT NULL DEFAULT '',
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 0,-- DTO.active
  `icon_bg`    VARCHAR(32)   NOT NULL DEFAULT '',
  `icon_color` VARCHAR(32)   NOT NULL DEFAULT '',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`scan_id`,`id`),
  CONSTRAINT `fk_pipeline_scan` FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. Detections  -> ScanSession.detections & ResultReport.detections (Detection[])
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scan_detections` (
  `scan_id`    VARCHAR(32)    NOT NULL,
  `id`         VARCHAR(32)    NOT NULL,    -- DTO.id
  `top`        VARCHAR(16)    NOT NULL,    -- e.g. '32%'
  `left_pos`   VARCHAR(16)    NOT NULL,    -- e.g. '42%'  (left is reserved)
  `confidence` VARCHAR(32)    NOT NULL,    -- e.g. '96%'
  `severity`   ENUM('healthy','warning','danger') NOT NULL DEFAULT 'danger',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`scan_id`,`id`),
  CONSTRAINT `fk_detection_scan` FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. Articles  -> HomeScreen "tips & alerts" cards  (Article[])
--    `time` is a reserved word in MySQL -> backticked.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `articles` (
  `id`          VARCHAR(32)   NOT NULL,
  `image`       VARCHAR(255)  NOT NULL,
  `label`       VARCHAR(64)   NOT NULL,
  `label_color` VARCHAR(32)   NOT NULL DEFAULT '',
  `time`        VARCHAR(32)   NOT NULL,        -- relative label e.g. '2 giờ trước'
  `title`       VARCHAR(128)  NOT NULL,
  `action`      VARCHAR(32)   NOT NULL DEFAULT '',
  `tag_bg`      VARCHAR(32)   NOT NULL DEFAULT '',
  `url`         VARCHAR(255)  NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. Guides  -> /guides endpoint & ResultReport.accordion  (AccordionItem[])
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guides` (
  `id`       VARCHAR(32)  NOT NULL,
  `icon`     VARCHAR(64)  NOT NULL DEFAULT 'help',
  `title`    VARCHAR(128) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. Guide sections  -> AccordionItem.sections  (ReportSection[])
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guide_sections` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `guide_id`    VARCHAR(32)   NOT NULL,
  `icon`        VARCHAR(64)   NOT NULL DEFAULT 'lens_blur',
  `title`       VARCHAR(128)  NOT NULL DEFAULT '',
  `body`        TEXT          NOT NULL,
  `badge`       VARCHAR(64)   NOT NULL DEFAULT '',
  `badge_bg`    VARCHAR(32)   NOT NULL DEFAULT '',
  `badge_text`  VARCHAR(32)   NOT NULL DEFAULT '',
  `bg`          VARCHAR(32)   NOT NULL DEFAULT '',
  `sort_order`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_section_guide` (`guide_id`),
  CONSTRAINT `fk_section_guide` FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. Users (Google-authenticated)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `google_id`   VARCHAR(255)    NOT NULL,  -- Google sub (user ID)
  `email`       VARCHAR(255)    NOT NULL,  -- Google email (lowercased)
  `name`        VARCHAR(255)    NOT NULL,  -- Google display name
  `avatar`      VARCHAR(512)    NOT NULL DEFAULT '',
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_google_id` (`google_id`),
  UNIQUE KEY `uq_users_email`     (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`          VARCHAR(64)    NOT NULL,     -- random 32-byte hex token
  `user_id`     INT UNSIGNED   NOT NULL,
  `expires_at`  DATETIME       NOT NULL,
  `created_at`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user`    (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Audit log — trace hành động quan trọng (save/unsave/analyze/delete)
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED  DEFAULT NULL,
  `action`      VARCHAR(32)   NOT NULL,
  `target_table` VARCHAR(32) NOT NULL,
  `target_id`   VARCHAR(64)   NOT NULL,
  `old_values`  JSON,
  `new_values`  JSON,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user`   (`user_id`),
  KEY `idx_audit_target` (`target_table`, `target_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================================================
-- Optional seed data for local dev / phpMyAdmin preview.
-- Delete or extend freely — these are example rows, not application mocks.
-- Seed user (associated with seed scans so authenticated demo users see data)
INSERT IGNORE INTO `users` (`google_id`,`email`,`name`,`avatar`) VALUES
  ('seed-dev-001','dev@agriscan.ai','Nông dân mẫu','');
-- ===========================================================================
INSERT INTO `crops` (`slug`,`name`,`label`,`icon`) VALUES
  ('rice','Lúa nước','Lúa','eco'),
  ('tomato','Cà chua','Cà chua','nature'),
  ('fruit','Trái cây','Trái cây','apple');

INSERT INTO `scans`
  (`id`,`crop_id`,`user_id`,`crop`,`crop_label`,`disease`,`pathogen`,`severity`,`image`,`confidence`,`recommendation`,`status_spread`,`status_stage`,`status_loss`,`scan_status`,`is_saved`,`created_at`)
VALUES
  ('A841',1,(SELECT `id` FROM `users` WHERE `google_id`='seed-dev-001' LIMIT 1),'rice','Lúa nước','Bệnh Đốm Nâu','Bipolaris oryzae (Cochliobolus miyabeanus)',
   'danger','https://agriscan.ai/samples/leaf_a841.jpg',96.40,
   'Phun thuốc bảo vệ thực vật + cắt bỏ lá bệnh.',
   'Nhanh','Đẻ nhánh rộ','15 - 25%','done',1,NOW());

INSERT INTO `scan_pipeline_steps`
  (`scan_id`,`id`,`icon`,`title`,`descr`,`step_status`,`is_active`,`icon_bg`,`icon_color`,`sort_order`)
VALUES
  ('A841','p1','image_search','Tiếp nhận ảnh lá','',        'Hoàn tất',1,'','',1),
  ('A841','p2','biotech',    'Phân tích LLaMA Vision','','',       0,'','',2),
  ('A841','p3','agronheart', 'Đề xuất phòng trí','',        '',         0,'','',3);

INSERT INTO `scan_detections` (`scan_id`,`id`,`top`,`left_pos`,`confidence`,`severity`,`sort_order`) VALUES
  ('A841','d1','32%','42%','96%','danger',1),
  ('A841','d2','55%','25%','96%','warning',2);

INSERT INTO `articles` (`id`,`image`,`label`,`label_color`,`time`,`title`,`action`,`tag_bg`) VALUES
  ('art-001','https://agriscan.ai/samples/article1.jpg','Mới','#EF4444','2 giờ trước','Cập nhật: Bệnh Đốm Nâu mùa hè nóng','read','#F8D7DA');

INSERT INTO `guides` (`id`,`icon`,`title`,`subtitle`) VALUES
  ('g-001','eco','Bệnh Đốm Nâu (Bipolaris oryzae)','Nguyên nhân & cách phòng tránh');

INSERT INTO `guide_sections` (`guide_id`,`icon`,`title`,`body`,`badge`,`badge_bg`,`badge_text`,`bg`,`sort_order`) VALUES
  ('g-001','check_circle','Nguyên nhãn','Nhiệt độ cao + độ ẩm > 85% vào thời gian mưa thoáng qua.','','#F0FDF4','#16a34a','',1);
