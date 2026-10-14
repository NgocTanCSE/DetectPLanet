/**
 * ResultScreen — AgriScan AI Diagnosis Detail
 *
 * Clean, authoritative agricultural diagnostic report. Eliminates
 * artificial AI decorations and presents treatment regimens clearly with
 * the minimalist nature-inspired aesthetic.
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
} from 'react-native';
import { colors, typography, spacing, shadowCard, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import ProgressCircle from '../ProgressCircle';
import { emptyReport } from '../dto';
import { fetchResultReport } from '../api';

const ResultScreen = ({ navigation, route }) => {
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
        setReport(await fetchResultReport(scanId));
      } catch {
        /* no backend */
      }
    };
    load();
  }, [scanId]);

  const onBack = () => navigation?.navigate?.('home');
  const onScanAnother = () => navigation?.navigate?.('camera');

  const onSave = () => {
    setSaved((v) => !v);
    setToast({
      visible: true,
      message: !isSaved
        ? `Đã lưu mẫu #${report.id || '-'} vào sổ theo dõi!`
        : 'Đã hủy lưu khỏi sổ theo dõi.',
    });
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
          { icon: isSaved ? 'bookmark' : 'bookmark_border', label: 'Lưu', onPress: onSave },
          { icon: 'share', label: 'Chia sẻ', onPress: shareResult },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 64,
          paddingBottom: 110,
          paddingHorizontal: spacing.gutter,
          gap: 14,
        }}>
        {/* Leaf image viewport */}
        <View style={styles.leafWrap}>
          {report.image ? (
            <Image
              source={{ uri: report.image }}
              style={[styles.leafImg, isZoomed && { transform: [{ scale: 1.4 }] }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.leafImg, { backgroundColor: colors['surface-container-low'], alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="eco" size={36} color={colors.muted} />
            </View>
          )}

          {/* Detections */}
          {(report.detections || []).map((d) => (
            <View key={d.id} style={[styles.detBox, { top: d.top, left: d.left }]}>
              <Text style={[typography['label-sm'], styles.detBadge, { backgroundColor: colors.primary }]}>
                {d.confidence}
              </Text>
            </View>
          ))}

          {/* Plant tag */}
          <View style={styles.leafBadge}>
            <Icon name="eco" size={13} color={colors.primary} />
            <Text style={[typography['label-sm'], { color: colors['on-surface'], fontWeight: '700' }]}>
              {report.crop || 'Cây trồng'} #{report.id || '-'}
            </Text>
          </View>

          {/* Zoom toggle */}
          <TouchableOpacity
            accessibilityLabel="Phóng to"
            activeOpacity={0.8}
            onPress={() => setZoomed((v) => !v)}
            style={styles.leafZoomBtn}>
            <Icon name={isZoomed ? 'zoom_out' : 'zoom_in'} size={18} color={colors['on-surface']} />
          </TouchableOpacity>
        </View>

        {/* Primary Diagnosis Card */}
        <View style={[styles.card, shadowPaper]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={[styles.severityPill, { backgroundColor: sevInfo.bg }]}>
                <Text style={[typography['label-sm'], { color: sevInfo.on, fontWeight: '700' }]}>
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

            {/* Confidence Gauge */}
            <View style={{ alignItems: 'center' }}>
              <ProgressCircle progress={report.confidence ? Number(report.confidence) : 0} size={64} strokeWidth={5}>
                <Text style={[typography['label-lg'], { color: colors.primary, fontWeight: '700' }]}>
                  {report.confidence ? `${report.confidence}%` : '-'}
                </Text>
              </ProgressCircle>
              <Text style={[typography['label-sm'], { color: colors.muted, marginTop: 4 }]}>Độ tin cậy</Text>
            </View>
          </View>

          {/* Status Matrix */}
          <View style={styles.statusMatrix}>
            <View style={styles.statusCell}>
              <Text style={[typography['label-sm'], { color: colors.muted }]}>Mức độ lây lan</Text>
              <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                {report.status.spread || 'Theo dõi'}
              </Text>
            </View>
            <View style={styles.statusCell}>
              <Text style={[typography['label-sm'], { color: colors.muted }]}>Giai đoạn</Text>
              <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                {report.status.stage || 'Giai đoạn đầu'}
              </Text>
            </View>
            <View style={styles.statusCell}>
              <Text style={[typography['label-sm'], { color: colors.muted }]}>Thiệt hại ước tính</Text>
              <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '700', marginTop: 2 }]}>
                {report.status.loss || 'Thấp'}
              </Text>
            </View>
          </View>
        </View>

        {/* Treatment Protocol Accordion */}
        <View style={{ gap: 8 }}>
          <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2 }]}>
            Phác đồ can thiệp
          </Text>

          {report.accordion.length === 0 ? (
            <View style={[styles.card, { padding: 16 }]}>
              <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center' }]}>
                Đang chuẩn bị phác đồ điều trị chi tiết...
              </Text>
            </View>
          ) : (
            report.accordion.map((item) => {
              const isOpen = open === item.id;
              return (
                <View key={item.id} style={[styles.accordionCard, shadowPaper]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setOpen(isOpen ? null : item.id)}
                    style={styles.accordionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.accordionIcon}>
                        <Icon name={item.icon} size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[typography['label-lg'], { color: colors['on-surface'], fontWeight: '600' }]}>{item.title}</Text>
                        <Text style={[typography.body.sm, { color: colors.muted }]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    <Icon name="expand_more" size={20} color={colors.muted} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                  </TouchableOpacity>

                  {isOpen ? (
                    <View style={styles.accordionContent}>
                      {item.sections.map((s, i) => (
                        <View key={i} style={styles.accordionSection}>
                          {s.title ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              {s.badge ? (
                                <View style={styles.sectionBadge}>
                                  <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '700' }]}>{s.badge}</Text>
                                </View>
                              ) : null}
                              <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '600' }]}>{s.title}</Text>
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
        </View>

        {/* Consult card — clean green outline, white content */}
        <View style={[styles.consultCard, shadowPaper]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.consultIconWrap}>
              <Icon name="support_agent" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline.sm, { color: colors['on-surface'], fontWeight: '700' }]}>Tư vấn khuyến nông</Text>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]}>
                Trao đổi trực tiếp với kỹ sư nông nghiệp địa phương
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={callExpert}
            style={styles.consultBtn}>
            <Icon name="call" size={18} color={colors.primary} />
            <Text style={[typography['label-lg'], { color: colors.primary, fontWeight: '700' }]}>
              Gọi tổng đài hỗ trợ miễn phí (1800 6868)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed bottom action bar */}
      <View style={[styles.quickBar, shadowPaper]}>
        <TouchableOpacity
          accessibilityLabel="Lưu vào nhật ký"
          activeOpacity={0.85}
          onPress={onSave}
          style={styles.quickSaveBtn}>
          <Icon name={isSaved ? 'bookmark' : 'bookmark_border'} size={20} color={isSaved ? colors.primary : colors['on-surface']} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onScanAnother}
          style={styles.quickMainBtn}>
          <Icon name="photo_camera" size={18} color={colors['on-primary']} />
          <Text style={[typography.body.md, { color: colors['on-primary'], fontWeight: '700' }]}>Quét mẫu lá khác</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Chia sẻ"
          activeOpacity={0.85}
          onPress={shareResult}
          style={styles.quickSaveBtn}>
          <Icon name="share" size={20} color={colors['on-surface']} />
        </TouchableOpacity>
      </View>

      {/* Clean Toast */}
      {toast.visible ? (
        <View style={[styles.toast, shadowCard]}>
          <Icon name="check_circle" size={16} color={colors.primary} />
          <Text style={[typography['label-md'], { color: colors['on-primary'] }]}>{toast.message}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  leafWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  leafImg: { width: '100%', height: '100%' },
  detBox: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  detBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: '700',
  },
  leafBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  leafZoomBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  severityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusMatrix: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  statusCell: { flex: 1, alignItems: 'center' },
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
  consultCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  consultIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  consultBtn: {
    backgroundColor: colors['primary-fixed'],
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors['outline'],
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
    borderColor: colors['outline'],
  },
  quickSaveBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  quickMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors['on-surface'],
  },
});

export default ResultScreen;
