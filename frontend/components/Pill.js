/**
 * AgriScan AI — Pill component
 *
 * Bo tròn lớn hơn Badge, dùng làm filter pill hoặc tab nhấn nhá.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, typography, spacing } from '../utils/theme';

export const Pill = ({
  label,
  active = false,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
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
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  active: {
    backgroundColor: colors.primary,
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
    fontFamily: 'PlusJakartaSans-Medium',
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
