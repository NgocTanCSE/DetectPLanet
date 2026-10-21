/**
 * AgriScan AI — Top App Header
 *
 * Flat header with back-arrow icon + text buttons. A subtle green dot serves
 * as the brand mark when the back button is hidden. All title/subtitle text
 * uses numberOfLines={1} to prevent line wrapping.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, typography, z } from '../../utils/theme';
import Icon from '../../icons';
import { getCurrentUser } from '../../services/auth';

export const HEADER_HEIGHT = 44;
export const DESKTOP_BREAKPOINT = 768;

/**
 * Cross-platform top inset.
 * - iOS: 44pt (static safe-area baseline for notch/status bar).
 * - Android: real status bar height via StatusBar.currentHeight (read in effect
 *   because it can be 0 on the first render).
 * - web/other: 0 (browser handles the status bar).
 */
export function useTopInset() {
  const [topInset, setTopInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const h = StatusBar.currentHeight || 0;
      setTopInset(h);
    } else if (Platform.OS === 'ios') {
      setTopInset(44);
    } else {
      setTopInset(0);
    }
  }, []);

  return topInset;
}

const AppHeader = ({
  title = 'AgriScan AI',
  subtitle = '',
  showBack = false,
  onBack = () => {},
  actions = [],
}) => {
  const topInset = useTopInset();
  const user = getCurrentUser();

  const webCursor = Platform.OS === 'web'
    ? { cursor: 'pointer', userSelect: 'none' }
    : {};

  return (
    <View
      style={[
        styles.header,
        { paddingTop: topInset },
      ]}>
      <View style={styles.headerInner}>
        {/* LEFT */}
        <View style={styles.left}>
          {showBack ? (
            <TouchableOpacity
              accessibilityLabel="Quay lại"
              style={[styles.textBtn, webCursor, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              onPress={onBack}>
              <Icon name="arrow_back_ios_new" size={16} color={colors['on-surface']} />
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '500' }]}
                numberOfLines={1}>
                Quay lại
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.brandMark}>
              <View style={styles.greenDot} />
              <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}
                numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}

          {/* When showBack=false, the title already appears in the brandMark above.
              Only render the separate title/subtitle View when showBack=true to avoid duplication. */}
          {showBack ? (
            <View>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          ) : (
            subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null
          )}
        </View>

        {/* RIGHT */}
        <View style={styles.right}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={a.label || i}
              accessibilityLabel={a.label}
              style={[styles.textBtn, webCursor, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              onPress={a.onPress}>
              {a.icon && <Icon name={a.icon} size={16} color={colors['on-surface-variant']} />}
              <Text style={[typography.body.md, { color: colors['on-surface-variant'], fontWeight: '500' }]}
                numberOfLines={1}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}

          {user?.avatar && !user.avatar.includes('favicon.ico') ? (
            <Image source={{ uri: user.avatar }} style={styles.profile}
            onError={(e) => console.warn('Profile image error:', e.nativeEvent?.error)} />
          ) : (
            <View style={styles.profileFallback}>
              <Text style={styles.profileInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'B'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderColor: colors.outline,
    elevation: 0,
    zIndex: z.header,
  },
  headerInner: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  title: {
    color: colors['on-surface'],
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  profile: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors['primary-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});

export default AppHeader;
