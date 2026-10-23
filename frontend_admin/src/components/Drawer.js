import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOTION, useReduceMotion } from '../utils/motion';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import { getApiBase } from '../api/client';

export const NAV_GROUPS = [
  {
    title: 'Tổng quan',
    items: [{ name: 'Dashboard', label: 'Dashboard', icon: 'analytics' }],
  },
  {
    title: 'Dữ liệu',
    items: [
      { name: 'Scans', label: 'Nhật ký quét', icon: 'camera' },
      { name: 'Users', label: 'Người dùng', icon: 'users' },
    ],
  },
  {
    title: 'Nội dung',
    items: [
      { name: 'Guides', label: 'Cẩm nang', icon: 'menu_book' },
      { name: 'Alerts', label: 'Cảnh báo', icon: 'warning' },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [
      { name: 'Community', label: 'Báo cáo cộng đồng', icon: 'flag' },
      { name: 'Official', label: 'Tin chính thức', icon: 'news' },
    ],
  },
  {
    title: 'Vận hành',
    items: [
      { name: 'Notifications', label: 'Thông báo', icon: 'notifications' },
      { name: 'AiReports', label: 'Báo cáo AI', icon: 'auto_awesome' },
      { name: 'Audit', label: 'Lịch sử thao tác', icon: 'schedule' },
      { name: 'System', label: 'Hệ thống', icon: 'server' },
      { name: 'Settings', label: 'Cài đặt', icon: 'settings' },
    ],
  },
];

const WIDTH = 286;

export default function Drawer({ open, current, onClose, onNavigate }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      // Bỏ qua animation: set ngay vị trí cuối cùng
      translateX.setValue(open ? 0 : -WIDTH);
      opacity.setValue(open ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -WIDTH,
        duration: open ? MOTION.duration.normal : MOTION.duration.fast,
        useNativeDriver: MOTION.useNativeDriver,
        easing: MOTION.easing,
      }),
      Animated.timing(opacity, {
        toValue: open ? 1 : 0,
        duration: open ? MOTION.duration.normal : MOTION.duration.fast,
        useNativeDriver: MOTION.useNativeDriver,
        easing: MOTION.easing,
      }),
    ]).start();
  }, [open, opacity, translateX, reduceMotion]);

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="eco" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>AgriScan Admin</Text>
            <Text style={styles.brandSub}>Quản trị nội bộ</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {NAV_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item) => {
                const active = item.name === current;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => onNavigate(item.name)}
                    style={({ pressed }) => [
                      styles.item,
                      active && styles.itemActive,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      color={active ? colors.primaryDark : colors.textSecondary}
                    />
                    <Text style={[styles.itemText, active && styles.itemTextActive]}>
                      {item.label}
                    </Text>
                    {active && <View style={styles.activeDot} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.statusDot} />
          <Text style={styles.footerText} numberOfLines={1}>
            {getApiBase()}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: WIDTH,
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  brandSub: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  scroll: { paddingVertical: 10, paddingHorizontal: 10 },
  group: { marginBottom: 8 },
  groupTitle: {
    fontFamily: font.semibold,
    fontSize: 9.5,
    letterSpacing: 0.7,
    color: colors.muted,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 1,
  },
  itemActive: { backgroundColor: colors.primarySoft },
  itemText: { flex: 1, fontFamily: font.medium, fontSize: 12.5, color: colors.textSecondary },
  itemTextActive: { color: colors.primaryDark, fontFamily: font.semibold },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  footerText: { flex: 1, fontFamily: font.regular, fontSize: 10, color: colors.muted },
});
