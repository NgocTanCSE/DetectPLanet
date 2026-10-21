/**
 * HomeScreen — AgriScan AI Home (Editorial Layout + Saved Reports)
 *
 * Clean editorial layout: green-dot brand mark, hero CTA,
 * stat cards without icons, recent scan carousel, and a saved-reports
 * preview section fed by the backend API.
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
  Share,
  StyleSheet,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../components/layout/AppHeader';
import { fetchHome } from '../services/api';
import { getSavedReports } from '../services/storage';
import { getCurrentUser, onAuthStateChanged } from '../services/auth';
import { Button, Badge, Card, SectionHeader, EmptyState } from '../components';

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
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.scanCard, style]}>
      <View style={styles.scanImgWrap}>
        <Image source={{ uri: scan.image }} style={styles.scanImg} resizeMode="cover"
          onError={(e) => console.warn('Scan image error:', e.nativeEvent?.error)} />

        <Badge severity={scan.severity} style={styles.scanBadge} />

        <View style={styles.scanTime}>
          <Text style={[typography.body.sm, { color: colors['on-surface'] }]}>
            {scan.time}
          </Text>
        </View>
      </View>
      <View style={styles.scanBody}>
        <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          {scan.plant}
        </Text>
        <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
          {scan.disease}
        </Text>
        <View style={styles.scanMeta}>
          <Text style={[typography.body.sm, { color: colors.muted }]}>Độ khớp:</Text>
          <Text style={[typography['metric-confidence'], { color: colors.primary, fontWeight: '700' }]}>
            {scan.confidence}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ArticleCard = ({ article, onPress }) => (
  <Card style={styles.articleCard}>
    <Image source={{ uri: article.image }} style={styles.articleImg} resizeMode="cover"
      onError={(e) => console.warn('Article image error:', e.nativeEvent?.error)} />
    <View style={styles.articleBody}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={[styles.articleTag, { backgroundColor: colors['surface-container-low'] }]}>
          <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '600' }]}>
            {article.label}
          </Text>
        </View>
        <Text style={[typography.body.sm, { color: colors.muted }]}>{article.time}</Text>
      </View>
      <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600', marginBottom: 6 }]} numberOfLines={2}>
        {article.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>{article.action}</Text>
        <Text style={[typography.body.sm, { color: colors.primary }]}>›</Text>
      </View>
    </View>
  </Card>
);

const SavedReportRow = ({ report, onPress }) => (
  <Card style={styles.savedRow} padding={10}>
    <Image source={{ uri: report.image || '' }} style={styles.savedThumb} resizeMode="cover"
      onError={(e) => console.warn('Saved image error:', e.nativeEvent?.error)} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
        {report.crop || 'Cây trồng'} — {report.disease || 'Chưa xác định'}
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

const HomeScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [stats, setStats] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [articles, setArticles] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [user, setUser] = useState(getCurrentUser());
  const { width } = useWindowSize();
  const isDesktop = width >= 768;
  const CONTAINER_MAX = 1024;

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchHome();
        setStats(d.stats || []);
        setRecentScans(d.recent || []);
        setArticles(d.articles || []);
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

  // Subscribe to auth state changes (user name greeting updates live)
  useEffect(() => {
    const unsub = onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const goScan = () => navigation?.navigate?.('camera');
  const goResult = () => navigation?.navigate?.('result');
  const goHistory = () => navigation?.navigate?.('history');
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
  const shareHome = async () => {
    try {
      await Share.share({
        message: 'AgriScan AI - Ứng dụng chẩn đoán bệnh cây trồng.',
        url: 'https://agriscan.ai',
      });
    } catch {
      /* no-op */
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="AgriScan AI"
        subtitle="Trang chủ"
        actions={[
          { icon: 'history', label: 'Lịch sử', onPress: goHistory },
          { icon: 'share', label: 'Chia sẻ', onPress: shareHome },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: isDesktop ? spacing['space-xl'] : spacing.gutter,
          gap: spacing['space-lg'],
          ...(isDesktop
            ? { alignSelf: 'center', width: CONTAINER_MAX, marginHorizontal: 'auto' }
            : {}),
        }}>
        {/* Farmer greeting — text only */}
        <View>
          <Text style={[typography.headline.lg, { color: colors['on-surface'] }]}>
            {user ? `Chào ${user.name || user.email || 'Bạn'}` : 'Chào bạn'}
          </Text>
          <Text style={[typography.body.md, { color: colors.muted, marginTop: 2 }]}>
            Theo dõi sức khỏe đồng ruộng hôm nay
          </Text>
        </View>

        {/* Primary Hero Section — clean card, green accent, no icons */}
        <Card style={styles.hero} padding={20}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroChip}>
                <View style={[styles.heroDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.heroChipText}>CHẨN ĐOÁN LÁ CÂY</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              Phát hiện sâu bệnh tức thì
            </Text>
            <Text style={styles.heroSubtitle}>
              Chụp hoặc chọn ảnh lá cây để nhận diện bệnh hại và nhận hướng dẫn điều trị chuẩn nông vụ.
            </Text>

            {/* CTA — solid green, text only (no camera/chevron icons) */}
            <Button
              variant="primary"
              onPress={goScan}
              style={styles.heroCta}
              accessibilityLabel="Bắt đầu quét mẫu lá">
              Bắt đầu quét mẫu lá
            </Button>
          </View>
        </Card>

        {/* Saved Reports preview section (new feature) */}
        {savedReports.length > 0 ? (
          <View>
            <SectionHeader title="Báo cáo đã lưu" subtitle="Mẫu đã lưu để tham khảo sau" actionLabel="Xem tất cả" onAction={goHistory} />
            <View style={{ gap: 8 }}>
              {savedReports.map((r) => (
                <SavedReportRow
                  key={r.id || r.time}
                  report={r}
                  onPress={() => navigation?.navigate?.('result', { scanId: r.id })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Farm overview metrics — text only, no stat icons */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing['space-sm'] }}>
            <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>Tổng quan hôm nay</Text>
            <Text style={[typography.body.sm, { color: colors.muted }]}>Cập nhật mới nhất</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: isDesktop ? 'wrap' : 'nowrap', gap: spacing['space-sm'] }}>
            {stats.length === 0 ? (
              <Card style={[styles.statCard, { flex: 1, padding: 16 }]}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Chưa có dữ liệu thống kê hôm nay.</Text>
              </Card>
            ) : (
              stats.map((s) => {
                const dotColor = s.color === 'primary' ? colors.primary
                    : s.color === 'status-danger' ? colors['status-danger']
                    : s.color === 'status-healthy' ? colors['status-healthy']
                    : colors.primary;
                return (
                  <Card key={s.label} style={[styles.statCard, isDesktop && { minWidth: 186, flex: '1 1 186' }]} padding={14}>
                    <View style={[styles.statDot, { backgroundColor: dotColor + '20' }]}>
                      <View style={[styles.statDotInner, { backgroundColor: dotColor }]} />
                    </View>
                    <Text style={[typography['metric-confidence'], { color: colors['on-surface'] }]}>{s.value}</Text>
                    <Text style={[typography.body.sm, { color: colors.muted }]}>{s.label}</Text>
                  </Card>
                );
              })
            )}
          </View>
        </View>

        {/* 2-col dashboard: Recent scans | Guides */}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? spacing['space-lg'] : undefined }}>
          {/* Recent scan records */}
          <View style={{ flex: isDesktop ? '1 1 500' : 1, minWidth: 0 }}>
            <SectionHeader title="Mẫu quét gần đây" subtitle="Các mẫu lá đã được phân loại" actionLabel="Xem tất cả" onAction={goHistory} />
            {isDesktop ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {recentScans.length === 0 ? (
                  <EmptyState message="Chưa có lịch sử quét nào." />
                ) : (
                  recentScans.map((s) => (
                    <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} style={{ flex: '1 1 220' }} />
                  ))
                )}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6 }}>
                {recentScans.length === 0 ? (
                  <EmptyState message="Chưa có lịch sử quét nào." />
                ) : (
                  recentScans.map((s) => (
                    <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} />
                  ))
                )}
              </ScrollView>
            )}
          </View>

          {/* Agricultural guides & seasonal tips — text only */}
          <View style={{ flex: isDesktop ? '1 1 420' : 1, minWidth: 0 }}>
            <SectionHeader title="Mẹo canh tác & Cảnh báo mùa vụ" subtitle="Tài liệu kỹ thuật từ chuyên gia nông nghiệp" />
            <View style={{ gap: 10 }}>
              {articles.length === 0 ? (
                <EmptyState message="Chưa có bài viết nào." />
              ) : (
                articles.map((a) => (
                  <ArticleCard key={a.id} article={a} onPress={() => goArticle(a.url)} />
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 12,
    backgroundColor: colors['primary-subtle'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  heroDot: { width: 5, height: 5, borderRadius: 3 },
  heroChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors['on-surface'],
    fontFamily: 'Geist',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 18,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  heroCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.paper,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scanCard: {
    width: 240,
    borderRadius: 8,
    backgroundColor: colors.paper,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  scanBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  scanTime: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
  },
  scanBody: { gap: 2 },
  scanMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  articleCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  articleImg: { width: 84, height: 84, borderRadius: 6 },
  articleBody: { flex: 1, minWidth: 0, justifyContent: 'center', padding: 12 },
  articleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  savedThumb: { width: 44, height: 44, borderRadius: 6 },
});

export default HomeScreen;
