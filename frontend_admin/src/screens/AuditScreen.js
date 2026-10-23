import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi, useDebounced } from '../hooks/useApi';
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
  Row,
  Screen,
  SearchBar,
  Select,
  Tabs,
} from '../components/UI';
import {
  fmtDateTime,
  timeAgo,
} from '../utils/format';

const ACTION_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'admin.user.update', label: 'Sửa người dùng' },
  { key: 'admin.user.suspend', label: 'Khoá người dùng' },
  { key: 'admin.user.unsuspend', label: 'Mở khoá người dùng' },
  { key: 'admin.user.delete', label: 'Xoá người dùng' },
  { key: 'admin.user.restore', label: 'Khôi phục người dùng' },
  { key: 'admin.scan.delete', label: 'Xoá quét' },
  { key: 'admin.scan.restore', label: 'Khôi phục quét' },
  { key: 'admin.guide.create', label: 'Tạo cẩm nang' },
  { key: 'admin.guide.update', label: 'Sửa cẩm nang' },
  { key: 'admin.guide.delete', label: 'Xoá cẩm nang' },
  { key: 'admin.guide.section.create', label: 'Thêm mục cẩm nang' },
  { key: 'admin.guide.section.update', label: 'Sửa mục cẩm nang' },
  { key: 'admin.guide.section.delete', label: 'Xoá mục cẩm nang' },
  { key: 'admin.guide.section.reorder', label: 'Sắp xếp mục cẩm nang' },
  { key: 'admin.alert.create', label: 'Tạo cảnh báo' },
  { key: 'admin.alert.update', label: 'Sửa cảnh báo' },
  { key: 'admin.alert.toggle', label: 'Bật/tắt cảnh báo' },
  { key: 'admin.alert.delete', label: 'Xoá cảnh báo' },
  { key: 'admin.report.verify', label: 'Xác minh báo cáo' },
  { key: 'admin.report.reject', label: 'Từ chối báo cáo' },
  { key: 'admin.ingest.approve', label: 'Duyệt tin chính thức' },
  { key: 'admin.ingest.reject', label: 'Từ chối tin chính thức' },
  { key: 'admin.ingest.fetch', label: 'Nhập từ URL' },
  { key: 'admin.ingest.manual', label: 'Nhập tay tin chính thức' },
  { key: 'admin.broadcast.create', label: 'Gửi broadcast' },
  { key: 'admin.report.ai_create', label: 'Tạo báo cáo AI' },
  { key: 'admin.report.ai_save', label: 'Lưu báo cáo AI' },
];

const TABLE_TABS = [
  { key: 'all', label: 'Tất cả bảng' },
  { key: 'users', label: 'users' },
  { key: 'scans', label: 'scans' },
  { key: 'guides', label: 'guides' },
  { key: 'guide_sections', label: 'guide_sections' },
  { key: 'crop_disease_alerts', label: 'crop_disease_alerts' },
  { key: 'disease_reports', label: 'disease_reports' },
  { key: 'official_ingest', label: 'official_ingest' },
  { key: 'notifications', label: 'notifications' },
  { key: 'admin_reports', label: 'admin_reports' },
  { key: 'notification_broadcasts', label: 'notification_broadcasts' },
];

export default function AuditScreen() {
  const toast = useToast();
  const [action, setAction] = useState('all');
  const [table, setTable] = useState('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState(null);

  const { data, loading, error, reload } = useApi('/admin/audit', {
    action: action === 'all' ? undefined : action,
    table: table === 'all' ? undefined : table,
    page,
    per_page: 30,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Tabs tabs={ACTION_TABS} value={action} onChange={setAction} />
      <Tabs tabs={TABLE_TABS} value={table} onChange={setTable} />

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải lịch sử thao tác…" /> : null}

      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Pressable
              onPress={() => setDetail(item)}
              style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconBox}>
                <Icon name="schedule" size={17} color={colors.info} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6}>
                  <Text style={styles.action} numberOfLines={1}>
                    {item.action}
                  </Text>
                  <Badge label={item.targetTable} tone="blue" />
                </Row>
                <Row gap={8} style={{ marginTop: 2 }}>
                  <Text style={styles.target} numberOfLines={1}>
                    #{item.targetId || '—'}
                  </Text>
                  <Text style={styles.time} numberOfLines={1}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </Row>
              </View>
            </Pressable>
            <Pressable onPress={() => setDetail(item)} hitSlop={8} style={styles.chevron}>
              <Icon name="chevron_right" size={16} color={colors.muted} />
            </Pressable>
          </Card>
        ))}
      </View>

      {items.length === 0 && !loading && (
        <Card>
          <View style={styles.empty}>
            <Icon name="schedule" size={24} color={colors.muted} />
            <Text style={styles.emptyTitle}>Không có hoạt động</Text>
            <Text style={styles.emptyText}>Không khớp với bộ lọc hiện tại.</Text>
          </View>
        </Card>
      )}

      {!!data && (
        <Pagination
          page={data.page}
          perPage={data.per_page}
          total={data.total}
          onPage={(next) => setPage(next)}
        />
      )}

      {!!detail && <AuditDetail item={detail} onClose={() => setDetail(null)} />}
    </Screen>
  );
}

function AuditDetail({ item, onClose }) {
  return (
    <ModalSheet
      visible
      title="Chi tiết hoạt động"
      subtitle={`${item.action} · ${item.targetTable} #${item.targetId || '—'}`}
      onClose={onClose}
      maxHeight="85%"
      footer={<Button title="Đóng" variant="secondary" onPress={onClose} />}
    >
      <KeyValue
        rows={[
          { label: 'Hành động', value: item.action },
          { label: 'Bảng đích', value: item.targetTable },
          { label: 'ID đối tượng', value: String(item.targetId || '—'), mono: true },
          { label: 'Người thực hiện', value: item.userId ? `#${item.userId}` : 'Hệ thống (admin)' },
          { label: 'Thời điểm', value: fmtDateTime(item.createdAt) },
        ]}
      />
      {item.oldValues && (
        <>
          <Divider />
          <Text style={styles.blockTitle}>Giá trị cũ</Text>
          <Text style={styles.jsonText}>{JSON.stringify(item.oldValues, null, 2)}</Text>
        </>
      )}
      {item.newValues && (
        <>
          <Divider />
          <Text style={styles.blockTitle}>Giá trị mới</Text>
          <Text style={styles.jsonText}>{JSON.stringify(item.newValues, null, 2)}</Text>
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, paddingRight: 36 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { flexShrink: 1, fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  target: { fontFamily: 'monospace', fontSize: 10, color: colors.textSecondary },
  time: { flex: 1, fontFamily: font.regular, fontSize: 9.5, color: colors.muted },
  chevron: { position: 'absolute', right: 10, top: 12, padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  jsonText: { fontFamily: 'monospace', fontSize: 9.5, lineHeight: 15, color: colors.textSecondary },
});