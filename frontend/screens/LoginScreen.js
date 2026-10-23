/**
 * AgriScan AI — Login Screen (Minimalist)
 *
 * Minimalist login screen. No icon logo — a small green mark + wordmark.
 * Green accent as the sole highlight, clean white surface on white canvas.
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
import { openGoogleLogin, finishGoogleLogin, googleErrorHint } from '../services/auth';
import { Button } from '../components';

const isWeb = Platform.OS === 'web';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await openGoogleLogin();
      await finishGoogleLogin(result);
      navigation.navigate('home');
    } catch (err) {
      const hint = googleErrorHint(err);
      Alert.alert(
        'Đăng nhập chưa hoàn tất',
        (err.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.') + (hint ? '\n\n' + hint : ''),
        [{ text: 'Đồng ý' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Green mark + text */}
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

        {/* Google Sign-In Button */}
        <Button
          variant="outline"
          iconName="google"
          iconSize={22}
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
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 0 : 32,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  greenMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors['primary-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  appName: {
    color: colors['on-surface'],
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Inter-Bold',
  },
  tagline: {
    color: colors.muted,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 240,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors['surface-container-low'],
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 280,
  },
  hint: {
    color: colors.muted,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  footer: {
    alignItems: 'center',
  },
  copyright: {
    color: colors.muted,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
});
