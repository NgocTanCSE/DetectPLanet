/**
 * AgriScan AI — Pill component
 *
 * Bo tròn lớn hơn Badge, dùng làm filter pill hoặc tab nhấn nhá.
 * Hover highlight trên web, màu xanh khi active.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, radius, interactive } from '../utils/theme';

const isWeb = Platform.OS === 'web';

export const Pill = ({
  label,
  active = false,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = isWeb ? () => setHovered(true) : undefined;
  const handleMouseLeave = isWeb ? () => setHovered(false) : undefined;

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.container,
        active ? styles.active : styles.inactive,
        hovered && isWeb && !active && interactive.hover.surface,
        disabled && styles.disabled,
        style,
      ]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  active: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  activeText: {
    color: colors['on-primary'],
  },
  inactiveText: {
    color: colors.muted,
  },
});

export default Pill;
