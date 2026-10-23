import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { MOTION, useReduceMotion } from '../utils/motion';

const { useNativeDriver, duration, easing } = MOTION;

/**
 * Chuyển màn nhẹ: fade + trượt lên 8px. Chỉ animate opacity/transform
 * nên chạy được trên native driver.
 *
 * Khi người dùng bật "Reduce Motion", bỏ qua animation và render ngay.
 */
export default function ScreenTransition({ screenKey, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      // Bỏ qua animation, render ngay
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        easing,
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        easing,
        useNativeDriver,
      }),
    ]).start();
  }, [screenKey, opacity, translateY, reduceMotion, easing, useNativeDriver]);

  return (
    <Animated.View
      style={{ flex: 1, opacity, transform: [{ translateY }] }}
      pointerEvents="box-none"
    >
      {children}
    </Animated.View>
  );
}
