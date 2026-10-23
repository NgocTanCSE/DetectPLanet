import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAdminToken, initConfig } from './api/client';
import Drawer from './components/Drawer';
import ScreenTransition from './components/ScreenTransition';
import { ToastProvider } from './components/Toast';
import Icon from './icons';
import { colors, font, radius, shadow } from './theme';

import DashboardScreen from './screens/DashboardScreen';
import UsersScreen from './screens/UsersScreen';
import ScansScreen from './screens/ScansScreen';
import GuidesScreen from './screens/GuidesScreen';
import AlertsScreen from './screens/AlertsScreen';
import CommunityScreen from './screens/CommunityScreen';
import OfficialScreen from './screens/OfficialScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AiReportsScreen from './screens/AiReportsScreen';
import AuditScreen from './screens/AuditScreen';
import SystemScreen from './screens/SystemScreen';
import SettingsScreen from './screens/SettingsScreen';

const SCREEN_META = {
  Dashboard: { title: 'Tổng quan', subtitle: 'Toàn cảnh hoạt động AgriScan' },
  Scans: { title: 'Nhật ký quét', subtitle: 'Dữ liệu phân tích ảnh' },
  Users: { title: 'Người dùng', subtitle: 'Tài khoản và trạng thái' },
  Guides: { title: 'Cẩm nang', subtitle: 'Nội dung hướng dẫn trong app' },
  Alerts: { title: 'Cảnh báo', subtitle: 'Dịch bệnh và thời tiết' },
  Community: { title: 'Báo cáo cộng đồng', subtitle: 'Duyệt báo cáo người dùng' },
  Official: { title: 'Tin chính thức', subtitle: 'Duyệt và nhập nguồn tin' },
  Notifications: { title: 'Thông báo', subtitle: 'Gửi hàng loạt và thống kê đọc' },
  AiReports: { title: 'Báo cáo AI', subtitle: 'Tổng hợp tự động theo kỳ' },
  Audit: { title: 'Lịch sử thao tác', subtitle: 'Audit log quản trị' },
  System: { title: 'Hệ thống', subtitle: 'Sức khoẻ dịch vụ và job' },
  Settings: { title: 'Cài đặt', subtitle: 'Kết nối API và quyền admin' },
};

const SCREENS = {
  Dashboard: DashboardScreen,
  Scans: ScansScreen,
  Users: UsersScreen,
  Guides: GuidesScreen,
  Alerts: AlertsScreen,
  Community: CommunityScreen,
  Official: OfficialScreen,
  Notifications: NotificationsScreen,
  AiReports: AiReportsScreen,
  Audit: AuditScreen,
  System: SystemScreen,
  Settings: SettingsScreen,
};

function Splash() {
  return (
    <View style={styles.splash}>
      <View style={styles.splashLogo}>
        <Icon name="eco" size={30} color={colors.white} />
      </View>
      <Text style={styles.splashTitle}>AgriScan Admin</Text>
      <Text style={styles.splashSub}>Đang khởi động…</Text>
      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState({ name: 'Dashboard', params: {} });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    initConfig().finally(() => {
      if (!alive) return;
      setReady(true);
      if (!getAdminToken()) {
        setScreen({ name: 'Settings', params: {} });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const navigate = useCallback((name, params = {}) => {
    setScreen({ name, params });
    setDrawerOpen(false);
  }, []);

  const meta = SCREEN_META[screen.name] || SCREEN_META.Dashboard;
  const ActiveScreen = SCREENS[screen.name] || DashboardScreen;

  if (!ready) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Splash />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />

      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => setDrawerOpen(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.6 }]}
        >
          <Icon name="menu" size={21} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {meta.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {meta.subtitle}
          </Text>
        </View>
        <View style={styles.adminPill}>
          <View style={styles.adminDot} />
          <Text style={styles.adminText}>ADMIN</Text>
        </View>
      </View>

      <ScreenTransition screenKey={screen.name}>
        <ActiveScreen navigation={{ navigate }} params={screen.params} />
      </ScreenTransition>

      <Drawer
        open={drawerOpen}
        current={screen.name}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  splashLogo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  splashTitle: { fontFamily: font.bold, fontSize: 19, color: colors.text },
  splashSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.card,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  subtitle: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  adminDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  adminText: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 0.6, color: colors.primaryDark },
});
