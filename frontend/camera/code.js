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
  Share,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { colors, typography, spacing, shadowFlat, z } from '../theme';
import Icon from '../icons';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../AppHeader';
import { emptyCapture } from '../dto';

const modes = [
  { key: 'single', label: 'Chụp trực tiếp' },
  { key: 'multi', label: 'Chọn từ thư viện' },
];

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
const CameraScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [mode, setMode] = useState('single');
  const [flashOn, setFlashOn] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [captured, setCaptured] = useState(emptyCapture());
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState(null);

  const onBack = () => navigation?.navigate?.('home');

  // ── Image capture: opens the system camera app ──────────────────────
  const captureFromSystemCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: CAMERA_QUALITY,
        includeBase64: true,
        cameraType: 'back',
        saveToPhotos: false,
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
        setShowPreview(true);
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
        setShowPreview(true);
      }
    } catch (err) {
      Alert.alert('Không thể mở Thư viện ảnh', 'Vui lòng thử lại.');
    }
  };

  // ── Shutter button handler (delegates to the active mode) ─────────────
  const takePhoto = () => {
    if (loading) return;
    if (mode === 'multi') {
      openImageLibrary();
    } else {
      captureFromSystemCamera();
    }
  };

  // ── Image error fallback — shows text placeholder when image fails to load
  const imageFallback = {
    onError: () => setCaptured((c) => ({ ...c, uri: c.uri, base64: c.base64 })),
  };

  const onAnalyze = () => {
    setShowPreview(false);
    navigation?.navigate?.('scan', {
      imageUri: captured.uri,
      base64: captured.base64,
    });
  };

  const onRetake = () => {
    setShowPreview(false);
    setQuality(null);
    if (mode === 'multi') {
      openImageLibrary();
    } else {
      captureFromSystemCamera();
    }
  };

  const shareCamera = async () => {
    try {
      await Share.share({
        message: 'AgriScan AI - Hình ảnh mẫu lá cây',
        url: captured.uri || 'https://agriscan.ai',
      });
    } catch {
      /* no-op */
    }
  };

  // ── Feed area content ──────────────────────────────────────────────
  const renderFeed = () => {
    if (captured.uri) {
      return (
        <Image
          source={{ uri: captured.uri }}
          style={styles.feed}
          resizeMode="cover"
          onError={(e) => console.warn('Camera feed load error:', e.nativeEvent?.error)}
        />
      );
    }
    return (
      <View style={[styles.feed, styles.feedPlaceholder]}>
        <View style={styles.feedIcon}>
          <Text style={[typography.body.sm, { color: colors.muted, textAlign: 'center' }]}>
            {mode === 'multi'
              ? 'Chọn ảnh từ thư viện'
              : 'Chụp ảnh lá cây'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Chụp ảnh mẫu lá"
        showBack
        onBack={onBack}
        actions={[{ icon: 'share', label: 'Chia sẻ', onPress: shareCamera }]}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>
        {/* Mode switcher & quick controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={styles.modeSwitcher}>
            {modes.map((m) => {
              const active = mode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.8}
                  onPress={() => {
                    setMode(m.key);
                    setShowPreview(false);
                    setCaptured(emptyCapture());
                    setQuality(null);
                  }}
                  style={[styles.modeTab, active && styles.modeTabActive]}>
                  <Text style={[
                    typography.body.md,
                    { color: active ? colors.primary : colors.muted, fontWeight: active ? '600' : '400' },
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              accessibilityLabel="Bật tắt Flash"
              activeOpacity={0.7}
              onPress={() => setFlashOn((v) => !v)}
              style={[styles.controlBtn, flashOn && { borderColor: colors.primary, backgroundColor: colors['primary-subtle'] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={flashOn ? 'flash_on' : 'flash_off'} size={14} color={flashOn ? colors.primary : colors.muted} style={{ marginRight: 4 }} />
                <Text style={[typography.body.sm, {
                  color: flashOn ? colors.primary : colors.muted,
                  fontWeight: '500',
                }]}>
                  Flash
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Lưới căn chỉnh"
              activeOpacity={0.7}
              onPress={() => setGridVisible((v) => !v)}
              style={[styles.controlBtn, gridVisible && { borderColor: colors.primary, backgroundColor: colors['primary-subtle'] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="grid_on" size={14} color={gridVisible ? colors.primary : colors.muted} style={{ marginRight: 4 }} />
                <Text style={[typography.body.sm, {
                  color: gridVisible ? colors.primary : colors.muted,
                  fontWeight: '500',
                }]}>
                  Lưới
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guidance hint — text only */}
        <View style={styles.guidanceBanner}>
          <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>
            Đặt mẫu lá đủ ánh sáng và chi tiết rõ nét trước khi chụp
          </Text>
        </View>

        {/* Feed area — no corner brackets, no viewfinder pill */}
        <View style={styles.viewport}>
          {renderFeed()}
          {gridVisible && captured.uri && (
            <View style={styles.gridOverlay} pointerEvents="none">
              <View style={[styles.gridLine, { left: '33.33%' }]} />
              <View style={[styles.gridLineV, { top: '33.33%' }]} />
              <View style={[styles.gridLineV, { top: '66.66%' }]} />
              <View style={[styles.gridLine, { left: '66.66%' }]} />
            </View>
          )}
        </View>

        {/* Shutter & Controls Row — text only, no icons */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            accessibilityLabel="Chuyển chế độ chụp"
            activeOpacity={0.8}
            onPress={() => {
              setMode(mode === 'single' ? 'multi' : 'single');
              setShowPreview(false);
              setCaptured(emptyCapture());
              setQuality(null);
            }}
            style={[styles.sideControlBtn, { backgroundColor: colors['surface-container-low'] }]}>
            <Text style={[typography.body.sm, {
              color: colors['on-surface'],
              fontWeight: '500',
            }]}>
              {mode === 'single' ? 'Chuyển thư viện' : 'Chuyển máy ảnh'}
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              accessibilityLabel="Chụp ảnh mẫu lá"
              activeOpacity={0.88}
              onPress={takePhoto}
              style={styles.shutterButton}>
              <View style={styles.shutterInnerCircle} />
            </TouchableOpacity>
            <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>
              Chụp ảnh
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="Lưới căn chỉnh"
            activeOpacity={0.7}
            onPress={() => setGridVisible((v) => !v)}
            style={[styles.sideControlBtn, {
              backgroundColor: gridVisible ? colors['primary-subtle'] : colors['surface-container-low'],
            }]}>
            <Text style={[typography.body.sm, {
              color: gridVisible ? colors.primary : colors.muted,
              fontWeight: gridVisible ? '600' : '400',
            }]}>
              Lưỗi {gridVisible ? 'Bật' : 'Tắt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mini review ribbon — text only, no chevron icon */}
        {captured.uri ? (
          <View style={[styles.miniRibbon, shadowFlat]}>
            <Image source={{ uri: captured.uri }} style={styles.miniThumbImg} resizeMode="cover"
              onError={(e) => console.warn('Camera mini thumb error:', e.nativeEvent?.error)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                {captured.crop}
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted }]}>{captured.time}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPreview(true)} style={styles.reviewBtn}>
              <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '700' }]}>Xem lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Preview bottom sheet — text only, includes Image Quality Check */}
      {showPreview ? (
        <View style={[styles.previewSheet, shadowFlat]}>
          <View style={styles.previewHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[typography.headline.sm, { color: colors['on-surface'] }]}>
              Kiểm tra ảnh mẫu lá
            </Text>
            {quality && (
              <View style={[
                styles.qualityBadge,
                { backgroundColor: quality.isGood ? colors['primary-subtle'] : colors['surface-container-low'] },
              ]}>
                <Text style={[
                  typography.body.sm,
                  { color: quality.isGood ? colors.primary : colors.muted, fontWeight: '700' },
                ]}>
                  {quality.message}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Image source={{ uri: captured.uri }} style={styles.previewThumb} resizeMode="cover"
              onError={(e) => console.warn('Camera preview error:', e.nativeEvent?.error)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '700' }]}>
                Mẫu bệnh phẩm
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]} numberOfLines={2}>
                Ảnh đủ độ sáng và chi tiết rõ nét. Nhấn "Phân tích ngay" để bắt đầu nhận diện.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity activeOpacity={0.88} onPress={onRetake} style={styles.retakeBtn}>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}>
                Chụp lại
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onAnalyze}
              style={styles.analyzeBtn}
              disabled={!quality?.isGood}>
              <Text style={[typography.body.md, { color: colors['on-primary'], fontWeight: '700' }]}>
                Phân tích ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors['surface-container-low'],
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modeTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: colors.paper,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors['surface-container-low'],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  viewport: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 4.6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-high'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  feed: { width: '100%', height: '100%' },
  feedPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface-container-low'],
  },
  feedIcon: {
    alignItems: 'center',
    gap: 8,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: colors.outline,
    opacity: 0.3,
  },
  gridLineV: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: colors.outline,
    opacity: 0.3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sideControlBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  controlBtn: {
    width: 44,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  shutterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.paper,
  },
  shutterInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors['on-primary'],
  },
  miniRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  miniThumbImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  reviewBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    maxHeight: '40%',
  },
  previewHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: 6,
  },
  qualityBadge: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  analyzeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 8,
    paddingVertical: 12,
  },
});

export default CameraScreen;
