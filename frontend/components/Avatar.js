/**
 * AgriScan AI — Avatar component
 *
 * Hình tròn: ảnh URI nếu có, ngược lại hiển thị chữ cái đầu tiên của tên.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius } from '../utils/theme';

export const Avatar = ({
  source,
  initial,
  size = 40,
  textColor = colors.primary,
  bgColor = colors['primary-subtle'],
  style,
  textStyle,
}) => {
  const radiusValue = size / 2;

  if (source) {
    return (
      <View style={[styles.wrapper, { width: size, height: size }, style]}>
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: size, height: size, borderRadius: radiusValue }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  const letter = initial ? initial.charAt(0).toUpperCase() : 'B';

  return (
    <View style={[styles.wrapper, { width: size, height: size, backgroundColor: bgColor }, style]}>
      <Text style={[styles.initial, { color: textColor, fontSize: Math.round(size * 0.3) }, textStyle]}>
        {letter}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
});

export default Avatar;
