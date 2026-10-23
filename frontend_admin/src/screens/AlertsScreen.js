import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi, useDebounced } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Input,
  Loading,
  ModalSheet,
  Pagination,
  Row,
  Screen,
  SearchBar,
  Select,
  Tabs,
  ToggleRow,
} from '../components/UI';
import {
  fmtDate,
  fmtNumber,
  severityLabel,
  sourceLabel,
  timeAgo,
} from '../utils/format';

const SOURCE_TABS = [
  { key: 'all', label: 'Tất cả nguồn' },
  { key: 'weather', label: 'Thời tiết' },
  { key: 'official', label: 'Chính thức' },
  { key: 'community', label: 'Cộng đồng' },
  { key: 'manual', label: 'Thủ công' },
];

const ACTIVE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hiệu lực' },
  { key: 'inactive', label: 'Đã tắt' },
];

const SEVERITY_OPTIONS = [
  { value: 'healthy', label: 'Khỏe' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'danger', label: 'Nguy hiểm' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Thủ công' },
  { value: 'weather', label: 'Thời tiết' },
  { value: 'official', label: 'Chính thức' },
  { value: 'community', label: 'Cộng đồng' },
];

export default function AlertsScreen() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 450);
  const [source, setSource] = useState('all');
  const [active, setActive] = useState('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState(null);

  const meta = useApi('/admin/alerts/meta');

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, source, active]);

  const { data, loading, error, reload } = useApi('/admin/alerts', {
    q: debouncedQ || undefined,
    source: source === 'all' ? undefined : source,
    active: active === 'all' ? undefined : active === 'active' ? 1 : 0,
    page,
    per_page: 20,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const toggle = async (alert) => {
    try {
      await api.post(`/admin/alerts/${alert.id}/toggle`);
      toast.success(alert.isActive ? 'Đã tắt cảnh báo.' : 'Đã bật cảnh báo.');
      await reload(true);
    } catch (err) {
      toast.error(err.message || 'Không đổi được trạng thái.');
    }
  };

  const items = data?.items || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.count}>{fmtNumber(data?.total)} cảnh báo</Text>
        <Button
          title="Thêm cảnh báo"
          icon="plus"
          size="sm"
          onPress={() => setEditor({ mode: 'create' })}
        />
      </Row>

      <SearchBar value={q} onChangeText={setQ} placeholder="Tìm bệnh, mô tả…" />
      <Tabs tabs={SOURCE_TABS} value={source} onChange={setSource} />
      <Tabs tabs={ACTIVE_TABS} value={active} onChange={setActive} />

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải cảnh báo…" /> : null}

      <View style={{ gap: 10 }}>
        {items.map((alert) => (
          <Card key={alert.id} style={styles.card}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6} style={{ flex: 1, flexWrap: 'wrap' }}>
                <Badge
                  label={severityLabel(alert.severity)}
                  tone={
                    alert.severity === 'danger'
                      ? 'red'
                      : alert.severity === 'warning'
                      ? 'amber'
                      : 'green'
                  }
                />
                <Badge label={sourceLabel(alert.source)} tone="blue" />
                <Badge label={alert.isActive ? 'Hiệu lực' : 'Đã tắt'} tone={alert.isActive ? 'green' : 'slate'} />
              </Row>
              <Switch
                value={!!alert.isActive}
                onValueChange={() => toggle(alert)}
                trackColor={{ false: colors.borderStrong, true: colors.primary }}
                thumbColor={colors.white}
                style={{ transform: [{ scale: 0.8 }] }}
              />
            </Row>

            <Text style={styles.title}>{alert.diseaseLabel}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {alert.cropLabel || alert.cropSlug || 'Cây khác'} ·{' '}
              {alert.province || 'Toàn quốc'} · rủi ro {alert.riskScore}
            </Text>
            {!!alert.description && (
              <Text style={styles.desc} numberOfLines={2}>
                {alert.description}
              </Text>
            )}
            <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={styles.date}>
                {fmtDate(alert.validFrom)} → {fmtDate(alert.validTo)} · {timeAgo(alert.createdAt)}
              </Text>
              <Row gap={6}>
                <Button
                  title="Sửa"
                  size="sm"
                  variant="secondary"
                  icon="edit"
                  onPress={() => setEditor({ mode: 'edit', alert })}
                />
                <Button
                  title="Xoá"
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  onPress={() =>
                    Alert.alert('Xoá cảnh báo?', alert.diseaseLabel, [
                      { text: 'Huỷ', style: 'cancel' },
                      {
                        text: 'Xoá',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.del(`/admin/alerts/${alert.id}`);
                            toast.success('Đã xoá cảnh báo.');
                            await reload(true);
                          } catch (err) {
                            toast.error(err.message || 'Không xoá được cảnh báo.');
                          }
                        },
                      },
                    ])
                  }
                />
              </Row>
            </Row>
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

      {!!editor && (
        <AlertEditor
          key={editor.alert?.id || 'create'}
          alert={editor.alert}
          crops={meta.data?.crops || []}
          provinces={meta.data?.provinces || []}
          onClose={() => setEditor(null)}
          onDone={() => reload(true)}
        />
      )}
    </Screen>
  );
}

function AlertEditor({ alert, crops, provinces, onClose, onDone }) {
  const toast = useToast();
  const editing = !!alert;
  const [label, setLabel] = useState(alert?.diseaseLabel || '');
  const [name, setName] = useState(alert?.diseaseName || '');
  const [crop, setCrop] = useState(alert?.cropSlug || 'rice');
  const [province, setProvince] = useState(alert?.province || '');
  const [severity, setSeverity] = useState(alert?.severity || 'warning');
  const [source, setSource] = useState(alert?.source || 'manual');
  const [risk, setRisk] = useState(String(alert?.riskScore ?? 50));
  const [description, setDescription] = useState(alert?.description || '');
  const [recommendation, setRecommendation] = useState(alert?.recommendation || '');
  const [validFrom, setValidFrom] = useState(alert?.validFrom || '');
  const [validTo, setValidTo] = useState(alert?.validTo || '');
  const [isActive, setIsActive] = useState(alert ? !!alert.isActive : true);
  const [saving, setSaving] = useState(false);

  const cropOptions = crops.map((c) => ({ value: c.slug, label: c.label }));
  const provinceOptions = [
    { value: '', label: 'Toàn quốc' },
    ...provinces.map((p) => ({ value: p, label: p })),
  ];

  const submit = async () => {
    if (!label.trim() || !name.trim()) {
      toast.error('Nhập tên bệnh (hiển thị) và tên kỹ thuật.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        crop,
        disease_label: label.trim(),
        disease_name: name.trim(),
        province,
        severity,
        source,
        risk_score: Number(risk) || 0,
        description,
        recommendation,
        valid_from: validFrom.trim() || null,
        valid_to: validTo.trim() || null,
        is_active: isActive,
      };
      if (editing) {
        await api.patch(`/admin/alerts/${alert.id}`, payload);
        toast.success('Đã lưu cảnh báo.');
      } else {
        await api.post('/admin/alerts', payload);
        toast.success('Đã tạo cảnh báo.');
      }
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không lưu được cảnh báo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible
      title={editing ? 'Sửa cảnh báo' : 'Thêm cảnh báo'}
      subtitle={editing ? alert.id : 'Tạo cảnh báo thủ công'}
      onClose={onClose}
      maxHeight="94%"
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
          <Button title="Lưu" icon="check" loading={saving} onPress={submit} />
        </>
      }
    >
      <Input
        label="Tên bệnh (hiển thị) *"
        value={label}
        onChangeText={setLabel}
        placeholder="Bệnh đạo ôn"
      />
      <Input
        label="Tên kỹ thuật *"
        value={name}
        onChangeText={setName}
        placeholder="rice blast"
      />
      <Select label="Cây trồng" value={crop} options={cropOptions} onChange={setCrop} />
      <Select label="Tỉnh/thành" value={province} options={provinceOptions} onChange={setProvince} />
      <Row gap={8}>
        <Select
          label="Mức độ"
          value={severity}
          options={SEVERITY_OPTIONS}
          onChange={setSeverity}
          style={{ flex: 1 }}
        />
        <Select
          label="Nguồn"
          value={source}
          options={SOURCE_OPTIONS}
          onChange={setSource}
          style={{ flex: 1 }}
        />
      </Row>
      <Input
        label="Điểm rủi ro (0–100)"
        value={risk}
        onChangeText={setRisk}
        keyboardType="number-pad"
      />
      <Input
        label="Mô tả"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Triệu chứng, diễn biến…"
      />
      <Input
        label="Khuyến nghị"
        value={recommendation}
        onChangeText={setRecommendation}
        multiline
        placeholder="Biện pháp xử lý…"
      />
      <Row gap={8}>
        <Input
          label="Hiệu lực từ"
          value={validFrom}
          onChangeText={setValidFrom}
          placeholder="YYYY-MM-DD"
          style={{ flex: 1 }}
        />
        <Input
          label="Đến"
          value={validTo}
          onChangeText={setValidTo}
          placeholder="YYYY-MM-DD"
          style={{ flex: 1 }}
        />
      </Row>
      <ToggleRow label="Đang hiệu lực" value={isActive} onValueChange={setIsActive} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: font.medium, fontSize: 12, color: colors.textSecondary },
  card: { padding: 13, gap: 7 },
  title: { fontFamily: font.semibold, fontSize: 13.5, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 10.5, color: colors.textSecondary },
  desc: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  date: { flex: 1, fontFamily: font.regular, fontSize: 9.5, color: colors.muted },
});
