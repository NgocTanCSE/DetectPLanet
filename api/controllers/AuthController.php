<?php
/**
 * AgriScan AI — Auth controller.
 * GET /auth/me, POST /auth/google, POST /auth/logout
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class AuthController {
    /** Deep link the app listens for after the browser round-trip. */
    const APP_DEEP_LINK = 'com.agriscan.ai://auth';

    public function handle($method, $target) {
        global $pdo, $GOOGLE;

        if ($method === 'GET' && $target === 'auth/me') {
            $this->handleMe();
        } elseif ($method === 'GET' && $target === 'auth/google/start') {
            $this->handleGoogleStart();
        } elseif ($method === 'GET' && $target === 'auth/google/callback') {
            $this->handleGoogleCallback();
        } elseif ($method === 'POST' && $target === 'auth/google') {
            $this->handleGoogle();
        } elseif ($method === 'POST' && $target === 'auth/logout') {
            $this->handleLogout();
        } else {
            sendJson(['error' => 'not found'], 404);
        }
    }

    private function handleMe() {
        global $pdo;
        $pdo = requireDb();
        $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
            $token = trim($m[1]);
        } else {
            $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
        }
        if (!$token) {
            sendJson(['error' => 'No session token'], 401);
            return;
        }

        $stmt = $pdo->prepare("
            SELECT u.id, u.email, u.name, u.avatar, u.status, u.deleted_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ? AND s.expires_at > NOW()
            LIMIT 1
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            sendJson(['error' => 'Invalid or expired session'], 401);
            return;
        }

        if (!empty($user['deleted_at']) || ($user['status'] ?? 'active') === 'suspended') {
            $pdo->prepare("DELETE FROM sessions WHERE id = ?")->execute([$token]);
            sendJson([
                'error'   => 'account_suspended',
                'message' => !empty($user['deleted_at'])
                    ? 'Tài khoản đã bị xóa. Vui lòng liên hệ quản trị viên.'
                    : 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ], 403);
            return;
        }

        sendJson([
            'user' => [
                'email'  => $user['email'],
                'name'   => $user['name'],
                'avatar' => $user['avatar'],
            ],
            'authenticated' => true,
        ]);
    }

    private function handleGoogle() {
        global $pdo, $GOOGLE;
        $rlKey = (($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ':authgoogle');
        if (!rateLimit($rlKey)) {
            sendJson([
                'error'   => 'Rate limit exceeded',
                'message' => 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.',
            ], 429);
            return;
        }

        $pdo = requireDb();
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $code = $body['code'] ?? '';
        if (!$code) {
            sendJson(['error' => 'missing authorization code'], 400);
            return;
        }

        try {
            $session = $this->googleExchange($code, $GOOGLE['redirect_uri']);
        } catch (Exception $e) {
            $message = $e->getMessage();
            $suspended = strpos($message, 'ACCOUNT_SUSPENDED:') === 0;
            if ($suspended) {
                $message = substr($message, strlen('ACCOUNT_SUSPENDED:'));
            }
            sendJson([
                'error'   => $suspended ? 'account_suspended' : 'Google token exchange failed',
                'message' => $message,
            ], $suspended ? 403 : 502);
            return;
        }

        sendJson($session);
    }

    /**
     * GET /auth/google/start
     * Opens the Google consent screen with an http(s) redirect that Google
     * accepts for a "Web application" OAuth client. Custom schemes such as
     * com.agriscan.ai://auth are rejected by Google for this client type, so
     * the code comes back to /auth/google/callback and we hand it to the app
     * through a deep link.
     */
    private function handleGoogleStart() {
        global $GOOGLE;
        if ($GOOGLE['client_id'] === '') {
            $this->failBrowser('Server chưa cấu hình GOOGLE_CLIENT_ID.');
            return;
        }

        $redirect = $this->callbackUrl();
        $state = $this->signState();
        $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
            'client_id'     => $GOOGLE['client_id'],
            'redirect_uri'  => $redirect,
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'access_type'   => 'offline',
            'prompt'        => 'consent',
            'state'         => $state,
        ]);

        header('Location: ' . $url, true, 302);
        exit;
    }

    /**
     * GET /auth/google/callback?code=...&state=...
     * Exchanges the code server-side, creates a session and deep-links back
     * into the app (com.agriscan.ai://auth?token=...).
     */
    private function handleGoogleCallback() {
        global $GOOGLE;

        $error = $_GET['error'] ?? '';
        if ($error !== '') {
            $this->deepLinkBack(['error' => $error, 'error_description' => $_GET['error_description'] ?? $error]);
            return;
        }

        if (!$this->verifyState($_GET['state'] ?? '')) {
            $this->deepLinkBack(['error' => 'invalid_state']);
            return;
        }

        $code = $_GET['code'] ?? '';
        if ($code === '') {
            $this->deepLinkBack(['error' => 'missing_code']);
            return;
        }

        try {
            $session = $this->googleExchange($code, $this->callbackUrl());
        } catch (Exception $e) {
            $this->deepLinkBack(['error' => 'exchange_failed', 'error_description' => $e->getMessage()]);
            return;
        }

        $this->deepLinkBack(['token' => $session['token']]);
    }

    /** Public URL Google must call back (must match Google Cloud Console). */
    private function callbackUrl() {
        global $GOOGLE;
        if (preg_match('#^https?://#i', (string) $GOOGLE['redirect_uri'])) {
            return $GOOGLE['redirect_uri'];
        }
        $host  = $_SERVER['HTTP_HOST'] ?? 'localhost:887';
        $proto = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                  || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') ? 'https' : 'http';
        return $proto . '://' . $host . '/auth/google/callback';
    }

    private function deepLinkBack(array $params) {
        $url = self::APP_DEEP_LINK . '?' . http_build_query($params);
        header('Location: ' . $url, true, 302);
        exit;
    }

    private function failBrowser($message) {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
           . '<body style="font-family:system-ui;padding:32px">'
           . '<h3>Không thể đăng nhập</h3><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p></body>';
        exit;
    }

    /** Stateless CSRF state: "<ts>.<hmac>", valid for 10 minutes. */
    private function signState() {
        global $GOOGLE;
        $ts  = time();
        $sig = hash_hmac('sha256', (string) $ts, $GOOGLE['client_secret']);
        return $ts . '.' . $sig;
    }

    private function verifyState($state) {
        global $GOOGLE;
        if (!is_string($state) || strpos($state, '.') === false) return false;
        [$ts, $sig] = explode('.', $state, 2);
        if (!ctype_digit($ts) || (time() - (int) $ts) > 600) return false;
        $expected = hash_hmac('sha256', $ts, $GOOGLE['client_secret']);
        return hash_equals($expected, $sig);
    }

    /**
     * Exchange an authorization code for Google tokens, verify the id_token,
     * upsert the user and create a 7-day session.
     *
     * @return array{token:string,user:array}
     * @throws Exception on any Google/DB failure
     */
    private function googleExchange($code, $redirectUri) {
        global $pdo, $GOOGLE;

        if ($GOOGLE['client_id'] === '' || $GOOGLE['client_secret'] === '') {
            throw new Exception('Server chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
        }

        $tokenResp = @file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query([
                    'client_id'     => $GOOGLE['client_id'],
                    'client_secret' => $GOOGLE['client_secret'],
                    'code'          => $code,
                    'grant_type'    => 'authorization_code',
                    'redirect_uri'  => $redirectUri,
                ]),
                'timeout' => 15,
            ]
        ]));

        if ($tokenResp === false) {
            throw new Exception('Không gọi được Google token endpoint.');
        }

        $tokenData = json_decode($tokenResp, true) ?: [];
        $idToken = $tokenData['id_token'] ?? '';
        if (!$idToken) {
            $detail = $tokenData['error_description'] ?? $tokenData['error'] ?? 'Không nhận được id_token.';
            throw new Exception($detail);
        }

        $verifyResp = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        if ($verifyResp === false) {
            throw new Exception('Không xác thực được Google token.');
        }

        $payload = json_decode($verifyResp, true) ?: [];
        if (!isset($payload['sub'], $payload['email'])) {
            throw new Exception('Google token thiếu thông tin người dùng.');
        }
        if (isset($payload['aud']) && $payload['aud'] !== $GOOGLE['client_id']) {
            throw new Exception('Token không thuộc client_id đã cấu hình.');
        }

        $googleId = $payload['sub'];
        $email    = strtolower($payload['email']);
        $name     = $payload['name'] ?? '';
        $avatar   = $payload['picture'] ?? '';

        $stmt = $pdo->prepare("SELECT id FROM users WHERE google_id=? LIMIT 1");
        $stmt->execute([$googleId]);
        $row = $stmt->fetch();

        if ($row) {
            $userId = $row['id'];

            $check = $pdo->prepare("SELECT status, deleted_at FROM users WHERE id = ? LIMIT 1");
            $check->execute([$userId]);
            $existing = $check->fetch();
            if ($existing && (!empty($existing['deleted_at']) || ($existing['status'] ?? 'active') === 'suspended')) {
                throw new Exception('ACCOUNT_SUSPENDED:Tài khoản đã bị khóa hoặc xóa. Vui lòng liên hệ quản trị viên.');
            }

            $stmt = $pdo->prepare("UPDATE users SET email=?, name=?, avatar=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$email, $name, $avatar, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)");
            $stmt->execute([$googleId, $email, $name, $avatar]);
            $userId = (int) $pdo->lastInsertId();
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7);
        $stmt = $pdo->prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$token, $userId, $expiresAt]);

        return [
            'token' => $token,
            'user'  => ['email' => $email, 'name' => $name, 'avatar' => $avatar],
        ];
    }

    private function handleLogout() {
        global $pdo;
        $pdo = requireDb();
        $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $token, $m)) {
            $token = trim($m[1]);
        } else {
            $token = '';
        }
        if ($token) {
            $stmt = $pdo->prepare("DELETE FROM sessions WHERE id=?");
            $stmt->execute([$token]);
        }
        sendJson(['ok' => true]);
    }
}
