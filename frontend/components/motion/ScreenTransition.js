/**
 * ScreenTransition — hiệu ứng chuyển trang.
 *
 * App.js render `<ScreenTransition key={screen} direction={...}>` nên mỗi lần
 * đổi route, component mount lại và chạy hiệu ứng vào:
 *   - forward : trượt nhẹ từ phải sang (đi sâu vào màn con)
 *   - back    : trượt nhẹ từ trái sang (quay lại)
 *   - tab     : chỉ mờ dần + nhích lên (đổi tab ngang cấp)
 *
 * Chỉ animate opacity/transform nên không ảnh hưởng layout, không giật khi
 * danh sách dài đang cuộn.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import FadeInView from './FadeInView';
import { duration } from '../../utils/motion';

const OFFSET = 26;

const ScreenTransition = ({ children, direction = 'tab' }) => {
  const translateX = direction === 'forward' ? OFFSET : direction === 'back' ? -OFFSET : 0;
  const translateY = direction === 'tab' ? 8 : 0;

  return (
    <FadeInView
      style={styles.container}
      duration={duration.slow}
      translateX={translateX}
      translateY={translateY}>
      {children}
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenTransition;
