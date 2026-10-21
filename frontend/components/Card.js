/**
 * AgriScan AI — Card component
 *
 * Bề mặt trắng, viền duy nhất, không đổ bóng (tuân thủ thiết kế "flat, border-only").
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

export const Card = ({ children, style, padding = spacing.gutter, borderColor }) => {
  return (
    <View
      style={[
        styles.container,
        { padding, borderColor: borderColor || colors.outline },
        style,
      ]}>
      {children}
    </View>
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
