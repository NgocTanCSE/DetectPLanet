/**
 * HomeScreen — AgriScan AI Home
 *
 * Clean editorial layout with the nature-inspired green color system.
 * Geist headings + Plus Jakarta Sans body text for clear hierarchy.
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
} from 'react-native';
import { colors, spacing, typography, shadowCard, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { fetchHome } from '../api';

const severityBadge = {
  danger: { label: 'Nguy hiểm', bg: colors['error-container'], text: colors['on-error-container'] },
  warning: { label: 'Cần chú ý', bg: colors['error-container'], text: colors['on-error-container'] },
  healthy: { label: 'Cây khỏe', bg: colors['secondary-container'], text: colors['on-secondary-container'] },
};

const ScanCard = ({ scan, onPress }) => {
  const badge = severityBadge[scan.severity] || severityBadge.healthy;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.scanCard, shadowPaper]}>
      <View style={styles.scanImgWrap}>
        <Image source={{ uri: scan.image }} style={styles.scanImg} resizeMode="cover" />
        <View style={[styles.scanBadge, { backgroundColor: badge.bg }]}>
          <Text style={[typography['label-sm'], { color: badge.text, fontWeight: '700' }]}>
            {badge.label}
          </Text>
        </View>
        <View style={styles.scanTime}>
          <Text style={[typography['label-sm'], { color: colors['inverse-on-surface'] }]}>
            {scan.time}
          </Text>
        </View>
      </View>
      <View style={styles.scanBody}>
        <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          {scan.plant}
        </Text>
        <Text style={[typography.body.lg, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
          {scan.disease}
        </Text>
        <View style={styles.scanMeta}>
          <Text style={[typography.body.sm, { color: colors.muted }]}>Độ khớp:</Text>
          <Text style={[typography['label-lg'], { color: colors.primary, fontWeight: '700' }]}>
            {scan.confidence}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ArticleCard = ({ article, onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.articleCard, shadowPaper]}>
    <Image source={{ uri: article.image }} style={styles.articleImg} resizeMode="cover" />
    <View style={styles.articleBody}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={[styles.articleTag, { backgroundColor: colors['surface-container-low'] }]}>
          <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '600' }]}>{article.label}</Text>
        </View>
        <Text style={[typography['label-sm'], { color: colors.muted }]}>{article.time}</Text>
      </View>
      <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600', marginBottom: 6 }]} numberOfLines={2}>
        {article.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '600' }]}>{article.action}</Text>
        <Icon name="arrow_forward" size={14} color={colors.primary} />
      </View>
    </View>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [articles, setArticles] = useState([]);

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
          paddingTop: 64,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: spacing['space-lg'],
        }}>
        {/* Farmer greeting & Weather status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[typography.headline.lg, { color: colors['on-surface'] }]}>Chào Bác Ba</Text>
            <Text style={[typography.body.md, { color: colors.muted, marginTop: 2 }]}>
              Theo dõi sức khỏe đồng ruộng hôm nay
            </Text>
          </View>
          <View style={styles.weatherBadge}>
            <Icon name="partly_cloudy_day" size={16} color={colors.primary} />
            <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>29°C, Nắng ráo</Text>
          </View>
        </View>

        {/* Primary Hero Section — clean card with green accent */}
        <View style={[styles.hero, shadowCard]}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroPill}>
                <Icon name="eco" size={13} color={colors.primary} />
                <Text style={styles.heroPillText}>CHẨN ĐOÁN LÁ CÂY</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              Phát hiện sâu bệnh tức thì
            </Text>
            <Text style={styles.heroSubtitle}>
              Chụp hoặc chọn ảnh lá cây để nhận diện bệnh hại và nhận hướng dẫn điều trị chuẩn nông vụ.
            </Text>

            {/* CTA — forest green fill, clean sans text */}
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={goScan}
              style={styles.heroCta}>
              <View style={styles.heroCtaLeft}>
                <View style={styles.heroCtaIconWrap}>
                  <Icon name="photo_camera" size={18} color={colors.primary} />
                </View>
                <Text style={styles.heroCtaText}>Bắt đầu quét mẫu lá</Text>
              </View>
              <View style={styles.heroCtaArrowWrap}>
                <Icon name="arrow_forward" size={15} color={colors['on-primary']} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Farm overview metrics */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing['space-sm'] }}>
            <Text style={[typography['headline-sm'], { color: colors['on-surface'] }]}>Tổng quan hôm nay</Text>
            <Text style={[typography['label-sm'], { color: colors.muted }]}>Cập nhật mới nhất</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing['space-sm'] }}>
            {stats.length === 0 ? (
              <View style={[styles.statCard, { flex: 1, padding: 16 }]}>
                <Text style={[typography.body.sm, { color: colors.muted }]}>Chưa có dữ liệu thống kê hôm nay.</Text>
              </View>
            ) : (
              stats.map((s) => (
                <View key={s.label} style={[styles.statCard, shadowPaper]}>
                  <View style={[styles.statIcon, { backgroundColor: colors['primary-fixed'] }]}>
                    <Icon name={s.icon} size={16} color={colors.primary} />
                  </View>
                  <Text style={[typography['metric-confidence'], { color: colors['on-surface'] }]}>{s.value}</Text>
                  <Text style={[typography['label-sm'], { color: colors.muted }]}>{s.label}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Recent scan records */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['space-xs'] }}>
            <View>
              <Text style={[typography['headline-sm'], { color: colors['on-surface'] }]}>Mẫu quét gần đây</Text>
              <Text style={[typography.body.sm, { color: colors.muted }]}>Các mẫu lá đã được phân loại</Text>
            </View>
            <TouchableOpacity onPress={goHistory} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '600' }]}>Xem tất cả</Text>
              <Icon name="chevron_right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6 }}>
            {recentScans.length === 0 ? (
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}>Chưa có lịch sử quét nào.</Text>
            ) : (
              recentScans.map((s) => (
                <ScanCard key={s.id} scan={s} onPress={() => navigation?.navigate?.('result', { scanId: s.id })} />
              ))
            )}
          </ScrollView>
        </View>

        {/* Agricultural guides & seasonal tips */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing['space-sm'] }}>
            <View>
              <Text style={[typography['headline-sm'], { color: colors['on-surface'] }]}>Mẹo canh tác & Cảnh báo mùa vụ</Text>
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
    borderRadius: 20,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  hero: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: colors['primary-fixed'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: colors['primary-container'],
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors['on-primary'],
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 8,
  },
  heroCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCtaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors['on-primary'],
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  heroCtaArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.paper,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCard: {
    width: 240,
    borderRadius: 14,
    backgroundColor: colors.paper,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  scanImgWrap: {
    position: 'relative',
    width: '100%',
    height: 124,
    borderRadius: 10,
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
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  articleImg: { width: 84, height: 84, borderRadius: 10 },
  articleBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  articleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
});

export default HomeScreen;
