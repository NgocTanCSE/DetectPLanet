/**
 * ScanScreen — AgriScan AI Realtime Diagnostic Scan
 *
 * Clean, farmer-focused diagnostic interface. Eliminates sci-fi cyber
 * decorations and tech jargon with professional agricultural status.
 * Text-only status indicators, numbered pipeline steps, no corner brackets.
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
import { colors, typography, spacing, shadowFlat } from '../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../components/layout/AppHeader';
import ProgressCircle from '../components/layout/ProgressCircle';
import { emptyScanSession } from '../utils/dto';
import { fetchScanSession, analyzeImage } from '../services/api';
import { Card, Badge, Button, SectionHeader, EmptyState } from '../components';

// Diagnostic pipeline steps — text + number, no sci-fi brackets
const PIPELINE_STEPS = [
  { id: 'capture', label: 'Chụp ảnh mẫu' },
  { id: 'analyze', label: 'Phân tích AI' },
  { id: 'detect', label: 'Phát hiện bệnh' },
  { id: 'suggest', label: 'Gợi ý xử lý' },
];

const ScanScreen = ({ navigation, route }) => {
  const topInset = useTopInset();
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

  // Smooth realistic progression — chỉ chạy khi có kết quả phân tích
  useEffect(() => {
    if (!analysisDone) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(100, p + 8);
      });
    }, 150);
    return () => clearInterval(timer);
  }, [analysisDone]);

  // Sync percent text from progress value
  useEffect(() => {
    setPercentText(progress + '%');
  }, [progress]);

  const onBack = () => navigation?.navigate?.('camera');
  const onCancel = () => navigation?.navigate?.('camera');
  const onContinue = () => {
    navigation?.navigate?.('result', { scanId: session.id });
  };
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
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: spacing['space-md'],
        }}>
        {/* Status header — text only, no eco icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '600' }]}>
              {analysisDone ? 'Đã hoàn tất phân tích' : 'Đang đối chiếu dữ liệu'}
            </Text>
          </View>
          {/* Model label — green dot + text, no eco icon */}
          <View style={styles.modelPill}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>
              Nhận diện bệnh hại
            </Text>
          </View>
        </View>

        {/* Error message banner — text only, no error icon */}
        {errorMsg ? (
          <Card style={styles.errorBanner}>
            <Text style={[typography.body.md, { color: colors['on-danger-bg'], fontWeight: '700' }]}>
              Thông báo phân tích
            </Text>
            <Text style={[typography.body.sm, { color: colors['on-surface'] }]}>{errorMsg}</Text>
            <TouchableOpacity onPress={onBack} style={styles.errorBtn}>
              <Text style={[typography.body.sm, { color: colors['on-primary'], fontWeight: '600' }]}>
                Chụp lại ảnh khác
              </Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Clean viewport — no corner brackets */}
        <View style={styles.viewport}>
          {passedImageUri || session.image ? (
            <Image
              source={{ uri: passedImageUri || session.image }}
              style={styles.viewportImg}
              resizeMode="cover"
              onError={(e) => console.warn('Scan viewport image error:', e.nativeEvent?.error)}
            />
          ) : (
            <View style={[styles.viewportImg, { backgroundColor: colors['surface-container-low'] }]} />
          )}

          {/* Data-driven detection boxes */}
          {(session.detections || []).map((d) => {
            const c = colors.primary;
            return (
              <View key={d.id} style={[styles.bBox, {
                top: d.top, left: d.left,
                borderColor: c,
                backgroundColor: 'rgba(0, 108, 73, 0.15)',
              }]}>
                <Text style={[typography.label.sm, {
                  fontSize: 10,
                  color: colors['on-primary'],
                  backgroundColor: c,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 4,
                  fontWeight: '700',
                }]}>
                  {d.confidence}
                </Text>
              </View>
            );
          })}

          {/* Detection tag — green dot + text */}
          <View style={styles.detectTag}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '600' }]}>
              {session.disease ? `${session.disease} (${session.confidence}%)` : 'Đang trích xuất triệu chứng trên lá...'}
            </Text>
          </View>
        </View>

        {/* Progress Card — flat, no shadow */}
        <Card style={styles.progressCard}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[typography.label.sm, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
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
            <Text style={[typography.label.lg, { color: colors.primary, fontWeight: '700' }]}>
              {percentText}
            </Text>
          </ProgressCircle>
        </Card>

        {/* Diagnostic pipeline — numbered dots instead of icons */}
        <Card style={styles.stepper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}>
              Quy trình xử lý mẫu
            </Text>
            <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '700' }]}>
              {session.pipeline && session.pipeline.length > 0
                ? `${session.pipeline.filter((s) => s.active).length} / ${session.pipeline.length} bước`
                : 'Đang chuẩn bị'}
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            {session.pipeline.length === 0 ? (
              <EmptyState message="Đang khởi tạo quy trình..." />
            ) : (
              session.pipeline.map((step, idx) => (
                <View key={step.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={[
                    styles.stepNumber,
                    { backgroundColor: step.active ? colors['primary-subtle'] : colors['surface-container-low'] },
                  ]}>
                    <Text style={[typography.body.sm, {
                      color: step.active ? colors.primary : colors.muted,
                      fontWeight: '700',
                    }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[typography.body.md, {
                        color: step.active ? colors['on-surface'] : colors.muted,
                        fontWeight: step.active ? '600' : '400',
                      }]} numberOfLines={1}>
                        {step.title}
                      </Text>
                      <Text style={[typography.body.sm, { color: step.active ? colors.primary : colors.muted }]}>
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
        </Card>

        {/* Telemetry footer — text only, no check_circle icon */}
        <View style={styles.telemetryFooter}>
          <Text style={[typography.body.sm, { color: colors.muted }]}>
            Chẩn đoán tức thì — Thời gian phản hồi ước tính ~1.5 giây
          </Text>
        </View>

        {/* Action button — tiếp tục khi xong, hủy khi đang xử lý */}
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          {analysisDone ? (
            <Button variant="primary" onPress={onContinue} style={styles.continueBtn} accessibilityLabel="Tiếp tục xem kết quả">
              Tiếp tục xem kết quả
            </Button>
          ) : (
            <Button variant="outline" onPress={onCancel} style={styles.cancelBtn} accessibilityLabel="Hủy bỏ phân tích">
              Hủy bỏ phân tích
            </Button>
          )}
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors['surface-container-low'],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  errorBanner: {
    borderRadius: 8,
    padding: spacing['space-md'],
    gap: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors['error-container'],
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
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportImg: { width: '100%', height: '100%' },
  bBox: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    padding: 3,
    minWidth: 64,
  },
  detectTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  progressCard: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  stepper: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  telemetryFooter: {
    width: '100%',
    backgroundColor: colors['surface-container-low'],
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cancelBtn: {
    minWidth: 150,
  },
  continueBtn: {
    minWidth: 150,
  },
});

export default ScanScreen;
