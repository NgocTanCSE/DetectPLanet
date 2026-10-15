/**
 * CameraScreen — AgriScan AI Camera Viewfinder
 *
 * Clean, unobstructed viewfinder optimized for botanical field capture.
 * Eliminates artificial laser sweeps and hologram overlays.
 * Forest green accent, the original nature-inspired palette.
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, shadowCard, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { emptyCapture } from '../dto';

const modes = [
  { key: 'single', label: 'Chụp trực tiếp' },
  { key: 'multi', label: 'Chọn từ thư viện' },
];

const CameraScreen = ({ navigation }) => {
  const [mode, setMode] = useState('single');
  const [flashOn, setFlashOn] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [facing, setFacing] = useState('back');
  const [captured, setCaptured] = useState(emptyCapture());

  const onBack = () => navigation?.navigate?.('home');

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted' && status !== undefined) {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền sử dụng Camera để chụp ảnh lá cây.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCaptured({
          uri: asset.uri,
          base64: asset.base64,
          crop: 'Mẫu lá chụp trực tiếp',
          time: 'Vừa chụp xong',
        });
        setShowPreview(true);
      }
    } catch (err) {
      console.warn('Không thể mở Camera:', err);
    }
  };

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' && status !== undefined) {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập Thư viện ảnh để chọn ảnh lá cây.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCaptured({
          uri: asset.uri,
          base64: asset.base64,
          crop: 'Ảnh chọn từ thư viện',
          time: 'Vừa chọn xong',
        });
        setShowPreview(true);
      }
    } catch (err) {
      console.warn('Không thể mở Thư viện:', err);
    }
  };

  const onShutter = () => {
    if (mode === 'multi') {
      openImageLibrary();
    } else {
      takePhoto();
    }
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
    takePhoto();
  };

  const shareCamera = async () => {
    try {
      await Share.share({ message: 'AgriScan AI - Hình ảnh mẫu lá cây', url: captured.uri || 'https://agriscan.ai' });
    } catch {
      /* no-op */
    }
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
          paddingTop: 64,
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
                  onPress={() => setMode(m.key)}
                  style={[styles.modeTab, active && styles.modeTabActive]}>
                  <Text style={[typography['label-md'], { color: active ? colors.primary : colors.muted, fontWeight: active ? '700' : '500' }]}>
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
              style={[styles.controlBtn, flashOn && { borderColor: colors.primary }]}>
              <Icon name={flashOn ? 'flash_on' : 'flash_off'} size={18} color={flashOn ? colors.primary : colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Lưới căn chỉnh"
              activeOpacity={0.7}
              onPress={() => setGridVisible((v) => !v)}
              style={[styles.controlBtn, gridVisible && { borderColor: colors.primary }]}>
              <Icon name="grid_on" size={18} color={gridVisible ? colors.primary : colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guidance hint */}
        <View style={styles.guidanceBanner}>
          <Icon name="center_focus_strong" size={15} color={colors.primary} />
          <Text style={[typography['label-sm'], { color: colors.muted, fontWeight: '500' }]}>
            Căn chỉnh đốm bệnh hoặc mặt lá vào trung tâm khung ngắm
          </Text>
        </View>

        {/* Precision Viewfinder */}
        <View style={styles.viewport}>
          {captured.uri ? (
            <Image source={{ uri: captured.uri }} style={[styles.feed, facing === 'front' ? { transform: [{ scaleX: -1 }] } : null]} resizeMode="cover" />
          ) : (
            <View style={[styles.feed, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors['surface-container-low'] }]}>
              <Icon name="photo_camera" size={36} color={colors.muted} />
              <Text style={[typography['label-sm'], { color: colors.muted, marginTop: 8 }]}>Sẵn sàng chụp mẫu lá</Text>
            </View>
          )}

          {/* Rule-of-thirds grid */}
          {gridVisible ? (
            <View style={styles.grid} pointerEvents="none">
              <View style={[styles.gridLine, styles.gridV, { left: '33.3%' }]} />
              <View style={[styles.gridLine, styles.gridV, { right: '33.3%' }]} />
              <View style={[styles.gridLine, styles.gridH, { top: '33.3%' }]} />
              <View style={[styles.gridLine, styles.gridH, { bottom: '33.3%' }]} />
            </View>
          ) : null}

          {/* Clean framing corners */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Viewfinder bottom label */}
          <View style={styles.viewportBottomPill}>
            <Text style={[typography['label-sm'], { color: colors['on-surface'], fontWeight: '600' }]}>
              {captured.uri ? 'Đã chụp xong — Sẵn sàng gửi phân tích' : 'Giữ cố định máy ảnh để hình ảnh rõ nét'}
            </Text>
          </View>
        </View>

        {/* Shutter & Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity accessibilityLabel="Thư viện ảnh" activeOpacity={0.8} onPress={openImageLibrary} style={styles.sideControlBtn}>
            <Icon name="photo_library" size={22} color={colors['on-surface']} />
            <Text style={[typography['label-sm'], { color: colors.muted, marginTop: 4 }]}>Thư viện</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Chụp ảnh"
            activeOpacity={0.88}
            onPress={onShutter}
            style={styles.shutterButton}>
            <View style={styles.shutterInnerCircle}>
              <Icon name="photo_camera" size={26} color={colors['on-primary']} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity accessibilityLabel="Lật camera" activeOpacity={0.8} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} style={styles.sideControlBtn}>
            <Icon name="flip_camera_ios" size={22} color={colors['on-surface']} />
            <Text style={[typography['label-sm'], { color: colors.muted, marginTop: 4 }]}>Đổi chiều</Text>
          </TouchableOpacity>
        </View>

        {/* Review strip if photo captured */}
        {captured.uri ? (
          <View style={[styles.miniRibbon, shadowPaper]}>
            <Image source={{ uri: captured.uri }} style={styles.miniThumbImg} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '700' }]} numberOfLines={1}>
                {captured.crop}
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted }]}>{captured.time}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPreview(true)} style={styles.reviewBtn}>
              <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '700' }]}>Xem lại</Text>
              <Icon name="chevron_right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Review bottom sheet */}
      {showPreview ? (
        <View style={[styles.previewSheet, shadowCard]}>
          <View style={styles.previewHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[typography['headline-sm'], { color: colors['on-surface'] }]}>Kiểm tra ảnh mẫu lá</Text>
            <View style={styles.clarityBadge}>
              <Text style={[typography['label-sm'], { color: colors.primary, fontWeight: '700' }]}>Chất lượng tốt</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Image source={{ uri: captured.uri }} style={styles.previewThumb} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography['label-md'], { color: colors['on-surface'], fontWeight: '700' }]}>Mẫu bệnh phẩm</Text>
              <Text style={[typography.body.sm, { color: colors.muted, marginTop: 2 }]} numberOfLines={2}>
                Ảnh đủ độ sáng và chi tiết gân lá. Nhấn "Phân tích ngay" để bắt đầu nhận diện.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity activeOpacity={0.88} onPress={onRetake} style={styles.retakeBtn}>
              <Icon name="refresh" size={18} color={colors['on-surface']} />
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}>Chụp lại</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.88} onPress={onAnalyze} style={styles.analyzeBtn}>
              <Icon name="arrow_forward" size={18} color={colors['on-primary']} />
              <Text style={[typography.body.md, { color: colors['on-primary'], fontWeight: '700' }]}>Phân tích ngay</Text>
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
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  modeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeTabActive: {
    backgroundColor: colors.paper,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors['surface-container-low'],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  viewport: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 4.6,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors['surface-container-high'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  feed: { width: '100%', height: '100%' },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 20, 20, 0.1)',
  },
  gridV: { top: 0, bottom: 0, width: 1 },
  gridH: { left: 0, right: 0, height: 1 },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors['on-surface'],
    opacity: 0.9,
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 4 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 4 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 4 },
  viewportBottomPill: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: colors['surface'],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 8,
  },
  sideControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors['outline'],
    shadowColor: '#141414',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  shutterInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  miniThumbImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors['primary-fixed'],
  },
  previewSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors['outline'],
  },
  previewHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors['outline'],
    alignSelf: 'center',
    marginBottom: 14,
  },
  clarityBadge: {
    backgroundColor: colors['primary-fixed'],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors['surface-container-low'],
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  analyzeBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
});

export default CameraScreen;
