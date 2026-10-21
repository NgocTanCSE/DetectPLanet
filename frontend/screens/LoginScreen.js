/**
 * AgriScan AI — Login Screen (Text-Only Logo)
 *
 * Minimalist login screen. No icon logo — a small green mark + wordmark.
 * Forest green as the sole accent, clean white surface, charcoal text.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography } from '../utils/theme';
import { openGoogleLogin, sendAuthCode } from '../services/auth';
import Icon from '../icons';
import { Button } from '../components';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const code = await openGoogleLogin();
      await sendAuthCode(code);
      navigation.navigate('home');
    } catch (err) {
      Alert.alert(
        'Đăng nhập chưa hoàn tất',
        err.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
        [{ text: 'Đồng ý' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Brand wordmark — green dot + text, no icon */}
        <View style={styles.logoContainer}>
          <View style={styles.greenMark}>
            <View style={styles.greenDot} />
          </View>
          <Text style={styles.appName}>
            AgriScan AI
          </Text>
          <Text style={styles.tagline}>
            Chẩn đoán sâu bệnh và chăm sóc cây trồng
          </Text>
        </View>

        {/* Google Sign-In Button — clean outline with green accent */}
        <Button
          variant="outline"
          iconName="google"
          iconSize={18}
          onPress={handleGoogleLogin}
          disabled={loading}
          loading={loading}
          style={styles.googleBtn}
          accessibilityLabel="Đăng nhập bằng Google">
          Tiếp tục với tài khoản Google
        </Button>

        <Text style={styles.hint}>
          Đăng nhập nhanh để đồng bộ nhật ký và báo cáo nông trại
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.copyright}>
          AgriScan AI — Nông nghiệp thông minh
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  greenMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors['primary-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  appName: {
    color: colors['on-surface'],
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'Geist',
  },
  tagline: {
    color: colors.muted,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 260,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleBtnText: {
    ...typography.body.md,
    color: colors['on-surface'],
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  hint: {
    color: colors.muted,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  footer: {
    alignItems: 'center',
  },
  copyright: {
    color: colors.muted,
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
