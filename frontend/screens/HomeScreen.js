/**
 * HomeScreen — AgriScan AI Home (Minimalist Layout + Saved Reports)
 *
 * Clean white-canvas layout: green accent, white cards, green-dot brand mark.
 * Hero CTA, stat cards without icons, recent scan carousel, and a
 * saved-reports preview section fed by the backend API.
 *
 * Saved reports are fetched from GET /history (filtered by is_saved),
 * and saved/unsaved via POST /history/{id}/save + /history/{id}/unsave.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, typography, interactive, radius } from '../utils/theme';
import { useTopInset } from '../components/layout/AppHeader';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import Icon from '../icons';
import { fetchHome, fetchUnreadCount } from '../services/api';
import { getSavedReports } from '../services/storage';
import { getCurrentUser, onAuthStateChanged } from '../services/auth';
import { Badge, Card, SectionHeader, EmptyState } from '../components';
import { FadeInView } from '../components/motion';

const isWeb = Platform.OS === 'web';

const useWindowSize = () => {
  const [size, setSize] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = typeof Dimensions.addEventListener === 'function'
      ? Dimensions.addEventListener('change', ({ window }) => setSize(window))
      : null;
    return () => sub?.remove?.();
  }, []);
  return size;
};

const ScanCard = ({ scan, onPress, style }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.scanCard, style, hovered && isWeb && interactive.hover.card]}
      onMouseEnter={() => isWeb && setHovered(true)}
      onMouseLeave={() => isWeb && setHovered(false)}>
      <View style={styles.scanImgWrap}>
        {scan.image ? (
          <Image source={{ uri: scan.image }} style={styles.scanImg} resizeMode="cover"
            onError={(e) => console.warn('Scan image error:', e.nativeEvent?.error)} />
        ) : (
          <View style={[styles.scanImg, styles.scanImgEmpty]}>
            <Icon name="document_scanner" size={22} color={colors.muted} />
          </View>
        )}
        <Badge severity={scan.severity} style={styles.scanBadge}>
          {scan.label || 'Chưa rõ'}
        </Badge>
      </View>
      <View style={styles.scanBody}>
        <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          {scan.plant}
        </Text>
        <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
          {scan.disease}
        </Text>
        <View style={styles.scanMeta}>
          <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
            {scan.time}
          </Text>
          <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '700' }]}>
            {scan.confidence}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ArticleCard = ({ article, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      padding={0}
      onPress={onPress}
      style={[styles.articleCard, hovered && isWeb && interactive.hover.card]}
      onMouseEnter={() => isWeb && setHovered(true)}
      onMouseLeave={() => isWeb && setHovered(false)}>
      {article.image ? (
        <Image
          source={{ uri: article.image }}
          style={styles.articleImg}
          resizeMode="cover"
          onError={(e) => console.warn('Article image error:', e.nativeEvent?.error)}
        />
      ) : null}
      <View style={styles.articleBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={[styles.articleTag, { backgroundColor: colors['surface-container-low'] }]}>
            <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '600' }]}>
              {article.label}
            </Text>
          </View>
          <Text style={[typography.body.sm, { color: colors.muted }]}>{article.time}</Text>
        </View>
        <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600', marginBottom: 8 }]} numberOfLines={2}>
          {article.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>
            {{ learn: 'Đọc thêm', read: 'Đọc bài', watch: 'Xem video' }[article.action] || 'Đọc thêm'}
          </Text>
          <Text style={[typography.body.sm, { color: colors.primary }]}>›</Text>
        </View>
      </View>
    </Card>
  );
};

const QuickChip = ({ icon, label, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.quickChip, hovered && isWeb && interactive.hover.surface]}
      onMouseEnter={() => isWeb && setHovered(true)}
      onMouseLeave={() => isWeb && setHovered(false)}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={[typography.label.md, { color: colors['on-surface'] }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const SavedReportRow = ({ report, onPress }) => {
  const [hovered, setHovered] = useState(false);
  const cropName = report.cropLabel || report.crop || 'Cây trồng';
  const disease = report.title || report.disease;

  return (
    <Card
      onPress={onPress}
      style={[styles.savedRow, hovered && isWeb && interactive.hover.card]}
      onMouseEnter={() => isWeb && setHovered(true)}
      onMouseLeave={() => isWeb && setHovered(false)}
      padding={10}>
      {report.image ? (
        <Image
          source={{ uri: report.image }}
          style={styles.savedThumb}
          resizeMode="cover"
          onError={(e) => console.warn('Saved image error:', e.nativeEvent?.error)}
        />
      ) : (
        <View style={[styles.savedThumb, styles.savedThumbEmpty]}>
          <Icon name="document_scanner" size={18} color={colors.muted} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
          {disease ? `${cropName} — ${disease}` : cropName}
        </Text>
        <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
          {report.time || report.id || ''}
        </Text>
      </View>
      <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '700' }]}>
        {report.confidence ? `${report.confidence}%` : ''}
      </Text>
    </Card>
  );
};

const HomeScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [stats, setStats] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [articles, setArticles] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [user, setUser] = useState(getCurrentUser());
  const [unread, setUnread] = useState(0);
  const { width } = useWindowSize();
  const isDesktop = width >= 768;
  const CONTAINER_MAX = 1024;

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchHome();
        setStats(d.stats || []);
        setRecentScans((d.recent || []).slice(0, 3));
        setArticles((d.articles || []).slice(0, 3));
      } catch {
        /* no backend / offline */
      }
      try {
        const saved = await getSavedReports();
        setSavedReports(saved.slice(0, 3));
      } catch {
        /* non-fatal */
      }
    };
    load();
  }, []);

  // Badge thông báo: hỏi ngay khi mở Trang chủ + mỗi 60s khi app còn mở.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await fetchUnreadCount();
        if (alive) setUnread(d.unread || 0);
      } catch {
        /* offline — giữ badge cũ */
      }
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Subscribe to auth state changes (user name greeting updates live)
  useEffect(() => {
    const unsub = onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const goScan = () => navigation?.navigate?.('camera');
  const goHistory = () => navigation?.navigate?.('history');
  const goAlerts = () => navigation?.navigate?.('alerts');
  const goGuides = () => navigation?.navigate?.('guides');
  const goReport = () => navigation?.navigate?.('report', {});
  const goNotifications = () => navigation?.navigate?.('notifications');
  const goArticle = (url) => {
    const target = url || 'https://agriscan.ai';
    Linking.canOpenURL(target).then((supported) => {
      if (supported) {
        Linking.openURL(target);
      } else {
        Alert.alert('Không thể mở', 'Liên kết bài viết không khả dụng.');
      }
    });
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + spacing['space-lg'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-2xl'],
          paddingHorizontal: isDesktop ? spacing['space-xl'] : spacing.gutter,
          gap: spacing['space-lg'],
          ...(isDesktop
            ? { alignSelf: 'center', width: CONTAINER_MAX, marginHorizontal: 'auto' }
            : {}),
        }}>
        {/* Farmer greeting + inline actions — text only, no header */}
        <FadeInView delay={0} translateY={8} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.headline.lg, { color: colors['on-surface'] }]}>
              {user ? `Chào ${user.name || user.email || 'Bạn'}` : 'Chào bạn'}
            </Text>
            <Text style={[typography.body.md, { color: colors.muted, marginTop: 4 }]}>
              Theo dõi sức khỏe đồng ruộng hôm nay
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
            onPress={goNotifications}
            style={styles.bellButton}>
            <Icon name="notifications" size={22} color={colors['on-surface']} />
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </FadeInView>

        {/* Quick shortcuts — 3 màn con, không phải tab */}
        <FadeInView delay={70} translateY={8} style={styles.quickRow}>
          <QuickChip icon="history" label="Lịch sử" onPress={goHistory} />
          <QuickChip icon="warning" label="Cảnh báo" onPress={goAlerts} />
          <QuickChip icon="send" label="Báo dịch" onPress={goReport} />
          <QuickChip icon="menu_book" label="Cẩm nang" onPress={goGuides} />
        </FadeInView>

        {/* Số liệu hôm nay */}
        <FadeInView delay={130} translateY={10}>
          <SectionHeader title="Hôm nay" subtitle="Cập nhật mới nhất" />
          <View style={{ flexDirection: 'row', flexWrap: isDesktop ? 'wrap' : 'nowrap', gap: spacing['space-sm'] }}>
            {(stats.length > 0
              ? stats
              : [{ label: 'Chưa có dữ liệu', value: '—', color: 'primary' }]
            ).map((s) => {
              return (
                <Card key={s.label} style={[styles.statCard, isDesktop && { minWidth: 180, flex: '1 1 180' }]} padding={12}>
                  <Text style={[typography.headline.md, { color: colors['on-surface'] }]}>{s.value}</Text>
                  <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center' }]} numberOfLines={1}>
                    {s.label === 'Tổng quan hôm nay' ? 'Tổng quan' : s.label}
                  </Text>
                </Card>
              );
            })}
          </View>
        </FadeInView>

        {/* Mẫu quét gần đây */}
        <FadeInView delay={190} translateY={10}>
          <SectionHeader title="Mẫu quét gần đây" actionLabel="Xem tất cả" onAction={goHistory} />
          {recentScans.length === 0 ? (
            <TouchableOpacity activeOpacity={0.9} onPress={goScan} style={styles.emptyRow}>
              <Icon name="photo_camera" size={18} color={colors.primary} />
              <Text style={[typography.body.md, { color: colors['on-surface'], flex: 1 }]}>
                Chưa có mẫu nào — quét mẫu lá đầu tiên
              </Text>
              <Icon name="chevron_right" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : isDesktop ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {recentScans.map((s) => (
                <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} style={{ flex: '1 1 200' }} />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingRight: spacing.gutter }}>
              {recentScans.map((s) => (
                <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} />
              ))}
            </ScrollView>
          )}
        </FadeInView>

        {/* Báo cáo đã lưu */}
        {savedReports.length > 0 ? (
          <FadeInView delay={250} translateY={10}>
            <SectionHeader title="Báo cáo đã lưu" actionLabel="Xem tất cả" onAction={goHistory} />
            <View style={{ gap: 8 }}>
              {savedReports.map((r) => (
                <SavedReportRow
                  key={r.id || r.time}
                  report={r}
                  onPress={() => navigation?.navigate?.('result', { scanId: r.id })}
                />
              ))}
            </View>
          </FadeInView>
        ) : null}

        {/* Mẹo canh tác */}
        <FadeInView delay={310} translateY={10}>
          <SectionHeader title="Mẹo canh tác" actionLabel="Cẩm nang" onAction={goGuides} />
          <View style={{ gap: 10 }}>
            {articles.length === 0 ? (
              <EmptyState message="Chưa có bài viết nào." />
            ) : (
              articles.map((a) => (
                <ArticleCard key={a.id} article={a} onPress={() => goArticle(a.url)} />
              ))
            )}
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors['status-danger'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing['space-sm'],
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors['surface-container-low'],
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  scanCard: {
    width: 196,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  scanImgWrap: {
    width: '100%',
    height: 104,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
  },
  scanImg: { width: '100%', height: '100%' },
  scanImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  scanBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  scanBody: { gap: 3 },
  scanMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 },
  articleCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  articleImg: { width: 90, height: 90, borderRadius: 8 },
  articleBody: { flex: 1, minWidth: 0, justifyContent: 'center', padding: 14 },
  articleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  savedThumb: { width: 44, height: 44, borderRadius: 8 },
  savedThumbEmpty: {
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
