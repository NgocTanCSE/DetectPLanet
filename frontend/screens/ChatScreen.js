/**
 * ChatScreen — AI chat for plant disease Q&A (Text-Only Redesign)
 *
 * Uses Cloudflare Workers AI (chat model) via PHP API proxy.
 * Single method of interaction: text chat with the AI assistant.
 * Nature-inspired green palette: forest green primary, clean white surfaces.
 *
 * Text-only redesign: the psychology avatar icon is replaced with a
 * green-dot mark. The send icon is replaced with "Gửi" text.
 * The refresh action is already text-only in AppHeader.
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
import { colors, spacing, typography, shadowFlat } from '../utils/theme';
import AppHeader, { useTopInset, HEADER_HEIGHT } from '../components/layout/AppHeader';
import { chatWithAI } from '../services/api';
import Icon from '../icons';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import { Button } from '../components';

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

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const topInset = useTopInset();

  useEffect(() => {
    // Scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
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

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';

    if (msg.role === 'system') return null; // Don't render system messages

    const align = isUser ? 'flex-end' : 'flex-start';
    const bg = isUser ? colors.primary : colors.paper;
    const color = isUser ? colors['on-primary'] : colors['on-surface'];

    return (
      <View key={msg.timestamp || idx} style={[styles.msgContainer, { alignSelf: align, backgroundColor: bg, borderBottomRightRadius: isUser ? 4 : 8, borderBottomLeftRadius: isUser ? 8 : 4 }]}>
        {!isUser && (
          /* Green-dot mark instead of psychology avatar icon */
          <View style={[styles.avatar, { backgroundColor: colors['primary-subtle'] }]}>
            <View style={[styles.avatarDot, { backgroundColor: colors.primary }]} />
          </View>
        )}
        <Text style={[styles.msgText, { color, fontFamily: 'PlusJakartaSans-Regular' }]}>
          {msg.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="AgriScan AI Chat"
        showBack
        onBack={() => navigation?.navigate?.('home')}
        actions={[
          { icon: 'refresh', label: 'Làm mới', onPress: () => setMessages(initialMessages) },
        ]}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={{
          paddingBottom: BOTTOM_NAV_HEIGHT + 24,
          gap: 12,
          paddingTop: topInset + HEADER_HEIGHT,
          paddingHorizontal: spacing.gutter,
        }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        {loading && (
          <View style={[styles.msgContainer, { alignSelf: 'flex-start', backgroundColor: colors.paper }]}>
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
          style={styles.sendBtn}
          accessibilityLabel="Gửi tin nhắn">
          {loading ? null : 'Gửi'}
        </Button>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messages: { flex: 1 },
  msgContainer: {
    maxWidth: '80%',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: spacing.gutter,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  avatarDot: {
    width: 7,
    height: 7,
    borderRadius: 3,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.gutter,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.paper,
    marginBottom: BOTTOM_NAV_HEIGHT,
  },
  input: {
    flex: 1,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors['on-surface'],
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.outline,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer', WebkitUserSelect: 'none', userSelect: 'none' }
      : {}),
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
