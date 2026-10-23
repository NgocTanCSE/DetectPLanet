/**
 * ScreenHeader — shared app bar for every screen.
 *
 * Replaces the per-screen header markup that used to be duplicated in
 * History / Guides / Alert / Settings / Result / Camera / Scan / Chat.
 *
 * The old pattern was:
 *   <View style={{ paddingTop: topInset }}>…title…</View>   (in normal flow)
 *   <ScrollView contentContainerStyle={{ paddingTop: topInset + 56 }}>  ← double inset
 * which produced a large empty band under the title. This component owns the
 * safe-area inset, so scroll content only needs a small top padding.
 *
 * Usage:
 *   <View style={{ flex: 1 }}>
 *     <ScreenHeader title="Cài đặt" onBack={() => navigation.navigate('home')} />
 *     <ScrollView contentContainerStyle={scrollContent}>…</ScrollView>
 *   </View>
 *
 * The optional `right` slot takes any node (icon button, text action, …).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../utils/theme';
import Icon from '../../icons';
import { useTopInset } from './AppHeader';

export const SCREEN_HEADER_HEIGHT = 52;

const ScreenHeader = ({ title, subtitle, onBack, right, style }) => {
  const topInset = useTopInset();

  return (
    <View style={[styles.wrapper, { paddingTop: topInset }, style]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onBack}
            style={styles.backBtn}>
            <Icon name="arrow_back_ios_new" size={18} color={colors['on-surface']} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  row: {
    minHeight: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
  },
  title: {
    color: colors['on-surface'],
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Inter-Regular',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ScreenHeader;
