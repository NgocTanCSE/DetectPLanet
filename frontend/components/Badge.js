/**
 * AgriScan AI — Badge / Pill component
 *
 * Nhãn trạng thái nhỏ, màu theo mức độ (healthy/warning/danger) hoặc tùy chỉnh.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../utils/theme';

export const Badge = ({
  severity,
  children,
  color,
  textColor,
  bgColor,
  style,
  textStyle,
}) => {
  const severityMap = {
    healthy: { bg: colors['primary-fixed'], text: colors.primary },
    warning: { bg: colors['warning-bg'], text: colors['on-warning-bg'] },
    danger: { bg: colors['error-container'], text: colors['on-error-container'] },
  };

  const resolved = severityMap[severity] || {};
  const backgroundColor = bgColor || color || resolved.bg || colors['surface-container-low'];
  const resolvedTextColor = textColor || resolved.text || colors.muted;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}>
      <Text style={[styles.text, { color: resolvedTextColor }, textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default Badge;
