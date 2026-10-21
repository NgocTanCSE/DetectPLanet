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
  Platform,
} from 'react-native';
import { colors, typography, spacing } from '../../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../../components/layout/AppHeader';
import { Card, Badge, Button, Pill, SectionHeader, EmptyState } from '../../components';

// Base URL — mirrors frontend/services/api.js (react-native-config + dev fallback)
const _DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const _DEV_URL = `http://${_DEV_HOST}:887`;
let BASE_URL = _DEV_URL;
try {
  const Config = require('react-native-config');
  if (Config && Config.API_URL) {
    BASE_URL = Config.API_URL;
  }
} catch {
  /* react-native-config not installed yet — using dev default */
}

const apiFetch = (path, opts = {}) =>
  fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  }).then((r) => r.json());

const severityColor = {
  healthy: colors['status-healthy'],
  warning: colors['status-warning'],
  danger: colors['status-danger'],
};

const severityLabel = {
  healthy: 'Bình thường',
  warning: 'Cần chú ý',
  danger: 'Nguy hiểm',
};

const AlertScreen = ({ navigation }) => {
  const topInset = useTopInset();
  const [alerts, setAlerts] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [alertsData, prefsData] = await Promise.all([
        apiFetch('/alerts'),
        apiFetch('/user-crop-preferences'),
      ]);

      setAlerts(alertsData.alerts || []);
      setPreferences(prefsData.preferences || []);
    } catch (err) {
      setError('Không thể tải dữ liệu cảnh báo. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePreference = async (cropId, isActive) => {
    try {
      const data = await apiFetch('/user-crop-preferences', {
        method: 'POST',
        body: JSON.stringify({ crop_id: cropId, is_active: isActive ? 0 : 1 }),
      });
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
  const cropAlerts = alerts.filter((a) =>
    activePrefs.some((p) => p.cropId === a.cropId)
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title="Cảnh báo an toàn" showBack onBack={() => navigation?.navigate?.('home')} />
        <EmptyState message="Đang tải..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title="Cảnh báo an toàn" showBack onBack={() => navigation?.navigate?.('home')} />
        <EmptyState message={error} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Cảnh báo an toàn"
        subtitle="Bệnh mùa & bệnh đang xuất hiện"
        showBack
        onBack={() => navigation?.navigate?.('home')}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + HEADER_HEIGHT,
          paddingBottom: 96,
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>

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
                    <Text style={[typography.body.sm, { color: p.isActive ? colors.primary : colors.muted, fontWeight: '700' }]}>
                      {p.icon || 'eco'}
                    </Text>
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
                    severity={p.isActive ? 'healthy' : 'healthy'}
                    color={p.isActive ? colors.primary : colors.muted}
                    bgColor={p.isActive ? colors['primary-fixed'] : colors['surface-container-low']}
                  >
                    {p.isActive ? 'Bật' : 'Tắt'}
                  </Badge>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Card>

        {/* Cảnh báo đang hoạt động */}
        <SectionHeader title="Cảnh báo hiện tại" subtitle="Theo mùa tháng và cây trồng bạn chọn" />
        {cropAlerts.length === 0 ? (
          <EmptyState
            message="Không có cảnh báo nào cho cây trồng bạn."
            subMessage="Hãy chọn cây trồng ở phần trên hoặc quay lại sau."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {cropAlerts.map((a) => (
              <Card key={a.id} style={styles.alertCard} padding={14}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Badge severity={a.severity}>{severityLabel[a.severity]}</Badge>
                      <Text style={[typography.body.sm, { color: colors.muted, fontWeight: '500' }]}>
                        {a.seasonMonths ? `Tháng ${a.seasonMonths.split(',').join(', ')}` : 'Cả năm'}
                      </Text>
                    </View>
                    <Text style={[typography.headline.md, { color: colors['on-surface'], fontWeight: '700', marginBottom: 4 }]}>
                      {a.diseaseLabel} — {a.cropLabel}
                    </Text>
                    <Text style={[typography.body.md, { color: colors['on-surface-variant'], lineHeight: 20 }]}>
                      {a.description}
                    </Text>
                  </View>
                  <View style={styles.severityChip}>
                    <Text style={[typography.body.md, { color: severityColor[a.severity], fontWeight: '700' }]}>
                      {severityLabel[a.severity]}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  <SectionHeader title="Khuyên xử lý" subtitle="" style={{ marginBottom: 0, marginTop: 0 }} />
                  <Text style={[typography.body.md, { color: colors['on-surface'], lineHeight: 22 }]}>
                    {a.recommendation}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Hướng dẫn chọn cây */}
        {preferences.length === 0 && (
          <Card style={styles.helpCard} padding={16}>
            <Text style={[typography.body.md, { color: colors['on-surface-variant'], lineHeight: 22, textAlign: 'center' }]}>
              Chọn ít nhất một loại cây trồng ở phần trên để hệ thống gửi cảnh báo
              khi bệnh mùa hoặc bệnh đang xuất hiện đối với loại cây đó.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  prefCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  prefRowActive: {
    backgroundColor: colors['primary-fixed'],
    borderColor: colors.primary,
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
  helpCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
  },
});

export default AlertScreen;
