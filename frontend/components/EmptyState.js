/**
 * AgriScan AI — EmptyState component
 *
 * Màn hình trống khi không có dữ liệu, kèm thông điệp rõ ràng.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';

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
      {subMessage && (
        <Text style={[styles.subMessage, subMessageStyle]} textAlign="center">
          {subMessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radiusNone(8),
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 120,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 8,
  },
  subMessage: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 4,
  },
});

function radiusNone(n) {
  return n;
}

export default EmptyState;
