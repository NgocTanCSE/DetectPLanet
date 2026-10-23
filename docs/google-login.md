# Đăng nhập Google — cấu hình & luồng

Tài liệu này mô tả cách Google OAuth đang được nối trong dự án và **việc duy nhất bạn cần làm
trên Google Cloud Console** để nút "Đăng nhập bằng Google" hoạt động.

## 1. Luồng hiện tại (relay qua API)

```
App  ──mở──►  http://<API>/auth/google/start
                    │
                    ├─ 302 ─► accounts.google.com/o/oauth2/v2/auth
                    │            redirect_uri = http(s)://<API>/auth/google/callback
                    ▼
App ◄──deep link── com.agriscan.ai://auth?token=...   ◄── 302 ──  /auth/google/callback
                                                                  (đổi code → tạo session)
```

Vì sao không dùng trực tiếp `com.agriscan.ai://auth`?

- Client OAuth trong project hiện tại là loại **"Web application"** (có `client_secret`).
- Google **từ chối** custom scheme cho loại client này (`redirect_uri_mismatch`).
- Ngoài ra Google chặn luôn redirect về **IP nội bộ** (`10.x`, `192.168.x`) với lỗi
  `device_id and device_name are required for private IP`.

Vì vậy API đứng giữa: nhận `code` qua một URL `http(s)` hợp lệ, đổi lấy `id_token`,
tạo session rồi deep-link `token` về app. App không cần giữ `client_secret`.

## 2. Việc cần làm trên Google Cloud Console

1. Vào **APIs & Services → Credentials → OAuth client** đang dùng (client id
   `861188782661-...apps.googleusercontent.com`).
2. Ở mục **Authorized redirect URIs**, thêm đúng các URL sau:

   | Môi trường | Redirect URI |
   |---|---|
   | Emulator Android (dev) | `http://localhost:1887/auth/google/callback` |
   | Máy thật qua `adb reverse` (dev) | `http://localhost:1887/auth/google/callback` |
   | Production | `https://<domain-của-bạn>/auth/google/callback` |

   > Phải khớp **chính xác** kể cả port và dấu `/`. Không khai báo custom scheme
   > `com.agriscan.ai://auth` cho client loại Web.

3. (Tuỳ chọn) Khai báo **Authorized JavaScript origins** nếu sau này có web app.
4. Lưu, đợi ~1 phút cho Google cập nhật.

## 3. Cấu hình phía server (.env)

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=
```

- Để trống `GOOGLE_REDIRECT_URI` → API tự suy ra `http(s)://<host gọi tới>/auth/google/callback`.
  Emulator gọi `10.0.2.2` sẽ ra `http://10.0.2.2:887/...` (bị Google chặn), nên app tự đổi
  sang `localhost:1887` khi host là IP nội bộ (xem mục 4).
- Production nên đặt tường minh: `GOOGLE_REDIRECT_URI=https://api.example.com/auth/google/callback`.

Sau khi sửa `.env`: `docker compose up -d --build api`.

## 4. Phía app (dev trên emulator)

- `docker-compose.yml` publish 2 cổng: `887:80` (API cho app) và `1887:80` (cho OAuth relay).
- Cổng `887` **không** `adb reverse` được (port < 1024 cần quyền root) → dùng `1887`.
- Chạy một lần sau khi cắm thiết bị/khởi động emulator:

  ```bash
  adb reverse tcp:1887 tcp:1887
  ```

- `frontend/services/auth.js` tự đổi host khi `API_BASE_URL` là IP nội bộ:
  `http://10.0.2.2:887` → `http://localhost:1887` cho riêng bước OAuth.
  Muốn ghim URL khác: thêm `GOOGLE_OAUTH_BASE=https://api.example.com` vào `.env`
  rồi build lại app (giá trị nhúng qua `react-native-config`).

## 5. Kiểm tra nhanh

```bash
# 1. API tạo được URL consent?
curl -s -i http://localhost:887/auth/google/start | grep -i '^location'

# 2. Callback trả deep link khi state sai (mong đợi: 302 ...?error=invalid_state)
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  'http://localhost:887/auth/google/callback?code=x&state=bad'
```

Trên app: **Cài đặt → Đăng nhập bằng Google**.

- Nếu Chrome báo `redirect_uri_mismatch` → chưa thêm URI ở mục 2.
- Nếu Chrome báo `device_id ... private IP` → app chưa chạy bản build mới, hoặc
  chưa `adb reverse tcp:1887 tcp:1887`.
- Đăng nhập xong app quay lại và hiện email/tên; token lưu trong EncryptedStorage.

## 6. Một client_id dùng cho nhiều app?

Được, nhưng tuỳ trường hợp:

| Trường hợp | Nên làm |
|---|---|
| Nhiều **môi trường** của cùng một app (localhost dev, staging, production) | ✅ Dùng chung 1 client, thêm mỗi môi trường 1 redirect URI (tối đa **100 URI/client**, khớp chính xác cả scheme + port + path) |
| Nhiều **app khác thương hiệu** (app A, app B…) | ❌ Tách project/client riêng — xem lý do bên dưới |
| App Android / iOS native | ❌ Phải tạo client loại *Android* (package name + SHA-1) hoặc *iOS* (bundle ID); client "Web application" không dùng để Sign-In native được |

Vì sao không nên gộp nhiều app khác nhau vào một client:

- **OAuth consent screen là cấp project**, không phải cấp client: tên app, logo, privacy policy
  hiển thị cho người dùng là **một** cho mọi client trong project. App khác tên sẽ hiện sai
  thương hiệu và dễ bị Google từ chối khi review.
- **Chung `client_secret`**: lộ ở một app là ảnh hưởng tất cả; muốn thu hồi phải thu hồi chung.
- **Chung hạn mức & trạng thái verified** của project.
- Không có wildcard: mỗi domain/subdomain/port là một dòng riêng, và mọi thay đổi có thể mất
  5 phút đến vài giờ mới có hiệu lực.

Với dự án này chỉ cần 2 URI (dev `localhost:1887` + domain production). Nếu có thêm app web
cùng thương hiệu dùng chung backend thì cứ thêm URI của app đó vào cùng client.

## 7. Khi nào cần chỉnh thêm

- **Tắt chế độ dev không cần đăng nhập**: đặt `REQUIRE_AUTH=true` trong `.env`
  rồi `docker compose up -d --build api`. Hiện tại đang `false` để app lấy dữ liệu
  ẩn danh khi chưa có Google login.
- **Chuyển sang native Google Sign-In** (không qua trình duyệt): cần tạo thêm
  OAuth client loại *Android* với SHA-1 của keystore, thêm
  `@react-native-google-signin/google-signin`, build lại APK. Cách này không dùng
  `client_secret` và không cần relay.
