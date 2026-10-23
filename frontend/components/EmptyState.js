/**
 * AgriScan AI — EmptyState component
 *
 * Màn hình trống khi không có dữ liệu, kèm thông điệp rõ rõ.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../utils/theme';

export const EmptyState = ({
  message,
  subMessage,
  style,
  messageStyle,
  subMessageStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.message, messageStyle]} textAlign="center">
        {message || 'Không có dữ liệu.'}
      </Text>
      {subMessage ? (
        <Text style={[styles.subMessage, subMessageStyle]} textAlign="center">
          {subMessage}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors['surface-container-low'],
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 76,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'Inter-Regular',
  },
  subMessage: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
});

export default EmptyState;
