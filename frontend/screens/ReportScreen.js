/**
 * ReportScreen — Báo dịch cộng đồng (GĐ4)
 *
 * Người dùng báo bệnh/dịch hại thấy trên đồng ruộng. Báo cáo được ẩn danh
 * (không hiện tên người gửi), tối đa 3 báo cáo/ngày. Khi ≥3 người cùng tỉnh
 * báo cùng bệnh trong 7 ngày, job nền tạo cảnh báo `source='community'`.
 *
 * Vào từ màn Cảnh báo (nút "Báo dịch") hoặc Trang chủ; có thể prefill
 * cây trồng / tên bệnh / tỉnh qua navigation.params.
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
} from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import Icon from '../icons';
import { Card, Badge, Button, Input, SectionHeader, EmptyState, ScreenHeader } from '../components';
import {
  createReport,
  fetchReports,
  confirmReport,
  fetchUserLocation,
  saveUserLocation,
} from '../services/api';
import { CROP_OPTIONS } from '../utils/crops';
import { VN_PROVINCES } from '../utils/provinces';

const STATUS_META = {
  pending:  { label: 'Chờ kiểm chứng', color: '#B45309', bg: '#FEF3C7' },
  verified: { label: 'Đã kiểm chứng',  color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Đã từ chối',     color: '#475569', bg: '#E2E8F0' },
};

function formatDate(value) {
  if (!value) return '';
  return String(value).split('T')[0].split('-').reverse().join('/');
}

const ReportScreen = ({ navigation }) => {
  const params = navigation?.params || {};

  // Kết quả quét có thể lưu tên khoa học hoặc slug cũ → chỉ nhận slug hợp lệ.
  const initialCrop = CROP_OPTIONS.some((c) => c.slug === String(params.crop || '').toLowerCase())
    ? String(params.crop).toLowerCase()
    : (params.crop ? 'other' : 'rice');
  const [crop, setCrop] = useState(initialCrop);
  const [diseaseLabel, setDiseaseLabel] = useState(params.diseaseLabel || '');
  const [province, setProvince] = useState(params.province || '');
  const [ward, setWard] = useState('');
  const [note, setNote] = useState('');

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  const loadReports = async (prov) => {
    setLoadingReports(true);
    try {
      const data = await fetchReports(prov || '', 30);
      setReports(data.reports || []);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    (async () => {
      let prov = params.province || '';
      if (!prov) {
        const loc = await fetchUserLocation();
        prov = loc.province || '';
      }
      setProvince(prov);
      loadReports(prov);
    })();
  }, []);

  const chooseProvince = async (value) => {
    setShowPicker(false);
    setProvince(value);
    try {
      if (value) await saveUserLocation(value);
    } catch {
      /* không chặn báo cáo nếu lưu vị trí lỗi */
    }
    loadReports(value);
  };

  const submit = async () => {
    if (diseaseLabel.trim().length < 3) {
      Alert.alert('Thiếu thông tin', 'Nhập tên bệnh hoặc mô tả ngắn (ít nhất 3 ký tự).');
      return;
    }
    if (!province) {
      Alert.alert('Thiếu khu vực', 'Chọn tỉnh/thành nơi bạn thấy bệnh.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await createReport({
        crop,
        diseaseLabel: diseaseLabel.trim(),
        province,
        ward: ward.trim(),
        note: note.trim(),
      });

      if (res && res.ok) {
        Alert.alert(
          'Đã gửi báo cáo',
          'Cảm ơn bạn. Báo cáo sẽ được đối chiếu với những người cùng khu vực trước khi thành cảnh báo.'
        );
        setDiseaseLabel('');
        setWard('');
        setNote('');
        loadReports(province);
      } else {
        const message = (res && res.message) || 'Không gửi được báo cáo. Thử lại sau.';
        setError(message);
        Alert.alert('Không gửi được', message);
      }
    } catch {
      setError('Không kết nối được máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async (id) => {
    try {
      const res = await confirmReport(id);
      if (res && res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, votes: res.votes, status: res.status, canConfirm: false } : r
          )
        );
      } else {
        Alert.alert('Không xác nhận được', (res && res.message) || 'Thử lại sau.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không kết nối được máy chủ.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Báo dịch cộng đồng"
        subtitle="Giúp bà con cùng khu vực phát hiện bệnh sớm"
        onBack={() => navigation?.navigate?.('alerts')}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing['space-md'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-xl'],
          paddingHorizontal: spacing.gutter,
          gap: 12,
        }}>

        <SectionHeader title="Báo cáo của bạn" subtitle="Thông tin được ẩn danh, tối đa 3 báo cáo/ngày" />

        <Card padding={14} style={styles.card}>
          <Text style={[typography.label.md, { color: colors.muted, marginBottom: 6 }]}>CÂY TRỒNG</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {CROP_OPTIONS.filter((c) => c.slug !== 'other').map((c) => {
              const active = crop === c.slug;
              return (
                <TouchableOpacity
                  key={c.slug}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn ${c.label}`}
                  onPress={() => setCrop(c.slug)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[typography.body.sm, { color: active ? colors.primary : colors['on-surface'], fontWeight: active ? '700' : '500' }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[typography.label.md, { color: colors.muted, marginBottom: 6 }]}>BỆNH / DỊCH HẠI</Text>
          <Input
            value={diseaseLabel}
            onChangeText={setDiseaseLabel}
            placeholder="Ví dụ: đạo ôn, mốc sương, rầy nâu…"
            containerStyle={{ marginBottom: 14 }}
          />

          <Text style={[typography.label.md, { color: colors.muted, marginBottom: 6 }]}>KHU VỰC</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Chọn tỉnh thành"
            onPress={() => setShowPicker(true)}
            style={[styles.selectRow, { marginBottom: 14 }]}>
            <Text style={[typography.body.md, { color: province ? colors['on-surface'] : colors.muted, flex: 1 }]}>
              {province || 'Chọn tỉnh/thành'}
            </Text>
            <Icon name="chevron_right" size={16} color={colors.muted} />
          </TouchableOpacity>

          <Text style={[typography.label.md, { color: colors.muted, marginBottom: 6 }]}>XÃ / PHƯỜNG (không bắt buộc)</Text>
          <Input
            value={ward}
            onChangeText={setWard}
            placeholder="Ví dụ: Diễn Châu"
            containerStyle={{ marginBottom: 14 }}
          />

          <Text style={[typography.label.md, { color: colors.muted, marginBottom: 6 }]}>GHI CHÚ (không bắt buộc)</Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Mô tả triệu chứng, mức độ lây lan…"
            numberOfLines={3}
            minHeight={80}
            containerStyle={{ marginBottom: 14 }}
          />

          {error ? (
            <Text style={[typography.body.sm, { color: colors['status-danger'], marginBottom: 10 }]}>{error}</Text>
          ) : null}

          <Button onPress={submit} loading={submitting} disabled={submitting} iconName="send">
            Gửi báo cáo
          </Button>
        </Card>

        <SectionHeader
          title="Báo cáo gần đây"
          subtitle={province ? `Tại ${province} trong 30 ngày` : 'Chọn khu vực để xem báo cáo'}
        />

        {loadingReports ? (
          <EmptyState message="Đang tải..." />
        ) : reports.length === 0 ? (
          <EmptyState
            message="Chưa có báo cáo nào."
            subMessage="Báo cáo đầu tiên giúp cộng đồng phát hiện bệnh sớm hơn."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {reports.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              return (
                <Card key={r.id} padding={14} style={styles.card}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    <Badge color={meta.color} bgColor={meta.bg}>{meta.label}</Badge>
                    {r.mine ? <Badge color="#0369A1" bgColor="#E0F2FE">Của bạn</Badge> : null}
                    <Badge color="#475569" bgColor="#E2E8F0">{r.cropLabel}</Badge>
                  </View>
                  <Text style={[typography.headline.md, { color: colors['on-surface'], fontWeight: '700', marginBottom: 2 }]}>
                    {r.diseaseLabel}
                  </Text>
                  <Text style={[typography.body.sm, { color: colors.muted, marginBottom: 6 }]}>
                    {r.province}{r.ward ? ` · ${r.ward}` : ''} · {formatDate(r.createdAt)}
                  </Text>
                  {r.note ? (
                    <Text style={[typography.body.md, { color: colors['on-surface-variant'], lineHeight: 20 }]}>
                      {r.note}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <Text style={[typography.body.sm, { color: colors.muted }]}>
                      {r.votes > 0 ? `${r.votes} người đã xác nhận` : 'Chưa có ai xác nhận'}
                    </Text>
                    {r.canConfirm ? (
                      <Button
                        variant="outline"
                        onPress={() => confirm(r.id)}
                        iconName="check_circle"
                        style={{ paddingHorizontal: 12 }}>
                        Tôi cũng thấy
                      </Button>
                    ) : null}
                  </View>
                </Card>
              );
            })}
            <Text style={[typography.body.sm, { color: colors.muted, paddingHorizontal: 2 }]}>
              Báo cáo cộng đồng chỉ là tín hiệu tham khảo, không thay thế kết luận của cơ quan chuyên môn.
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
              Chọn tỉnh/thành
            </Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator>
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
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors['surface-container-low'],
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors['primary-fixed'],
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors['surface-container-low'],
  },
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
});

export default ReportScreen;
