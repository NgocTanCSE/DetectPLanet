/**
 * HistoryScreen — AgriScan AI Scan History
 *
 * Clean, structured field log for agricultural diagnoses. Eliminates
 * decorative cloud badges and emoji swipe hints — minimal green aesthetic.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, Linking } from 'react-native';
import { colors, typography, spacing, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { fetchHistory } from '../api';

const severityMap = {
  danger: { label: 'Nguy hiểm', bg: colors['error-container'], text: colors['on-error-container'] },
  warning: { label: 'Cần chú ý', bg: colors['error-container'], text: colors['on-error-container'] },
  healthy: { label: 'Cây khỏe', bg: colors['primary-fixed'], text: colors.primary },
};

const FILTER_PILLS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'rice', label: 'Lúa' },
  { key: 'tomato', label: 'Cà chua' },
  { key: 'fruit', label: 'Cây ăn trái' },
  { key: 'danger', label: 'Báo động' },
];

const HistoryRecord = ({ record, onPress }) => {
  const sev = severityMap[record.severity] || severityMap.healthy;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.record, shadowPaper]}>
      <View style={styles.recordImgWrap}>
        <Image source={{ uri: record.image }} style={styles.recordImg} resizeMode="cover" />
        <View style={styles.recordIdBadge}>
          <Text style={styles.recordIdText}>{record.id}</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <View style={[styles.severityPill, { backgroundColor: sev.bg }]}>
            <Text style={[typography['label-sm'], { color: sev.text, fontWeight: '700' }]}>
              {sev.label}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="verified" size={14} color={colors.primary} />
            <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '700' }]}>
              {record.confidence}%
            </Text>
          </View>
        </View>
        <Text
          style={[typography.body.lg, { color: colors['on-surface'], fontWeight: '600' }]}
          numberOfLines={1}>
          {record.cropLabel} — {record.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Icon name="schedule" size={13} color={colors.muted} />
          <Text style={[typography.body.sm, { color: colors.muted }]}>{record.time}</Text>
        </View>
      </View>
      <Icon name="chevron_right" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
};

const HealthStat = ({ value, label, color }) => (
  <View style={styles.healthStat}>
    <Text style={[typography['metric-confidence'], { color }]}>{value}</Text>
    <Text style={[typography['label-sm'], { color: colors.muted, marginTop: 3 }]}>{label}</Text>
  </View>
);

const HistoryScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState([{ key: 'all', label: 'Tất cả', icon: 'apps' }]);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchHistory();
        setRecords(d.records || []);
        if (Array.isArray(d.filters) && d.filters.length > 0) {
          setFilters(d.filters);
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
      return { healthy: 0, warning: 0, danger: 0, segs: [{ flex: 100, color: colors['outline'] }] };
    }
    const pct = (n) => Math.max(5, Math.round((n / total) * 100));
    return {
      healthy,
      warning,
      danger,
      segs: [
        { flex: pct(healthy), color: colors['status-healthy'] },
        { flex: pct(warning), color: colors['status-warning'] },
        { flex: pct(danger), color: colors['status-danger'] },
      ],
    };
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
          paddingTop: 64,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Search input */}
        <View style={styles.searchWrap}>
          <Icon name="search" size={18} color={colors.muted} style={{ marginLeft: 8 }} />
          <TextInput
            placeholder="Tìm theo cây trồng, tên bệnh hoặc ngày..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
              <Icon name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter pills */}
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
                <Text
                  style={[
                    typography['label-md'],
                    {
                      color: active ? colors['on-primary'] : colors.muted,
                      fontWeight: active ? '700' : '500',
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
          <Text style={[typography['label-sm'], { color: colors.muted }]}>
            Hiển thị {filtered.length} trong {records.length} mẫu lá đã quét
          </Text>
        </View>

        {/* Records list */}
        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="search" size={32} color={colors.muted} />
              <Text style={[typography.body.md, { color: colors.muted, marginTop: 8 }]}>
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

        {/* Agricultural health status summary */}
        <View style={[styles.healthBanner, shadowPaper]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="analytics" size={18} color={colors.primary} />
              <Text style={[typography['headline-sm'], { color: colors['on-surface'] }]}>
                Tỷ lệ mẫu lá 7 ngày
              </Text>
            </View>
            <View style={styles.summaryTag}>
              <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '700' }]}>
                Tổng kết
              </Text>
            </View>
          </View>

          <View style={styles.healthBar}>
            {healthSummary.segs.map((s, i) => (
              <View key={i} style={[styles.healthSeg, { flex: s.flex, backgroundColor: s.color }]} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
            <HealthStat value={String(healthSummary.healthy)} label="Mẫu khỏe" color={colors['status-healthy']} />
            <HealthStat value={String(healthSummary.warning)} label="Cần chú ý" color={colors['status-warning']} />
            <HealthStat value={String(healthSummary.danger)} label="Báo động" color={colors['status-danger']} />
          </View>
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
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  searchInput: {
    flex: 1,
    color: colors['on-surface'],
    fontSize: 14,
    paddingHorizontal: 8,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  logSummaryRow: {
    paddingHorizontal: 2,
    marginTop: 2,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  recordImgWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
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
  healthBanner: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors['outline'],
    marginTop: 6,
  },
  summaryTag: {
    backgroundColor: colors['primary-fixed'],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  healthBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    gap: 2,
  },
  healthSeg: { height: '100%', borderRadius: 4 },
  healthStat: { flex: 1, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
});

export default HistoryScreen;
