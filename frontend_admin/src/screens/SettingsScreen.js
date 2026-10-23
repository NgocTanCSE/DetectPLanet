import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, getAdminToken, getApiBase, saveConfig } from '../api/client';
import { DEFAULT_ADMIN_TOKEN, DEFAULT_API_BASE } from '../config';
import { useToast } from '../components/Toast';
import Icon from '../icons';
import { colors, font, radius } from '../theme';
import {
  Badge,
  Button,
  Divider,
  Input,
  KeyValue,
  Row,
  Screen,
  Section,
} from '../components/UI';

export default function SettingsScreen() {
  const toast = useToast();
  const [base, setBase] = useState(getApiBase());
  const [token, setToken] = useState(getAdminToken());
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState(null);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveConfig({ base, token });
      toast.success('Đã lưu cấu hình kết nối.');
    } catch (err) {
      toast.error(err.message || 'Không lưu được cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setHealth(null);
    try {
      await saveConfig({ base, token });
      const result = await api.get('/admin/system');
      setHealth(result);
      toast.success('Kết nối API thành công.');
    } catch (err) {
      toast.error(err.message || 'Không kết nối được API.');
    } finally {
      setTesting(false);
    }
  };

  const useBuildDefaults = () => {
    setBase(DEFAULT_API_BASE);
    setToken(DEFAULT_ADMIN_TOKEN);
    toast.info('Đã điền giá trị nhúng lúc build.');
  };

  return (
    <Screen>
      <Section
        title="Kết nối API"
        subtitle="Địa chỉ backend và token quản trị"
      >
        <View style={{ gap: 12 }}>
          <Input
            label="API base URL"
            value={base}
            onChangeText={setBase}
            placeholder="http://10.0.2.2:887"
            keyboardType="url"
            hint="Emulator Android dùng 10.0.2.2; máy thật dùng IP LAN của máy chủ."
          />
          <View>
            <Input
              label="Admin token"
              value={token}
              onChangeText={setToken}
              placeholder="X-Admin-Token"
              secureTextEntry={!showToken}
              autoCapitalize="none"
              hint={`${token ? token.length : 0} ký tự · gửi qua header X-Admin-Token`}
            />
            <Button
              title={showToken ? 'Ẩn token' : 'Hiện token'}
              variant="ghost"
              size="sm"
              icon={showToken ? 'eye' : 'shield'}
              onPress={() => setShowToken((v) => !v)}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            />
          </View>
        </View>

        <Row gap={8} style={{ marginTop: 14 }}>
          <Button
            title="Lưu cấu hình"
            icon="check"
            onPress={onSave}
            loading={saving}
            style={{ flex: 1 }}
          />
          <Button
            title="Kiểm tra"
            icon="sync"
            variant="soft"
            onPress={onTest}
            loading={testing}
            style={{ flex: 1 }}
          />
        </Row>
        <Button
          title="Dùng giá trị nhúng lúc build"
          variant="ghost"
          size="sm"
          onPress={useBuildDefaults}
          style={{ alignSelf: 'flex-start', marginTop: 8 }}
        />
      </Section>

      {!!health && (
        <Section title="Kết quả kiểm tra" subtitle="Phản hồi từ /admin/system">
          <Row gap={8} style={{ marginBottom: 12 }}>
            <Badge label={health.db?.connected ? 'DB kết nối' : 'DB lỗi'} tone={health.db?.connected ? 'green' : 'red'} />
            <Badge
              label={health.ai?.configured ? 'AI sẵn sàng' : 'AI chưa cấu hình'}
              tone={health.ai?.configured ? 'green' : 'amber'}
            />
            <Badge label={`${(health.jobs || []).length} job`} tone="blue" />
          </Row>
          <KeyValue
            rows={[
              { label: 'Chat model', value: health.ai?.chat_model },
              { label: 'Vision model', value: health.ai?.vision_model },
              { label: 'Timeout AI', value: `${health.ai?.timeout || 0}s` },
              { label: 'Bắt buộc auth', value: health.auth?.require_auth ? 'Có' : 'Không' },
              { label: 'Bắt buộc login', value: health.auth?.require_login ? 'Có' : 'Không' },
            ]}
          />
        </Section>
      )}

      <Section title="Quyền truy cập" subtitle="App nội bộ, không có màn đăng nhập">
        <View style={styles.noteRow}>
          <View style={styles.noteIcon}>
            <Icon name="shield" size={16} color={colors.primaryDark} />
          </View>
          <Text style={styles.noteText}>
            Mọi request gửi kèm header X-Admin-Token. Token được lưu trong
            EncryptedStorage của thiết bị và không hiển thị cho người dùng cuối.
            Không chia sẻ APK admin ra ngoài.
          </Text>
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <KeyValue
          rows={[
            { label: 'Package', value: 'com.agriscan.admin', mono: true },
            { label: 'Phiên bản', value: '1.0.0' },
            { label: 'Nền tảng', value: 'React Native CLI' },
            { label: 'Backend', value: 'AgriScan API v1' },
          ]}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
