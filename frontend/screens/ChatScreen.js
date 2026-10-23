/**
 * ChatScreen — AI chat for plant disease Q&A (Minimalist Redesign)
 *
 * Uses Cloudflare Workers AI (chat model) via PHP API proxy.
 * Single method of interaction: text chat with the AI assistant.
 * White canvas, light chat bubbles, green accent for user messages and CTAs.
 *
 * Minimalist redesign: the psychology avatar icon is replaced with a
 * green-dot mark. The send button uses "Gửi" text on a green pill.
 * The refresh action is a text-only button in the inline title bar.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography, interactive, iconSize } from '../utils/theme';
import Icon from '../icons';
import { chatWithAI, fetchChatHistory, clearChatHistory } from '../services/api';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import { Button, ScreenHeader } from '../components';
import { FadeInView } from '../components/motion';
import { staggerDelay } from '../utils/motion';

const isWeb = Platform.OS === 'web';

/** Light markdown cleanup for Cloudflare AI replies (###, **bold**, "- " lists). */
function cleanMarkdown(text) {
  return String(text || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ');
}

/** Bold segments for **...** without pulling in a markdown renderer. */
function renderInline(text, baseStyle) {
  return cleanMarkdown(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={[baseStyle, { fontWeight: '700', fontFamily: 'Inter-SemiBold' }]}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return (
        <Text key={i} style={baseStyle}>
          {part}
        </Text>
      );
    });
}

const SYSTEM_PROMPT = 'Bạn là trợ lý AI AgriScan, chuyên về nông nghiệp và trồng trọt. Trả lời ngắn gọn, thực tế, bằng tiếng Việt.';

/** @returns {Array<{role: 'system'|'user'|'assistant', content: string}>} */
const initialMessages = [
  { role: 'system', content: SYSTEM_PROMPT, timestamp: 'init-0' },
  {
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý AgriScan AI. Tôi có thể giúp bạn tư vấn về bệnh thực vật, chăm sóc cây trồng, và phòng tránh sâu bệnh. Bạn cần hỗ trợ gì hôm nay?',
    timestamp: 'init-1',
  },
];

// Token of the last diagnosis already pushed into the chat. Kept at module
// level so switching back to the Chat tab does not resend the old context.
let lastConsumedContext = '';

const SEVERITY_LABEL = {
  healthy: 'Lá khỏe',
  warning: 'Cần chú ý',
  danger: 'Nguy hiểm',
};

/**
 * Build the first message sent to the assistant when the user taps
 * "Hỏi AI về kết quả này" on the result screen.
 */
function buildContextPrompt(ctx) {
  const lines = ['Kết quả chẩn đoán từ mẫu lá tôi vừa quét:'];
  if (ctx.crop) lines.push(`- Cây trồng: ${ctx.crop}`);
  if (ctx.disease) lines.push(`- Bệnh: ${ctx.disease}`);
  if (ctx.pathogen) lines.push(`- Tác nhân: ${ctx.pathogen}`);
  if (ctx.severity) lines.push(`- Mức độ: ${SEVERITY_LABEL[ctx.severity] || ctx.severity}`);
  if (ctx.confidence) {
    const conf = String(ctx.confidence).replace(/\.0+$/, '');
    lines.push(`- Độ tin cậy: ${conf.includes('%') ? conf : `${conf}%`}`);
  }
  if (ctx.recommendation) lines.push(`- Gợi ý ban đầu: ${ctx.recommendation}`);
  lines.push('');
  lines.push(
    'Hãy tư vấn cách xử lý ngay và cách phòng bệnh cho vụ sau: ưu tiên biện pháp canh tác, sinh học; '
    + 'nếu cần thuốc bảo vệ thực vật thì nêu hoạt chất và lưu ý thời gian cách ly.',
  );
  return lines.join('\n');
}

export default function ChatScreen({ navigation, route }) {
  const scanContext = navigation?.params?.scanContext || route?.params?.scanContext || null;
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const scrollViewRef = useRef(null);
  const seededRef = useRef('');

  useEffect(() => {
    // Scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const runChat = async (baseMessages, text) => {
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const newMessages = [...baseMessages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history to backend → Cloudflare Workers AI
      const response = await chatWithAI(newMessages);
      const assistantMsg = { role: 'assistant', content: response.content, timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    runChat(messages, input.trim());
  };

  // Nạp lịch sử chat đã lưu của tài khoản này (nếu có).
  useEffect(() => {
    if (scanContext) return; // mở từ kết quả quét → bắt đầu luồng mới
    let alive = true;
    (async () => {
      try {
        const res = await fetchChatHistory();
        const items = (res.messages || [])
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
          .map((m, i) => ({
            role: m.role,
            content: m.content,
            timestamp: m.createdAt || `history-${i}`,
          }));
        if (alive && items.length) {
          setMessages([{ role: 'system', content: SYSTEM_PROMPT, timestamp: 'init-0' }, ...items]);
        }
      } catch {
        /* không có mạng / chưa đăng nhập → giữ lời chào mặc định */
      }
    })();
    return () => { alive = false; };
  }, []);

  // "Cuộc trò chuyện mới": xoá cả trên máy chủ để không hiện lại khi mở app.
  const startNewConversation = async () => {
    setMessages(initialMessages);
    try {
      await clearChatHistory();
    } catch {
      /* xoá thất bại thì vẫn reset giao diện */
    }
  };

  // Opened from "Hỏi AI về kết quả này" → seed the chat with the diagnosis
  // and let the assistant answer right away (only once per mount).
  const contextKey = scanContext
    ? `${scanContext.at || ''}|${scanContext.id || ''}|${scanContext.disease || ''}`
    : '';

  useEffect(() => {
    if (!scanContext || !contextKey) return;
    if (seededRef.current === contextKey || lastConsumedContext === contextKey) return;
    seededRef.current = contextKey;
    lastConsumedContext = contextKey;
    // Bắt đầu luồng mới cho ca bệnh này để lịch sử hiển thị khớp với máy chủ.
    clearChatHistory().catch(() => {});
    runChat(initialMessages, buildContextPrompt(scanContext));
  }, [contextKey]);

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    if (msg.role === 'system') return null; // Don't render system messages

    const align = isUser ? 'flex-end' : 'flex-start';
    const bg = isUser ? colors.primary : colors['surface-container-low'];
    const color = isUser ? colors['on-primary'] : colors['on-surface'];

    return (
      <FadeInView
        key={msg.timestamp || idx}
        delay={staggerDelay(idx, 30, 6)}
        translateY={8}
        style={[
          styles.msgContainer,
          { alignSelf: align, backgroundColor: bg, color },
          isUser
            ? { borderBottomRightRadius: 4, borderBottomLeftRadius: 16 }
            : { borderBottomRightRadius: 16, borderBottomLeftRadius: 4 },
        ]}>
        {!isUser && (
          /* Blue-dot mark instead of psychology avatar icon */
          <View style={[styles.avatar, { backgroundColor: colors['primary-subtle'] }]}>
            <View style={[styles.avatarDot, { backgroundColor: colors.primary }]} />
          </View>
        )}
        <Text style={[styles.msgText, { color }]}>
          {renderInline(msg.content, { color })}
        </Text>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Trợ lý AI"
        subtitle="Tư vấn bệnh cây trồng"
        onBack={() => navigation?.navigate?.('home')}
        right={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu cuộc trò chuyện mới"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={startNewConversation}
            style={{ padding: 6 }}>
            <Icon name="refresh" size={18} color={colors.muted} />
          </TouchableOpacity>
        }
      />

      {scanContext ? (
        <View style={styles.contextBar}>
          <Text
            style={[typography.body.sm, { color: colors['on-surface'], fontWeight: '600' }]}
            numberOfLines={1}>
            {scanContext.crop || 'Mẫu lá'} · {scanContext.disease || 'Chưa rõ bệnh'}
          </Text>
          <Text style={[typography.body.sm, { color: colors.muted }]} numberOfLines={1}>
            Tư vấn theo kết quả quét
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={{
          paddingBottom: BOTTOM_NAV_HEIGHT + 24,
          gap: 12,
          paddingTop: spacing['space-md'],
          paddingHorizontal: spacing.gutter,
        }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        {loading && (
          <View
            style={[
              styles.msgContainer,
              { alignSelf: 'flex-start', backgroundColor: colors.surface },
            ]}>
            <View style={[styles.avatar, { backgroundColor: colors['primary-subtle'] }]}>
              <View style={[styles.avatarDot, { backgroundColor: colors.primary }]} />
            </View>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.inputRow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập câu hỏi về bệnh cây..."
          placeholderTextColor={colors.muted}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
        />
        <Button
          variant="primary"
          onPress={handleSend}
          disabled={!input.trim() || loading}
          loading={loading}
          style={[styles.sendBtn, sendHovered && isWeb && { backgroundColor: '#15803d' }]}
          accessibilityLabel="Gửi tin nhắn"
          onMouseEnter={() => isWeb && setSendHovered(true)}
          onMouseLeave={() => isWeb && setSendHovered(false)}>
          {loading ? null : 'Gửi'}
        </Button>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messages: { flex: 1 },
  contextBar: {
    marginHorizontal: spacing.gutter,
    marginTop: spacing['space-sm'],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors['surface-container-low'],
    gap: 2,
  },
  msgContainer: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginHorizontal: spacing.gutter,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDot: {
    width: 7,
    height: 7,
    borderRadius: 3,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
    fontFamily: 'Inter-Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.gutter,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.paper,
    marginBottom: BOTTOM_NAV_HEIGHT,
  },
  input: {
    flex: 1,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 15,
    color: colors['on-surface'],
    minHeight: 44,
    maxHeight: 100,
    fontFamily: 'Inter-Regular',
  },
  sendBtn: {
    width: 48,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
});
