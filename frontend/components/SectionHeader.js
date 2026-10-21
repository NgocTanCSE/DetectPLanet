/**
 * AgriScan AI — SectionHeader component
 *
 * Tiêu đề + phụ đề + hành động bên phải, dùng ở đầu mỗi phần màn hình.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  actionIconName,
  onAction,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.content}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && (
        <TouchableOpacity
          accessible={true}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={onAction}
          style={styles.action}>
          <Text style={styles.actionText} numberOfLines={1}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['space-sm'],
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors['on-surface'],
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});

export default SectionHeader;
