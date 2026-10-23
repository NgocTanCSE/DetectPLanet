/**
 * AlertScreen — Cảnh báo an toàn cây trồng
 *
 * Hiển thị danh sách cảnh báo bệnh mùa / bệnh đang xuất hiện cho các cây trồng
 * mà người dùng đã chọn theo dõi. Người dùng có thể chọn/bỏ chọn cây trồng
 * quan tâm tại phần "Cây trồng của bạn".
 *
 * Dữ liệu lấy từ GET /alerts (cảnh báo theo mùa tháng hiện tại) và
 * GET /user-crop-preferences (cây trồng đang theo dõi).
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import Icon from '../icons';
import { Card, Badge, Button, Pill, SectionHeader, EmptyState, ScreenHeader } from '../components';
import { FadeInView } from '../components/motion';
import { staggerDelay } from '../utils/motion';
import {
  fetchAlerts,
  fetchCropPreferences,
  saveCropPreference,
  fetchUserLocation,
  saveUserLocation,
} from '../services/api';
import { VN_PROVINCES } from '../utils/provinces';

// Nhãn nguồn cảnh báo — người dùng phải phân biệt được đâu là tin chính thức,
// đâu chỉ là dự báo nguy cơ theo thời tiết.
const SOURCE_META = {
  official:  { label: 'Chính thức',        color: '#065F46', bg: '#D1FAE5' },
  manual:    { label: 'Cẩm nang',          color: '#475569', bg: '#E2E8F0' },
  community: { label: 'Cộng đồng',         color: '#B45309', bg: '#FEF3C7' },
  weather:   { label: 'Dự báo thời tiết',  color: '#0369A1', bg: '#E0F2FE' },
};

const severityLabel = {
  healthy: 'Bình thường',
  warning: 'Cần chú ý',
  danger: 'Nguy hiểm',
};

const AlertScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [province, setProvince] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [alertsData, prefsData, location] = await Promise.all([
        fetchAlerts(),
        fetchCropPreferences(),
        fetchUserLocation(),
      ]);

      setAlerts(alertsData.alerts || []);
      setPreferences(prefsData.preferences || []);
      setProvince(location.province || '');
    } catch (err) {
      setError('Không thể tải dữ liệu cảnh báo. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  const chooseProvince = async (value) => {
    setShowPicker(false);
    try {
      const res = await saveUserLocation(value);
      if (res.ok) {
        setProvince(value);
        load();
      } else {
        Alert.alert('Lỗi', res.message || 'Không lưu được khu vực.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không kết nối được máy chủ.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePreference = async (cropId, isActive) => {
    try {
      const data = await saveCropPreference(cropId, !isActive);
      if (data.ok) {
        setPreferences((prev) =>
          prev.map((p) =>
            p.cropId === cropId ? { ...p, isActive: data.is_active } : p
          )
        );
        load(); // refresh alerts
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật lựa chọn.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ.');
    }
  };

  const activePrefs = preferences.filter((p) => p.isActive);
  // The API serialises crop_id as `crop_id`; older builds also expose
  // `cropId`. Accept both so alerts are not silently filtered out.
  const cropAlerts = alerts.filter((a) => {
    const cropId = a.cropId != null ? a.cropId : a.crop_id;
    return activePrefs.some((p) => p.cropId === cropId);
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Cảnh báo an toàn" onBack={() => navigation?.navigate?.('home')} />
        <View style={{ padding: spacing.gutter }}>
          <EmptyState message="Đang tải..." />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Cảnh báo an toàn" onBack={() => navigation?.navigate?.('home')} />
        <View style={{ padding: spacing.gutter }}>
          <EmptyState message={error} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Cảnh báo an toàn"
        subtitle="Rủi ro dịch bệnh theo cây trồng của bạn"
        onBack={() => navigation?.navigate?.('home')}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-md'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-xl'],
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>

        {/* Khu vực — lọc cảnh báo theo tỉnh/thành */}
        <SectionHeader title="Khu vực của bạn" subtitle="Nhận cảnh báo dịch bệnh tại tỉnh/thành" />
        <Card style={styles.prefCard} padding={14}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Chọn khu vực nhận cảnh báo"
            onPress={() => setShowPicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}
                numberOfLines={1}>
                {province || 'Chưa chọn khu vực'}
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={2}>
                {province
                  ? `Đang nhận cảnh báo chung và cảnh báo riêng cho ${province}.`
                  : 'Chọn tỉnh/thành để lọc cảnh báo theo khu vực của bạn.'}
              </Text>
            </View>
            <Text style={[typography.body.md, { color: colors.primary, fontWeight: '600' }]}>Đổi</Text>
          </TouchableOpacity>
        </Card>

        {/* Cây trồng của bạn — chọn theo dõi */}
        <SectionHeader title="Cây trồng của bạn" subtitle="Chọn cây bạn đang trồng để nhận cảnh báo" />
        <Card style={styles.prefCard} padding={14}>
          <View style={{ gap: 8 }}>
            {preferences.length === 0 ? (
              <EmptyState message="Chưa có cây trồng nào." subMessage="Hãy chọn ít nhất một cây trồng để bắt đầu nhận cảnh báo." />
            ) : (
              preferences.map((p) => (
                <TouchableOpacity
                  key={p.cropId}
                  activeOpacity={0.8}
                  onPress={() => togglePreference(p.cropId, p.isActive)}
                  style={[
                    styles.prefRow,
                    p.isActive && styles.prefRowActive,
                  ]}>
                  <View style={[styles.prefIcon, { backgroundColor: p.isActive ? colors['primary-subtle'] : colors['surface-container-low'] }]}>
                    <Icon
                      name={p.icon || 'eco'}
                      size={16}
                      color={p.isActive ? colors.primary : colors.muted}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]} numberOfLines={1}>
                      {p.label || p.name}
                    </Text>
                    <Text style={[typography.body.sm, { color: colors.muted }]}>
                      {p.isActive ? 'Đang theo dõi' : 'Chưa theo dõi'}
                    </Text>
                  </View>
                  <Badge
                    color={p.isActive ? colors.primary : colors.muted}
                    bgColor={p.isActive ? colors['primary-fixed'] : colors['surface-container-high']}
                  >
                    {p.isActive ? 'Đang theo dõi' : 'Theo dõi'}
                  </Badge>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Card>

        {/* Báo dịch cộng đồng */}
        <Card style={styles.prefCard} padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.body.md, { color: colors['on-surface'], fontWeight: '600' }]}>
                Thấy bệnh lạ trên đồng?
              </Text>
              <Text style={[typography.body.sm, { color: colors.muted }]}>
                Báo để bà con cùng khu vực biết sớm. Thông tin được ẩn danh.
              </Text>
            </View>
          </View>
          <Button
            variant="outline"
            iconName="send"
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
            onPress={() => navigation?.navigate?.('report', { province })}>
            Báo dịch
          </Button>
        </Card>

        {/* Cảnh báo đang hoạt động */}
        <SectionHeader title="Cảnh báo hiện tại" subtitle="Theo khu vực, mùa vụ và cây trồng bạn chọn" />
        {cropAlerts.length === 0 ? (
          <EmptyState
            message="Không có cảnh báo nào cho cây trồng bạn."
            subMessage="Hãy chọn cây trồng ở phần trên hoặc quay lại sau."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {cropAlerts.map((a, index) => (
              <FadeInView key={a.id} delay={staggerDelay(index)} translateY={10}>
                <Card style={styles.alertCard} padding={14}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Badge severity={a.severity}>{severityLabel[a.severity]}</Badge>
                        {(() => {
                          const meta = SOURCE_META[a.source] || SOURCE_META.manual;
                          return <Badge color={meta.color} bgColor={meta.bg}>{meta.label}</Badge>;
                        })()}
                        {a.riskScore > 0 ? (
                          <Badge color="#0369A1" bgColor="#E0F2FE">{`Rủi ro ${a.riskScore}/100`}</Badge>
                        ) : null}
                      </View>
                      <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500', marginBottom: 4 }]}>
                        {a.seasonMonths ? `Tháng ${a.seasonMonths.split(',').join(', ')}` : 'Cả năm'}
                        {' · '}{a.province || 'Toàn quốc'}
                        {a.validTo ? ` · đến ${String(a.validTo).split('T')[0].split('-').reverse().join('/')}` : ''}
                      </Text>
                      <Text style={[typography.headline.md, { color: colors['on-surface'], fontWeight: '700', marginBottom: 4 }]}>
                        {a.diseaseLabel} — {a.cropLabel}
                      </Text>
                      <Text style={[typography.body.md, { color: colors['on-surface-variant'], lineHeight: 20 }]}>
                        {a.description}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Text style={[typography.label.md, { color: colors.muted, marginBottom: 2 }]}>
                      KHUYẾN XỬ LÝ
                    </Text>
                    <Text style={[typography.body.md, { color: colors['on-surface'], lineHeight: 22 }]}>
                      {a.recommendation}
                    </Text>
                  </View>

                  {a.source === 'weather' ? (
                    <Text style={[typography.body.sm, { color: colors.muted, marginTop: 8 }]}>
                      Dự báo thời tiết: Open-Meteo · Đây là nguy cơ, chưa phải xác nhận có dịch.
                    </Text>
                  ) : null}

                  {a.source === 'official' && a.sourceUrl ? (
                    <TouchableOpacity
                      accessibilityRole="link"
                      onPress={() => Linking.openURL(a.sourceUrl).catch(() => {})}
                      style={{ marginTop: 8 }}>
                      <Text style={[typography.body.sm, { color: colors.primary, fontWeight: '600' }]}>
                        Xem nguồn: Cục Trồng trọt &amp; BVTV
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </Card>
              </FadeInView>
            ))}
            <Text style={[typography.body.sm, { color: colors.muted, paddingHorizontal: 2 }]}>
              Cảnh báo chỉ mang tính tham khảo. Đối chiếu với khuyến nông địa phương trước khi xử lý.
            </Text>
          </View>
        )}

      </ScrollView>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[typography.headline.sm, { color: colors['on-surface'], fontWeight: '700', marginBottom: 10 }]}>
              Chọn khu vực
            </Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => chooseProvince('')}
                style={[styles.provRow, province === '' && styles.provRowActive]}>
                <Text style={[typography.body.md, { color: colors['on-surface'] }]}>Toàn quốc</Text>
                {province === '' ? <Icon name="check_circle" size={16} color={colors.primary} /> : null}
              </TouchableOpacity>
              {VN_PROVINCES.map((name) => (
                <TouchableOpacity
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => chooseProvince(name)}
                  style={[styles.provRow, province === name && styles.provRowActive]}>
                  <Text style={[typography.body.md, { color: colors['on-surface'] }]}>{name}</Text>
                  {province === name ? <Icon name="check_circle" size={16} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button variant="outline" onPress={() => setShowPicker(false)} style={{ marginTop: 10 }}>
              Đóng
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  provRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  provRowActive: {
    backgroundColor: colors['primary-fixed'],
  },
  prefCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors['surface-container-low'],
  },
  prefRowActive: {
    backgroundColor: colors['primary-fixed'],
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alertCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
});

export default AlertScreen;
