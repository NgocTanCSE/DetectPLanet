/**
 * AgriScan AI — SectionHeader component
 *
 * Tiêu đề + phụ đề + hành động bên phải, dùng ở đầu mỗi phần màn hình.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, typography, spacing, interactive, radius } from '../utils/theme';

const isWeb = Platform.OS === 'web';

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
  const [hovered, setHovered] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.content}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && (
        <TouchableOpacity
          accessible={true}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={onAction}
          style={[styles.action, hovered && isWeb && interactive.hover.surface]}
          onMouseEnter={() => isWeb && setHovered(true)}
          onMouseLeave={() => isWeb && setHovered(false)}>
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
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  actionText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});

export default SectionHeader;
