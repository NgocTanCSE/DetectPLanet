/**
 * AgriScan AI — Login Screen
 *
 * Clean, minimalist login screen with the nature-inspired green palette.
 * Forest green (#006c49) as the sole accent, warm earth-tone palette,
 * Geist logo type, soft card for the sign-in flow.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography } from './theme';
import Icon from './icons';
import { openGoogleLogin, sendAuthCode } from './auth';

const GOOGLE_LOGO = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

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
        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="eco" size={40} color={colors.primary} />
          </View>
          <Text style={styles.appName}>
            AgriScan AI
          </Text>
          <Text style={styles.tagline}>
            Chẩn đoán sâu bệnh và chăm sóc cây trồng
          </Text>
        </View>

        {/* Google Sign-In Button — clean outline with green accent */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.88}
          accessibilityLabel="Đăng nhập bằng Google"
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Image source={{ uri: GOOGLE_LOGO }} style={styles.googleLogo} resizeMode="contain" />
              <Text style={styles.googleBtnText}>Tiếp tục với tài khoản Google</Text>
            </>
          )}
        </TouchableOpacity>

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
    gap: 28,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
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
    gap: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors['outline'],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 260,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    ...typography['body-md'],
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
