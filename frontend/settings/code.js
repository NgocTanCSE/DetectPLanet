/**
 * SettingsScreen — AgriScan AI account + app settings (Text-Only Redesign)
 *
 * Shows the signed-in Google account (when available), the API endpoint in
 * use, the app version, and a logout action. Vector icons from icons.js
 * accompany section headers and buttons — no image-based icon assets.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors, typography, spacing, shadowFlat } from '../theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../AppHeader';
import { getCurrentUser, logout, onAuthStateChanged, openGoogleLogin, sendAuthCode } from '../auth';
import Icon from '../icons';

let APP_VERSION = '1.0.0';
let API_URL = '';
try {
  const DeviceInfo = require('react-native-device-info');
  APP_VERSION = DeviceInfo.getVersion();
} catch { /* fallback below */ }
try {
  const Config = require('react-native-config');
  if (Config && Config.API_URL) {
    API_URL = Config.API_URL;
  }
} catch { /* fallbacks above */ }

const SettingsScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => onAuthStateChanged((u) => setUser(u)), []);

  const handleLogin = async () => {
    try {
      const code = await openGoogleLogin();
      await sendAuthCode(code);
    } catch (err) {
      Alert.alert('Đăng nhập chưa hoàn tất', err.message || 'Không thể đăng nhập bằng Google.', [{ text: 'Đồng ý' }]);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Cài đặt"
        subtitle="Tài khoản & ứng dụng"
        showBack
        onBack={() => navigation?.navigate?.('home')}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Account card — text only, no person/logout/account_circle icons */}
        <View style={[styles.card, shadowFlat]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="tune" size={14} color={colors.muted} />
            <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Tài khoản
            </Text>
          </View>
          {user ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                {/* Text initial instead of person icon avatar */}
                <View style={styles.avatar}>
                  <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700' }]}>
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0)?.toUpperCase() || 'B'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body.lg, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                    {user.name || user.email}
                  </Text>
                  <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={[typography.body.md, { color: colors['on-error-container'], fontWeight: '600' }]}>
                  Đăng xuất
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[typography.body.md, { color: colors.muted, marginTop: 8 }]}>
                Đăng nhập bằng Google để đồng bộ nhật ký chẩn đoán giữa các thiết bị.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} activeOpacity={0.8}>
                <Text style={[typography.body.md, { color: colors['on-primary'], fontWeight: '600' }]}>
                  Đăng nhập bằng Google
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* App info card — text-only rows */}
        <View style={[styles.card, shadowFlat]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="document_scanner" size={14} color={colors.muted} />
            <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Ứng dụng
            </Text>
          </View>
          <InfoRow label="Phiên bản" value={`v${APP_VERSION} (${Platform.OS})`} />
          <InfoRow label="Máy chủ API" value={API_URL || 'Mặc định'} />
          <InfoRow label="AI" value="Cloudflare Workers AI" />
        </View>

        {/* About card */}
        <View style={[styles.card, shadowFlat]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="support_agent" size={14} color={colors.muted} />
            <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Giới thiệu
            </Text>
          </View>
          <Text style={[typography.body.md, { color: colors['on-surface-variant'], marginTop: 8, lineHeight: 22 }]}>
            AgriScan AI hỗ trợ nông dân nhận diện sớm bệnh trên lá cây trồng qua ảnh chụp và gợi ý
            biện pháp chăm sóc. Kết quả chẩn đoán là ước tính từ mô hình AI, nên tham khảo thêm
            khuyến cáo của kỹ sư nông nghiệp địa phương trước khi phun thuốc.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>{label}</Text>
    <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors['primary-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors['error-container'],
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
});

export default SettingsScreen;
