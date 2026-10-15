/**
 * SettingsScreen — AgriScan AI account + app settings
 *
 * Shows the signed-in Google account (when available), the API endpoint in
 * use, the app version, and a logout action. No mock content — every value
 * comes from the real auth state / expo config.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors, typography, spacing, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { getCurrentUser, logout, onAuthStateChanged, openGoogleLogin, sendAuthCode } from '../auth';

let APP_VERSION = '1.0.0';
let API_URL = '';
try {
  const { expoConfig, nativeApplicationVersion } = require('expo-constants');
  APP_VERSION = nativeApplicationVersion || expoConfig?.version || '1.0.0';
  API_URL = expoConfig?.extra?.apiUrl || '';
} catch { /* fallbacks above */ }

const SettingsScreen = ({ navigation }) => {
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
          paddingTop: 64,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Account card */}
        <View style={[styles.card, shadowPaper]}>
          <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            Tài khoản
          </Text>
          {user ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <View style={styles.avatar}>
                  <Icon name="person" size={24} color={colors.primary} />
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
                <Icon name="logout" size={16} color={colors['on-error-container']} />
                <Text style={[typography['label-md'], { color: colors['on-error-container'], fontWeight: '600' }]}>
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
                <Icon name="account_circle" size={18} color={colors['on-primary']} />
                <Text style={[typography['label-md'], { color: colors['on-primary'], fontWeight: '600' }]}>
                  Đăng nhập bằng Google
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* App info card */}
        <View style={[styles.card, shadowPaper]}>
          <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            Ứng dụng
          </Text>
          <InfoRow icon="info" label="Phiên bản" value={`v${APP_VERSION} (${Platform.OS})`} />
          <InfoRow icon="dns" label="Máy chủ API" value={API_URL || 'Mặc định'} />
          <InfoRow icon="psychology" label="AI" value="Cloudflare Workers AI" />
        </View>

        {/* About card */}
        <View style={[styles.card, shadowPaper]}>
          <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            Giới thiệu
          </Text>
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

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={16} color={colors.muted} />
    <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>{label}</Text>
    <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors['outline'],
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors['error-container'],
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
});

export default SettingsScreen;

