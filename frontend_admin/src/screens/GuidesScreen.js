import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
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
  Loading,
  ModalSheet,
  Row,
  Screen,
  Section,
  ToggleRow,
} from '../components/UI';

export default function GuidesScreen() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/admin/guides');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const items = data?.items || [];
  const selected = items.find((g) => g.id === selectedId);

  useEffect(() => {
    if (selectedId && data && !selected) setSelectedId(null);
  }, [data, selectedId, selected]);

  const togglePublished = async (guide, value) => {
    try {
      await api.patch(`/admin/guides/${guide.id}`, { is_published: value });
      toast.success(value ? 'Đã xuất bản cẩm nang.' : 'Đã ẩn cẩm nang.');
      await reload(true);
    } catch (err) {
      toast.error(err.message || 'Không đổi được trạng thái.');
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.count}>{items.length} cẩm nang</Text>
        <Button title="Thêm cẩm nang" icon="plus" size="sm" onPress={() => setCreateOpen(true)} />
      </Row>

      {!!error && <ErrorBox error={error} onRetry={() => reload()} />}
      {loading && !data ? <Loading rows={4} label="Đang tải cẩm nang…" /> : null}

      <View style={{ gap: 10 }}>
        {items.map((guide) => (
          <Card key={guide.id} style={styles.card}>
            <Pressable
              onPress={() => setSelectedId(guide.id)}
              style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconBox}>
                <Icon name={guide.icon || 'menu_book'} size={19} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6}>
                  <Text style={styles.title} numberOfLines={1}>
                    {guide.title}
                  </Text>
                  <Badge
                    label={guide.isPublished ? 'Đang hiện' : 'Đang ẩn'}
                    tone={guide.isPublished ? 'green' : 'slate'}
                  />
                </Row>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {guide.subtitle || 'Không có mô tả'}
                </Text>
                <Text style={styles.meta}>
                  {guide.sections?.length || 0} mục · thứ tự {guide.sortOrder}
                </Text>
              </View>
              <Icon name="chevron_right" size={16} color={colors.muted} />
            </Pressable>
            <View style={styles.switchWrap}>
              <Switch
                value={!!guide.isPublished}
                onValueChange={(value) => togglePublished(guide, value)}
                trackColor={{ false: colors.borderStrong, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </Card>
        ))}
      </View>

      {!!selected && (
        <GuideEditor
          key={`${selected.id}-${selected.updatedAt}`}
          guide={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => reload(true)}
        />
      )}

      <CreateGuideModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => reload(true)}
      />
    </Screen>
  );
}

function CreateGuideModal({ visible, onClose, onDone }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [icon, setIcon] = useState('menu_book');
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Nhập tiêu đề cẩm nang.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/guides', {
        title: title.trim(),
        subtitle: subtitle.trim(),
        icon: icon.trim() || 'menu_book',
        is_published: published,
      });
      toast.success('Đã tạo cẩm nang.');
      onDone?.();
      onClose();
      setTitle('');
      setSubtitle('');
      setIcon('menu_book');
      setPublished(true);
    } catch (err) {
      toast.error(err.message || 'Không tạo được cẩm nang.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      title="Thêm cẩm nang"
      onClose={onClose}
      footer={
        <>
          <Button title="Huỷ" variant="secondary" onPress={onClose} />
          <Button title="Tạo" icon="plus" loading={saving} onPress={submit} />
        </>
      }
    >
      <Input label="Tiêu đề *" value={title} onChangeText={setTitle} placeholder="Nhận biết bệnh trên lúa" />
      <Input label="Mô tả ngắn" value={subtitle} onChangeText={setSubtitle} placeholder="Dấu hiệu, cách xử lý…" />
      <Input label="Icon" value={icon} onChangeText={setIcon} hint="Tên icon nội bộ, ví dụ menu_book" />
      <ToggleRow label="Xuất bản ngay" value={published} onValueChange={setPublished} />
    </ModalSheet>
  );
}

function GuideEditor({ guide, onClose, onChanged }) {
  const toast = useToast();
  const [title, setTitle] = useState(guide.title || '');
  const [subtitle, setSubtitle] = useState(guide.subtitle || '');
  const [icon, setIcon] = useState(guide.icon || '');
  const [sortOrder, setSortOrder] = useState(String(guide.sortOrder ?? 0));
  const [published, setPublished] = useState(!!guide.isPublished);
  const [sections, setSections] = useState(guide.sections || []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSections(guide.sections || []);
  }, [guide.sections]);

  const saveGuide = async () => {
    if (!title.trim()) {
      toast.error('Tiêu đề không được để trống.');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/admin/guides/${guide.id}`, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        icon: icon.trim(),
        sort_order: Number(sortOrder) || 0,
        is_published: published,
      });
      toast.success('Đã lưu cẩm nang.');
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Không lưu được cẩm nang.');
    } finally {
      setBusy(false);
    }
  };

  const deleteGuide = () => {
    Alert.alert('Xoá cẩm nang?', 'Toàn bộ mục bên trong cũng bị xoá và không khôi phục được.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.del(`/admin/guides/${guide.id}`);
            toast.success('Đã xoá cẩm nang.');
            onClose();
            onChanged?.();
          } catch (err) {
            toast.error(err.message || 'Không xoá được cẩm nang.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const saveSection = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Nhập tiêu đề và nội dung mục.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        icon: form.icon.trim(),
        title: form.title.trim(),
        body: form.body,
        badge: form.badge.trim(),
        badge_bg: form.badge_bg.trim(),
        badge_text: form.badge_text.trim(),
        bg: form.bg.trim(),
      };
      if (form.id) {
        await api.patch(`/admin/guides/${guide.id}/sections/${form.id}`, payload);
        toast.success('Đã lưu mục.');
      } else {
        await api.post(`/admin/guides/${guide.id}/sections`, payload);
        toast.success('Đã thêm mục.');
      }
      setForm(null);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Không lưu được mục.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSection = (section) => {
    Alert.alert('Xoá mục?', section.title, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/admin/guides/${guide.id}/sections/${section.id}`);
            toast.success('Đã xoá mục.');
            onChanged?.();
          } catch (err) {
            toast.error(err.message || 'Không xoá được mục.');
          }
        },
      },
    ]);
  };

  const moveSection = async (index, direction) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    try {
      await api.post(`/admin/guides/${guide.id}/sections/reorder`, {
        order: next.map((s) => s.id),
      });
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Không đổi được thứ tự.');
      setSections(guide.sections || []);
    }
  };

  return (
    <ModalSheet
      visible
      title={guide.title}
      subtitle={`Mã ${guide.id} · ${sections.length} mục`}
      onClose={onClose}
      maxHeight="94%"
      footer={
        <>
          <Button title="Xoá" variant="ghost" icon="trash" onPress={deleteGuide} disabled={busy} />
          <Button title="Lưu cẩm nang" icon="check" loading={busy} onPress={saveGuide} />
        </>
      }
    >
      <Section title="Thông tin cẩm nang" noPad>
        <View style={{ padding: 12, gap: 12 }}>
          <Input label="Tiêu đề" value={title} onChangeText={setTitle} />
          <Input label="Mô tả" value={subtitle} onChangeText={setSubtitle} />
          <Row gap={8}>
            <Input label="Icon" value={icon} onChangeText={setIcon} style={{ flex: 1 }} />
            <Input
              label="Thứ tự"
              value={sortOrder}
              onChangeText={setSortOrder}
              keyboardType="number-pad"
              style={{ width: 90 }}
            />
          </Row>
          <ToggleRow label="Đang xuất bản" value={published} onValueChange={setPublished} />
        </View>
      </Section>

      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={styles.blockTitle}>Các mục ({sections.length})</Text>
        <Button
          title="Thêm mục"
          size="sm"
          icon="plus"
          variant="soft"
          onPress={() =>
            setForm({
              id: null,
              icon: 'lens_blur',
              title: '',
              body: '',
              badge: '',
              badge_bg: '',
              badge_text: '',
              bg: '',
            })
          }
        />
      </Row>

      {!!form && (
        <View style={styles.formBox}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.formTitle}>{form.id ? `Sửa mục #${form.id}` : 'Mục mới'}</Text>
            <Pressable onPress={() => setForm(null)} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </Row>
          <Input
            label="Tiêu đề *"
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />
          <Input
            label="Nội dung *"
            value={form.body}
            onChangeText={(v) => setForm({ ...form, body: v })}
            multiline
          />
          <Row gap={8}>
            <Input
              label="Icon"
              value={form.icon}
              onChangeText={(v) => setForm({ ...form, icon: v })}
              style={{ flex: 1 }}
            />
            <Input
              label="Badge"
              value={form.badge}
              onChangeText={(v) => setForm({ ...form, badge: v })}
              style={{ flex: 1 }}
            />
          </Row>
          <Row gap={8}>
            <Input
              label="Badge nền"
              value={form.badge_bg}
              onChangeText={(v) => setForm({ ...form, badge_bg: v })}
              style={{ flex: 1 }}
              placeholder="#dcfce7"
            />
            <Input
              label="Badge chữ"
              value={form.badge_text}
              onChangeText={(v) => setForm({ ...form, badge_text: v })}
              style={{ flex: 1 }}
              placeholder="#166534"
            />
          </Row>
          <Input
            label="Màu nền mục"
            value={form.bg}
            onChangeText={(v) => setForm({ ...form, bg: v })}
            placeholder="#f8fafc"
          />
          <Row gap={8} style={{ justifyContent: 'flex-end' }}>
            <Button title="Huỷ" size="sm" variant="secondary" onPress={() => setForm(null)} />
            <Button title="Lưu mục" size="sm" icon="check" loading={busy} onPress={saveSection} />
          </Row>
        </View>
      )}

      <View style={{ gap: 8 }}>
        {sections.map((section, index) => (
          <View key={section.id} style={styles.sectionRow}>
            <View style={styles.sectionOrder}>
              <Text style={styles.sectionOrderText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Row gap={6}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {section.title}
                </Text>
                {!!section.badge && <Badge label={section.badge} tone="green" />}
              </Row>
              <Text style={styles.sectionBody} numberOfLines={2}>
                {section.body}
              </Text>
            </View>
            <View style={styles.sectionActions}>
              <Pressable onPress={() => moveSection(index, -1)} hitSlop={6} style={styles.miniBtn}>
                <Icon name="arrow_up" size={14} color={colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => moveSection(index, 1)} hitSlop={6} style={styles.miniBtn}>
                <Icon name="arrow_down" size={14} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => setForm({ ...section })}
                hitSlop={6}
                style={styles.miniBtn}
              >
                <Icon name="edit" size={14} color={colors.info} />
              </Pressable>
              <Pressable onPress={() => deleteSection(section)} hitSlop={6} style={styles.miniBtn}>
                <Icon name="trash" size={14} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ))}
        {sections.length === 0 && (
          <Text style={styles.emptyText}>Chưa có mục nào. Bấm “Thêm mục” để bắt đầu.</Text>
        )}
      </View>

      <Divider style={{ marginTop: 6 }} />
      <Text style={styles.hint}>
        Thứ tự mục được lưu ngay khi bấm mũi tên. Nội dung hỗ trợ xuống dòng; app người dùng hiển thị
        theo đúng thứ tự này.
      </Text>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: font.medium, fontSize: 12, color: colors.textSecondary },
  card: { padding: 0, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: colors.text },
  subtitle: { fontFamily: font.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  meta: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 3 },
  switchWrap: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    transform: [{ scale: 0.75 }],
  },

  blockTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  formBox: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 12,
    gap: 10,
  },
  formTitle: { fontFamily: font.semibold, fontSize: 12, color: colors.text },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  sectionOrder: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionOrderText: { fontFamily: font.bold, fontSize: 10.5, color: colors.textSecondary },
  sectionTitle: { flexShrink: 1, fontFamily: font.medium, fontSize: 11.5, color: colors.text },
  sectionBody: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  sectionActions: { flexDirection: 'row', gap: 2 },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  hint: { fontFamily: font.regular, fontSize: 10.5, lineHeight: 16, color: colors.muted },
});
