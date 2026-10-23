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
  Row,
  Screen,
  SearchBar,
  Section,
  StatCard,
  Tabs,
} from '../components/UI';
import {
  fmtDateTime,
  fmtNumber,
  timeAgo,
} from '../utils/format';

const RANGE_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

export default function AiReportsScreen() {
  const toast = useToast();
  const [range, setRange] = useState(7);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genRange, setGenRange] = useState(7);
  const [genFrom, setGenFrom] = useState('');
  const [genTo, setGenTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);

  const { data, loading, error, reload } = useApi('/admin/ai/reports', {
    page,
    per_page: 20,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];

  const generate = async () => {
    setGenBusy(true);
    setAiResult(null);
    try {
      const payload = useCustom
        ? { from: genFrom, to: genTo }
        : { range: genRange };
      const result = await api.post('/admin/ai/summary', payload);
      setAiResult(result);
      toast.success('Đã sinh báo cáo bằng AI.');
    } catch (err) {
      toast.error(err.message || 'AI không phản hồi.');
    } finally {
      setGenBusy(false);
    }
  };

  const save = async () => {
    if (!aiResult) return;
    setSaveBusy(true);
    try {
      await api.post('/admin/ai/reports/save', {
        from: aiResult.from,
        to: aiResult.to,
        report: aiResult.report,
        metrics: aiResult.metrics,
        model: aiResult.model,
      });
      toast.success('Đã lưu báo cáo AI.');
      setAiResult(null);
      await reload(true);
    } catch (err) {
      toast.error(err.message || 'Không lưu được báo cáo.');
    } finally {
      setSaveBusy(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Xoá báo cáo AI?', item.title || `Kỳ ${fmtDateTime(item.periodStart)}–${fmtDateTime(item.periodEnd)}`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/admin/ai/reports/${item.id}`);
            toast.success('Đã xoá báo cáo.');
            await reload(true);
          } catch (err) {
            toast.error(err.message || 'Không xoá được báo cáo.');
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.count}>{items.length} báo cáo đã lưu</Text>
        <Row gap={8}>
          <Button
            title="Tổng hợp AI"
            icon="auto_awesome"
            size="sm"
            variant="soft"
            onPress={() => setGenerateOpen(true)}
          />
        </Row>
      </Row>

      <Tabs tabs={RANGE_OPTIONS} value={genRange} onChange={setGenRange} />
      <ToggleRow
        label="Tuỳ chỉnh khoảng ngày"
        value={useCustom}
        onValueChange={setUseCustom}
      />
      {useCustom && (
        <Row gap={8} style={{ marginBottom: 6 }}>
          <Input
            label="Từ"
            value={genFrom}
            onChangeText={setGenFrom}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1 }}
          />
          <Input
            label="Đến"
            value={genTo}
            onChangeText={setGenTo}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1 }}
          />
        </Row>
      )}

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={3} label="Đang tải báo cáo AI…" /> : null}

      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Pressable
              onPress={() => setDetailId(item.id)}
              style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconBox}>
                <Icon name="auto_awesome" size={18} color={colors.purple} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title || `Kỳ ${fmtDateTime(item.periodStart)} – ${fmtDateTime(item.periodEnd)}`}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.model || 'AI'} · {timeAgo(item.createdAt)}
                </Text>
                <Text style={styles.summary} numberOfLines={3}>
                  {item.summary}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => remove(item)} hitSlop={8} style={styles.trash}>
              <Icon name="trash" size={15} color={colors.muted} />
            </Pressable>
          </Card>
        ))}
      </View>

      {items.length === 0 && !loading && (
        <Card>
          <View style={styles.empty}>
            <Icon name="auto_awesome" size={24} color={colors.muted} />
            <Text style={styles.emptyTitle}>Chưa có báo cáo AI</Text>
            <Text style={styles.emptyText}>Bấm “Tổng hợp AI” để sinh báo cáo mới.</Text>
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

      <GenerateModal
        visible={generateOpen}
        onClose={() => setGenerateOpen(false)}
        range={genRange}
        onRangeChange={setGenRange}
        useCustom={useCustom}
        onUseCustomChange={setUseCustom}
        genFrom={genFrom}
        onGenFromChange={setGenFrom}
        genTo={genTo}
        onGenToChange={setGenTo}
        onGenerate={generate}
        busy={genBusy}
        result={aiResult}
        onSave={save}
        saveBusy={saveBusy}
      />

      {!!detailId && (
        <AiReportDetail
          id={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </Screen>
  );
}

function GenerateModal({
  visible,
  onClose,
  range,
  onRangeChange,
  useCustom,
  onUseCustomChange,
  genFrom,
  onGenFromChange,
  genTo,
  onGenToChange,
  onGenerate,
  busy,
  result,
  onSave,
  saveBusy,
}) {
  const toast = useToast();

  return (
    <ModalSheet
      visible={visible}
      title="Tổng hợp bằng AI"
      subtitle="Sinh nhận định từ số liệu thật, không gửi dữ liệu cá nhân"
      onClose={onClose}
      maxHeight="85%"
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
        </>
      }
    >
      <Tabs tabs={RANGE_OPTIONS} value={range} onChange={onRangeChange} />
      <ToggleRow label="Tuỳ chỉnh khoảng ngày" value={useCustom} onValueChange={onUseCustomChange} />
      {useCustom && (
        <Row gap={8} style={{ marginBottom: 6 }}>
          <Input
            label="Từ ngày"
            value={genFrom}
            onChangeText={onGenFromChange}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1 }}
          />
          <Input
            label="Đến ngày"
            value={genTo}
            onChangeText={onGenToChange}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1 }}
          />
        </Row>
      )}

      <Row gap={8}>
        <Button
          title="Tổng hợp"
          icon="auto_awesome"
          loading={busy}
          onPress={onGenerate}
          style={{ flex: 1 }}
        />
      </Row>

      {result && (
        <>
          <Divider />
          <Text style={styles.resultTitle}>Kết quả AI</Text>
          <Text style={styles.aiSummary}>{result.report?.summary}</Text>
          {(result.report?.highlights || []).map((item, index) => (
            <View key={`h-${index}`} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          {(result.report?.actions || []).length > 0 && (
            <>
              <Divider style={{ marginVertical: 4 }} />
              <Text style={styles.aiLabel}>Việc cần làm</Text>
              {(result.report.actions || []).map((item, index) => (
                <View key={`a-${index}`} style={styles.bulletRow}>
                  <Text style={styles.actionIndex}>{index + 1}.</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </>
          )}
          <Row gap={8} style={{ justifyContent: 'flex-end', marginTop: 4 }}>
            <Button
              title="Lưu báo cáo"
              size="sm"
              icon="download"
              loading={saveBusy}
              onPress={onSave}
            />
          </Row>
        </>
      )}
    </ModalSheet>
  );
}

function AiReportDetail({ id, onClose }) {
  const { data, loading, error, reload } = useApi(`/admin/ai/reports/${id}`);
  const report = data;

  return (
    <ModalSheet
      visible
      title={report?.title || 'Báo cáo AI'}
      subtitle={report ? `${fmtDateTime(report.periodStart)} – ${fmtDateTime(report.periodEnd)}` : `Mã ${id}`}
      onClose={onClose}
      maxHeight="92%"
      footer={<Button title="Đóng" variant="secondary" onPress={onClose} />}
    >
      {loading && !data ? <Loading rows={3} /> : null}
      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}

      {!!report && (
        <>
          <Text style={styles.detailSummary}>{report.summary}</Text>
          <Divider style={{ marginVertical: 8 }} />
          <Text style={styles.blockTitle}>Nhận định chính</Text>
          {(report.highlights || []).map((item, index) => (
            <View key={`h-${index}`} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          {(report.actions || []).length > 0 && (
            <>
              <Divider style={{ marginVertical: 4 }} />
              <Text style={styles.blockTitle}>Việc cần làm</Text>
              {(report.actions || []).map((item, index) => (
                <View key={`a-${index}`} style={styles.bulletRow}>
                  <Text style={styles.actionIndex}>{index + 1}.</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </>
          )}

          <Divider style={{ marginVertical: 8 }} />
          <KeyValue
            rows={[
              { label: 'Khoảng ngày', value: `${fmtDateTime(report.periodStart)} – ${fmtDateTime(report.periodEnd)}` },
              { label: 'Model', value: report.model },
              { label: 'Tạo lúc', value: fmtDateTime(report.createdAt) },
              { label: 'Mã', value: report.id, mono: true },
            ]}
          />

          {!!report.metrics && (
            <>
              <Divider style={{ marginVertical: 8 }} />
              <Text style={styles.blockTitle}>Số liệu gốc (metrics)</Text>
              <View style={{ maxHeight: 180 }}>
                <Text style={styles.metricsText}>{JSON.stringify(report.metrics, null, 2)}</Text>
              </View>
            </>
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
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, marginTop: 2 },
  summary: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary, marginTop: 3 },
  trash: { position: 'absolute', right: 10, top: 12, padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  resultTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  aiSummary: { fontFamily: font.regular, fontSize: 12, lineHeight: 19, color: colors.text },
  aiLabel: { fontFamily: font.semibold, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 },
  actionIndex: { fontFamily: font.semibold, fontSize: 11.5, color: colors.primaryDark, width: 16 },
  bulletText: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  detailSummary: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text },
  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricsText: { fontFamily: 'monospace', fontSize: 9.5, lineHeight: 15, color: colors.textSecondary },
});