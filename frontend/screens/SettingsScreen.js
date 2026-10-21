/**
 * SettingsScreen — AgriScan AI account + app settings (Text-Only Redesign)
 *
 * Shows the signed-in Google account (when available), the API endpoint in
 * use, the app version, and a logout action. Vector icons from icons.js
 * accompany section headers and buttons — no image-based icon assets.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../components/layout/AppHeader';
import { getCurrentUser, logout, onAuthStateChanged, openGoogleLogin, sendAuthCode } from '../services/auth';
import { Card, Avatar, Button, SectionHeader } from '../components';

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
        {/* Account card */}
        <Card style={styles.card}>
          <SectionHeader title="Tài khoản" />
          {user ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <Avatar source={user.avatar} initial={user.name || user.email || 'B'} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body.lg, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                    {user.name || user.email}
                  </Text>
                  <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>
              <Button
                variant="outline"
                onPress={handleLogout}
                style={styles.dangerBtn}
                accessibilityLabel="Đăng xuất">
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Text style={[typography.body.md, { color: colors.muted, marginTop: 8 }]}>
                Đăng nhập bằng Google để đồng bộ nhật ký chẩn đoán giữa các thiết bị.
              </Text>
              <Button variant="primary" onPress={handleLogin} style={styles.primaryBtn} accessibilityLabel="Đăng nhập bằng Google">
                Đăng nhập bằng Google
              </Button>
            </>
          )}
        </Card>

        {/* App info card */}
        <Card style={styles.card}>
          <SectionHeader title="Ứng dụng" />
          <View style={styles.infoRow}>
            <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>Phiên bản</Text>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
              v{APP_VERSION} ({Platform.OS})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>Máy chủ API</Text>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
              {API_URL || 'Mặc định'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>AI</Text>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
              Cloudflare Workers AI
            </Text>
          </View>
        </Card>

        {/* About card */}
        <Card style={styles.card}>
          <SectionHeader title="Giới thiệu" />
          <Text style={[typography.body.md, { color: colors['on-surface-variant'], marginTop: 8, lineHeight: 22 }]}>
            AgriScan AI hỗ trợ nông dân nhận diện sớm bệnh trên lá cây trồng qua ảnh chụp và gợi ý
            biện pháp chăm sóc. Kết quả chẩn đoán là ước tính từ mô hình AI, nên tham khảo thêm
            khuyến cáo của kỹ sư nông nghiệp địa phương trước khi phun thuốc.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  dangerBtn: {
    marginTop: 14,
    backgroundColor: colors['error-container'],
  },
  primaryBtn: {
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
