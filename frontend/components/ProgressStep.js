/**
 * AgriScan AI — ProgressStep component
 *
 * Bước đánh số trong quy trình chẩn đoán, không dùng icon sci-fi.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography, spacing } from '../utils/theme';

export const ProgressStep = ({ step, active, index, total }) => {
  const bgColor = active ? colors['primary-subtle'] : colors['surface-container-low'];
  const textColor = active ? colors.primary : colors.muted;

  return (
    <View style={styles.row}>
      <View style={[styles.circle, { backgroundColor: bgColor }]}>
        <Text style={[styles.circleText, { color: textColor }]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.content} flex={1} minWidth={0}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, active && styles.activeTitle]} numberOfLines={1}>
            {step.title}
          </Text>
          <Text style={[styles.status, { color: textColor }]}>
            {step.status}
          </Text>
        </View>
        <Text style={[styles.desc, { color: textColor }]} numberOfLines={1}>
          {step.desc}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors['on-surface'],
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  activeTitle: {
    color: colors['on-surface'],
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  desc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
});

export default ProgressStep;
