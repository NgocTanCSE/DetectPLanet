<?php
/**
 * AgriScan AI — Runtime schema upgrades.
 *
 * Dev databases were created from older versions of db/agriscan_schema_postgres.sql.
 * Every upgrade here is idempotent (IF NOT EXISTS / ON CONFLICT) so it is safe to
 * run on every boot, and the same statements are mirrored in the schema file for
 * fresh installs.
 */

require_once __DIR__ . '/provinces.php';

/**
 * Crop catalogue used by scans, alerts and preferences.
 * `fruit` is kept for rows created before the 9-crop scan picker existed;
 * `other` is not a real crop and is hidden from the preference list.
 */
function agriscanCrops() {
    return [
        // slug        name          label        icon
        ['rice',      'Lúa nước',    'Lúa',       'eco'],
        ['tomato',    'Cà chua',     'Cà chua',   'nature'],
        ['fruit',     'Trái cây',    'Trái cây',  'apple'],
        ['maize',     'Ngô',         'Ngô',       'eco'],
        ['potato',    'Khoai tây',   'Khoai tây', 'eco'],
        ['coffee',    'Cà phê',      'Cà phê',    'eco'],
        ['pepper',    'Hồ tiêu',     'Hồ tiêu',   'eco'],
        ['soybean',   'Đậu nành',    'Đậu nành',  'nature'],
        ['vegetable', 'Rau cải',     'Rau cải',   'nature'],
        ['other',     'Cây khác',    'Cây khác',  'eco'],
    ];
}

function ensureCrops($pdo) {
    $stmt = $pdo->prepare(
        "INSERT INTO crops (slug, name, label, icon) VALUES (?, ?, ?, ?)
         ON CONFLICT (slug) DO NOTHING"
    );
    foreach (agriscanCrops() as $crop) {
        $stmt->execute($crop);
    }
}

function ensureAlertSchema($pdo) {
    // GĐ1 — cảnh báo theo khu vực.
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS province VARCHAR(64) NOT NULL DEFAULT ''");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crop_alerts_province ON crop_disease_alerts (province)");

    // GĐ2 — nguồn cảnh báo, điểm rủi ro, thời hạn hiệu lực, khoá chống trùng.
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'manual'");
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS risk_score SMALLINT NOT NULL DEFAULT 0");
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS valid_from DATE NULL");
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS valid_to DATE NULL");
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS external_id VARCHAR(160) NOT NULL DEFAULT ''");
    $pdo->exec("ALTER TABLE crop_disease_alerts ADD COLUMN IF NOT EXISTS source_url VARCHAR(512) NOT NULL DEFAULT ''");

    $pdo->exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_crop_alerts_external
           ON crop_disease_alerts (external_id) WHERE external_id <> ''"
    );
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crop_alerts_valid_to ON crop_disease_alerts (valid_to)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_crop_alerts_source ON crop_disease_alerts (source)");
}

function ensureJobSchema($pdo) {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS weather_snapshots (
           id         BIGSERIAL PRIMARY KEY,
           province   VARCHAR(64) NOT NULL,
           fetched_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
           forecast   JSONB       NOT NULL
         )"
    );
    $pdo->exec(
        "CREATE INDEX IF NOT EXISTS idx_weather_province_time
           ON weather_snapshots (province, fetched_at DESC)"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS job_runs (
           name             VARCHAR(48) PRIMARY KEY,
           last_run_at      TIMESTAMP   NULL,
           last_status      VARCHAR(16) NOT NULL DEFAULT '',
           last_message     TEXT        NOT NULL DEFAULT '',
           last_duration_ms INTEGER     NOT NULL DEFAULT 0
         )"
    );
}

function ensureOfficialSchema($pdo) {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS official_ingest (
           id           BIGSERIAL PRIMARY KEY,
           source_url   VARCHAR(512)  NOT NULL,
           title        TEXT          NOT NULL,
           published_at DATE          NULL,
           province     VARCHAR(64)   NOT NULL DEFAULT '',
           crop_slug    VARCHAR(32)   NOT NULL DEFAULT '',
           disease_name VARCHAR(128)  NOT NULL DEFAULT '',
           disease_label VARCHAR(128) NOT NULL DEFAULT '',
           severity     VARCHAR(32)   NOT NULL DEFAULT 'warning',
           summary      TEXT          NOT NULL DEFAULT '',
           status       VARCHAR(16)   NOT NULL DEFAULT 'pending',
           alert_id     VARCHAR(32)   NULL,
           created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
           reviewed_at  TIMESTAMP     NULL,
           UNIQUE (source_url, disease_label, province)
         )"
    );
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ingest_status ON official_ingest (status, created_at DESC)");
}

function ensureReportSchema($pdo) {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS disease_reports (
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
         )"
    );
    $pdo->exec(
        "CREATE INDEX IF NOT EXISTS idx_reports_cluster
           ON disease_reports (province, crop_slug, created_at DESC)"
    );
    $pdo->exec(
        "CREATE INDEX IF NOT EXISTS idx_reports_user
           ON disease_reports (user_id, created_at DESC)"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS disease_report_votes (
           report_id  VARCHAR(32) NOT NULL REFERENCES disease_reports(id) ON DELETE CASCADE,
           user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (report_id, user_id)
         )"
    );
}

function ensureDbSchema($pdo) {
    static $done = false;
    if ($done) return;

    ensureCrops($pdo);
    ensureAlertSchema($pdo);
    ensureJobSchema($pdo);
    ensureOfficialSchema($pdo);
    ensureReportSchema($pdo);

    $done = true;
}
