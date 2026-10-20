/**
 * ResultScreen — AgriScan AI Diagnosis Detail (Text-Only Redesign + Saved Reports)
 *
 * Clean, authoritative agricultural diagnostic report. All icons removed;
 * replaces them with text labels, green-dot marks, and numbered indicators.
 *
 * New feature: Saved Reports — the bookmark action now persists the full
 * report to secure local storage. The save state is loaded on mount and
 * synced with the home screen.
 *
 * Flat surfaces: no card shadows (shadowFlat everywhere), border-only style.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { colors, typography, spacing, shadowFlat, z } from '../theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../AppHeader';
import ProgressCircle from '../ProgressCircle';
import { emptyReport } from '../dto';
import { fetchResultReport } from '../api';
import { saveReport, unsaveReport, isReportSaved } from '../storage';
import Icon from '../icons';

const ResultScreen = ({ navigation, route }) => {
  const topInset = useTopInset();
  const scanId = navigation?.params?.scanId || route?.params?.scanId || '';
  const [isZoomed, setZoomed] = useState(false);
  const [isSaved, setSaved] = useState(false);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [report, setReport] = useState(emptyReport());

  const severityBanner = (sev) => {
    if (sev === 'warning') {
      return { label: 'Cần chú ý - Theo dõi vườn', bg: colors['error-container'], on: colors['on-error-container'] };
    }
    if (sev === 'healthy') {
      return { label: 'Cây khỏe - Không phát hiện bệnh', bg: colors['primary-fixed'], on: colors.primary };
    }
    return { label: 'Nguy hiểm - Cần xử lý sớm', bg: colors['error-container'], on: colors['on-error-container'] };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetchResultReport(scanId);
        setReport(r);
        const saved = await isReportSaved(r.id || '');
        setSaved(saved);
      } catch {
        /* no backend */
      }
    };
    load();
  }, [scanId]);

  const onBack = () => navigation?.navigate?.('home');
  const onScanAnother = () => navigation?.navigate?.('camera');

  const onSave = async () => {
    const reportId = report.id || '';
    try {
      if (isSaved) {
        await unsaveReport(reportId);
        setSaved(false);
        setToast({ visible: true, message: 'Đã hủy lưu khỏi sổ theo dõi.' });
      } else {
        await saveReport(report);
        setSaved(true);
        setToast({ visible: true, message: `Đã lưu mẫu #${reportId || '-'} vào sổ theo dõi!` });
      }
    } catch {
      setToast({ visible: true, message: 'Lỗi lưu báo cáo.' });
    }
    setTimeout(() => setToast({ visible: false, message: '' }), 2400);
  };

  const shareResult = async () => {
    try {
      await Share.share({
        message: `Báo cáo AgriScan AI #${report.id || '-'} | ${report.crop || 'Cây'}: ${report.disease || 'Chưa rõ'} (${report.confidence || '0'}%)`,
        url: report.image || 'https://agriscan.ai',
      });
    } catch {
      setToast({ visible: true, message: 'Đã sao chép liên kết báo cáo!' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
    }
  };

  const callExpert = async () => {
    const phone = 'tel:18006868';
    try {
      const can = await Linking.canOpenURL(phone);
      if (can) {
        await Linking.openURL(phone);
      } else {
        setToast({ visible: true, message: 'Đường dây nóng: 1800 6868' });
      }
    } catch {
      setToast({ visible: true, message: 'Tổng đài khuyến nông: 1800 6868' });
    }
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  const sevInfo = severityBanner(report.severity);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Chi tiết chẩn đoán"
        showBack
        onBack={onBack}
        actions={[
          { icon: isSaved ? 'bookmark' : 'bookmark_border', label: isSaved ? 'Đã lưu' : 'Lưu', onPress: onSave },
          { icon: 'share', label: 'Chia sẻ', onPress: shareResult },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 110,
          paddingHorizontal: spacing.gutter,
          gap: 14,
        }}>
        {/* Leaf image viewport — no eco icon placeholder */}
        <View style={styles.leafWrap}>
          {report.image ? (
            <Image
              source={{ uri: report.image }}
              style={[styles.leafImg, isZoomed && { transform: [{ scale: 1.4 }] }]}
              resizeMode="cover"
              onError={(e) => console.warn('Result image load error:', e.nativeEvent?.error)}
            />
          ) : (
            <View style={[styles.leafImg, {
              backgroundColor: colors['surface-container-low'],
              alignItems: 'center',
              justifyContent: 'center',
            }]}>
              <Text style={[typography.body.sm, { color: colors.muted }]}>Chưa có ảnh mẫu</Text>
            </View>
          )}

          {/* Detections — confidence badges with green border, no icons */}
          {(report.detections || []).map((d) => (
            <View key={d.id} style={[styles.detBox, {
              top: d.top, left: d.left,
              borderColor: colors.primary,
              backgroundColor: 'rgba(0, 108, 73, 0.15)',
            }]}>
              <Text style={[typography.label.sm, {
                color: colors['on-primary'],
                backgroundColor: colors.primary,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 4,
                fontWeight: '700',
              }]}>
                {d.confidence}
              </Text>
            </View>
          ))}

          {/* Plant tag — green dot + leaf icon + text */}
          <View style={styles.leafBadge}>
            <Icon name="eco" size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '700' }]} numberOfLines={1}>
              {report.crop || 'Cây trồng'} #{report.id || '-'}
            </Text>
          </View>

          {/* Zoom toggle — text + icon */}
          <TouchableOpacity
            accessibilityLabel="Phóng to"
            activeOpacity={0.8}
            onPress={() => setZoomed((v) => !v)}
            style={styles.leafZoomBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name={isZoomed ? 'zoom_out' : 'zoom_in'} size={14} color={colors['on-surface']} />
              <Text style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '600' }]}>
                {isZoomed ? 'Thu nhỏ' : 'Phóng to'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Primary Diagnosis Card — flat, border-only */}
        <View style={[styles.card, shadowFlat]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={[styles.severityPill, { backgroundColor: sevInfo.bg }]}>
                <Text style={[typography.body.sm, { color: sevInfo.on, fontWeight: '700' }]}>
                  {sevInfo.label}
                </Text>
              </View>

              <Text style={[typography.headline.md, { color: colors['on-surface'], marginTop: 8 }]}>
                {report.crop || 'Cây trồng'} — {report.disease || 'Chưa xác định'}
              </Text>

              {report.pathogen ? (
                <Text style={[typography.body.sm, { color: colors.muted, fontStyle: 'italic', marginTop: 2 }]}>
                  Tên khoa học: {report.pathogen}
                </Text>
              ) : null}
            </View>

            {/* Confidence Gauge (ProgressCircle kept — data viz) */}
            <View style={{ alignItems: 'center' }}>
              <ProgressCircle progress={report.confidence ? Number(report.confidence) : 0} size={64} strokeWidth={5}>
                <Text style={[typography['metric-confidence'], { color: colors.primary, fontWeight: '700' }]}>
                  {report.confidence ? `${report.confidence}%` : '-'}
                </Text>
              </ProgressCircle>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 4 }]}>Độ tin cậy</Text>
            </View>
          </View>

          {/* Status Matrix — text + colored dot */}
          <View style={styles.statusMatrix}>
            <View style={styles.statusCell}>
              <View style={[styles.statusCellDot, { backgroundColor: colors['status-warning'] }]} />
              <Text style={[typography.body.sm, { color: colors.muted }]}>Mức độ lây lan</Text>
              <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                {report.status.spread || 'Theo dõi'}
              </Text>
            </View>
            <View style={styles.statusCell}>
              <View style={[styles.statusCellDot, { backgroundColor: colors.primary }]} />
              <Text style={[typography.body.sm, { color: colors.muted }]}>Giai đoạn</Text>
              <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                {report.status.stage || 'Giai đoạn đầu'}
              </Text>
            </View>
            <View style={styles.statusCell}>
              <View style={[styles.statusCellDot, { backgroundColor: colors['status-danger'] }]} />
              <Text style={[typography.body.sm, { color: colors.muted }]}>Thiệt hại ước tính</Text>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '700', marginTop: 2 }]}>
                {report.status.loss || 'Thấp'}
              </Text>
            </View>
          </View>
        </View>

        {/* Treatment Protocol Accordion — numbered indicators, no icons */}
        <View style={{ gap: 8 }}>
          <Text style={[typography.body.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 2 }]}>
            Phác đồ can thiệp
          </Text>

          {report.accordion.length === 0 ? (
            <View style={[styles.card, { padding: 16 }]}>
              <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center' }]}>
                Đang chuẩn bị phác đồ điều trị chi tiết...
              </Text>
            </View>
          ) : (
            report.accordion.map((item, idx) => {
              const isOpen = open === item.id;
              return (
                <View key={item.id} style={[styles.accordionCard, shadowFlat]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setOpen(isOpen ? null : item.id)}
                    style={styles.accordionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      {/* Numbered indicator instead of icon */}
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
                    <Icon name={isOpen ? 'expand_more' : 'chevron_right'} size={16} color={colors.muted}
                      style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                  </TouchableOpacity>

                  {isOpen ? (
                    <View style={styles.accordionContent}>
                      {item.sections.map((s, i) => (
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
                </View>
              );
            })
          )}
        </View>

        {/* Consult card — green dot mark instead of support_agent icon */}
        <View style={[styles.consultCard, shadowFlat]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.consultIconWrap, { backgroundColor: colors['primary-subtle'] }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline.sm, { color: colors['on-surface'], fontWeight: '700' }]}>
                Tư vấn khuyến nông
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]}>
                Trao đổi trực tiếp với kỹ sư nông nghiệp địa phương
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={callExpert}
            style={styles.consultBtn}>
            <Text style={[typography.body.md, { color: colors.primary, fontWeight: '700' }]}>
              Gọi tổng đài hỗ trợ miễn phí (1800 6868)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed bottom action bar — text only, no icon buttons.
          Only unique actions remain: "Quét mẫu lá khác" (primary) + "Chia sẻ".
          The save/bookmark action lives in the AppHeader (avoid duplication). */}
      <View style={[styles.quickBar, shadowFlat]}>
        {/* Scan another — primary CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onScanAnother}
          style={styles.quickMainBtn}
          accessibilityLabel="Quét mẫu lá khác">
          <Text style={[typography.body.md, { color: colors['on-primary'], fontWeight: '700' }]}>
            Quét mẫu lá khác
          </Text>
        </TouchableOpacity>

        {/* Share — secondary */}
        <TouchableOpacity
          accessibilityLabel="Chia sẻ"
          activeOpacity={0.85}
          onPress={shareResult}
          style={styles.quickSaveBtn}>
          <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '700' }]}>
            Chia sẻ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clean Toast — text only, no check_circle icon */}
      {toast.visible ? (
        <View style={[styles.toast, shadowFlat]}>
          <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>
            {toast.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  leafWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  leafImg: { width: '100%', height: '100%' },
  detBox: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 3,
    minWidth: 64,
    zIndex: z.badge,
  },
  leafBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: colors.outline,
    zIndex: z.badge,
  },
  leafZoomBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 60,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    zIndex: z.badge,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  severityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusMatrix: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statusCell: { flex: 1, alignItems: 'center', gap: 4 },
  statusCellDot: { width: 6, height: 6, borderRadius: 3 },
  accordionCard: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outline,
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
  consultCard: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  consultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  consultBtn: {
    backgroundColor: colors['primary-fixed'],
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quickBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.gutter,
    paddingBottom: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  quickSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quickMainBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: colors['primary-fixed'],
    borderWidth: 1,
    borderColor: colors.outline,
  },
});

export default ResultScreen;
