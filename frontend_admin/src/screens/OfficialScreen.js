import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
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
  Input,
  Loading,
  ModalSheet,
  Row,
  Screen,
  Select,
  Tabs,
  ToggleRow,
} from '../components/UI';
import {
  fmtDate,
  severityLabel,
  statusLabel,
  timeAgo,
  truncate,
} from '../utils/format';

const TABS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'all', label: 'Tất cả' },
];

const SEVERITY_OPTIONS = [
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'danger', label: 'Nguy hiểm' },
];

export default function OfficialScreen() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);

  const meta = useApi('/admin/alerts/meta');
  const { data, loading, error, reload } = useApi('/admin/ingest', {
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
      await api.post(`/admin/ingest/${id}/${action}`);
      toast.success(action === 'approve' ? 'Đã duyệt và phát hành tin.' : 'Đã từ chối tin.');
      await reload(true);
    } catch (err) {
      toast.error(err.message || 'Không cập nhật được tin.');
    } finally {
      setBusyId(null);
    }
  };

  const openSource = async (url) => {
    if (!/^https?:\/\//i.test(url || '')) return;
    try {
      await Linking.openURL(url);
    } catch {
      toast.error('Không mở được liên kết.');
    }
  };

  const items = data?.items || [];
  const provinces = meta.data?.provinces || [];
  const crops = meta.data?.crops || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row gap={8}>
        <Button
          title="Nhập tay"
          icon="plus"
          onPress={() => setManualOpen(true)}
          style={{ flex: 1 }}
        />
        <Button
          title="Nhập từ URL"
          icon="download"
          variant="soft"
          onPress={() => setUrlOpen(true)}
          style={{ flex: 1 }}
        />
      </Row>

      <Tabs tabs={TABS} value={status} onChange={setStatus} />

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={3} label="Đang tải tin chính thức…" /> : null}

      {!!data && items.length === 0 && (
        <Card>
          <View style={styles.empty}>
            <Icon name="news" size={24} color={colors.muted} />
            <Text style={styles.emptyTitle}>Không có tin</Text>
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
                  <Badge
                    label={severityLabel(item.severity)}
                    tone={item.severity === 'danger' ? 'red' : 'amber'}
                  />
                  <Badge
                    label={statusLabel(item.status)}
                    tone={
                      item.status === 'approved'
                        ? 'green'
                        : item.status === 'pending'
                        ? 'amber'
                        : 'slate'
                    }
                  />
                </Row>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </Row>

              <Text style={styles.title}>{item.title}</Text>
              <Row gap={5} style={{ flexWrap: 'wrap' }}>
                <Badge label={item.province || 'Toàn quốc'} tone="blue" />
                <Badge label={item.crop || 'other'} tone="slate" />
                <Text style={styles.date}>Công bố {fmtDate(item.publishedAt)}</Text>
              </Row>
              <Text style={styles.disease}>{item.diseaseLabel || item.diseaseName}</Text>
              {!!item.summary && (
                <Text style={styles.summary} numberOfLines={4}>
                  {item.summary}
                </Text>
              )}

              <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                <Button
                  title={truncate(item.sourceUrl, 28)}
                  variant="ghost"
                  size="sm"
                  icon="share"
                  onPress={() => openSource(item.sourceUrl)}
                  style={{ flex: 1, justifyContent: 'flex-start' }}
                />
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
                      title="Duyệt"
                      size="sm"
                      icon="check"
                      loading={busyId === item.id}
                      onPress={() => review(item.id, 'approve')}
                    />
                  </Row>
                )}
              </Row>
            </Card>
          );
        })}
      </View>

      <ManualIngestModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        provinces={provinces}
        crops={crops}
        onDone={() => reload(true)}
      />
      <UrlIngestModal
        visible={urlOpen}
        onClose={() => setUrlOpen(false)}
        onDone={() => reload(true)}
      />
    </Screen>
  );
}

function ManualIngestModal({ visible, onClose, provinces, crops, onDone }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [diseaseLabel, setDiseaseLabel] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [province, setProvince] = useState('');
  const [crop, setCrop] = useState('other');
  const [severity, setSeverity] = useState('warning');
  const [summary, setSummary] = useState('');
  const [autoPublish, setAutoPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  const provinceOptions = [
    { value: '', label: 'Toàn quốc' },
    ...provinces.map((p) => ({ value: p, label: p })),
  ];
  const cropOptions = crops.map((c) => ({ value: c.slug, label: c.label }));

  const submit = async () => {
    if (!title.trim() || !diseaseLabel.trim()) {
      toast.error('Nhập tiêu đề và tên bệnh.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.post('/admin/ingest', {
        title: title.trim(),
        disease_label: diseaseLabel.trim(),
        disease_name: diseaseName.trim(),
        province,
        crop,
        severity,
        summary: summary.trim(),
        auto_publish: autoPublish,
      });
      toast.success(
        result.status === 'approved' ? 'Đã nhập và phát hành cảnh báo.' : 'Đã nhập, chờ duyệt.',
      );
      onDone?.();
      onClose();
      setTitle('');
      setDiseaseLabel('');
      setDiseaseName('');
      setSummary('');
      setAutoPublish(false);
    } catch (err) {
      toast.error(err.message || 'Không nhập được tin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      title="Nhập tin chính thức"
      subtitle="Dùng khi đọc công văn hoặc website tỉnh"
      onClose={onClose}
      maxHeight="92%"
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
          <Button title="Lưu tin" icon="check" loading={saving} onPress={submit} />
        </>
      }
    >
      <Input label="Tiêu đề *" value={title} onChangeText={setTitle} placeholder="Ví dụ: Nghệ An công bố dịch đạo ôn" />
      <Input
        label="Tên bệnh (hiển thị) *"
        value={diseaseLabel}
        onChangeText={setDiseaseLabel}
        placeholder="Bệnh đạo ôn"
      />
      <Input
        label="Tên bệnh (kỹ thuật)"
        value={diseaseName}
        onChangeText={setDiseaseName}
        placeholder="rice blast"
      />
      <Select label="Tỉnh/thành" value={province} options={provinceOptions} onChange={setProvince} />
      <Select label="Cây trồng" value={crop} options={cropOptions} onChange={setCrop} />
      <Select label="Mức độ" value={severity} options={SEVERITY_OPTIONS} onChange={setSeverity} />
      <Input
        label="Tóm tắt"
        value={summary}
        onChangeText={setSummary}
        multiline
        placeholder="Diễn biến, diện tích, khuyến cáo…"
        maxLength={2000}
      />
      <ToggleRow
        label="Tự phát hành cảnh báo"
        hint="Bỏ trống để duyệt tay. Tin 'hết dịch' không tự đăng."
        value={autoPublish}
        onValueChange={setAutoPublish}
      />
    </ModalSheet>
  );
}

function UrlIngestModal({ visible, onClose, onDone }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error('URL phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    setSaving(true);
    try {
      const result = await api.post('/admin/ingest/fetch', { url: url.trim() });
      toast.success(`Đã tạo ${result.created?.length || 0} tin chờ duyệt.`);
      onDone?.();
      onClose();
      setUrl('');
    } catch (err) {
      toast.error(err.message || 'Không bóc được nội dung bài.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      title="Nhập từ URL"
      subtitle="Tự bóc tỉnh, bệnh và mức độ; luôn lưu ở trạng thái chờ duyệt"
      onClose={onClose}
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
          <Button title="Tải và bóc" icon="download" loading={saving} onPress={submit} />
        </>
      }
    >
      <Input
        label="URL bài viết"
        value={url}
        onChangeText={setUrl}
        placeholder="https://ppd.gov.vn/..."
        keyboardType="url"
      />
      <View style={styles.noteBox}>
        <Icon name="warning" size={15} color="#92400e" />
        <Text style={styles.noteText}>
          Chỉ nhận URL công khai. Nếu bài không đủ dữ liệu, app sẽ báo và bạn dùng Nhập tay.
        </Text>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  card: { padding: 13, gap: 7 },
  time: { fontFamily: font.regular, fontSize: 10, color: colors.muted },
  title: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.text },
  date: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, alignSelf: 'center' },
  disease: { fontFamily: font.medium, fontSize: 11.5, color: colors.primaryDark },
  summary: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 17, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 10,
  },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 10.5, lineHeight: 16, color: '#92400e' },
});
