/**
 * AgriScan AI — Bottom Navigation Bar
 *
 * Clean, minimalist bar with forest green as the sole accent color.
 * Removes deep green shadows in favor of subtle paper-like elevation.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, radius } from './theme';
import Icon from './icons';

export const TABS = [
  { key: 'home', label: 'Trang chủ', icon: 'home' },
  { key: 'history', label: 'Lịch sử', icon: 'history' },
  { key: 'scan', label: '', icon: 'qr_code_scanner' },
  { key: 'guides', label: 'Cẩm nang', icon: 'menu_book' },
  { key: 'chat', label: 'Chat AI', icon: 'psychology' },
  { key: 'settings', label: 'Cài đặt', icon: 'settings' },
];

const isIos = Platform.OS === 'ios';

const BottomNav = ({ activeTab = 'home', onTabPress = () => {} }) => {
  const handlePress = (tab) => {
    if (tab.key === 'scan') {
      onTabPress('camera');
    } else {
      onTabPress(tab.key);
    }
  };

  const renderTab = (tab) => {
    const active = activeTab === tab.key;
    const isScan = tab.key === 'scan';

    if (isScan) {
      return (
        <TouchableOpacity
          key={tab.key}
          activeOpacity={0.88}
          onPress={() => handlePress(tab)}
          style={styles.scanButton}>
          <Icon name="photo_camera" size={24} color={colors['on-primary']} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={tab.key}
        activeOpacity={0.7}
        onPress={() => handlePress(tab)}
        style={styles.tab}>
        <Icon
          name={tab.icon}
          size={active ? 20 : 19}
          color={active ? colors.primary : colors.muted}
        />
        {tab.label !== '' ? (
          <Text
            style={[
              styles.tabLabelText,
              {
                color: active ? colors.primary : colors.muted,
                fontWeight: active ? '600' : '400',
              },
            ]}>
            {tab.label}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.nav,
        isIos && { paddingBottom: 16 },
      ]}>
      <View style={styles.row}>
        {renderTab(TABS[0])}
        {renderTab(TABS[1])}
        {renderTab(TABS[2])}
        {renderTab(TABS[3])}
        {renderTab(TABS[4])}
        {renderTab(TABS[5])}
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
    borderColor: colors['outline'],
    shadowColor: '#141414',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    position: 'relative',
    paddingHorizontal: 4,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 52,
    gap: 3,
  },
  tabLabelText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  scanButton: {
    position: 'absolute',
    left: '50%',
    top: -16,
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141414',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 11,
    borderWidth: 3,
    borderColor: colors['outline'],
  },
});

export default BottomNav;
