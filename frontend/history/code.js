/**
 * HistoryScreen — AgriScan AI Scan History (Field Log + Scan Stats)
 *
 * Clean field-log style list. Search input has no icon prefix.
 * Filter pills are text-only. The health summary banner is replaced
 * with a plain text-based statistics block (Scan Stats feature)
 * instead of the old segmented SVG bar.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, Linking } from 'react-native';
import { colors, typography, spacing, shadowFlat } from '../theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../AppHeader';
import { fetchHistory } from '../api';
import Icon from '../icons';

const severityMap = {
  danger: { label: 'Nguy hiểm', bg: colors['error-container'], text: colors['on-error-container'] },
  warning: { label: 'Cần chú ý', bg: colors['error-container'], text: colors['on-error-container'] },
  healthy: { label: 'Cây khỏe', bg: colors['primary-fixed'], text: colors.primary },
};

const HistoryRecord = ({ record, onPress }) => {
  const sev = severityMap[record.severity] || severityMap.healthy;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.record, shadowFlat]}>
      <View style={styles.recordImgWrap}>
        <Image source={{ uri: record.image }} style={styles.recordImg} resizeMode="cover"
          onError={(e) => console.warn('History image error:', e.nativeEvent?.error)} />
        <View style={styles.recordIdBadge}>
          <Text style={styles.recordIdText}>{record.id}</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <View style={[styles.severityPill, { backgroundColor: sev.bg }]}>
            <Text style={[typography.body.sm, { color: sev.text, fontWeight: '700' }]}>
              {sev.label}
            </Text>
          </View>
          {/* Confidence as text, no verified icon */}
          <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700' }]}>
            {record.confidence}%
          </Text>
        </View>
        <Text
          style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}
          numberOfLines={1}>
          {record.cropLabel} — {record.title}
        </Text>
        {/* Time as text, no schedule icon */}
        <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]}>
          {record.time}
        </Text>
      </View>
      {/* Chevron icon instead of text › */}
      <Icon name="chevron_right" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
};

const HistoryScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState([{ key: 'all', label: 'Tất cả' }]);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchHistory();
        setRecords(d.records || []);
        if (Array.isArray(d.filters) && d.filters.length > 0) {
          // Strip icon property from filters (text-only redesign)
          setFilters(d.filters.map((f) => ({ key: f.key, label: f.label })));
        }
      } catch {
        /* no backend */
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.cropLabel.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.time.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'danger') return r.severity === 'danger';
      return r.crop === activeFilter;
    });
  }, [search, activeFilter, records]);

  const healthSummary = useMemo(() => {
    const healthy = records.filter((r) => r.severity === 'healthy').length;
    const warning = records.filter((r) => r.severity === 'warning').length;
    const danger = records.filter((r) => r.severity === 'danger').length;
    const total = healthy + warning + danger;
    if (total === 0) {
      return { healthy: 0, warning: 0, danger: 0, total: 0 };
    }
    return { healthy, warning, danger, total };
  }, [records]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Nhật ký chẩn đoán"
        subtitle="Lịch sử"
        showBack
        onBack={() => navigation?.navigate?.('home')}
        actions={[{ icon: 'notifications', label: 'Thông báo', onPress: () => Linking.openSettings() }]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Search input — no search icon prefix */}
        <View style={styles.searchWrap}>
          <TextInput
            placeholder="Tìm theo cây trồng, tên bệnh hoặc ngày..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Filter pills — text only, no icons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {filters.map((p) => {
            const active = activeFilter === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(p.key)}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
                <Text style={[
                  typography.body.md,
                  {
                    color: active ? colors['on-primary'] : colors.muted,
                    fontWeight: active ? '600' : '400',
                  },
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary info banner */}
        <View style={styles.logSummaryRow}>
          <Text style={[typography.body.sm, { color: colors.muted }]}>
            Hiển thị {filtered.length} trong {records.length} mẫu lá đã quét
          </Text>
        </View>

        {/* Scan Stats Summary (Feature 3) — plain text, no segmented bar */}
        {records.length > 0 && (
          <View style={[styles.statsSummary, shadowFlat]}>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600', marginBottom: 8 }]}>
              Thống kê 7 ngày qua
            </Text>
            <View style={{ gap: 6 }}>
              <View style={styles.statRow}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Tổng số mẫu</Text>
                <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '700' }]}>
                  {healthSummary.total}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Cây khỏe</Text>
                <Text style={[typography.body.md, { color: colors['status-healthy'], fontWeight: '700' }]}>
                  {healthSummary.healthy}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Cần chú ý</Text>
                <Text style={[typography.body.md, { color: colors['status-warning'], fontWeight: '700' }]}>
                  {healthSummary.warning}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Báo động</Text>
                <Text style={[typography.body.md, { color: colors['status-danger'], fontWeight: '700' }]}>
                  {healthSummary.danger}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Records list */}
        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={[typography.body.sm, { color: colors.muted }]}>
                Không tìm thấy mẫu quét phù hợp.
              </Text>
            </View>
          ) : null}
          {filtered.map((r) => (
            <HistoryRecord
              key={r.id}
              record={r}
              onPress={() => navigation?.navigate?.('result', { scanId: r.id })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    color: colors['on-surface'],
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  logSummaryRow: {
    paddingHorizontal: 2,
  },
  statsSummary: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  recordImgWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    flexShrink: 0,
  },
  recordImg: { width: '100%', height: '100%' },
  recordIdBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recordIdText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  severityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  emptyCard: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
});

export default HistoryScreen;
