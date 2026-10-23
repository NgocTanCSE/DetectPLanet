import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi, useDebounced } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  ErrorBox,
  Input,
  KeyValue,
  Loading,
  ModalSheet,
  Pagination,
  Row,
  Screen,
  SearchBar,
  Section,
  StatCard,
  Tabs,
} from '../components/UI';
import { HBar } from '../components/Charts';
import {
  fmtDateTime,
  fmtNumber,
  fmtPercent,
  severityLabel,
  statusLabel,
  timeAgo,
} from '../utils/format';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'suspended', label: 'Đã khoá' },
  { key: 'deleted', label: 'Đã xoá' },
];

export default function UsersScreen() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 450);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status]);

  const { data, loading, error, reload } = useApi('/admin/users', {
    q: debouncedQ || undefined,
    status: status === 'all' ? undefined : status,
    page,
    per_page: 20,
    include_deleted: status === 'deleted' ? 1 : undefined,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Tìm theo tên hoặc email…"
      />
      <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải người dùng…" /> : null}

      {!!data && (
        <Card>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="users" size={22} color={colors.muted} />
              <Text style={styles.emptyTitle}>Không có người dùng phù hợp</Text>
              <Text style={styles.emptyText}>Thử đổi từ khoá hoặc bộ lọc trạng thái.</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => setDetailId(item.id)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <Avatar name={item.name} email={item.email} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Row gap={6}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name || 'Chưa đặt tên'}
                      </Text>
                      <Badge
                        label={statusLabel(item.status)}
                        tone={
                          item.status === 'active'
                            ? 'green'
                            : item.status === 'suspended'
                            ? 'amber'
                            : 'slate'
                        }
                      />
                    </Row>
                    <Text style={styles.email} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {fmtNumber(item.scanCount)} lượt quét
                      {item.lastScanAt ? ` · ${timeAgo(item.lastScanAt)}` : ' · chưa quét'}
                    </Text>
                  </View>
                  <Icon name="chevron_right" size={16} color={colors.muted} />
                </Pressable>
                {index < items.length - 1 && <Divider />}
              </View>
            ))
          )}
          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPage={(next) => setPage(next)}
          />
        </Card>
      )}

      {!!detailId && (
        <UserDetailModal
          userId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => reload(true)}
        />
      )}
    </Screen>
  );
}

function UserDetailModal({ userId, onClose, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/admin/users/${userId}`);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (data?.user?.name) setName(data.user.name);
  }, [data?.user?.name]);

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await reload(true);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    if (!name.trim()) {
      toast.error('Tên không được để trống.');
      return;
    }
    await run(() => api.patch(`/admin/users/${userId}`, { name: name.trim() }), 'Đã cập nhật tên.');
    setEditOpen(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Xoá mềm người dùng?',
      'Tài khoản sẽ bị ẩn khỏi danh sách và không đăng nhập được. Có thể khôi phục sau.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () =>
            run(() => api.del(`/admin/users/${userId}`), 'Đã xoá mềm người dùng.'),
        },
      ],
    );
  };

  const user = data?.user;
  const stats = data?.stats || {};
  const severityItems = Object.entries(stats.by_severity || {}).map(([key, value]) => ({
    name: severityLabel(key),
    count: value,
  }));

  return (
    <>
      <ModalSheet
        visible
        title={user ? user.name || user.email : 'Người dùng'}
        subtitle={`ID #${userId}${user?.email ? ` · ${user.email}` : ''}`}
        onClose={onClose}
        maxHeight="92%"
        footer={<Button title="Đóng" variant="secondary" onPress={onClose} />}
      >
        {loading && !data ? <Loading rows={3} /> : null}
        {!!error && <ErrorBox error={error} onRetry={() => reload()} />}

        {!!user && (
          <>
            <Row gap={12}>
              <Avatar name={user.name} email={user.email} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{user.name || 'Chưa đặt tên'}</Text>
                <Text style={styles.detailEmail}>{user.email}</Text>
                <Row gap={6} style={{ marginTop: 5 }}>
                  <Badge
                    label={statusLabel(user.status)}
                    tone={
                      user.status === 'active'
                        ? 'green'
                        : user.status === 'suspended'
                        ? 'amber'
                        : 'slate'
                    }
                  />
                  {!!user.deletedAt && <Badge label="Đã xoá mềm" tone="slate" />}
                </Row>
              </View>
            </Row>

            {user.status === 'suspended' && !!user.suspendedReason && (
              <View style={styles.warnBox}>
                <Icon name="warning" size={15} color="#92400e" />
                <Text style={styles.warnText}>Lý do khoá: {user.suspendedReason}</Text>
              </View>
            )}

            <Row gap={8}>
              <StatCard label="Lượt quét" value={fmtNumber(stats.scans)} icon="camera" tone="green" />
              <StatCard label="Đã lưu" value={fmtNumber(stats.scans_saved)} icon="bookmark" tone="blue" />
            </Row>
            <Row gap={8}>
              <StatCard label="Báo cáo dịch" value={fmtNumber(stats.reports)} icon="flag" tone="amber" />
              <StatCard label="Thông báo" value={fmtNumber(stats.notifications)} icon="notifications" tone="purple" />
            </Row>

            <KeyValue
              rows={[
                { label: 'Ngày tạo', value: fmtDateTime(user.createdAt) },
                { label: 'Cập nhật', value: fmtDateTime(user.updatedAt) },
                { label: 'Khoá lúc', value: fmtDateTime(user.suspendedAt) },
                { label: 'Xoá lúc', value: fmtDateTime(user.deletedAt) },
                { label: 'Google ID', value: user.googleId || 'Chưa liên kết', mono: true },
              ]}
            />

            {severityItems.length > 0 && (
              <View>
                <Text style={styles.blockTitle}>Phân bố mức độ</Text>
                <HBar items={severityItems} color={colors.info} />
              </View>
            )}

            <View>
              <Text style={styles.blockTitle}>Lượt quét gần đây</Text>
              {(data.recent || []).length === 0 ? (
                <Text style={styles.emptyText}>Chưa có lượt quét.</Text>
              ) : (
                (data.recent || []).map((scan, index) => (
                  <View key={scan.id}>
                    <Row style={{ paddingVertical: 8 }} gap={10}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanTitle} numberOfLines={1}>
                          {scan.cropLabel} — {scan.disease}
                        </Text>
                        <Text style={styles.scanMeta}>
                          {timeAgo(scan.createdAt)} · {fmtPercent(scan.confidence)}
                        </Text>
                      </View>
                      <Badge
                        label={severityLabel(scan.severity)}
                        tone={
                          scan.severity === 'danger'
                            ? 'red'
                            : scan.severity === 'warning'
                            ? 'amber'
                            : 'green'
                        }
                      />
                    </Row>
                    {index < (data.recent || []).length - 1 && <Divider />}
                  </View>
                ))
              )}
            </View>

            <Divider />
            <Text style={styles.blockTitle}>Thao tác</Text>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <Button
                title="Sửa tên"
                size="sm"
                icon="edit"
                onPress={() => setEditOpen(true)}
                disabled={!!user.deletedAt}
              />
              {user.status === 'suspended' ? (
                <Button
                  title="Mở khoá"
                  size="sm"
                  variant="soft"
                  icon="check"
                  loading={busy}
                  onPress={() =>
                    run(() => api.post(`/admin/users/${userId}/unsuspend`), 'Đã mở khoá tài khoản.')
                  }
                />
              ) : (
                <Button
                  title="Khoá tài khoản"
                  size="sm"
                  variant="danger"
                  icon="ban"
                  onPress={() => setSuspendOpen(true)}
                  disabled={!!user.deletedAt}
                />
              )}
              {user.deletedAt ? (
                <Button
                  title="Khôi phục"
                  size="sm"
                  variant="soft"
                  icon="refresh"
                  loading={busy}
                  onPress={() =>
                    run(() => api.post(`/admin/users/${userId}/restore`), 'Đã khôi phục tài khoản.')
                  }
                />
              ) : (
                <Button
                  title="Xoá mềm"
                  size="sm"
                  variant="secondary"
                  icon="trash"
                  onPress={confirmDelete}
                />
              )}
            </Row>
          </>
        )}
      </ModalSheet>

      <ModalSheet
        visible={editOpen}
        title="Sửa tên người dùng"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button title="Huỷ" variant="secondary" onPress={() => setEditOpen(false)} />
            <Button title="Lưu" icon="check" onPress={saveName} loading={busy} />
          </>
        }
      >
        <Input label="Tên hiển thị" value={name} onChangeText={setName} autoCapitalize="words" />
      </ModalSheet>

      <ModalSheet
        visible={suspendOpen}
        title="Khoá tài khoản"
        subtitle="Mọi phiên đăng nhập hiện tại sẽ bị thu hồi."
        onClose={() => setSuspendOpen(false)}
        footer={
          <>
            <Button title="Huỷ" variant="secondary" onPress={() => setSuspendOpen(false)} />
            <Button
              title="Khoá"
              variant="danger"
              icon="ban"
              loading={busy}
              onPress={async () => {
                await run(
                  () => api.post(`/admin/users/${userId}/suspend`, { reason: reason.trim() }),
                  'Đã khoá tài khoản.',
                );
                setSuspendOpen(false);
                setReason('');
              }}
            />
          </>
        }
      >
        <Input
          label="Lý do (tuỳ chọn)"
          value={reason}
          onChangeText={setReason}
          placeholder="Ví dụ: gửi báo cáo sai nhiều lần"
          multiline
          maxLength={500}
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  name: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.text },
  email: { fontFamily: font.regular, fontSize: 10.5, color: colors.textSecondary, marginTop: 1 },
  meta: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },

  detailName: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  detailEmail: { fontFamily: font.regular, fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  scanTitle: { fontFamily: font.medium, fontSize: 12, color: colors.text },
  scanMeta: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 10,
  },
  warnText: { flex: 1, fontFamily: font.regular, fontSize: 11, color: '#92400e' },
});
