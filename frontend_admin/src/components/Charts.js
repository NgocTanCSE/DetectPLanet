import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import { fmtDate, fmtNumber } from '../utils/format';

/** Biểu đồ cột dọc theo ngày (7/30/90 ngày). */
export function DayBars({ data = [], height = 92 }) {
  if (!data.length) {
    return <Text style={styles.emptyText}>Chưa có dữ liệu trong khoảng này.</Text>;
  }
  const max = Math.max(1, ...data.map((d) => Number(d.count) || 0));
  const step = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {data.map((d, index) => {
          const value = Number(d.count) || 0;
          const h = value ? Math.max(4, (value / max) * height) : 2;
          const isLast = index === data.length - 1;
          return (
            <View key={`${d.date}-${index}`} style={styles.barSlot}>
              <View
                style={{
                  width: '72%',
                  height: h,
                  borderRadius: 3,
                  backgroundColor: isLast ? colors.primaryDark : colors.primary,
                  opacity: value ? 1 : 0.18,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {data.map((d, index) => {
          const show = index % step === 0 || index === data.length - 1;
          return (
            <View key={`label-${d.date}-${index}`} style={styles.axisSlot}>
              {show && (
                <Text style={styles.axisText} numberOfLines={1}>
                  {fmtDate(d.date).slice(0, 5)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Danh sách thanh ngang: bệnh / tỉnh / cây trồng. */
export function HBar({ items = [], color = colors.primary, emptyLabel = 'Chưa có dữ liệu.' }) {
  if (!items.length) return <Text style={styles.emptyText}>{emptyLabel}</Text>;
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));

  return (
    <View style={{ gap: 11 }}>
      {items.map((item, index) => {
        const count = Number(item.count) || 0;
        const pct = Math.max(2, (count / max) * 100);
        return (
          <View key={`${item.name}-${index}`}>
            <View style={styles.hRow}>
              <Text style={styles.hLabel} numberOfLines={1}>
                {item.name || 'Chưa rõ'}
              </Text>
              <Text style={styles.hCount}>{fmtNumber(count)}</Text>
            </View>
            <View style={styles.hTrack}>
              <View
                style={{
                  width: `${pct}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: color,
                  opacity: 1 - Math.min(index * 0.07, 0.45),
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Thanh chồng mức độ: khỏe / cảnh báo / nguy hiểm. */
export function SeverityBar({ data = {} }) {
  const healthy = Number(data.healthy) || 0;
  const warning = Number(data.warning) || 0;
  const danger = Number(data.danger) || 0;
  const total = healthy + warning + danger;

  if (!total) return <Text style={styles.emptyText}>Chưa có lượt quét hoàn tất.</Text>;

  const segments = [
    { key: 'healthy', label: 'Khỏe', value: healthy, color: colors.primary },
    { key: 'warning', label: 'Cảnh báo', value: warning, color: colors.warning },
    { key: 'danger', label: 'Nguy hiểm', value: danger, color: colors.danger },
  ];

  return (
    <View>
      <View style={styles.stack}>
        {segments.map((seg) =>
          seg.value ? (
            <View
              key={seg.key}
              style={{
                width: `${(seg.value / total) * 100}%`,
                backgroundColor: seg.color,
                height: '100%',
              }}
            />
          ) : null,
        )}
      </View>
      <View style={{ gap: 8, marginTop: 12 }}>
        {segments.map((seg) => (
          <View key={seg.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{seg.label}</Text>
            <Text style={styles.legendValue}>{fmtNumber(seg.value)}</Text>
            <Text style={styles.legendPct}>
              {Math.round((seg.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  axis: { flexDirection: 'row', marginTop: 6 },
  axisSlot: { flex: 1, alignItems: 'center' },
  axisText: { fontFamily: font.regular, fontSize: 8.5, color: colors.muted },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.muted,
    paddingVertical: 10,
  },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  hLabel: { flex: 1, fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  hCount: { fontFamily: font.semibold, fontSize: 11, color: colors.textSecondary },
  hTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  stack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontFamily: font.regular, fontSize: 11.5, color: colors.textSecondary },
  legendValue: { fontFamily: font.semibold, fontSize: 11.5, color: colors.text },
  legendPct: { width: 38, textAlign: 'right', fontFamily: font.regular, fontSize: 10.5, color: colors.muted },
});
