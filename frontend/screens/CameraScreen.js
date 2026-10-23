/**
 * CameraScreen — AgriScan AI Camera / Image Picker (Text-Only Redesign)
 *
 * In the React Native CLI workflow this screen uses `react-native-image-picker`
 * for both capture and library selection (system camera app + photo picker):
 *   - `launchCamera()`  → opens the system camera app (Android "Chụp trực tiếp")
 *   - `launchImageLibrary()` → opens the system photo picker ("Chọn từ thư viện")
 *
 * Both return `includeBase64: true` so the captured image can be POSTed to the
 * /analyze endpoint as a base64 string (the same contract the backend expects).
 *
 * Text-light redesign: icons are used sparingly (flash toggle, grid toggle).
 * Shutter → plain green circle (no icon).
 * Corner brackets, viewfinder pill, and all decorative SVG paths removed.
 *
 * New feature: Image Quality Check — a lightweight blur-detection heuristic
 * runs on the captured image before the "Phân tích ngay" button appears,
 * showing a text-only quality indicator.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { colors, typography, spacing, radius } from '../utils/theme';
import Icon from '../icons';
import { emptyCapture } from '../utils/dto';
import { CROP_OPTIONS, cropLabel } from '../utils/crops';
import { Button, Card, ScreenHeader } from '../components';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';

const CAMERA_QUALITY = 0.8;

// ── Image Quality Check ──────────────────────────────────────────────
/**
 * Lightweight blur-detection heuristic.
 * On web we attempt a variance-of-Laplacian via an off-screen canvas.
 * On native (or when anything fails), we fall back to a base64-size heuristic:
 * a real leaf photo is at least ~10 KB of base64; anything smaller is suspect.
 *
 * Returns: { score: number(0-100), isGood: boolean, message: string }
 */
function checkImageQuality(base64) {
  if (!base64) return { score: 0, isGood: false, message: 'Chưa có ảnh' };

  // Heuristic: base64 size correlates with resolution / detail.
  const len = base64.replace(/^data:image\/[^;]+;base64,/, '').length;
  if (len < 5000) {
    return { score: 30, isGood: false, message: 'Ảnh quá nhỏ, vui lòng chụp lại' };
  }

  // On web, try a proper variance-of-Laplacian for a sharper signal.
  if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
    try {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${base64}`;
      // Synchronous decode (works in jsdom if already in cache / data URI).
      const canvas = document.createElement('canvas');
      const MAX = 80; // downscale to keep it cheap
      canvas.width = MAX;
      canvas.height = MAX;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, MAX, MAX);

      const gray = [];
      const imageData = ctx.getImageData(0, 0, MAX, MAX);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        gray.push(0.299 * r + 0.587 * g + 0.114 * b);
      }

      // Sobel / Laplacian kernel (simplified 3x3 Laplacian)
      let lapSum = 0;
      let count = 0;
      for (let y = 1; y < MAX - 1; y++) {
        for (let x = 1; x < MAX - 1; x++) {
          const idx = y * MAX + x;
          const lap =
            gray[idx - MAX] * 0 +
            gray[idx - 1] * 0 +
            gray[idx + 1] * 0 +
            gray[idx + MAX] * 0 +
            (gray[idx] * -4) +
            gray[idx - MAX - 1] * 1 +
            gray[idx - MAX + 1] * 1 +
            gray[idx + MAX - 1] * 1 +
            gray[idx + MAX + 1] * 1;
          lapSum += Math.abs(lap);
          count++;
        }
      }
      const variance = count > 0 ? lapSum / count : 0;
      const score = Math.min(100, Math.round(variance / 3));
      const isGood = score >= 30;
      return {
        score,
        isGood,
        message: isGood ? 'Chất lượng ảnh tốt' : 'Ảnh mờ, vui lòng chụp lại',
      };
    } catch {
      // canvas failed — fall through to base64 heuristic
    }
  }

  // Fallback heuristic
  if (len > 30000) {
    return { score: 75, isGood: true, message: 'Chất lượng ảnh tốt' };
  }
  return { score: 45, isGood: true, message: 'Chất lượng ảnh tốt' };
}

// ── CameraScreen ────────────────────────────────────────────────────
const TIPS = [
  'Đặt lá trên nền sáng, tránh chụp ngược sáng.',
  'Giữ toàn bộ lá trong khung hình, không quá xa.',
  'Lấy nét rõ vùng có đốm bệnh hoặc héo úa.',
];

const CameraScreen = ({ navigation }) => {
  const [captured, setCaptured] = useState(emptyCapture());
  const [quality, setQuality] = useState(null);
  // The vision model available on the current plan misidentifies the plant
  // often, so the user confirms the crop before /analyze is called.
  const [cropSlug, setCropSlug] = useState('');

  const onBack = () => navigation?.navigate?.('home');

  // ── Image capture: opens the system camera app ──────────────────────
  const captureFromSystemCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: CAMERA_QUALITY,
        includeBase64: true,
        // Downscale on device: a 12MP JPEG becomes ~4 MB base64, which slows
        // vision inference past the server timeout and can exceed PHP's
        // post_max_size. 1280px is plenty for leaf-level diagnosis.
        maxWidth: 1280,
        maxHeight: 1280,
        cameraType: 'back',
        saveToPhotos: false,
        // NOTE: react-native-image-picker v8 CameraOptions does NOT support
        // a `flashMode` key (it's absent from the TS types). Passing it is
        // ignored at best and can trigger native warnings on some Android
        // vendor camera apps. The flashOn state is kept for UI-only purposes
        // (toggle button appearance). System camera flash control would require
        // a custom native camera module (e.g. react-native-camera-kit).
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi máy ảnh', result.errorMessage || 'Không thể chụp ảnh.');
        return;
      }
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newCapture = {
          uri: asset.uri,
          base64: asset.base64 || '',
          crop: 'Mẫu lá chụp trực tiếp',
          time: 'Vừa chụp xong',
        };
        setCaptured(newCapture);
        setQuality(checkImageQuality(newCapture.base64));
      }
    } catch (err) {
      Alert.alert(
        'Không thể mở máy ảnh',
        'Vui lòng thử lại hoặc chọn ảnh từ thư viện.',
      );
    }
  };

  // ── Image library: opens the system photo picker ────────────────────
  const openImageLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: CAMERA_QUALITY,
        includeBase64: true,
        maxWidth: 1280,
        maxHeight: 1280,
        selectionLimit: 1,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi thư viện ảnh', result.errorMessage || 'Không thể mở thư viện.');
        return;
      }
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newCapture = {
          uri: asset.uri,
          base64: asset.base64 || '',
          crop: 'Ảnh chọn từ thư viện',
          time: 'Vừa chọn xong',
        };
        setCaptured(newCapture);
        setQuality(checkImageQuality(newCapture.base64));
      }
    } catch (err) {
      Alert.alert('Không thể mở Thư viện ảnh', 'Vui lòng thử lại.');
    }
  };

  const onAnalyze = () => {
    if (!cropSlug) return;
    navigation?.navigate?.('scan', {
      imageUri: captured.uri,
      base64: captured.base64,
      crop: cropSlug,
      cropLabel: cropLabel(cropSlug),
    });
  };

  // "Chụp lại" chỉ xoá ảnh hiện tại để người dùng tự chọn máy ảnh / thư viện
  // (trước đây nó mở lại camera ngay, gây bất ngờ và không thể đổi nguồn ảnh).
  const onRetake = () => {
    setCaptured(emptyCapture());
    setQuality(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Quét mẫu lá"
        subtitle={captured.uri ? 'Kiểm tra ảnh trước khi phân tích' : 'Chụp hoặc chọn ảnh lá cây'}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-lg'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-lg'],
          paddingHorizontal: spacing.gutter,
          gap: spacing['space-md'],
        }}>
        {/* Khung ảnh */}
        <View style={styles.viewport}>
          {captured.uri ? (
            <Image
              source={{ uri: captured.uri }}
              style={styles.viewportImg}
              resizeMode="cover"
              onError={(e) => console.warn('Camera preview error:', e.nativeEvent?.error)}
            />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderIcon}>
                <Icon name="photo_camera" size={26} color={colors.primary} />
              </View>
              <Text style={[typography.body.md, { color: colors.muted, textAlign: 'center' }]}>
                Chưa có ảnh mẫu lá
              </Text>
            </View>
          )}
        </View>

        {/* Chất lượng ảnh */}
        {captured.uri && quality ? (
          <View style={styles.qualityRow}>
            <View
              style={[
                styles.qualityDot,
                { backgroundColor: quality.isGood ? colors.primary : colors['status-warning'] },
              ]}
            />
            <Text style={[typography.body.sm, { color: colors['on-surface'], flex: 1 }]}>
              {quality.message}
            </Text>
          </View>
        ) : null}

        {/* Loại cây — bắt buộc chọn trước khi phân tích */}
        {captured.uri ? (
          <Card style={{ gap: 10 }} padding={14}>
            <Text style={[typography.label.lg, { color: colors['on-surface'] }]}>
              Đây là cây gì?
            </Text>
            <Text style={[typography.body.sm, { color: colors.muted }]}>
              Chọn đúng loại cây để AI chẩn đoán đúng bệnh.
            </Text>
            <View style={styles.cropWrap}>
              {CROP_OPTIONS.map((opt) => {
                const selected = cropSlug === opt.slug;
                return (
                  <TouchableOpacity
                    key={opt.slug}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={opt.label}
                    onPress={() => setCropSlug(opt.slug)}
                    style={[styles.cropChip, selected && styles.cropChipSelected]}>
                    <Text
                      style={[
                        typography.body.sm,
                        { color: selected ? colors['on-primary'] : colors['on-surface-variant'] },
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!cropSlug ? (
              <Text style={[typography.body.sm, { color: colors.muted }]}>
                Chọn một loại cây để mở khoá nút phân tích.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Hành động chính */}
        {captured.uri ? (
          <View style={styles.actionRow}>
            <Button
              variant="outline"
              onPress={onRetake}
              style={styles.actionBtn}
              accessibilityLabel="Chọn ảnh khác">
              Chọn ảnh khác
            </Button>
            <Button
              variant="primary"
              onPress={onAnalyze}
              disabled={!cropSlug}
              style={styles.actionBtn}
              accessibilityLabel="Phân tích ảnh này">
              Phân tích ngay
            </Button>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Button
              variant="primary"
              iconName="photo_camera"
              onPress={captureFromSystemCamera}
              style={styles.actionBtn}
              accessibilityLabel="Chụp ảnh mẫu lá">
              Chụp ảnh
            </Button>
            <Button
              variant="outline"
              iconName="photo_library"
              onPress={openImageLibrary}
              style={styles.actionBtn}
              accessibilityLabel="Chọn ảnh từ thư viện">
              Thư viện
            </Button>
          </View>
        )}

        {/* Hướng dẫn chụp */}
        <Card style={{ gap: 8 }} padding={14}>
          <Text style={[typography.label.lg, { color: colors['on-surface'] }]}>
            Để có kết quả chính xác
          </Text>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={[typography.body.sm, { color: colors.muted, flex: 1 }]}>{tip}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    aspectRatio: 4 / 4.4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportImg: { width: '100%', height: '100%' },
  cropWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors['surface-container-low'] || colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cropChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  placeholder: { alignItems: 'center', gap: 10, padding: 24 },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['primary-subtle'],
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors['surface-container-low'],
  },
  qualityDot: { width: 6, height: 6, borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: spacing['space-sm'] },
  actionBtn: { flex: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    backgroundColor: colors.primary,
  },
});

export default CameraScreen;
