/**
 * AgriScan AI — Bottom Navigation Bar
 *
 * Icon + text navigation strip at the bottom of the screen with the four
 * primary destinations of the app:
 *   1. Trang chủ  — tổng quan + lối vào nhanh (Lịch sử / Cảnh báo / Cẩm nang)
 *   2. Quét       — chụp / chọn ảnh lá để chẩn đoán
 *   3. Chat AI    — trợ lý tư vấn
 *   4. Cài đặt    — tài khoản + Lịch sử / Cảnh báo / Cẩm nang + thông tin app
 *
 * Lịch sử, Cảnh báo và Cẩm nang are deliberately NOT tabs: they are
 * sub-screens reached from Trang chủ and Cài đặt.
 *
 * Each tab shows a 24×24 SVG icon from icons.js + a single-line label.
 * Active tabs use the green accent (#22c55e); inactive tabs are muted.
 *
 * Motion: the active icon pops slightly (spring) and the dot fades/scales in;
 * pressing a tab dips the icon so the tap feels acknowledged even before the
 * screen swaps.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, typography, z, interactive, radius } from '../../utils/theme';
import { spring, nativeDriver } from '../../utils/motion';
import Icon from '../../icons';

export const TABS = [
  { key: 'home', label: 'Trang chủ', icon: 'home' },
  { key: 'scan', label: 'Quét lá', icon: 'qr_code_scanner' },
  { key: 'chat', label: 'Chat AI', icon: 'psychology' },
  { key: 'settings', label: 'Cài đặt', icon: 'settings' },
];

// Height of the bottom navigation bar (inner row = 56px, plus iOS safe-area
// inset handled in the nav style itself).
export const BOTTOM_NAV_HEIGHT = 64;

const isIos = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

// Desktop breakpoint: >= 768px keeps the same 4 tabs inline.
const DESKTOP_BREAKPOINT = 768;

const ACTIVE_SCALE = 1.1;
const PRESSED_SCALE = 0.9;

const NavItem = ({ tab, active, onPress, hovered, onHoverChange }) => {
  const scale = useRef(new Animated.Value(active ? ACTIVE_SCALE : 1)).current;
  const dot = useRef(new Animated.Value(active ? 1 : 0)).current;

  const springTo = (value) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: nativeDriver,
      ...spring,
    }).start();

  // Icon pop when the tab becomes active.
  useEffect(() => {
    springTo(active ? ACTIVE_SCALE : 1);
  }, [active]);

  // Dot grows in / out with the active state.
  useEffect(() => {
    Animated.timing(dot, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: nativeDriver,
    }).start();
  }, [active]);

  const iconColor = active ? colors.primary : colors.muted;
  const textColor = active ? colors.primary : colors.muted;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => springTo(PRESSED_SCALE)}
      onPressOut={() => springTo(active ? ACTIVE_SCALE : 1)}
      style={[styles.tab, hovered && isWeb && interactive.hover.surface]}
      onMouseEnter={() => isWeb && onHoverChange(tab.key)}
      onMouseLeave={() => isWeb && onHoverChange(null)}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={tab.icon} size={22} color={iconColor} style={styles.tabIcon} />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: textColor, fontWeight: active ? '600' : '400' },
        ]}
        numberOfLines={1}>
        {tab.label}
      </Text>
      <Animated.View
        style={[
          styles.activeDot,
          {
            backgroundColor: colors.primary,
            opacity: dot,
            transform: [
              { scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const BottomNav = ({ activeTab = 'home', onTabPress = () => {} }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const [hoveredTab, setHoveredTab] = useState(null);

  const handlePress = (tab) => {
    if (tab.key === 'scan') {
      onTabPress('camera');
    } else {
      onTabPress(tab.key);
    }
  };

  return (
    <View
      style={[
        styles.nav,
        isDesktop && styles.navDesktop,
        isIos && { paddingBottom: 0 },
      ]}>
      <View style={[styles.row, { height: BOTTOM_NAV_HEIGHT }]}>
        {TABS.map((tab) => (
          <NavItem
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key}
            hovered={hoveredTab === tab.key}
            onHoverChange={setHoveredTab}
            onPress={() => handlePress(tab)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.outline,
    elevation: 0,
    zIndex: z.nav,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 11.5,
    fontFamily: 'Inter-SemiBold',
    marginTop: 3,
  },
  tabIcon: {
    marginBottom: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  navDesktop: {
    height: 64,
  },
});

export default BottomNav;
