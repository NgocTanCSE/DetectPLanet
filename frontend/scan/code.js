/**
 * ScanScreen — AgriScan AI Realtime Diagnostic Scan
 *
 * Clean, farmer-focused diagnostic interface. Replaces sci-fi cyber laser
 * animations and tech jargon with professional, clear agricultural status.
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
} from 'react-native';
import { colors, typography, spacing, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import ProgressCircle from '../ProgressCircle';
import { emptyScanSession } from '../dto';
import { fetchScanSession, analyzeImage } from '../api';

const ScanScreen = ({ navigation, route }) => {
  const passedImageUri = navigation?.params?.imageUri || route?.params?.imageUri || '';
  const passedBase64 = navigation?.params?.base64 || route?.params?.base64 || '';

  const [progress, setProgress] = useState(15);
  const [percentText, setPercentText] = useState('15%');
  const [session, setSession] = useState(emptyScanSession());
  const [analysisDone, setAnalysisDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Call AI diagnosis API
  useEffect(() => {
    let isMounted = true;
    const runAnalysis = async () => {
      try {
        if (passedImageUri || passedBase64) {
          const res = await analyzeImage(passedImageUri, passedBase64);
          if (!isMounted) return;
          if (res && res.id) {
            setSession(res);
            setAnalysisDone(true);
          } else if (res && res.error) {
            setErrorMsg(res.message || res.error || 'Dịch vụ phân tích không thể xử lý ảnh.');
          } else {
            setErrorMsg('Không thể kết nối tới máy chủ phân tích.');
          }
        } else {
          const s = await fetchScanSession();
          if (isMounted) {
            setSession(s);
            setAnalysisDone(true);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMsg('Lỗi kết nối máy chủ phân tích.');
      }
    };
    runAnalysis();
    return () => { isMounted = false; };
  }, [passedImageUri, passedBase64]);

  // Smooth realistic progression
  useEffect(() => {
    if (errorMsg) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        if (!analysisDone && p >= 85) {
          setPercentText('85%');
          return 85;
        }
        const step = analysisDone ? 15 : 6;
        const next = Math.min(100, p + step);
        setPercentText(next + '%');
        if (next >= 100 && analysisDone) {
          clearInterval(timer);
          setTimeout(() => {
            navigation?.navigate?.('result', { scanId: session.id });
          }, 450);
        }
        return next;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [navigation, analysisDone, session.id, errorMsg]);

  const onBack = () => navigation?.navigate?.('camera');
  const onCancel = () => navigation?.navigate?.('camera');
  const shareLeaf = async () => {
    try {
      await Share.share({
        message: 'Mẫu lá đang được phân tích bởi AgriScan AI',
        url: session.image || 'https://agriscan.ai',
      });
    } catch {
      /* no-op */
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Đang phân tích"
        showBack
        onBack={onBack}
        actions={[{ icon: 'share', label: 'Chia sẻ', onPress: shareLeaf }]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 64,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: spacing['space-md'],
        }}>
        {/* Status header banner */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: analysisDone ? colors.primary : colors.primary }]} />
            <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '600' }]}>
              {analysisDone ? 'Đã hoàn tất phân tích' : 'Đang đối chiếu dữ liệu'}
            </Text>
          </View>
          <View style={styles.modelPill}>
            <Icon name="eco" size={14} color={colors.primary} />
            <Text style={[typography['label-sm'], { color: colors.muted, fontWeight: '500' }]}>Nhận diện bệnh hại</Text>
          </View>
        </View>

        {/* Error message banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="error" size={18} color={colors.primary} />
              <Text style={[typography['label-md'], { color: colors.primary, fontWeight: '700' }]}>Thông báo phân tích</Text>
            </View>
            <Text style={[typography.body.sm, { color: colors['on-surface'] }]}>{errorMsg}</Text>
            <TouchableOpacity onPress={onBack} style={styles.errorBtn}>
              <Text style={[typography['label-sm'], { color: colors['on-primary'], fontWeight: '600' }]}>Chụp lại ảnh khác</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Professional Viewfinder */}
        <View style={styles.viewport}>
          {passedImageUri || session.image ? (
            <Image source={{ uri: passedImageUri || session.image }} style={styles.viewportImg} resizeMode="cover" />
          ) : (
            <View style={[styles.viewportImg, { backgroundColor: colors['surface-container-low'] }]} />
          )}

          {/* Clean framing corners */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Data-driven detections */}
          {(session.detections || []).map((d) => {
            const isWarn = d.severity === 'warning';
            const isH = d.severity === 'healthy';
            const c = colors.primary;
            return (
              <View key={d.id} style={[styles.bBox, { top: d.top, left: d.left, borderColor: c, backgroundColor: colors.primary + '33' }]}>
                <View style={styles.bBoxHeader}>
                  <Text style={[typography['label-sm'], { fontSize: 10, color: colors['on-primary'], backgroundColor: c, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, fontWeight: '700' }]}>
                    {isH ? 'Vùng khỏe' : `Điểm #${d.id}`}
                  </Text>
                </View>
                <Text style={[typography['label-sm'], { fontSize: 9, color: colors['on-primary'], fontWeight: '700' }]}>
                  {d.confidence}
                </Text>
              </View>
            );
          })}

          {/* Clean status tag */}
          <View style={styles.detectTag}>
            <View style={[styles.statusDot, { backgroundColor: session.disease ? (session.severity === 'healthy' ? colors.primary : colors.primary) : colors.primary }]} />
            <Text style={[typography['label-sm'], { color: colors['on-surface'], fontWeight: '600' }]}>
              {session.disease ? `${session.disease} (${session.confidence}%)` : 'Đang trích xuất triệu chứng trên lá...'}
            </Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={[styles.progressCard, shadowPaper]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[typography['label-sm'], { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Tiến trình chẩn đoán
            </Text>
            <Text style={[typography.headline.md, { color: colors['on-surface'], marginTop: 2 }]}>
              {analysisDone ? 'Đã tìm thấy kết quả' : 'Đang xử lý mẫu vật...'}
            </Text>
            <Text style={[typography.body.sm, { color: colors.muted, marginTop: 4 }]}>
              Hệ thống đang so khớp hình thái đốm lá với kho dữ liệu bệnh học
            </Text>
          </View>
          <ProgressCircle progress={progress} size={70} strokeWidth={6}>
            <Text style={[typography['label-lg'], { color: colors.primary, fontWeight: '700' }]}>{percentText}</Text>
          </ProgressCircle>
        </View>

        {/* Diagnostic pipeline stepper */}
        <View style={[styles.stepper, shadowPaper]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '600' }]}>Quy trình xử lý mẫu</Text>
            <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '700' }]}>
              {session.pipeline && session.pipeline.length > 0
                ? `${session.pipeline.filter((s) => s.active).length} / ${session.pipeline.length} bước`
                : 'Đang chuẩn bị'}
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            {session.pipeline.length === 0 ? (
              <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center', paddingVertical: 8 }]}>Đang khởi tạo quy trình...</Text>
            ) : (
              session.pipeline.map((step) => (
                <View key={step.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={[styles.stepIcon, { backgroundColor: step.active ? colors['primary-fixed'] : colors['surface-container-low'] }]}>
                    <Icon name={step.icon === 'sync' ? 'sync' : step.icon} size={15} color={step.active ? colors.primary : colors.muted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[typography.body.md, { color: step.active ? colors['on-surface'] : colors.muted, fontWeight: step.active ? '600' : '400' }]} numberOfLines={1}>
                        {step.title}
                      </Text>
                      <Text style={[typography['label-sm'], { color: step.active ? colors.primary : colors.muted }]}>
                        {step.status}
                      </Text>
                    </View>
                    <Text style={[typography.body.sm, { color: step.active ? colors['on-surface-variant'] : colors.muted }]} numberOfLines={1}>
                      {step.desc}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Telemetry footer */}
        <View style={styles.telemetryFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="check_circle" size={15} color={colors.primary} />
            <Text style={[typography.body.sm, { color: colors.muted }]}>
              Chẩn đoán tức thì — Thời gian phản hồi ước tính ~1.5 giây
            </Text>
          </View>
        </View>

        {/* Cancel button */}
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <TouchableOpacity activeOpacity={0.88} onPress={onCancel} style={styles.cancelBtn}>
            <Icon name="close" size={16} color={colors['on-surface']} />
            <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '600' }]}>Hủy bỏ phân tích</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors['primary-fixed'],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors['surface-container-low'],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  errorBanner: {
    backgroundColor: colors['error-container'],
    padding: spacing['space-md'],
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  errorBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewport: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3.4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportImg: { width: '100%', height: '100%' },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors['on-surface'],
    opacity: 0.85,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
  bBox: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 3,
    minWidth: 64,
  },
  bBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detectTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  progressCard: {
    width: '100%',
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  stepper: {
    width: '100%',
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  telemetryFooter: {
    width: '100%',
    backgroundColor: colors['surface-container-low'],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
});

export default ScanScreen;
