/**
 * NotificationsScreen — Thông báo trong app (GĐ4a)
 *
 * Không dùng push/FCM: màn này + badge ở Trang chủ là đủ cho bản 4a.
 * Người dùng bấm vào thông báo → đánh dấu đã đọc và mở màn Cảnh báo.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import Icon from '../icons';
import { Card, Badge, Button, EmptyState, ScreenHeader } from '../components';
import { FadeInView } from '../components/motion';
import { staggerDelay } from '../utils/motion';
import { fetchNotifications, markNotificationsRead } from '../services/api';

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_META = {
  alert:   { icon: 'warning', color: '#B45309', bg: '#FEF3C7' },
  warning: { icon: 'warning', color: '#B45309', bg: '#FEF3C7' },
  success: { icon: 'check_circle', color: '#065F46', bg: '#D1FAE5' },
  error:   { icon: 'error', color: '#991B1B', bg: '#FEE2E2' },
  info:    { icon: 'notifications', color: '#0369A1', bg: '#E0F2FE' },
};

const NotificationsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await fetchNotifications(50);
      setItems(data.notifications || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (item) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      markNotificationsRead(item.id).catch(() => {});
    }
    navigation?.navigate?.('alerts');
  };

  const readAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markNotificationsRead();
    } catch {
      /* im lặng — badge sẽ tự cập nhật lần sau */
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Thông báo"
        subtitle={unread > 0 ? `${unread} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}
        onBack={() => navigation?.navigate?.('home')}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={{
          paddingTop: spacing['space-md'],
          paddingBottom: BOTTOM_NAV_HEIGHT + spacing['space-xl'],
          paddingHorizontal: spacing.gutter,
          gap: 10,
        }}>

        {unread > 0 ? (
          <Button variant="outline" onPress={readAll} iconName="check_circle" style={{ alignSelf: 'flex-start' }}>
            Đọc tất cả
          </Button>
        ) : null}

        {loading ? (
          <EmptyState message="Đang tải..." />
        ) : items.length === 0 ? (
          <EmptyState
            message="Chưa có thông báo nào."
            subMessage="Khi có cảnh báo cộng đồng tại khu vực bạn theo dõi, thông báo sẽ xuất hiện ở đây."
          />
        ) : (
          items.map((n, index) => {
            const meta = TYPE_META[n.type] || TYPE_META.info;
            return (
              <FadeInView key={n.id} delay={staggerDelay(index)} translateY={8}>
                <Card padding={14} onPress={() => open(n)} style={[styles.card, !n.isRead && styles.unread]}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                      <Icon name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Text
                          style={[typography.body.md, { color: colors['on-surface'], fontWeight: '700', flex: 1 }]}
                          numberOfLines={2}>
                          {n.title}
                        </Text>
                        {!n.isRead ? <Badge color="#0369A1" bgColor="#E0F2FE">Mới</Badge> : null}
                      </View>
                      <Text style={[typography.body.md, { color: colors['on-surface-variant'], lineHeight: 20 }]}>
                        {n.body}
                      </Text>
                      <Text style={[typography.body.sm, { color: colors.muted, marginTop: 6 }]}>
                        {formatDateTime(n.createdAt)}
                      </Text>
                    </View>
                  </View>
              </Card>
              </FadeInView>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: colors['primary-fixed'],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationsScreen;
