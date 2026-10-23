import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, getApiBase } from '../api/client';
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
  absoluteUrl,
  fmtDateTime,
  fmtNumber,
  fmtPercent,
  severityLabel,
  statusLabel,
  timeAgo,
} from '../utils/format';

const SEVERITY_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'healthy', label: 'Khỏe' },
  { key: 'warning', label: 'Cảnh báo' },
  { key: 'danger', label: 'Nguy hiểm' },
];

export default function ScansScreen() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 450);
  const [severity, setSeverity] = useState('all');
  const [crop, setCrop] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const meta = useApi('/admin/alerts/meta');
  const cropOptions = [
    { value: '', label: 'Tất cả cây trồng' },
    ...((meta.data?.crops || []).map((c) => ({ value: c.slug, label: c.label }))),
  ];

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, severity, crop, includeDeleted]);

  const { data, loading, error, reload } = useApi('/admin/scans', {
    q: debouncedQ || undefined,
    severity: severity === 'all' ? undefined : severity,
    crop: crop || undefined,
    page,
    per_page: 25,
    include_deleted: includeDeleted ? 1 : undefined,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Tìm bệnh, cây trồng, mã quét, email…" />
      <Tabs tabs={SEVERITY_TABS} value={severity} onChange={setSeverity} />
      <Row gap={8}>
        <Select
          value={crop}
          options={cropOptions}
          onChange={setCrop}
          style={{ flex: 1 }}
          placeholder="Cây trồng"
        />
        <Button
          title={includeDeleted ? 'Đang hiện đã xoá' : 'Hiện đã xoá'}
          size="sm"
          variant={includeDeleted ? 'soft' : 'secondary'}
          icon="trash"
          onPress={() => setIncludeDeleted((v) => !v)}
          style={{ height: 42 }}
        />
      </Row>

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải nhật ký quét…" /> : null}

      {!!data && (
        <Card>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="camera" size={22} color={colors.muted} />
              <Text style={styles.emptyTitle}>Không có lượt quét phù hợp</Text>
              <Text style={styles.emptyText}>Thử đổi bộ lọc hoặc từ khoá.</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => setDetailId(item.id)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <ScanThumb image={item.image} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Row gap={6}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.cropLabel || item.crop} — {item.disease || 'Chưa rõ'}
                      </Text>
                      <Badge
                        label={severityLabel(item.severity)}
                        tone={
                          item.severity === 'danger'
                            ? 'red'
                            : item.severity === 'warning'
                            ? 'amber'
                            : 'green'
                        }
                      />
                    </Row>
                    <Text style={styles.meta} numberOfLines={1}>
                      {fmtPercent(item.confidence)} · {item.userName || item.userEmail || 'Khách'}
                    </Text>
                    <Text style={styles.time} numberOfLines={1}>
                      {timeAgo(item.createdAt)}
                      {item.deletedAt ? ' · đã xoá mềm' : ''}
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
        <ScanDetailModal
          scanId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => reload(true)}
        />
      )}
    </Screen>
  );
}

function ScanThumb({ image, size = 44 }) {
  if (image) {
    return (
      <Image
        source={{ uri: absoluteUrl(getApiBase(), image) }}
        style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.surfaceHigh }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      <Icon name="camera" size={18} color={colors.muted} />
    </View>
  );
}

function ScanDetailModal({ scanId, onClose, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/admin/scans/${scanId}`);
  const [busy, setBusy] = useState(false);

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

  const confirmDelete = () => {
    Alert.alert('Xoá mềm lượt quét?', 'Dữ liệu sẽ bị ẩn nhưng có thể khôi phục.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => run(() => api.del(`/admin/scans/${scanId}`), 'Đã xoá mềm lượt quét.'),
      },
    ]);
  };

  const scan = data?.scan;
  const detections = data?.detections || [];
  const pipeline = data?.pipeline || [];

  return (
    <ModalSheet
      visible
      title={scan ? `${scan.cropLabel || scan.crop} — ${scan.disease || 'Chưa rõ'}` : 'Lượt quét'}
      subtitle={`Mã ${scanId}`}
      onClose={onClose}
      maxHeight="92%"
      footer={<Button title="Đóng" variant="secondary" onPress={onClose} />}
    >
      {loading && !data ? <Loading rows={3} /> : null}
      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}

      {!!scan && (
        <>
          {scan.image ? (
            <Image
              source={{ uri: absoluteUrl(getApiBase(), scan.image) }}
              style={styles.hero}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Icon name="camera" size={28} color={colors.muted} />
              <Text style={styles.emptyText}>Không có ảnh đính kèm</Text>
            </View>
          )}

          <Row gap={8}>
            <Badge
              label={severityLabel(scan.severity)}
              tone={
                scan.severity === 'danger' ? 'red' : scan.severity === 'warning' ? 'amber' : 'green'
              }
            />
            <Badge label={statusLabel(scan.status)} tone={scan.status === 'failed' ? 'red' : 'blue'} />
            <Badge label={`${fmtPercent(scan.confidence)} tin cậy`} tone="slate" />
          </Row>

          <KeyValue
            rows={[
              { label: 'Cây trồng', value: scan.cropLabel || scan.crop },
              { label: 'Bệnh', value: scan.disease },
              { label: 'Người quét', value: scan.userName || scan.userEmail || 'Khách' },
              { label: 'Email', value: scan.userEmail },
              { label: 'Thời điểm', value: fmtDateTime(scan.createdAt) },
              { label: 'Cập nhật', value: fmtDateTime(scan.updatedAt) },
              { label: 'Xoá mềm', value: fmtDateTime(scan.deletedAt) },
            ]}
          />

          {!!scan.pathogen && (
            <View>
              <Text style={styles.blockTitle}>Tác nhân</Text>
              <Text style={styles.bodyText}>{scan.pathogen}</Text>
            </View>
          )}
          {!!scan.recommendation && (
            <View>
              <Text style={styles.blockTitle}>Khuyến nghị</Text>
              <Text style={styles.bodyText}>{scan.recommendation}</Text>
            </View>
          )}

          {(!!scan.statusSpread || !!scan.statusStage || !!scan.statusLoss) && (
            <View>
              <Text style={styles.blockTitle}>Tình trạng</Text>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {!!scan.statusSpread && <Badge label={`Lan: ${scan.statusSpread}`} tone="amber" />}
                {!!scan.statusStage && <Badge label={`Giai đoạn: ${scan.statusStage}`} tone="blue" />}
                {!!scan.statusLoss && <Badge label={`Thiệt hại: ${scan.statusLoss}`} tone="red" />}
              </Row>
            </View>
          )}

          <View>
            <Text style={styles.blockTitle}>Vùng phát hiện ({detections.length})</Text>
            {detections.length === 0 ? (
              <Text style={styles.emptyText}>Không có vùng phát hiện.</Text>
            ) : (
              detections.map((d, index) => (
                <View key={d.id}>
                  <Row style={{ paddingVertical: 7 }} gap={8}>
                    <Text style={styles.detIndex}>#{index + 1}</Text>
                    <Text style={styles.detText} numberOfLines={1}>
                      top {Math.round(Number(d.top) || 0)} · left {Math.round(Number(d.left) || 0)}
                    </Text>
                    <Badge
                      label={severityLabel(d.severity)}
                      tone={d.severity === 'danger' ? 'red' : d.severity === 'warning' ? 'amber' : 'green'}
                    />
                    <Text style={styles.detConf}>{fmtPercent(d.confidence)}</Text>
                  </Row>
                  {index < detections.length - 1 && <Divider />}
                </View>
              ))
            )}
          </View>

          <View>
            <Text style={styles.blockTitle}>Pipeline xử lý</Text>
            {pipeline.length === 0 ? (
              <Text style={styles.emptyText}>Không có bước xử lý.</Text>
            ) : (
              pipeline.map((step, index) => (
                <View key={step.id}>
                  <Row style={{ paddingVertical: 8 }} gap={9}>
                    <View style={styles.pipeIcon}>
                      <Icon
                        name={step.isActive ? 'check_circle' : 'schedule'}
                        size={15}
                        color={step.isActive ? colors.primary : colors.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pipeTitle}>{step.title}</Text>
                      {!!step.descr && <Text style={styles.pipeDesc}>{step.descr}</Text>}
                    </View>
                    <Badge
                      label={step.status || (step.isActive ? 'Xong' : 'Chờ')}
                      tone={step.isActive ? 'green' : 'slate'}
                    />
                  </Row>
                  {index < pipeline.length - 1 && <Divider />}
                </View>
              ))
            )}
          </View>

          <Divider />
          <Row gap={8}>
            {scan.deletedAt ? (
              <Button
                title="Khôi phục lượt quét"
                variant="soft"
                icon="refresh"
                loading={busy}
                onPress={() => run(() => api.post(`/admin/scans/${scanId}/restore`), 'Đã khôi phục.')}
              />
            ) : (
              <Button
                title="Xoá mềm"
                variant="danger"
                icon="trash"
                onPress={confirmDelete}
              />
            )}
          </Row>
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumb: {
    borderRadius: 10,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 10.5, color: colors.textSecondary, marginTop: 2 },
  time: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },

  hero: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  bodyText: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  detIndex: { width: 26, fontFamily: font.semibold, fontSize: 10.5, color: colors.muted },
  detText: { flex: 1, fontFamily: font.regular, fontSize: 11, color: colors.textSecondary },
  detConf: { fontFamily: font.medium, fontSize: 10.5, color: colors.text },
  pipeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeTitle: { fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  pipeDesc: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 1 },
});
