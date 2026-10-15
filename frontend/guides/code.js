/**
 * GuidesScreen — AgriScan AI Cẩm nang (disease guide accordion)
 *
 * Loads the real guides from GET /guides (database-backed) and renders them
 * as expandable accordion cards, matching the design language of the result
 * screen's "Phác đồ can thiệp" section.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { colors, typography, spacing, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { fetchGuides } from '../api';

const GuidesScreen = ({ navigation }) => {
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
          paddingTop: 64,
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
          <View style={styles.emptyCard}>
            <Icon name="menu_book" size={32} color={colors.muted} />
            <Text style={[typography.body.md, { color: colors.muted, marginTop: 8 }]}>
              Đang tải cẩm nang...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Icon name="error_outline" size={32} color={colors.muted} />
            <Text style={[typography.body.md, { color: colors.muted, marginTop: 8, textAlign: 'center' }]}>
              {error}
            </Text>
          </View>
        ) : (
          guides.map((item) => {
            const isOpen = open === item.id;
            return (
              <View key={item.id} style={[styles.accordionCard, shadowPaper]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setOpen(isOpen ? null : item.id)}
                  style={styles.accordionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.accordionIcon}>
                      <Icon name={item.icon || 'eco'} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography['label-lg'], { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Icon name="expand_more" size={20} color={colors.muted} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.accordionContent}>
                    {(item.sections || []).map((s, i) => (
                      <View key={i} style={styles.accordionSection}>
                        {s.title ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {s.badge ? (
                              <View style={[styles.sectionBadge, s.badgeBg ? { backgroundColor: s.badgeBg } : null]}>
                                <Text style={[typography['label-sm'], { color: s.badgeText || colors.primary, fontWeight: '700' }]}>
                                  {s.badge}
                                </Text>
                              </View>
                            ) : null}
                            <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '600' }]}>
                              {s.title}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                          <Icon name={s.icon === 'check_circle' ? 'check_circle' : 'eco'} size={16} color={colors.primary} style={{ marginTop: 2 }} />
                          <Text style={[typography.body.md, { color: colors['on-surface-variant'], flex: 1, lineHeight: 20 }]}>
                            {s.body}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  accordionCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  accordionSection: {
    backgroundColor: colors['surface-container-low'],
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  sectionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors['primary-fixed'],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors['outline'],
    padding: 24,
    marginTop: 12,
  },
});

export default GuidesScreen;

