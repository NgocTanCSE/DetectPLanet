/**
 * AgriScan AI — Card component
 *
 * Bề mặt trắng, viền duy nhất, không đổ bóng (tuân thủ thiết kế "flat, border-only").
 * Màu trắng trên nền đen, viền xám nhẹ.
 *
 * Card có `onPress` sẽ nhún nhẹ khi chạm (spring scale) để phản hồi thao tác.
 */
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { colors, radius, spacing, interactive } from '../utils/theme';
import { spring, nativeDriver } from '../utils/motion';

const isWeb = Platform.OS === 'web';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * `onPress` makes the whole card tappable (rendered as TouchableOpacity).
 * Without it the card stays a static View.
 */
export const Card = ({
  children,
  style,
  padding = spacing.gutter,
  borderColor,
  hover = false,
  onPress,
  activeOpacity = 0.85,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = isWeb ? () => setHovered(true) : undefined;
  const handleMouseLeave = isWeb ? () => setHovered(false) : undefined;

  const animateScale = (toValue) =>
    Animated.spring(scale, { toValue, useNativeDriver: nativeDriver, ...spring }).start();

  const containerStyle = [
    styles.container,
    { padding, borderColor: borderColor || colors.outline },
    hover && hovered && isWeb && interactive.hover.card,
    style,
  ];

  if (!onPress) {
    return (
      <View
        style={containerStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...rest}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={activeOpacity}
      onPressIn={() => animateScale(0.975)}
      onPressOut={() => animateScale(1)}
      style={[...containerStyle, { transform: [{ scale }] }]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...rest}>
      {children}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
});

export default Card;
