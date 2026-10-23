import Config from 'react-native-config';

/**
 * Cấu hình mặc định của app admin.
 *
 * API_URL / ADMIN_TOKEN được nhúng lúc build từ frontend_admin/.env
 * (react-native-config + dotenv.gradle). Người dùng vẫn có thể đổi trong
 * màn Cài đặt; giá trị lưu trong EncryptedStorage sẽ được ưu tiên.
 */
const DEV_ANDROID = 'http://10.0.2.2:887';

export const DEFAULT_API_BASE = (Config && Config.API_URL) || DEV_ANDROID;
export const DEFAULT_ADMIN_TOKEN = (Config && Config.ADMIN_TOKEN) || '';

export const STORAGE_KEYS = {
  apiBase: 'agriscan_admin_api_base',
  adminToken: 'agriscan_admin_token',
};
