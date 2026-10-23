import React, { useCallback, useEffect, useState } from 'react';
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
  Divider,
  ErrorBox,
  KeyValue,
  Loading,
  Row,
  Screen,
  Section,
  StatCard,
} from '../components/UI';
import {
  fmtDateTime,
  fmtNumber,
  timeAgo,
} from '../utils/format';

export default function SystemScreen() {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [runningJob, setRunningJob] = useState(null);

  const { data, loading, error, reload } = useApi('/admin/system');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  const runJob = async (jobName) => {
    setRunningJob(jobName);
    try {
      await api.post('/admin/jobs/run', { job: jobName });
      toast.success(`Đã chạy job ${jobName}.`);
      await reload(true);
    } catch (err) {
      toast.error(err.message || `Không chạy được job ${jobName}.`);
    } finally {
      setRunningJob(null);
    }
  };

  if (loading && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Loading rows={4} label="Đang tải trạng thái hệ thống…" />
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

  const jobs = data?.jobs || [];
  const counts = data?.counts || {};
  const auth = data?.auth || {};

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Section title="Sức khoẻ dịch vụ">
        <Row gap={8}>
          <Badge label={data?.db?.connected ? 'PostgreSQL kết nối' : 'PostgreSQL lỗi'} tone={data?.db?.connected ? 'green' : 'red'} />
          <Badge
            label={data?.ai?.configured ? 'Cloudflare AI sẵn sàng' : 'AI chưa cấu hình'}
            tone={data?.ai?.configured ? 'green' : 'amber'}
          />
          <Badge label={`ADMIN_TOKEN: ${auth.admin_token ? 'có' : 'thiếu'}`} tone={auth.admin_token ? 'green' : 'red'} />
        </Row>
        <KeyValue
          rows={[
            { label: 'Chat model', value: data?.ai?.chat_model },
            { label: 'Vision model', value: data?.ai?.vision_model },
            { label: 'Timeout AI', value: `${data?.ai?.timeout || 0}s` },
            { label: 'Bắt buộc auth', value: auth.require_auth ? 'Có' : 'Không' },
            { label: 'Bắt buộc login', value: auth.require_login ? 'Có' : 'Không' },
            { label: 'Thời gian máy chủ', value: data?.time ? fmtDateTime(data.time) : '—' },
          ]}
        />
      </Section>

      <Section title="Job scheduler" subtitle={`${jobs.length} job đã đăng ký`}>
        <View style={{ gap: 8 }}>
          {jobs.map((job) => (
            <Card key={job.name} style={styles.jobCard}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <Text style={styles.jobName} numberOfLines={1}>{job.name}</Text>
                    <Badge
                      label={
                        job.lastStatus === 'ok'
                          ? 'OK'
                          : job.lastStatus === 'error'
                          ? 'Lỗi'
                          : job.lastStatus === 'running'
                          ? 'Đang chạy'
                          : 'Chưa chạy'
                      }
                      tone={
                        job.lastStatus === 'ok'
                          ? 'green'
                          : job.lastStatus === 'error'
                          ? 'red'
                          : 'amber'
                      }
                    />
                  </Row>
                  <Text style={styles.jobMeta} numberOfLines={1}>
                    Lần chạy gần nhất: {job.lastRunAt ? timeAgo(job.lastRunAt) : 'chưa bao giờ'}
                    {job.lastDurationMs && ` · ${Math.round(job.lastDurationMs / 1000)}s`}
                  </Text>
                  {job.lastMessage && (
                    <Text style={styles.jobMsg} numberOfLines={3}>
                      {job.lastMessage}
                    </Text>
                  )}
                </View>
                <Button
                  title="Chạy"
                  size="sm"
                  icon="play_arrow"
                  variant={runningJob === job.name ? 'soft' : 'secondary'}
                  loading={runningJob === job.name}
                  onPress={() => runJob(job.name)}
                />
              </Row>
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Số lượng bản ghi">
        <Row gap={12}>
          <StatCard label="Người dùng" value={fmtNumber(counts.users)} icon="users" tone="blue" />
          <StatCard label="Lượt quét" value={fmtNumber(counts.scans)} icon="camera" tone="green" />
        </Row>
        <Row gap={12}>
          <StatCard label="Cẩm nang" value={fmtNumber(counts.guides)} icon="menu_book" tone="purple" />
          <StatCard label="Cảnh báo" value={fmtNumber(counts.crop_disease_alerts)} icon="warning" tone="amber" />
        </Row>
        <Row gap={12}>
          <StatCard label="Báo cáo cộng đồng" value={fmtNumber(counts.disease_reports)} icon="flag" tone="red" />
          <StatCard label="Thông báo" value={fmtNumber(counts.notifications)} icon="notifications" tone="blue" />
        </Row>
        <Row gap={12}>
          <StatCard label="Báo cáo AI" value={fmtNumber(counts.admin_reports)} icon="auto_awesome" tone="purple" />
        </Row>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  jobCard: { padding: 12, gap: 6 },
  jobName: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.text },
  jobMeta: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  jobMsg: {
    fontFamily: 'monospace',
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 4,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.sm,
    padding: 8,
  },
});