/**
 * AgriScan AI — Button component
 *
 * Các biến thể:
 *  - primary: nền xanh lá #22c55e, chữ trắng (CTA chính)
 *  - outline: nền trắng, không viền, chữ xanh lá (CTA phụ)
 *  - text: không nền, không viền, chữ xanh lá (hành động nhẹ)
 *
 * Hover / focus states được bật tự động trên web qua onMouseEnter/Leave.
 * Trên native, dùng activeOpacity để phản hồi cảm xúc.
 */
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, Platform } from 'react-native';
import { colors, typography, radius, interactive } from '../utils/theme';
import { spring, nativeDriver } from '../utils/motion';
import Icon from '../icons';

// Web-only cursor + hover helpers
const isWeb = Platform.OS === 'web';
const webCursor = isWeb ? { cursor: 'pointer', userSelect: 'none' } : {};
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button = ({
  children,
  onPress,
  disabled = false,
  variant = 'primary',
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  iconName,
  iconSize = 18,
  iconColor,
}) => {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue) =>
    Animated.spring(scale, { toValue, useNativeDriver: nativeDriver, ...spring }).start();

  const base = {
    primary: {
      container: [styles.primaryContainer, hovered && isWeb && interactive.hover.primary],
      text: styles.primaryText,
    },
    outline: {
      container: [styles.outlineContainer, hovered && isWeb && interactive.hover.surface],
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
    webCursor,
  ];
  const textStyles = [base.text, textStyle];

  const handleMouseEnter = isWeb ? () => setHovered(true) : undefined;
  const handleMouseLeave = isWeb ? () => setHovered(false) : undefined;

  return (
    <AnimatedTouchable
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      activeOpacity={0.88}
      onPress={onPress}
      onPressIn={() => animateScale(0.97)}
      onPressOut={() => animateScale(1)}
      style={[...containerStyles, { transform: [{ scale }] }]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {loading ? (
        <ActivityIndicator size="small" color={colors['on-primary']} style={styles.loading} />
      ) : (
        <>
          {iconName && (
            <View style={styles.iconWrap}>
              <Icon name={iconName} size={iconSize} color={iconColor || (variant === 'primary' ? colors['on-primary'] : colors.primary)} />
            </View>
          )}
          <Text style={textStyles}>{children}</Text>
        </>
      )}
    </AnimatedTouchable>
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
  const [hovered, setHovered] = useState(false);

  const base = {
    text: {
      container: [styles.iconTextContainer, hovered && isWeb && interactive.hover.surface],
    },
    outline: {
      container: [styles.iconOutlineContainer, hovered && isWeb && { backgroundColor: colors['surface-container-high'] }],
    },
  }[variant];

  const handleMouseEnter = isWeb ? () => setHovered(true) : undefined;
  const handleMouseLeave = isWeb ? () => setHovered(false) : undefined;

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      disabled={disabled}
      activeOpacity={0.88}
      onPress={onPress}
      style={[base.container, disabled && styles.disabled, style, webCursor]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {iconName && (
        <View style={styles.iconWrap}>
          <Icon name={iconName} size={iconSize} color={iconColor || colors.primary} />
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
    borderColor: colors.primary,
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
    elevation: 0,
    shadowColor: 'transparent',
  },
  primaryText: {
    color: colors['on-primary'],
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  outlineContainer: {
    backgroundColor: colors['surface-container-low'],
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
  },
  outlineText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  textContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
    gap: 6,
  },
  textText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    minHeight: 40,
    backgroundColor: colors['surface-container-low'],
  },
  iconOutlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors['surface-container-low'],
    minHeight: 40,
  },
  iconWrap: {
    marginRight: 6,
  },
  iconText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
