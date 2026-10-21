<?php
/**
 * AgriScan AI — Auth controller.
 * GET /auth/me, POST /auth/google, POST /auth/logout
 */

require_once __DIR__ . '/../services/database.php';
require_once __DIR__ . '/../middleware/rate_limit.php';

class AuthController {
    public function handle($method, $target) {
        global $pdo, $GOOGLE;

        if ($method === 'GET' && $target === 'auth/me') {
            $this->handleMe();
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
            SELECT u.id, u.email, u.name, u.avatar
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

        if ($GOOGLE['client_id'] === '' || $GOOGLE['client_secret'] === '') {
            sendJson([
                'error'   => 'Google OAuth not configured',
                'message' => 'Server chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.',
            ], 503);
            return;
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
                    'redirect_uri'  => $GOOGLE['redirect_uri'],
                ]),
                'timeout' => 15,
            ]
        ]));

        if ($tokenResp === false) {
            sendJson(['error' => 'Google token exchange failed'], 502);
            return;
        }

        $tokenData = json_decode($tokenResp, true);
        $idToken = $tokenData['id_token'] ?? '';
        if (!$idToken) {
            sendJson(['error' => 'No id_token in Google response'], 401);
            return;
        }

        $verifyResp = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        if ($verifyResp === false) {
            sendJson(['error' => 'Google token verification failed'], 401);
            return;
        }

        $payload = json_decode($verifyResp, true);
        if (!isset($payload['sub']) || !isset($payload['email'])) {
            sendJson(['error' => 'Invalid Google token payload'], 401);
            return;
        }
        if (isset($payload['aud']) && $payload['aud'] !== $GOOGLE['client_id']) {
            sendJson(['error' => 'Token audience mismatch'], 401);
            return;
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

        sendJson([
            'token' => $token,
            'user'  => ['email' => $email, 'name' => $name, 'avatar' => $avatar],
        ]);
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
