/**
 * FadeInView — phần tử xuất hiện mượt khi màn hình mount.
 *
 * Chỉ animate opacity + transform (native driver), nên không gây layout lại.
 *
 * @param {number} delay      Độ trễ trước khi chạy (ms) — dùng để so le danh sách.
 * @param {number} duration   Thời lượng (ms).
 * @param {number} translateY Dịch từ dưới lên (px).
 * @param {number} translateX Dịch ngang (px, âm = từ trái vào).
 * @param {number} scaleFrom  Tỉ lệ bắt đầu (1 = không phóng to).
 */
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  duration as durations,
  easing,
  nativeDriver,
  useReduceMotion,
} from '../../utils/motion';

const FadeInView = ({
  children,
  delay = 0,
  duration = durations.base,
  translateY = 10,
  translateX = 0,
  scaleFrom = 1,
  style,
  ...rest
}) => {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: easing.decelerate,
      useNativeDriver: nativeDriver,
    });

    animation.start();
    return () => animation.stop();
  }, [progress, delay, duration, reduceMotion]);

  const transform = [];
  if (translateY) {
    transform.push({
      translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [translateY, 0] }),
    });
  }
  if (translateX) {
    transform.push({
      translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [translateX, 0] }),
    });
  }
  if (scaleFrom !== 1) {
    transform.push({
      scale: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }),
    });
  }

  return (
    <Animated.View
      style={[style, { opacity: progress, transform }]}
      {...rest}>
      {children}
    </Animated.View>
  );
};

export default FadeInView;
