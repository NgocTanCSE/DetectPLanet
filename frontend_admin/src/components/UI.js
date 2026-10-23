import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '../icons';
import { colors, font, radius, shadow, spacing } from '../theme';
import { MOTION, useReduceMotion } from '../utils/motion';

const TONES = {
  green: { bg: colors.primarySoft, fg: colors.primaryDark },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  amber: { bg: colors.warningSoft, fg: '#92400e' },
  blue: { bg: colors.infoSoft, fg: '#1d4ed8' },
  purple: { bg: colors.purpleSoft, fg: '#6d28d9' },
  slate: { bg: colors.surfaceHigh, fg: colors.textSecondary },
};

export function Screen({ children, refreshing, onRefresh, contentStyle }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, subtitle, action, children, style, noPad }) {
  return (
    <View style={[styles.card, style]}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            {!!title && <Text style={styles.sectionTitle}>{title}</Text>}
            {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
          </View>
          {action}
        </View>
      )}
      <View style={noPad ? null : styles.sectionBody}>{children}</View>
    </View>
  );
}

export function Row({ children, style, gap = 8 }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function Badge({ label, tone = 'slate', style }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.paper, fg: colors.text, border: colors.borderStrong },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    soft: { bg: colors.primarySoft, fg: colors.primaryDark, border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
  }[variant];
  const height = size === 'sm' ? 34 : 44;
  const isDisabled = disabled || loading;
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (isDisabled || reduceMotion) return;
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: MOTION.useNativeDriver,
      speed: 20,
      bounciness: 5,
    }).start();
  };
  const onPressOut = () => {
    if (isDisabled || reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: MOTION.useNativeDriver,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : reduceMotion && pressed ? 0.85 : 1,
          paddingHorizontal: size === 'sm' ? 12 : 16,
        },
        style,
      ]}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, transform: [{ scale }] }}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <>
            {!!icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={palette.fg} />}
            <Text
              style={[
                styles.buttonText,
                { color: palette.fg, fontSize: size === 'sm' ? 12.5 : 13.5 },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function IconButton({ name, onPress, color = colors.textSecondary, size = 18, style, disabled }) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled || reduceMotion) return;
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: MOTION.useNativeDriver,
      speed: 20,
      bounciness: 5,
    }).start();
  };
  const onPressOut = () => {
    if (disabled || reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: MOTION.useNativeDriver,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.4 : reduceMotion && pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
        <Icon name={name} size={size} color={color} />
      </Animated.View>
    </Pressable>
  );
}

export function StatCard({ label, value, foot, icon, tone = 'slate' }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <View style={styles.statCard}>
      <Row gap={6}>
        {!!icon && (
          <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
            <Icon name={icon} size={13} color={t.fg} />
          </View>
        )}
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </Row>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!foot && (
        <Text style={styles.statFoot} numberOfLines={2}>
          {foot}
        </Text>
      )}
    </View>
  );
}

export function Input({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize = 'none',
  secureTextEntry,
  style,
  inputStyle,
  maxLength,
  editable = true,
}) {
  return (
    <View style={[styles.field, style]}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={editable}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && { backgroundColor: colors.surfaceHigh },
          inputStyle,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

export function Select({ label, hint, value, options, onChange, placeholder = 'Chọn…', style, disabled }) {
  const [open, setOpen] = React.useState(false);
  const current = (options || []).find((opt) => String(opt.value) === String(value));

  return (
    <View style={[styles.field, style]}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          styles.select,
          { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        <Text
          style={[styles.selectText, !current && { color: colors.muted }]}
          numberOfLines={1}
        >
          {current ? current.label : placeholder}
        </Text>
        <Icon name="expand_more" size={16} color={colors.muted} />
      </Pressable>
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}

      <ModalSheet
        visible={open}
        title={label || 'Chọn giá trị'}
        onClose={() => setOpen(false)}
        maxHeight="70%"
      >
        {(options || []).map((opt) => {
          const active = String(opt.value) === String(value);
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.option,
                active && { backgroundColor: colors.primarySoft },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.optionText, active && { color: colors.primaryDark, fontFamily: font.semibold }]}>
                {opt.label}
              </Text>
              {active && <Icon name="check" size={16} color={colors.primaryDark} />}
            </Pressable>
          );
        })}
      </ModalSheet>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onValueChange }) {
  return (
    <Row style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
      </View>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.white}
      />
    </Row>
  );
}

export function Tabs({ tabs, value, onChange, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.tabs}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
              {tab.count !== undefined ? ` · ${tab.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((opt) => {
        const active = String(opt.value) === String(value);
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Tìm kiếm…', onSubmitEditing }) {
  return (
    <View style={styles.searchBar}>
      <Icon name="search" size={16} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="close" size={15} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ icon = 'search', title, message, action }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={22} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!message && <Text style={styles.emptyMessage}>{message}</Text>}
      {action}
    </View>
  );
}

export function Loading({ rows = 3, label = 'Đang tải…' }) {
  return (
    <View style={{ paddingVertical: 18 }}>
      <Row style={{ justifyContent: 'center', marginBottom: 12 }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.hint}>{label}</Text>
      </Row>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.skeleton}>
          <View style={[styles.skeletonLine, { width: `${80 - index * 8}%` }]} />
          <View style={[styles.skeletonLine, { width: `${55 - index * 4}%`, marginTop: 7 }]} />
        </View>
      ))}
    </View>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <View style={styles.errorBox}>
      <Icon name="warning" size={17} color={colors.danger} />
      <Text style={styles.errorText}>{error.message || String(error)}</Text>
      {!!onRetry && (
        <Button title="Thử lại" size="sm" onPress={onRetry} style={{ marginLeft: 'auto' }} />
      )}
    </View>
  );
}

export function KeyValue({ rows, style }) {
  return (
    <View style={[styles.kv, style]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.kvRow}>
          <Text style={styles.kvLabel}>{row.label}</Text>
          <Text style={[styles.kvValue, row.mono && styles.mono]} numberOfLines={row.lines || 2}>
            {row.value === undefined || row.value === null || row.value === '' ? '—' : row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Avatar({ name, email, size = 40 }) {
  const label = String(name || email || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const text =
    label.length >= 2
      ? `${label[0][0]}${label[label.length - 1][0]}`.toUpperCase()
      : String(name || email || '?').slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.34, color: colors.primaryDark }}>
        {text}
      </Text>
    </View>
  );
}

export function Pagination({ page, perPage, total, onPage }) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <Row style={styles.pagination}>
      <Text style={styles.paginationText}>
        {from}–{to} / {total}
      </Text>
      <Row gap={6}>
        <Button
          title="Trước"
          size="sm"
          variant="ghost"
          disabled={page <= 1}
          onPress={() => onPage(page - 1)}
        />
        <Text style={styles.paginationText}>
          {page}/{totalPages}
        </Text>
        <Button
          title="Sau"
          size="sm"
          variant="ghost"
          disabled={page >= totalPages}
          onPress={() => onPage(page + 1)}
        />
      </Row>
    </Row>
  );
}

export function ProgressBar({ value, color = colors.primary, height = 6 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ height, backgroundColor: colors.surfaceHigh, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function ModalSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxHeight = '88%',
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={[styles.sheet, { maxHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {!!subtitle && <Text style={styles.sheetSub}>{subtitle}</Text>}
              </View>
              <IconButton name="close" onPress={onClose} />
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {!!footer && <View style={styles.sheetFooter}>{footer}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, paddingBottom: 40, gap: 14 },

  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  sectionSub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  sectionBody: { padding: 16 },

  divider: { height: 1, backgroundColor: colors.border },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: font.semibold, fontSize: 10.5 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonText: { fontFamily: font.semibold },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadow.card,
  },
  statIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontFamily: font.medium, fontSize: 11, color: colors.textSecondary, flexShrink: 1 },
  statValue: { fontFamily: font.bold, fontSize: 21, color: colors.text, marginTop: 6 },
  statFoot: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 3 },

  field: { gap: 6 },
  fieldLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.textSecondary },
  fieldHint: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 13.5,
    color: colors.text,
    backgroundColor: colors.paper,
  },
  inputMultiline: { minHeight: 92 },
  select: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.paper,
  },
  selectText: { fontFamily: font.regular, fontSize: 13.5, color: colors.text, flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  optionText: { fontFamily: font.regular, fontSize: 13.5, color: colors.text },

  toggleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: { fontFamily: font.medium, fontSize: 13, color: colors.text },

  tabs: { gap: 6, paddingVertical: 2 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { fontFamily: font.medium, fontSize: 11.5, color: colors.textSecondary },
  tabTextActive: { color: colors.primaryDark },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.paper, ...shadow.card },
  segmentText: { fontFamily: font.medium, fontSize: 11.5, color: colors.textSecondary },
  segmentTextActive: { color: colors.text },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.paper,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },

  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.text },
  emptyMessage: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },

  hint: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  mono: { fontFamily: 'monospace' },

  skeleton: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  skeletonLine: { height: 9, borderRadius: 5, backgroundColor: colors.surfaceHigh },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { flex: 1, fontFamily: font.regular, fontSize: 11.5, color: '#991c1c' },

  kv: { gap: 2 },
  kvRow: { flexDirection: 'row', gap: 12, paddingVertical: 5 },
  kvLabel: { width: 112, fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  kvValue: { flex: 1, fontFamily: font.medium, fontSize: 12, color: colors.text },

  pagination: {
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paginationText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  modalWrap: { width: '100%' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    ...shadow.modal,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  sheetSub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  sheetBody: { padding: 18, gap: 12 },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'android' ? 18 : 26,
  },
});

export default {
  Screen,
  Card,
  Section,
  Row,
  Divider,
  Badge,
  Button,
  IconButton,
  StatCard,
  Input,
  Select,
  ToggleRow,
  Tabs,
  Segmented,
  SearchBar,
  Empty,
  Loading,
  ErrorBox,
  KeyValue,
  Avatar,
  Pagination,
  ProgressBar,
  ModalSheet,
};
