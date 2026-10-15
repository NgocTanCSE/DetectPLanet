<?php
/**
 * AgriScan AI — PDO database connection.
 *
 * Host / port / dbname come from your phpMyAdmin URL
 * (https://103.139.203.43:887, db = sql_nhom53_itimi). MySQL is almost always on
 * port 3306 on the app server; set DB_HOST/DB_PORT if yours differs.
 *
 * Credentials MUST come from environment variables — never commit real passwords.
 * Ask your hoster to set these on the server (e.g. in Apache SetEnv / .env loader):
 *   DB_HOST, DB_PORT (opt), DB_NAME (opt, default=sql_nhom53_itimi),
 *   DB_USER, DB_PASS
 */
$DB = [
    'driver'  => getenv('DB_DRIVER') ?: 'pgsql',
    'host'    => getenv('DB_HOST') ?: '127.0.0.1',
    'port'    => getenv('DB_PORT') ?: '5432',
    'name'    => getenv('DB_NAME') ?: 'agriscan',
    'user'    => getenv('DB_USER') ?: 'postgres',
    'pass'    => getenv('DB_PASS') ?: 'postgres',
    'sslmode' => getenv('DB_SSLMODE') ?: '',
    'charset' => 'utf8',
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
    // ── Serverless MVP mode: graceful degradation ─────────────────────
    // When the database is not reachable (e.g. running without PostgreSQL),
    // set $pdo = null and let the API router fall back to mock/static data.
    // AI inference is via Cloudflare Workers AI (proxied via $AI['endpoint']).
    $pdo = null;
    error_log('Database connection failed (mock mode): ' . $e->getMessage());
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
 *   CLOUDFLARE_VISION_MODEL  vision model id (default @cf/meta/llama-3.2-11b-vision-instruct)
 *   CLOUDFLARE_CHAT_MODEL    chat model id   (default @cf/meta/llama-3.1-8b-instruct-fp8)
 *   AI_TIMEOUT             (optional) seconds to wait per inference, default 90
 *
 * Legacy override: if AI_ENDPOINT / CHAT_ENDPOINT are set, they are used as
 * full URLs instead (e.g. a self-hosted worker deployment).
 */
$AI = [
    'account_id'      => getenv('CLOUDFLARE_ACCOUNT_ID') ?: '',
    'api_token'       => getenv('CLOUDFLARE_API_TOKEN') ?: getenv('AI_BEARER') ?: '',
    'vision_model'    => getenv('CLOUDFLARE_VISION_MODEL') ?: '@cf/meta/llama-3.2-11b-vision-instruct',
    'chat_model'      => getenv('CLOUDFLARE_CHAT_MODEL')   ?: '@cf/meta/llama-3.1-8b-instruct-fp8',
    'endpoint'        => getenv('AI_ENDPOINT') ?: '',     // legacy full-URL override (/predict)
    'chat_endpoint'   => getenv('CHAT_ENDPOINT') ?: '',   // legacy full-URL override (/chat)
    'username'        => getenv('AI_USERNAME') ?: '',
    'api_key'         => getenv('AI_API_KEY') ?: '',
    'bearer'          => getenv('AI_BEARER') ?: getenv('CLOUDFLARE_API_TOKEN') ?: '',
    'timeout'         => (int) (getenv('AI_TIMEOUT') ?: 90),
];

/**
 * Google OAuth configuration — set these from your Google Cloud Console.
 *   GOOGLE_CLIENT_ID     OAuth 2.0 client ID (web application)
 *   GOOGLE_CLIENT_SECRET OAuth 2.0 client secret (KEEP PRIVATE — server-side only)
 *   GOOGLE_REDIRECT_URI  Must match a URI registered in Google Cloud Console
 *     Custom domain:  https://your-domain.com/auth/callback
 *     HF Spaces:      https://yourname-agriscan.hf.space/auth/callback
 *
 * Ask your hoster to set these env vars. The client ID is safe to expose
 * to the frontend; the client secret MUST stay in this config.
 */
$GOOGLE = [
    'client_id'     => getenv('GOOGLE_CLIENT_ID') ?: '',
    'client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '',
    'redirect_uri'  => getenv('GOOGLE_REDIRECT_URI') ?: 'com.agriscan.ai://auth',
    'token_endpoint' => 'https://oauth2.googleapis.com/token',
    'userinfo_endpoint' => 'https://oauth2.googleapis.com/tokeninfo',
];

