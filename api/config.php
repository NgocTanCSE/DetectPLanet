<?php
/**
 * AgriScan AI — PDO database connection.
 *
 * Primary backend: PostgreSQL 16 (Docker image postgres:16-alpine).
 * Optional legacy backend: MySQL (set DB_DRIVER=mysql; uses utf8mb4).
 *
 * Host / port / dbname come from environment variables (set in docker-compose / .env):
 *   DB_DRIVER  pgsql (default) or mysql
 *   DB_HOST    database host (default: 127.0.0.1 / Docker service name "postgres")
 *   DB_PORT    5432 (PostgreSQL) or 3306 (MySQL)
 *   DB_NAME    agriscan (default)
 *   DB_USER    postgres (default)
 *   DB_PASS    database password
 *   DB_SSLMODE optional sslmode for PostgreSQL (empty = no SSL)
 *
 * Credentials MUST come from environment variables — never commit real passwords.
 * In Docker: set via `environment:` block in docker-compose.yml.
 * On shared hosting: set via the hoster's control panel or .htaccess.
 */
$DB = [
    'driver'  => getenv('DB_DRIVER') ?: 'pgsql',
    'host'    => getenv('DB_HOST') ?: '127.0.0.1',
    'port'    => getenv('DB_PORT') ?: '5432',
    'name'    => getenv('DB_NAME') ?: 'agriscan',
    'user'    => getenv('DB_USER') ?: 'postgres',
    'pass'    => getenv('DB_PASS') ?: 'postgres',
    'sslmode' => getenv('DB_SSLMODE') ?: '',
    'charset' => 'utf8mb4',
];

if ($DB['driver'] === 'pgsql') {
    $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s',
        $DB['host'], $DB['port'], $DB['name']);
    if (!empty($DB['sslmode'])) {
        $dsn .= ';sslmode=' . $DB['sslmode'];
    }
} else {
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $DB['host'], $DB['port'], $DB['name'], $DB['charset'] ?? 'utf8mb4');
}

try {
    $pdo = new PDO($dsn, $DB['user'], $DB['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    // ── Graceful degradation ─────────────────────────────────────────
    // When the database is not reachable, $pdo remains null. Most API
    // routes that require the DB will return HTTP 500. The /home and /guides
    // endpoints have client-side fallbacks (empty states) so the web UI
    // still renders without crashing.
    // AI inference is via Cloudflare Workers AI (configured in $AI below).
    $pdo = null;
    error_log('Database connection failed (DB required): ' . $e->getMessage());
}

/**
 * AgriScan AI inference client — Cloudflare Workers AI REST API.
 *
 * The PHP API calls the Cloudflare Workers AI REST endpoint DIRECTLY
 * (no intermediate worker needed):
 *   POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}
 * Auth: Authorization: Bearer <CLOUDFLARE_API_TOKEN>
 *   Token needs: Account → Workers AI (Edit).
 *
 * Env vars (set these on your hosting platform / docker-compose .env):
 *   CLOUDFLARE_ACCOUNT_ID  Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN   Cloudflare API token with Workers AI Edit permission
 *   CLOUDFLARE_VISION_MODEL  vision model id (default @cf/meta/llama-4-scout-17b-16e-instruct)
 *   CLOUDFLARE_CHAT_MODEL    chat model id   (default @cf/meta/llama-3.1-8b-instruct-fp8)
 *   AI_TIMEOUT             (optional) seconds to wait per inference, default 90
 *
 * Legacy override: if AI_ENDPOINT / CHAT_ENDPOINT are set, they are used as
 * full URLs instead (e.g. a self-hosted worker deployment).
 */
$AI = [
    'account_id'      => getenv('CLOUDFLARE_ACCOUNT_ID') ?: '',
    'api_token'       => getenv('CLOUDFLARE_API_TOKEN') ?: getenv('AI_BEARER') ?: '',
    'vision_model'    => getenv('CLOUDFLARE_VISION_MODEL') ?: '@cf/meta/llama-4-scout-17b-16e-instruct',
    // Used when the primary model is unavailable (e.g. a paid multimodal
    // model while the account is still on the Workers Free plan).
    'vision_fallback' => getenv('CLOUDFLARE_VISION_FALLBACK') ?: '@cf/meta/llama-4-scout-17b-16e-instruct',
    'chat_model'      => getenv('CLOUDFLARE_CHAT_MODEL')   ?: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    'endpoint'        => getenv('AI_ENDPOINT') ?: '',     // legacy full-URL override (/predict)
    'chat_endpoint'   => getenv('CHAT_ENDPOINT') ?: '',   // legacy full-URL override (/chat)
    'bearer'          => getenv('AI_BEARER') ?: getenv('CLOUDFLARE_API_TOKEN') ?: '',
    'timeout'         => (int) (getenv('AI_TIMEOUT') ?: 90),
];

/**
 * Google OAuth configuration — set these from your Google Cloud Console.
 *   GOOGLE_CLIENT_ID     OAuth 2.0 client ID (web application)
 *   GOOGLE_CLIENT_SECRET OAuth 2.0 client secret (KEEP PRIVATE — server-side only)
 *   GOOGLE_REDIRECT_URI  Public http(s) URL registered in Google Cloud Console.
 *     Leave empty to derive it from the incoming request host, e.g.
 *       emulator:  http://10.0.2.2:887/auth/google/callback
 *       production: https://your-domain.com/auth/google/callback
 *     A custom-scheme value (com.agriscan.ai://auth) is rejected by Google for
 *     "Web application" clients — use the HTTP relay below instead.
 *
 * Ask your hoster to set these env vars. The client ID is safe to expose
 * to the frontend; the client secret MUST stay in this config.
 */
$GOOGLE = [
    'client_id'     => getenv('GOOGLE_CLIENT_ID') ?: '',
    'client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '',
    'redirect_uri'  => getenv('GOOGLE_REDIRECT_URI') ?: '',
    'token_endpoint' => 'https://oauth2.googleapis.com/token',
    'userinfo_endpoint' => 'https://oauth2.googleapis.com/tokeninfo',
];

