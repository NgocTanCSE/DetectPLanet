/**
 * HistoryScreen — AgriScan AI Scan History (Field Log + Scan Stats)
 *
 * Clean field-log style list. Search input has no icon prefix.
 * Filter pills are text-only. The health summary banner is replaced
 * with a plain text-based statistics block (Scan Stats feature)
 * instead of the old segmented SVG bar.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import Icon from '../icons';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import { fetchHistory } from '../services/api';
import { Pill, Badge, SectionHeader, EmptyState, Card, Input, ScreenHeader } from '../components';
import { FadeInView } from '../components/motion';
import { staggerDelay } from '../utils/motion';

const severityMap = {
  danger: { label: 'Nguy hiểm', severity: 'danger' },
  warning: { label: 'Cần chú ý', severity: 'warning' },
  healthy: { label: 'Cây khỏe', severity: 'healthy' },
};

const HistoryRecord = ({ record, onPress }) => {
  const sev = severityMap[record.severity] || severityMap.healthy;
  return (
    <View style={styles.recordWrapper}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.record}>
        <View style={styles.recordImgWrap}>
          {record.image ? (
            <Image
              source={{ uri: record.image }}
              style={styles.recordImg}
              resizeMode="cover"
              onError={(e) => console.warn('History image error:', e.nativeEvent?.error)}
            />
          ) : (
            <View style={[styles.recordImg, styles.recordImgEmpty]}>
              <Icon name="document_scanner" size={18} color={colors.muted} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <Badge severity={sev.severity}>{sev.label}</Badge>
            <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700' }]}>
              {record.confidence}%
            </Text>
          </View>
          <Text
            style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}
            numberOfLines={1}>
            {record.cropLabel} — {record.title}
          </Text>
          <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]}>
            {record.time}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const HistoryScreen = ({ navigation }) => {
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
          // API có thể trả về nhiều filter cùng key (mỗi bản ghi một dòng) —
          // lọc trùng để React không cảnh báo "two children with the same key".
          const seen = new Set();
          const unique = [];
          d.filters.forEach((f) => {
            if (!f || !f.key || seen.has(f.key)) return;
            seen.add(f.key);
            unique.push({ key: f.key, label: f.label });
          });
          setFilters(unique);
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
      <ScreenHeader
        title="Nhật ký chẩn đoán"
        subtitle={`${records.length} mẫu lá đã quét`}
        onBack={() => navigation?.navigate?.('home')}
        right={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cài đặt hệ thống"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => Linking.openSettings()}
            style={{ padding: 6 }}>
            <Icon name="settings" size={18} color={colors.muted} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-md'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-xl'],
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Search input — no search icon prefix */}
        <Input
          placeholder="Tìm theo cây trồng, tên bệnh hoặc ngày..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

        {/* Filter pills — text only, no icons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {filters.map((p) => {
            const active = activeFilter === p.key;
            return (
              <Pill
                key={p.key}
                label={p.label}
                active={active}
                onPress={() => setActiveFilter(p.key)}
                style={styles.pill}
              />
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
          <Card style={styles.statsSummary} padding={14}>
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
          </Card>
        )}

        {/* Records list */}
        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <EmptyState message="Không tìm thấy mẫu quét phù hợp." />
          ) : null}
          {filtered.map((r, index) => (
            <FadeInView key={r.id} delay={staggerDelay(index)} translateY={10}>
              <HistoryRecord
                record={r}
                onPress={() => navigation?.navigate?.('result', { scanId: r.id })}
              />
            </FadeInView>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    marginBottom: 8,
  },
  pill: {
    minHeight: 36,
  },
  logSummaryRow: {
    paddingHorizontal: 2,
  },
  statsSummary: {
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  recordWrapper: {
    marginBottom: 10,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface-container-low'],
    borderRadius: 8,
    padding: 10,
    gap: 10,
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
  recordImgEmpty: { alignItems: 'center', justifyContent: 'center' },
});

export default HistoryScreen;
