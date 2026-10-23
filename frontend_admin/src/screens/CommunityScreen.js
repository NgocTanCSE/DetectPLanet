import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Loading,
  Row,
  Screen,
  Tabs,
} from '../components/UI';
import { fmtDateTime, statusLabel, timeAgo } from '../utils/format';

const TABS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'verified', label: 'Đã xác minh' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'all', label: 'Tất cả' },
];

export default function CommunityScreen() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, reload } = useApi('/admin/reports', {
    status,
    limit: 50,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const review = async (id, action) => {
    setBusyId(id);
    try {
      await api.post(`/admin/reports/${id}/${action}`);
      toast.success(action === 'verify' ? 'Đã xác minh báo cáo.' : 'Đã từ chối báo cáo.');
      await reload(true);
    } catch (err) {
      toast.error(err.message || 'Không cập nhật được báo cáo.');
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Icon name="flag" size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.bannerText}>
          Job <Text style={styles.mono}>aggregate-reports</Text> gom ≥3 người cùng tỉnh báo cùng
          bệnh trong 7 ngày thành cảnh báo cộng đồng. Duyệt tay để loại báo cáo trùng hoặc sai.
        </Text>
      </View>

      <Tabs tabs={TABS} value={status} onChange={setStatus} />

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={3} label="Đang tải báo cáo…" /> : null}

      {!!data && items.length === 0 && (
        <Card>
          <View style={styles.empty}>
            <Icon name="check_circle" size={24} color={colors.primary} />
            <Text style={styles.emptyTitle}>Không có báo cáo</Text>
            <Text style={styles.emptyText}>Hàng chờ đang trống ở trạng thái này.</Text>
          </View>
        </Card>
      )}

      <View style={{ gap: 10 }}>
        {items.map((item) => {
          const pending = item.status === 'pending';
          return (
            <Card key={item.id} style={styles.card}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={6} style={{ flex: 1, flexWrap: 'wrap' }}>
                  <Badge label={item.cropLabel || item.crop || 'Cây khác'} tone="slate" />
                  <Badge
                    label={statusLabel(item.status)}
                    tone={
                      item.status === 'verified'
                        ? 'green'
                        : item.status === 'pending'
                        ? 'amber'
                        : 'slate'
                    }
                  />
                </Row>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </Row>

              <Text style={styles.title}>{item.diseaseLabel || 'Chưa rõ bệnh'}</Text>
              <Row gap={5}>
                <Icon name="flag" size={12} color={colors.muted} />
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.province, item.ward].filter(Boolean).join(' · ') || 'Không rõ khu vực'}
                </Text>
              </Row>
              {!!item.note && (
                <Text style={styles.note} numberOfLines={4}>
                  {item.note}
                </Text>
              )}

              <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={styles.email} numberOfLines={1}>
                  {item.userEmail || 'Ẩn danh'} · {fmtDateTime(item.createdAt)}
                </Text>
                {pending && (
                  <Row gap={6}>
                    <Button
                      title="Từ chối"
                      size="sm"
                      variant="secondary"
                      loading={busyId === item.id}
                      onPress={() => review(item.id, 'reject')}
                    />
                    <Button
                      title="Xác minh"
                      size="sm"
                      icon="check"
                      loading={busyId === item.id}
                      onPress={() => review(item.id, 'verify')}
                    />
                  </Row>
                )}
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, fontFamily: font.regular, fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  mono: { fontFamily: 'monospace', color: colors.text },
  card: { padding: 13, gap: 7 },
  time: { fontFamily: font.regular, fontSize: 10, color: colors.muted },
  title: { fontFamily: font.semibold, fontSize: 13.5, color: colors.text },
  meta: { flex: 1, fontFamily: font.regular, fontSize: 11, color: colors.textSecondary },
  note: {
    fontFamily: font.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.sm,
    padding: 9,
  },
  email: { flex: 1, fontFamily: font.regular, fontSize: 9.5, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
});
