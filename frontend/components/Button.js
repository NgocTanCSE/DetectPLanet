/**
 * AgriScan AI — Button component
 *
 * Các biến thể:
 *  - primary: nền xanh forest, chữ trắng (CTA chính)
 *  - outline: nền trắng, viền xám, chữ xanh (CTA phụ)
 *  - text: không nền, không viền, chữ xanh (hành động nhẹ)
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { colors, typography, radius, spacing } from '../utils/theme';
import Icon from '../icons';

export const Button = ({
  children,
  onPress,
  disabled = false,
  variant = 'primary',
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const base = {
    primary: {
      container: styles.primaryContainer,
      text: styles.primaryText,
    },
    outline: {
      container: styles.outlineContainer,
      text: styles.outlineText,
    },
    text: {
      container: styles.textContainer,
      text: styles.textText,
    },
  }[variant];

  const containerStyles = [
    base.container,
    disabled && styles.disabled,
    style,
  ];
  const textStyles = [base.text, textStyle];

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      activeOpacity={0.88}
      onPress={onPress}
      style={containerStyles}>
      {loading ? (
        <ActivityIndicator size="small" color={colors['on-primary']} style={styles.loading} />
      ) : (
        <Text style={textStyles}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

export const IconButton = ({
  iconName,
  iconSize = 18,
  iconColor,
  label,
  onPress,
  disabled = false,
  variant = 'text',
  style,
  accessibilityLabel,
}) => {
  const base = {
    text: { container: styles.iconTextContainer },
    outline: { container: styles.iconOutlineContainer },
  }[variant];

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      disabled={disabled}
      activeOpacity={0.88}
      onPress={onPress}
      style={[base.container, disabled && styles.disabled, style]}>
      {iconName && (
        <View style={styles.iconWrap}>
          <Icon name={iconName} size={iconSize} color={iconColor || colors['on-surface']} />
        </View>
      )}
      {label && (
        <Text style={[styles.iconText, disabled && styles.disabledText]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryContainer: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 44,
    elevation: 0,
    shadowColor: 'transparent',
  },
  primaryText: {
    color: colors['on-primary'],
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
  outlineContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 44,
  },
  outlineText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
  textContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  textText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  iconOutlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 40,
  },
  iconWrap: {
    marginRight: 6,
  },
  iconText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.muted,
  },
  loading: {
    marginLeft: 6,
  },
});

export default Button;
