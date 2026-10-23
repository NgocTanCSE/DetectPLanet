/**
 * AgriScan AI — Motion tokens
 *
 * Toàn bộ chuyển động dùng `Animated` có sẵn của React Native (không cần
 * Reanimated / Gesture Handler, nên không phải build lại APK).
 *
 * Nguyên tắc:
 *  - Ngắn: 160–300ms. Không dùng hiệu ứng dài làm chậm thao tác.
 *  - Chỉ animate `opacity` + `transform` để chạy trên native driver.
 *  - Tôn trọng "Reduce motion" của hệ điều hành (hook `useReduceMotion`).
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing, Platform } from 'react-native';

/** Thời lượng (ms) theo ngữ cảnh sử dụng. */
export const duration = {
  fast: 160, // phản hồi chạm
  base: 240, // phần tử xuất hiện
  slow: 360, // khối lớn / trang
};

/** Đường cong easing dùng chung. */
export const easing = {
  // Vào nhanh, dừng êm — cảm giác "có trọng lượng" nhưng không rườm rà.
  decelerate: Easing.out(Easing.cubic),
  standard: Easing.bezier(0.2, 0, 0, 1),
};

/** Cấu hình lò xo cho phản hồi chạm. */
export const spring = { damping: 18, stiffness: 220, mass: 0.9 };

/**
 * `useNativeDriver` chỉ bật trên native. Trên web, Animated buộc phải chạy
 * bằng JS driver nên truyền `true` sẽ chỉ sinh warning.
 */
export const nativeDriver = Platform.OS !== 'web';

/**
 * Độ trễ so le cho danh sách: item thứ `index` vào sau item trước `step` ms.
 * Giới hạn `max` để danh sách dài không phải chờ quá lâu.
 */
export function staggerDelay(index, step = 45, max = 8) {
  return Math.min(Math.max(index, 0), max) * step;
}

/**
 * Theo dõi cài đặt "giảm chuyển động" của hệ điều hành.
 * Khi bật, mọi component motion sẽ hiện ngay lập tức thay vì animate.
 */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduceMotion(!!value);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (value) => setReduceMotion(!!value),
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}

/**
 * Đếm số từ 0 → `target` trong `duration` ms (dùng cho điểm tin cậy).
 * Chạy bằng requestAnimationFrame nên chỉ dùng cho vài con số, không dùng
 * cho danh sách dài.
 */
export function useCountUp(target, { duration = 700, delay = 0 } = {}) {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return undefined;
    }

    let frame = null;
    let startTime = null;
    let cancelled = false;

    const tick = (now) => {
      if (cancelled) return;
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, duration, delay, reduceMotion]);

  return value;
}

export default { duration, easing, spring, nativeDriver, staggerDelay, useReduceMotion, useCountUp };