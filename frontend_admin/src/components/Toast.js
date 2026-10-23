import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOTION, useReduceMotion } from '../utils/motion';
import Icon from '../icons';
import { colors, font, radius, shadow } from '../theme';

const ToastContext = createContext(null);

const TONES = {
  success: { bg: '#0f2e1c', fg: '#bbf7d0', icon: 'check_circle' },
  error: { bg: '#3b0d0d', fg: '#fecaca', icon: 'error' },
  info: { bg: '#0f172a', fg: '#e2e8f0', icon: 'notifications' },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const reduceMotion = useReduceMotion();

  const hide = useCallback(() => {
    if (reduceMotion) {
      setToast(null);
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: MOTION.duration.fast,
      useNativeDriver: MOTION.useNativeDriver,
    }).start(() => setToast(null));
  }, [opacity, reduceMotion]);

  const show = useCallback(
    (message, type = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message: String(message || ''), type });
      if (reduceMotion) {
        // Bỏ qua animation, hiện ngay
        opacity.setValue(1);
        timer.current = setTimeout(hide, 3200);
        return;
      }
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.duration.fast,
        useNativeDriver: MOTION.useNativeDriver,
        easing: MOTION.easing,
      }).start();
      timer.current = setTimeout(hide, 3200);
    },
    [hide, opacity, reduceMotion],
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const api = React.useMemo(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info'),
    }),
    [show],
  );

  const tone = TONES[toast?.type] || TONES.info;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {!!toast && (
        <Animated.View
          style={[
            styles.wrap,
            { opacity, bottom: insets.bottom + 20, backgroundColor: tone.bg },
          ]}
        >
          <Pressable style={styles.inner} onPress={hide}>
            <Icon name={tone.icon} size={17} color={tone.fg} />
            <Text style={[styles.text, { color: tone.fg }]} numberOfLines={4}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.md,
    ...shadow.modal,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { flex: 1, fontFamily: font.medium, fontSize: 12.5 },
});
