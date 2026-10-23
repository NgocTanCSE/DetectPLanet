import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
  Badge,
  Button,
  Divider,
  ErrorBox,
  Loading,
  Row,
  Screen,
  Section,
  Segmented,
  StatCard,
} from '../components/UI';
import { DayBars, HBar, SeverityBar } from '../components/Charts';
import { fmtDateTime, fmtNumber, fmtPercent, severityLabel, timeAgo } from '../utils/format';

const RANGES = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

const ACTIVITY_ICON = { scan: 'camera', alert: 'warning', report: 'flag' };

export default function DashboardScreen({ navigation }) {
  const toast = useToast();
  const [range, setRange] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState(null);

  const { data, loading, error, reload } = useApi('/admin/overview', { range });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const runAi = async () => {
    setAiBusy(true);
    try {
      const res = await api.post('/admin/ai/summary', { range });
      setAi(res);
      toast.success('Đã tổng hợp bằng AI.');
    } catch (err) {
      toast.error(err.message || 'AI không phản hồi.');
    } finally {
      setAiBusy(false);
    }
  };

  const saveAi = async () => {
    if (!ai) return;
    setSaving(true);
    try {
      await api.post('/admin/ai/reports/save', {
        from: ai.from,
        to: ai.to,
        report: ai.report,
        metrics: ai.metrics,
        model: ai.model,
      });
      toast.success('Đã lưu báo cáo AI.');
    } catch (err) {
      toast.error(err.message || 'Không lưu được báo cáo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen>
        <Loading rows={4} label="Đang tải tổng quan…" />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <ErrorBox error={error} onRetry={() => reload()} />
      </Screen>
    );
  }

  const users = data?.users || {};
  const scans = data?.scans || {};
  const alerts = data?.alerts || {};
  const community = data?.community || {};
  const official = data?.official || {};
  const notifications = data?.notifications || {};
  const severity = scans.by_severity || {};

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={RANGES} value={range} onChange={setRange} />

      <Row gap={10}>
        <StatCard
          label="Người dùng"
          value={fmtNumber(users.total)}
          foot={`+${fmtNumber(users.new)} mới · ${fmtNumber(users.active_7d)} active 7d`}
          icon="users"
          tone="blue"
        />
        <StatCard
          label="Lượt quét"
          value={fmtNumber(scans.total)}
          foot={`Hôm nay ${fmtNumber(scans.today)} · lỗi ${fmtNumber(scans.failed)}`}
          icon="camera"
          tone="green"
        />
      </Row>
      <Row gap={10}>
        <StatCard
          label="Độ tin cậy TB"
          value={fmtPercent(scans.avg_confidence)}
          foot="Trên các lượt quét hoàn tất"
          icon="verified"
          tone="purple"
        />
        <StatCard
          label="Cảnh báo hiệu lực"
          value={fmtNumber(alerts.active)}
          foot={`${fmtNumber(alerts.expiring_soon)} sắp hết hạn`}
          icon="warning"
          tone="amber"
        />
      </Row>
      <Row gap={10}>
        <StatCard
          label="Chờ duyệt cộng đồng"
          value={fmtNumber(community.pending)}
          foot={`${fmtNumber(community.verified)} đã xác minh`}
          icon="flag"
          tone="red"
        />
        <StatCard
          label="Tỉ lệ đọc thông báo"
          value={fmtPercent(notifications.read_rate)}
          foot={`${fmtNumber(notifications.sent)} đã gửi · ${fmtNumber(notifications.broadcasts)} đợt`}
          icon="notifications"
          tone="blue"
        />
      </Row>

      <Section title="Cần xử lý" subtitle="Chạm để mở hàng chờ tương ứng">
        <View style={{ gap: 8 }}>
          <QuickRow
            icon="flag"
            tone="amber"
            title="Báo cáo cộng đồng chờ duyệt"
            subtitle="Xác minh hoặc từ chối báo cáo người dùng"
            count={community.pending}
            onPress={() => navigation.navigate('Community')}
          />
          <QuickRow
            icon="news"
            tone="blue"
            title="Tin chính thức chờ duyệt"
            subtitle="Duyệt tin trước khi phát hành cảnh báo"
            count={official.pending}
            onPress={() => navigation.navigate('Official')}
          />
          <QuickRow
            icon="warning"
            tone="red"
            title="Cảnh báo đang hiệu lực"
            subtitle="Kiểm tra nguồn, mức độ và thời hạn"
            count={alerts.active}
            onPress={() => navigation.navigate('Alerts')}
          />
        </View>
      </Section>

      <Section title="Lượt quét theo ngày" subtitle={`${data?.from || ''} → ${data?.to || ''}`}>
        <DayBars data={scans.by_day || []} />
      </Section>

      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Section title="Mức độ phát hiện">
            <SeverityBar data={severity} />
          </Section>
        </View>
      </Row>

      <Section title="Bệnh xuất hiện nhiều" subtitle="Không tính cây khỏe">
        <HBar items={scans.top_diseases || []} color={colors.danger} emptyLabel="Chưa ghi nhận bệnh." />
      </Section>

      <Section title="Tỉnh có nhiều lượt quét" subtitle="Suy ra từ hồ sơ người dùng">
        <HBar items={scans.top_provinces || []} color={colors.info} />
      </Section>

      <Section
        title="Tổng hợp bằng AI"
        subtitle="Sinh nhận định từ số liệu thật, không gửi dữ liệu cá nhân"
        action={
          <Button
            title={ai ? 'Tạo lại' : 'Tổng hợp'}
            icon="auto_awesome"
            size="sm"
            variant="soft"
            loading={aiBusy}
            onPress={runAi}
          />
        }
      >
        {!ai ? (
          <Text style={styles.aiHint}>
            AI sẽ đọc KPI, xu hướng quét, cảnh báo và hàng chờ duyệt trong {range} ngày,
            rồi trả về nhận định + việc cần làm. Bạn có thể lưu thành báo cáo.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.aiSummary}>{ai.report?.summary}</Text>
            {(ai.report?.highlights || []).map((item, index) => (
              <View key={`h-${index}`} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
            {(ai.report?.actions || []).length > 0 && (
              <>
                <Divider style={{ marginVertical: 4 }} />
                <Text style={styles.aiLabel}>Việc cần làm</Text>
                {(ai.report.actions || []).map((item, index) => (
                  <View key={`a-${index}`} style={styles.bulletRow}>
                    <Text style={styles.actionIndex}>{index + 1}.</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.aiMeta} numberOfLines={1}>
                {ai.model || 'AI'} · {fmtDateTime(ai.generatedAt)}
              </Text>
              <Button
                title="Lưu báo cáo"
                size="sm"
                icon="download"
                loading={saving}
                onPress={saveAi}
              />
            </Row>
          </View>
        )}
      </Section>

      <Section title="Hoạt động gần đây" subtitle="Quét, cảnh báo và báo cáo cộng đồng">
        {(data?.activity || []).length === 0 ? (
          <Text style={styles.aiHint}>Chưa có hoạt động.</Text>
        ) : (
          <View style={{ gap: 2 }}>
            {(data.activity || []).map((item, index) => {
              const tone =
                item.level === 'danger'
                  ? 'red'
                  : item.level === 'warning'
                  ? 'amber'
                  : 'green';
              return (
                <View key={`${item.type}-${item.id}-${index}`}>
                  <Row style={styles.activityRow}>
                    <View style={styles.activityIcon}>
                      <Icon name={ACTIVITY_ICON[item.type] || 'schedule'} size={15} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.activityTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    <Badge label={severityLabel(item.level)} tone={tone} />
                  </Row>
                  {index < (data.activity || []).length - 1 && <Divider />}
                </View>
              );
            })}
          </View>
        )}
      </Section>

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
    </Screen>
  );
}

function QuickRow({ icon, tone, title, subtitle, count, onPress }) {
  const toneMap = {
    amber: { bg: colors.warningSoft, fg: '#92400e' },
    blue: { bg: colors.infoSoft, fg: '#1d4ed8' },
    red: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const t = toneMap[tone] || toneMap.blue;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickRow, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={17} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.quickCount}>
        <Text style={styles.quickCountText}>{fmtNumber(count)}</Text>
      </View>
      <Icon name="chevron_right" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { fontFamily: font.medium, fontSize: 12.5, color: colors.text },
  quickSub: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  quickCount: {
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
  },
  quickCountText: { fontFamily: font.bold, fontSize: 11.5, color: colors.textSecondary },

  aiHint: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  aiSummary: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text },
  aiLabel: { fontFamily: font.semibold, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  aiMeta: { flex: 1, fontFamily: font.regular, fontSize: 10, color: colors.muted },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  actionIndex: { fontFamily: font.semibold, fontSize: 11.5, color: colors.primaryDark, width: 16 },
  bulletText: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },

  activityRow: { paddingVertical: 9, gap: 10 },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  activityTime: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 1 },
});
