import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
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
  ProgressBar,
  Row,
  Screen,
  Select,
  StatCard,
} from '../components/UI';
import {
  fmtDateTime,
  fmtNumber,
  fmtPercent,
  notificationTypeLabel,
  targetLabel,
  timeAgo,
} from '../utils/format';

const TYPE_OPTIONS = [
  { value: 'info', label: 'Thông tin' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'alert', label: 'Cảnh báo dịch' },
  { value: 'success', label: 'Thành công' },
  { value: 'error', label: 'Lỗi' },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'Tất cả người dùng' },
  { value: 'province', label: 'Theo tỉnh' },
  { value: 'crop', label: 'Theo cây trồng' },
  { value: 'user', label: 'Một người dùng' },
];

export default function NotificationsScreen() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const meta = useApi('/admin/alerts/meta');
  const { data, loading, error, reload } = useApi('/admin/notifications', {
    page,
    per_page: 20,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];

  const remove = (item) => {
    Alert.alert('Xoá lần gửi?', 'Toàn bộ thông báo con của lần gửi này cũng bị xoá.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/admin/notifications/${item.id}`);
            toast.success('Đã xoá lần gửi thông báo.');
            await reload(true);
          } catch (err) {
            toast.error(err.message || 'Không xoá được.');
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.count}>{fmtNumber(data?.total)} lần gửi</Text>
        <Button title="Gửi thông báo" icon="send" size="sm" onPress={() => setComposeOpen(true)} />
      </Row>

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải thông báo…" /> : null}

      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Pressable
              onPress={() => setDetailId(item.id)}
              style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconBox}>
                <Icon name="notifications" size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Badge label={notificationTypeLabel(item.type)} tone="blue" />
                </Row>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {targetLabel(item.target, item.targetValue, meta.data?.crops || [])} ·{' '}
                  {fmtNumber(item.sent)} người nhận · {timeAgo(item.createdAt)}
                </Text>
                <View style={{ marginTop: 6 }}>
                  <ProgressBar value={item.readRate} height={5} />
                  <Text style={styles.rate}>
                    Đã đọc {fmtNumber(item.read)}/{fmtNumber(item.sent)} ({fmtPercent(item.readRate)})
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable onPress={() => remove(item)} hitSlop={8} style={styles.trash}>
              <Icon name="trash" size={15} color={colors.muted} />
            </Pressable>
          </Card>
        ))}
      </View>

      {!!data && (
        <Pagination
          page={data.page}
          perPage={data.per_page}
          total={data.total}
          onPage={(next) => setPage(next)}
        />
      )}

      <ComposeModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onDone={() => reload(true)}
        provinces={meta.data?.provinces || []}
        crops={meta.data?.crops || []}
      />

      {!!detailId && (
        <NotificationDetail
          id={detailId}
          crops={meta.data?.crops || []}
          onClose={() => setDetailId(null)}
        />
      )}
    </Screen>
  );
}

function ComposeModal({ visible, onClose, onDone, provinces, crops }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [target, setTarget] = useState('all');
  const [targetValue, setTargetValue] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  const provinceOptions = provinces.map((p) => ({ value: p, label: p }));
  const cropOptions = crops.map((c) => ({ value: c.slug, label: c.label }));

  const reset = () => {
    setTitle('');
    setBody('');
    setType('info');
    setTarget('all');
    setTargetValue('');
    setPreview(null);
  };

  const check = async () => {
    setChecking(true);
    setPreview(null);
    try {
      const result = await api.post('/admin/notifications/preview', {
        target,
        target_value: targetValue,
      });
      setPreview(result.recipients);
    } catch (err) {
      toast.error(err.message || 'Không đếm được người nhận.');
    } finally {
      setChecking(false);
    }
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Nhập tiêu đề và nội dung.');
      return;
    }
    if (target !== 'all' && !targetValue.trim()) {
      toast.error('Chọn đối tượng nhận.');
      return;
    }
    setSending(true);
    try {
      const result = await api.post('/admin/notifications/broadcast', {
        title: title.trim(),
        body: body.trim(),
        type,
        target,
        target_value: targetValue,
      });
      toast.success(`Đã gửi cho ${fmtNumber(result.recipients)} người.`);
      onDone?.();
      onClose();
      reset();
    } catch (err) {
      toast.error(err.message || 'Không gửi được thông báo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      title="Gửi thông báo"
      subtitle="Broadcast tới người dùng đang hoạt động"
      onClose={onClose}
      maxHeight="92%"
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
          <Button title="Gửi" icon="send" loading={sending} onPress={send} />
        </>
      }
    >
      <Input label="Tiêu đề *" value={title} onChangeText={setTitle} placeholder="Cảnh báo đạo ôn" />
      <Input
        label="Nội dung *"
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Nội dung hiển thị trong app…"
      />
      <Select label="Loại" value={type} options={TYPE_OPTIONS} onChange={setType} />
      <Select
        label="Đối tượng"
        value={target}
        options={TARGET_OPTIONS}
        onChange={(value) => {
          setTarget(value);
          setTargetValue('');
          setPreview(null);
        }}
      />

      {target === 'province' && (
        <Select
          label="Tỉnh/thành"
          value={targetValue}
          options={provinceOptions}
          onChange={setTargetValue}
          placeholder="Chọn tỉnh"
        />
      )}
      {target === 'crop' && (
        <Select
          label="Cây trồng"
          value={targetValue}
          options={cropOptions}
          onChange={setTargetValue}
          placeholder="Chọn cây trồng"
        />
      )}
      {target === 'user' && (
        <Input
          label="User ID"
          value={targetValue}
          onChangeText={setTargetValue}
          keyboardType="number-pad"
          placeholder="Ví dụ 12"
        />
      )}

      <Row gap={8}>
        <Button
          title="Kiểm tra người nhận"
          size="sm"
          variant="soft"
          icon="users"
          loading={checking}
          onPress={check}
          style={{ flex: 1 }}
        />
        {preview !== null && (
          <Badge label={`${fmtNumber(preview)} người`} tone={preview ? 'green' : 'red'} />
        )}
      </Row>

      <View style={styles.noteBox}>
        <Icon name="warning" size={15} color="#92400e" />
        <Text style={styles.noteText}>
          Chỉ gửi tới tài khoản đang hoạt động. Không gửi thử nghiệm hàng loạt; kiểm tra kỹ đối tượng.
        </Text>
      </View>
    </ModalSheet>
  );
}

function NotificationDetail({ id, crops, onClose }) {
  const { data, loading, error, reload } = useApi(`/admin/notifications/${id}`);
  const broadcast = data?.broadcast;
  const stats = data?.stats || {};
  const recipients = data?.recipients || [];

  return (
    <ModalSheet
      visible
      title={broadcast?.title || 'Chi tiết thông báo'}
      subtitle={broadcast ? fmtDateTime(broadcast.createdAt) : `Mã ${id}`}
      onClose={onClose}
      maxHeight="90%"
      footer={<Button title="Đóng" variant="secondary" onPress={onClose} />}
    >
      {loading && !data ? <Loading rows={3} /> : null}
      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}

      {!!broadcast && (
        <>
          <Text style={styles.detailBody}>{broadcast.body}</Text>
          <Row gap={8}>
            <Badge label={notificationTypeLabel(broadcast.type)} tone="blue" />
            <Badge
              label={targetLabel(broadcast.target, broadcast.targetValue, crops)}
              tone="purple"
            />
          </Row>

          <Row gap={8}>
            <StatCard label="Đã gửi" value={fmtNumber(stats.sent)} icon="send" tone="blue" />
            <StatCard label="Đã đọc" value={fmtNumber(stats.read)} icon="eye" tone="green" />
          </Row>
          <View>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.rateLabel}>Tỉ lệ đọc</Text>
              <Text style={styles.rateValue}>{fmtPercent(stats.readRate)}</Text>
            </Row>
            <ProgressBar value={stats.readRate} />
          </View>

          <KeyValue
            rows={[
              { label: 'Chưa đọc', value: fmtNumber(stats.unread) },
              { label: 'Người nhận', value: fmtNumber(broadcast.recipients) },
              { label: 'Mã', value: broadcast.id, mono: true },
            ]}
          />

          <Divider />
          <Text style={styles.blockTitle}>Người nhận ({recipients.length})</Text>
          {recipients.slice(0, 40).map((r) => (
            <View key={r.userId}>
              <Row style={{ paddingVertical: 7 }} gap={8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipientName}>{r.name || r.email}</Text>
                  <Text style={styles.recipientEmail}>{r.email}</Text>
                </View>
                <Badge
                  label={r.isRead ? `Đã đọc ${timeAgo(r.readAt)}` : 'Chưa đọc'}
                  tone={r.isRead ? 'green' : 'slate'}
                />
              </Row>
              <Divider />
            </View>
          ))}
          {recipients.length > 40 && (
            <Text style={styles.more}>… và {recipients.length - 40} người khác</Text>
          )}
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: font.medium, fontSize: 12, color: colors.textSecondary },
  card: { padding: 0, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', gap: 10, padding: 13, paddingRight: 36 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary, marginTop: 3 },
  meta: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, marginTop: 4 },
  rate: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, marginTop: 3 },
  trash: { position: 'absolute', right: 10, top: 12, padding: 4 },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 10,
  },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 10.5, lineHeight: 16, color: '#92400e' },
  detailBody: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text },
  rateLabel: { fontFamily: font.medium, fontSize: 11, color: colors.textSecondary },
  rateValue: { fontFamily: font.bold, fontSize: 11.5, color: colors.text },
  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  recipientName: { fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  recipientEmail: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 1 },
  more: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 6 },
});
