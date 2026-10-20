/**
 * HomeScreen — AgriScan AI Home (Editorial Layout + Saved Reports)
 *
 * Clean editorial layout: green-dot brand mark, weather text, hero CTA,
 * stat cards without icons, recent scan carousel, and a saved-reports
 * preview section fed by secure local storage.
 *
 * New feature: "Báo cáo đã lưu" section below the hero shows up to 3
 * bookmarked reports from local storage.
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
} from 'react-native';
import { colors, spacing, typography, shadowFlat } from '../theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../AppHeader';
import { fetchHome } from '../api';
import { getSavedReports } from '../storage';
import Icon from '../icons';

const severityBadge = {
  danger: { label: 'Nguy hiểm', bg: colors['error-container'], text: colors['on-error-container'] },
  warning: { label: 'Cần chú ý', bg: colors['error-container'], text: colors['on-error-container'] },
  healthy: { label: 'Cây khỏe', bg: colors['primary-fixed'], text: colors.primary },
};

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
  const badge = severityBadge[scan.severity] || severityBadge.healthy;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.scanCard, shadowFlat, style]}>
      <View style={styles.scanImgWrap}>
        <Image source={{ uri: scan.image }} style={styles.scanImg} resizeMode="cover"
        onError={(e) => console.warn('Scan image error:', e.nativeEvent?.error)} />

        <View style={[styles.scanBadge, { backgroundColor: badge.bg }]}>
          <Text style={[typography.body.sm, { color: badge.text, fontWeight: '700' }]}>
            {badge.label}
          </Text>
        </View>
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
          <Icon name="eco" size={12} color={colors.primary} style={{ marginRight: 4 }} />
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
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.articleCard, shadowFlat]}>
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
      {/* Text-only chevron instead of arrow_forward icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>{article.action}</Text>
        <Text style={[typography.body.sm, { color: colors.primary }]}>›</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const SavedReportRow = ({ report, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.savedRow, shadowFlat]}>
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
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [stats, setStats] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [articles, setArticles] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
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

  const goScan = () => navigation?.navigate?.('camera');
  const goResult = () => navigation?.navigate?.('result');
  const goHistory = () => navigation?.navigate?.('history');
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
          { icon: 'notifications', label: 'Thông báo', onPress: goHistory },
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
        {/* Farmer greeting & weather — text only, no weather icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[typography.headline.lg, { color: colors['on-surface'] }]}>Chào Bác Ba</Text>
            <Text style={[typography.body.md, { color: colors.muted, marginTop: 2 }]}>
              Theo dõi sức khỏe đồng ruộng hôm nay
            </Text>
          </View>
          {/* Weather text — green dot + text, no partly_cloudy_day icon */}
          <View style={styles.weatherBadge}>
            <View style={[styles.weatherDot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>
              29°C, Nắng ráo
            </Text>
          </View>
        </View>

        {/* Primary Hero Section — clean card, green accent, no icons */}
        <View style={[styles.hero, shadowFlat]}>
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
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={goScan}
              style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Bắt đầu quét mẫu lá</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Reports preview section (new feature) */}
        {savedReports.length > 0 ? (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <View>
                <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>Báo cáo đã lưu</Text>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Mẫu đã lưu để tham khảo sau</Text>
              </View>
              <TouchableOpacity onPress={goHistory}>
                <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '600' }]}>Xem tất cả ›</Text>
              </TouchableOpacity>
            </View>
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
              <View style={[styles.statCard, { flex: 1, padding: 16 }]}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Chưa có dữ liệu thống kê hôm nay.</Text>
              </View>
            ) : (
              stats.map((s) => {
                const dotColor = s.color === 'primary' ? colors.primary
                    : s.color === 'status-danger' ? colors['status-danger']
                    : s.color === 'status-healthy' ? colors['status-healthy']
                    : colors.primary;
                return (
                <View key={s.label} style={[styles.statCard, shadowFlat, isDesktop && { minWidth: 186, flex: '1 1 186' }]}>
                  <View style={[styles.statDot, { backgroundColor: dotColor + '20' }]}>
                    <View style={[styles.statDotInner, { backgroundColor: dotColor }]} />
                  </View>
                  <Text style={[typography['metric-confidence'], { color: colors['on-surface'] }]}>{s.value}</Text>
                  <Text style={[typography.body.sm, { color: colors.muted }]}>{s.label}</Text>
                </View>
              );
            })
            )}
          </View>
        </View>

        {/* 2-col dashboard: Recent scans | Guides */}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? spacing['space-lg'] : undefined }}>
          {/* Recent scan records */}
          <View style={{ flex: isDesktop ? '1 1 500' : 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['space-xs'] }}>
              <View>
                <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>Mẫu quét gần đây</Text>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Các mẫu lá đã được phân loại</Text>
              </View>
              <TouchableOpacity onPress={goHistory} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>Xem tất cả</Text>
                <Text style={[typography.body.sm, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            </View>
            {isDesktop ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {recentScans.length === 0 ? (
                  <Text style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}>Chưa có lịch sử quét nào.</Text>
                ) : (
                  recentScans.map((s) => (
                    <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} style={{ flex: '1 1 220' }} />
                  ))
                )}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6 }}>
                {recentScans.length === 0 ? (
                  <Text style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}>Chưa có lịch sử quét nào.</Text>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing['space-sm'] }}>
              <View>
                <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>Mẹo canh tác & Cảnh báo mùa vụ</Text>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Tài liệu kỹ thuật từ chuyên gia nông nghiệp</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {articles.length === 0 ? (
                <Text style={[typography.body.sm, { color: colors.muted }]}>Chưa có bài viết nào.</Text>
              ) : (
                articles.map((a) => (
                  <ArticleCard key={a.id} article={a} onPress={goResult} />
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
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  weatherDot: { width: 5, height: 5, borderRadius: 3 },
  hero: {
    borderRadius: 12,
    padding: 20,
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors['on-primary'],
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.paper,
    padding: 14,
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
  scanImgWrap: {
    position: 'relative',
    width: '100%',
    height: 124,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
  },
  scanImg: { width: '100%', height: '100%' },
  scanBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  articleImg: { width: 84, height: 84, borderRadius: 6 },
  articleBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
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
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  savedThumb: { width: 44, height: 44, borderRadius: 6 },
});

export default HomeScreen;
