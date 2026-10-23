/**
 * Animation utilities cho AgriScan Admin.
 *
 * Cung cấp token thời gian/easing và hook useReduceMotion() để tôn trọng
 * cài đặt "giảm chuyển động" (AccessibilityInfo) của người dùng.
 */
import React, { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform, Easing } from 'react-native';

/** Các hằng số thời gian và easing dùng cho animation. */
export const MOTION = {
  duration: {
    fast: 180,
    normal: 230,
    slow: 320,
  },
  easing: Easing.out(Easing.cubic),
  // Native driver: chỉ bật trên nền tảng native (Android/iOS), tắt trên web.
  useNativeDriver: Platform.OS !== 'web',
};

/**
 * Trả về true khi người dùng bật "Reduce Motion" trong cài đặt thiết bị.
 * Trên web luôn trả về false (web không có AccessibilityInfo native).
 */
export function useReduceMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduced(enabled);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) setReduced(enabled);
      },
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/** Stagger delay cho danh sách item (tối đa maxItems). */
export function staggerDelay(index, base = 30, maxItems = 8) {
  return Math.min(index, maxItems) * base;
}
