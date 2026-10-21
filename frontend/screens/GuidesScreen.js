/**
 * GuidesScreen — AgriScan AI Cẩm nang (disease guide accordion)
 *
 * Text-only reference list. Loading state shows plain text "Đang tải...".
 * Error state shows plain text. Accordion uses numbered indicators
 * instead of icon circles. Expand/collapse uses a text caret (▼).
 * Sections use bullet characters (•) instead of check_circle / eco icons.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../components/layout/AppHeader';
import { fetchGuides } from '../services/api';
import { SectionHeader, EmptyState, Card } from '../components';

const GuidesScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [guides, setGuides] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await fetchGuides();
      setGuides(Array.isArray(data) ? data : []);
      setError(Array.isArray(data) && data.length === 0 ? 'Chưa có cẩm nang nào.' : '');
    } catch {
      setError('Không thể tải cẩm nang. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Cẩm nang"
        subtitle="Chẩn đoán & phòng trừ"
        showBack
        onBack={() => navigation?.navigate?.('home')}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 10,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }>
        {loading ? (
          <EmptyState message="Đang tải..." />
        ) : error ? (
          <EmptyState message={error} />
        ) : (
          guides.map((item, idx) => {
            const isOpen = open === item.id;
            return (
              <Card key={item.id} style={styles.accordionCard} padding={0}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setOpen(isOpen ? null : item.id)}
                  style={styles.accordionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.accordionIcon, { backgroundColor: isOpen ? colors['primary-subtle'] : colors['surface-container-low'] }]}>
                      <Text style={[typography.body.sm, {
                        color: isOpen ? colors.primary : colors.muted,
                        fontWeight: '700',
                      }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.chevronWrap}>
                    <View style={[styles.chevronIcon, { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }]} />
                  </View>
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.accordionContent}>
                    {(item.sections || []).map((s, i) => (
                      <View key={i} style={styles.accordionSection}>
                        {s.title ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {s.badge ? (
                              <View style={styles.sectionBadge}>
                                <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '700' }]}>
                                  {s.badge}
                                </Text>
                              </View>
                            ) : null}
                            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}>
                              {s.title}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                          <Text style={[typography.body.sm, { color: colors.primary, marginTop: 2 }]}>
                            •
                          </Text>
                          <Text style={[typography.body.md, { color: colors['on-surface-variant'], flex: 1, lineHeight: 20 }]}>
                            {s.body}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  accordionCard: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accordionIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chevronWrap: {
    padding: 4,
  },
  chevronIcon: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderStyle: 'solid',
    borderTopWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: '45deg' }],
  },
  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  accordionSection: {
    backgroundColor: colors['surface-container-low'],
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  sectionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors['primary-fixed'],
  },
});

export default GuidesScreen;
