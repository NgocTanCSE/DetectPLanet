/**
 * ResultScreen — AgriScan AI Diagnosis Detail (Text-Only Redesign + Saved Reports)
 *
 * Clean, authoritative agricultural diagnostic report. All icons removed;
 * replaces them with text labels, green-dot marks, and numbered indicators.
 *
 * New feature: Saved Reports — the bookmark action now persists via the
 * backend API (POST /history/{id}/save). Save state flows from /history
 * and /result/{id} responses.
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
  Platform,
} from 'react-native';
import { colors, typography, spacing, shadowFlat } from '../utils/theme';
import Icon from '../icons';
import ProgressCircle from '../components/layout/ProgressCircle';
import { emptyReport } from '../utils/dto';
import { fetchResultReport } from '../services/api';
import { saveReport, unsaveReport } from '../services/storage';
import { Button, Badge, Card, SectionHeader, ScreenHeader } from '../components';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import { useCountUp } from '../utils/motion';

/** Vòng tròn độ tin cậy: đếm 0 → giá trị thật, chỉ component này re-render. */
const ConfidenceGauge = ({ value }) => {
  const animated = useCountUp(value, { duration: 750, delay: 120 });
  return (
    <ProgressCircle progress={animated} size={72} strokeWidth={5}>
      <Text
        numberOfLines={1}
        style={{ color: colors.primary, fontWeight: '700', fontFamily: 'Inter-Bold', fontSize: 16 }}>
        {value ? `${Math.round(animated)}%` : '-'}
      </Text>
    </ProgressCircle>
  );
};

const ResultScreen = ({ navigation, route }) => {
  const scanId = navigation?.params?.scanId || route?.params?.scanId || '';
  const [isZoomed, setZoomed] = useState(false);
  const [isSaved, setSaved] = useState(false);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [report, setReport] = useState(emptyReport());

  const severityBanner = (sev) => {
    if (sev === 'warning') {
      return { label: 'Cần chú ý - Theo dõi vườn', severity: 'warning' };
    }
    if (sev === 'healthy') {
      return { label: 'Cây khỏe - Không phát hiện bệnh', severity: 'healthy' };
    }
    return { label: 'Nguy hiểm - Cần xử lý sớm', severity: 'danger' };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetchResultReport(scanId);
        setReport(r);
        setSaved(r.is_saved === 1 || r.is_saved === true);
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
        const result = await unsaveReport(reportId);
        if (result?.ok !== false) {
          setSaved(false);
          setToast({ visible: true, message: 'Đã hủy lưu khỏi sổ theo dõi.' });
        } else {
          setToast({ visible: true, message: 'Lỗi lưu báo cáo.' });
        }
      } else {
        const result = await saveReport(report);
        if (result?.ok !== false) {
          setSaved(true);
          setToast({ visible: true, message: `Đã lưu mẫu #${reportId || '-'} vào sổ theo dõi!` });
        } else {
          setToast({ visible: true, message: 'Lỗi lưu báo cáo.' });
        }
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

  // Chuyển nguyên kết quả chẩn đoán sang màn Chat để hỏi đáp tiếp với AI.
  const askAI = () => {
    navigation?.navigate?.('chat', {
      scanContext: {
        at: Date.now(),
        id: report.id,
        crop: report.crop,
        disease: report.disease,
        pathogen: report.pathogen,
        severity: report.severity,
        confidence: report.confidence,
        recommendation: report.recommendation,
      },
    });
  };

  // Báo dịch ngoài đồng — prefill cây + bệnh từ kết quả chẩn đoán.
  const reportDisease = () => {
    navigation?.navigate?.('report', {
      crop: report.crop,
      diseaseLabel: report.disease,
    });
  };

  const sevInfo = severityBanner(report.severity);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Chi tiết chẩn đoán"
        onBack={onBack}
        right={
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Bỏ lưu báo cáo' : 'Lưu báo cáo'}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onSave}
              style={{ padding: 6 }}>
              <Icon
                name={isSaved ? 'bookmark' : 'bookmark_border'}
                size={18}
                color={isSaved ? colors.primary : colors.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Chia sẻ kết quả"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={shareResult}
              style={{ padding: 6 }}>
              <Icon name="share" size={18} color={colors.muted} />
            </TouchableOpacity>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-lg'],
          paddingBottom: 130,
          paddingHorizontal: spacing.gutter,
          gap: 14,
        }}>
        {/* Leaf image viewport — only when the scan actually has a photo.
            A empty 4:3 box with floating confidence badges (độ chính xác theo
            vùng) is meaningless without pixels underneath, so we degrade to a
            single compact info row instead. */}
        {report.image ? (
          <View style={[styles.leafWrap, isZoomed && { overflow: 'visible' }]}>
            <Image
              source={{ uri: report.image }}
              style={[styles.leafImg, isZoomed && { transform: [{ scale: 1.4 }] }]}
              resizeMode="cover"
              onError={(e) => console.warn('Result image load error:', e.nativeEvent?.error)}
            />

            {/* Detections — confidence badges with green border, no icons */}
            {(report.detections || []).map((d) => (
              <View key={d.id} style={[styles.detBox, {
                top: d.top, left: d.left,
                borderColor: colors.primary,
                backgroundColor: colors['primary-subtle'],
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

            {/* Plant tag — green dot + text */}
            <View style={styles.leafBadge}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
              <Text style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '700' }]} numberOfLines={1}>
                {report.crop || 'Cây trồng'}
              </Text>
            </View>

            {/* Zoom toggle — text only */}
            <TouchableOpacity
              accessibilityLabel={isZoomed ? 'Thu nhỏ ảnh' : 'Phóng to ảnh'}
              activeOpacity={0.8}
              onPress={() => setZoomed((v) => !v)}
              style={styles.leafZoomBtn}>
              <Text style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '600' }]}>
                {isZoomed ? 'Thu nhỏ' : 'Phóng to'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Card
            padding={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.noImageIcon, { backgroundColor: colors['surface-container-low'] }]}>
              <Icon name="document_scanner" size={18} color={colors.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                {report.crop || 'Cây trồng'} #{report.id || '-'}
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted }]}>
                Mẫu quét này không lưu ảnh lá
              </Text>
            </View>
          </Card>
        )}

        {/* Primary Diagnosis Card — flat, border-only */}
        <Card style={styles.card} padding={16}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Badge severity={sevInfo.severity}>{sevInfo.label}</Badge>

              <Text style={[typography.headline.md, { color: colors['on-surface'], marginTop: 8 }]}>
                {report.crop || 'Cây trồng'} — {report.disease || 'Chưa xác định'}
              </Text>

              {report.pathogen && report.pathogen !== '—' && report.pathogen !== '-' ? (
                <Text style={[typography.body.sm, { color: colors.muted, fontStyle: 'italic', marginTop: 2 }]}>
                  Tên khoa học: {report.pathogen}
                </Text>
              ) : null}
            </View>

            {/* Confidence Gauge (ProgressCircle kept — data viz) */}
            <View style={{ alignItems: 'center' }}>
              <ConfidenceGauge value={Number(report.confidence) || 0} />
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 4 }]}>Độ tin cậy</Text>
            </View>
          </View>

          {/* Status Matrix — text + colored dot */}
          <View style={[styles.statusMatrix, { marginTop: 14 }]}>
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
        </Card>

        {/* Treatment Protocol Accordion — numbered indicators, no icons */}
        <View style={{ gap: 8 }}>
          <SectionHeader
            title={report.severity === 'healthy' ? 'Chăm sóc & phòng bệnh' : 'Phác đồ can thiệp'}
          />

          {report.accordion.length === 0 ? (
            <Card style={styles.accordionEmpty} padding={16}>
              <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center' }]}>
                Đang chuẩn bị phác đồ điều trị chi tiết...
              </Text>
            </Card>
          ) : (
            report.accordion.map((item, idx) => {
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
                      <View style={[styles.chevronIcon, { transform: [{ rotate: isOpen ? '135deg' : '-45deg' }] }]} />
                    </View>
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
                </Card>
              );
            })
          )}
        </View>

        {/* Consult card — chuyển kết quả sang trợ lý AI để hỏi đáp */}
        <Card style={styles.consultCard} padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.consultIconWrap, { backgroundColor: colors['primary-subtle'] }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline.sm, { color: colors['on-surface'], fontWeight: '700' }]}>
                Tư vấn AI
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]}>
                Hỏi tiếp về cách xử lý và phòng bệnh cho mẫu lá này
              </Text>
            </View>
          </View>

          <Button
            variant="outline"
            onPress={askAI}
            style={styles.consultBtn}
            accessibilityLabel="Hỏi AI về kết quả chẩn đoán này">
            Hỏi AI về kết quả này
          </Button>
          <Button
            variant="text"
            onPress={reportDisease}
            iconName="send"
            style={{ marginTop: 4 }}
            accessibilityLabel="Báo dịch ngoài đồng cho cộng đồng">
            Báo dịch ngoài đồng
          </Button>
        </Card>
      </ScrollView>

      {/* Fixed bottom action bar — text only, no icon buttons.
          Save/bookmark action now lives in the inline title bar (avoid duplication). */}
      <View style={styles.quickBar}>
        <Button
          variant="primary"
          onPress={onScanAnother}
          style={styles.quickMainBtn}
          accessibilityLabel="Quét mẫu lá khác">
          Quét mẫu lá khác
        </Button>

        <Button
          variant="outline"
          onPress={shareResult}
          style={styles.quickSaveBtn}
          accessibilityLabel="Chia sẻ">
          Chia sẻ
        </Button>
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
  noImageIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  },
  leafBadge: {
    position: 'absolute',
    bottom: 10,
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
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
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
    marginBottom: 8,
    overflow: 'hidden',
  },
  accordionEmpty: {
    marginBottom: 8,
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
  consultCard: {
    borderRadius: 8,
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
    marginTop: 8,
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  quickMainBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
  },
  quickSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toast: {
    position: 'absolute',
    bottom: 80 + BOTTOM_NAV_HEIGHT,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: colors['primary-fixed'],
  },
});

export default ResultScreen;
