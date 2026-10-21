/**
 * AgriScan AI — Bottom Navigation Bar
 *
 * Icon + text navigation strip at the bottom of the screen.
 * Each tab shows a 20×20 SVG icon from icons.js + a single-line label.
 * Active tabs use the forest-green accent (#006c49); inactive tabs are muted.
 * The central "Quét lá" tab is a primary CTA (green text on green-subtle bg).
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, typography, z } from '../../utils/theme';
import Icon from '../../icons';

export const TABS = [
  { key: 'home', label: 'Trang chủ', icon: 'home' },
  { key: 'history', label: 'Lịch sử', icon: 'history' },
  { key: 'scan', label: 'Quét lá', icon: 'qr_code_scanner' },
  { key: 'guides', label: 'Cẩm nang', icon: 'menu_book' },
  { key: 'chat', label: 'Chat AI', icon: 'psychology' },
  { key: 'settings', label: 'Cài đặt', icon: 'settings' },
];

// Height of the bottom navigation bar (inner row = 56px, plus iOS safe-area
// inset handled in the nav style itself). Screens that render persistent
// bottom bars (chat input, quick-action bars) must offset by this amount so
// they sit *above* — not behind — the BottomNav.
export const BOTTOM_NAV_HEIGHT = 56;

const isIos = Platform.OS === 'ios';

// Desktop breakpoint: >= 768px renders all 6 tabs inline.
const DESKTOP_BREAKPOINT = 768;

// Web-only interactive cursor.
const webCursor = Platform.OS === 'web'
  ? { cursor: 'pointer', userSelect: 'none' }
  : {};

const BottomNav = ({ activeTab = 'home', onTabPress = () => {} }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

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
      <View style={[styles.row, { height: 56 }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const isScan = tab.key === 'scan';
          const iconColor = active ? colors.primary : colors.muted;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              onPress={() => handlePress(tab)}
              style={[
                styles.tab,
                isScan && active && styles.scanTabActive,
                isScan && active && webCursor,
                isScan && !active && webCursor,
                !isScan && webCursor,
              ]}>
              <Icon name={tab.icon} size={20} color={iconColor} style={styles.tabIcon} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.primary : colors.muted,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {active && !isScan && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderColor: colors.outline,
    elevation: 0,
    zIndex: z.nav,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 48,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  scanTabActive: {
    backgroundColor: colors['primary-subtle'],
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 2,
  },
  navDesktop: {
    height: 48,
  },
});

export default BottomNav;
