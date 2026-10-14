/**
 * ChatScreen — AI chat for plant disease Q&A
 *
 * Uses Cloudflare Workers AI (chat model) via PHP API proxy.
 * Single method of interaction: text chat with the AI assistant.
 * Nature-inspired green palette: forest green primary, mint/amber/red status
 * accents, clean white surfaces, charcoal text.
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
import { colors, spacing, typography, shadowPaper } from '../theme';
import Icon from '../icons';
import AppHeader from '../AppHeader';
import { chatWithAI } from '../api';

const SYSTEM_PROMPT = 'Bạn là trợ lý AI AgriScan, chuyên về nông nghiệp và trồng trọt. Trả lời ngắn gọn, thực tế, bằng tiếng Việt.';

/** @returns {Array<{role: 'system'|'user'|'assistant', content: string}>} */
const initialMessages = [
  { role: 'system', content: SYSTEM_PROMPT },
  {
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý AgriScan AI. Tôi có thể giúp bạn tư vấn về bệnh thực vật, chăm sóc cây trồng, và phòng tránh sâu bệnh. Bạn cần hỗ trợ gì hôm nay?',
  },
];

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history to backend → Cloudflare Workers AI
      const response = await chatWithAI(newMessages);
      const assistantMsg = { role: 'assistant', content: response.content };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    if (isSystem) return null; // Don't render system messages

    const align = isUser ? 'flex-end' : 'flex-start';
    const bg = isUser ? colors.primary : colors.paper;
    const color = isUser ? colors['on-primary'] : colors['on-surface'];

    return (
      <View key={idx} style={[styles.msgContainer, { alignSelf: align, backgroundColor: bg }]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors['primary-fixed'] }]}>
            <Icon name="psychology" size={16} color={colors.primary} />
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
        onBack={() => navigation.navigate('home')}
        actions={[
          { icon: 'refresh', label: 'Làm mới', onPress: () => setMessages(initialMessages) },
        ]}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={{ paddingBottom: 16, gap: 12, paddingTop: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        {loading && (
          <View style={[styles.msgContainer, { alignSelf: 'flex-start', backgroundColor: colors.paper, ...shadowPaper }]}>
            <View style={[styles.avatar, { backgroundColor: colors['primary-fixed'] }]}>
              <Icon name="psychology" size={16} color={colors.primary} />
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
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
          accessibilityLabel="Gửi tin nhắn"
        >
          {loading ? (
            <ActivityIndicator color={colors['on-primary']} size="small" />
          ) : (
            <Icon name="send" size={20} color={colors['on-primary']} />
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messages: { flex: 1 },
  msgContainer: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: spacing.gutter,
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
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
    borderTopColor: colors['outline'],
    backgroundColor: colors.paper,
  },
  input: {
    flex: 1,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors['on-surface'],
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors['outline'],
    fontFamily: 'PlusJakartaSans-Regular',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
