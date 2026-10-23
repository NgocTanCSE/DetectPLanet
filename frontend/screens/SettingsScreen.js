/**
 * SettingsScreen — AgriScan AI account + app settings (Minimalist Redesign)
 *
 * Shows the signed-in Google account (when available), the API endpoint in
 * use, the app version, and a logout action. Vector icons from icons.js
 * accompany section headers and buttons.
 *
 * White canvas, light cards, green accent for interactive elements.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Share, Linking } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import Icon from '../icons';
import { getCurrentUser, logout, onAuthStateChanged, openGoogleLogin, finishGoogleLogin, googleErrorHint } from '../services/auth';
import { Card, Avatar, Button, SectionHeader, ScreenHeader } from '../components';

let APP_VERSION = '1.0.0';
try {
  const DeviceInfo = require('react-native-device-info');
  APP_VERSION = DeviceInfo.getVersion();
} catch { /* fallback above */ }

/**
 * Số liên hệ chính thức của cơ quan nông nghiệp (nguồn: ppd.gov.vn,
 * khuyennongvn.gov.vn, mae.gov.vn — kiểm tra 10/2026).
 * Người dùng có thể gọi trực tiếp để hỏi thêm về bệnh cây, thuốc BVTV.
 */
const SUPPORT_CONTACTS = [
  {
    id: 'mae',
    name: 'Bộ Nông nghiệp và Môi trường',
    hint: 'Cổng thông tin chung của Bộ',
    phone: '02437956868',
    display: '(0243) 795 6868',
  },
  {
    id: 'ppd',
    name: 'Cục Trồng trọt và Bảo vệ thực vật',
    hint: 'Bệnh cây trồng, thuốc bảo vệ thực vật',
    phone: '02438519451',
    display: '(024) 3851 9451',
  },
  {
    id: 'knqg',
    name: 'Trung tâm Khuyến nông Quốc gia',
    hint: 'Kỹ thuật canh tác, khuyến nông',
    phone: '02437282485',
    display: '0243 728 2485',
  },
];

/**
 * Row used by the "Tiện ích" card. Lịch sử / Cảnh báo / Cẩm nang are sub-screens
 * (they are not bottom tabs), so they are listed here as navigable rows — the
 * same three entries are also surfaced on Trang chủ under "Truy cập nhanh".
 */
const NavRow = ({ icon, label, hint, onPress, divider = true }) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={[styles.navRow, divider && styles.navRowDivider]}>
    <View style={styles.navIcon}>
      <Icon name={icon} size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
    <Icon name="chevron_right" size={18} color={colors.muted} />
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => onAuthStateChanged((u) => setUser(u)), []);

  const handleLogin = async () => {
    try {
      const result = await openGoogleLogin();
      await finishGoogleLogin(result);
    } catch (err) {
      const hint = googleErrorHint(err);
      Alert.alert(
        'Đăng nhập chưa hoàn tất',
        (err.message || 'Không thể đăng nhập bằng Google.') + (hint ? '\n\n' + hint : ''),
        [{ text: 'Đồng ý' }]
      );
    }
  };

  const handleCall = async (contact) => {
    try {
      const url = `tel:${contact.phone}`;
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch { /* rơi xuống Alert */ }
    Alert.alert(contact.name, `Số điện thoại: ${contact.display}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'AgriScan AI — ứng dụng chẩn đoán bệnh cây trồng. https://agriscan.ai',
      });
    } catch {
      /* người dùng huỷ chia sẻ */
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
      <ScreenHeader title="Cài đặt" onBack={() => navigation?.navigate?.('home')} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-lg'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-xl'],
          paddingHorizontal: spacing.gutter,
          gap: spacing['space-md'],
        }}>
        {/* Account card */}
        <Card style={styles.card} padding={20}>
          <SectionHeader title="Tài khoản" />
          {user ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
                <Avatar source={user.avatar} initial={user.name || user.email || 'B'} size={52} />
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
              <Text style={[typography.body.md, { color: colors.muted, marginTop: 12 }]}>
                Đăng nhập bằng Google để đồng bộ nhật ký chẩn đoán giữa các thiết bị.
              </Text>
              <Button variant="primary" onPress={handleLogin} style={styles.primaryBtn} accessibilityLabel="Đăng nhập bằng Google">
                Đăng nhập bằng Google
              </Button>
            </>
          )}
        </Card>

        {/* Utilities card — Lịch sử / Cảnh báo / Cẩm nang */}
        <Card style={styles.card} padding={20}>
          <SectionHeader title="Tiện ích" subtitle="Lịch sử quét, cảnh báo mùa vụ và cẩm nang xử lý" />
          <View style={{ marginTop: 8 }}>
            <NavRow
              icon="history"
              label="Lịch sử quét"
              hint="Toàn bộ mẫu lá đã chẩn đoán"
              onPress={() => navigation?.navigate?.('history')}
            />
            <NavRow
              icon="warning"
              label="Cảnh báo"
              hint="Rủi ro dịch bệnh theo cây trồng"
              onPress={() => navigation?.navigate?.('alerts')}
            />
            <NavRow
              icon="menu_book"
              label="Cẩm nang"
              hint="Hướng dẫn nhận biết & xử lý bệnh"
              onPress={() => navigation?.navigate?.('guides')}
            />
            <NavRow
              icon="share"
              label="Chia sẻ ứng dụng"
              hint="Gửi AgriScan AI cho người khác"
              divider={false}
              onPress={handleShare}
            />
          </View>
        </Card>

        {/* Support contacts card */}
        <Card style={styles.card} padding={20}>
          <SectionHeader title="Hỗ trợ & tư vấn" subtitle="Gọi trực tiếp cơ quan nông nghiệp" />
          <View style={{ marginTop: 8 }}>
            {SUPPORT_CONTACTS.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Gọi ${c.name}: ${c.display}`}
                onPress={() => handleCall(c)}
                style={[
                  styles.navRow,
                  i < SUPPORT_CONTACTS.length - 1 && styles.navRowDivider,
                ]}>
                <View style={styles.navIcon}>
                  <Icon name="call" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}
                    numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
                    {c.display} · {c.hint}
                  </Text>
                </View>
                <Icon name="chevron_right" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* App info card */}
        <Card style={styles.card} padding={20}>
          <SectionHeader title="Ứng dụng" />
          <View style={styles.infoRow}>
            <Text style={[typography.body.md, { color: colors.muted, flex: 1 }]}>Phiên bản</Text>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]} numberOfLines={1}>
              v{APP_VERSION} ({Platform.OS})
            </Text>
          </View>
        </Card>

        {/* About card */}
        <Card style={styles.card} padding={20}>
          <SectionHeader title="Giới thiệu" />
          <Text style={[typography.body.md, { color: colors['on-surface-variant'], marginTop: 12, lineHeight: 22 }]}>
            Nhận diện sớm bệnh trên lá cây qua ảnh chụp. Kết quả là ước tính từ AI — nên tham khảo
            thêm kỹ sư nông nghiệp trước khi phun thuốc.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 4,
  },
  dangerBtn: {
    marginTop: 16,
    backgroundColor: colors['error-container'],
  },
  primaryBtn: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  navRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['primary-subtle'],
  },
});

export default SettingsScreen;
