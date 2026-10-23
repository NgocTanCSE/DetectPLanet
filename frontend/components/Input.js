/**
 * AgriScan AI — Input component
 *
 * Ô nhập liệu có viền, placeholder màu nhạt, tập trung vào tính đọc được.
 */
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { colors, radius, spacing, interactive } from '../utils/theme';

const isWeb = Platform.OS === 'web';

export const Input = ({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  editable = true,
  secureTextEntry = false,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  maxHeight,
  minHeight,
  style,
  containerStyle,
  numberOfLines,
}) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TextInput
        style={[styles.input, style, focused && isWeb && interactive.focus.outline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.muted}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => isWeb && setHovered(true)}
        onMouseLeave={() => isWeb && setHovered(false)}
        maxHeight={maxHeight}
        minHeight={minHeight}
        numberOfLines={numberOfLines}
        selectionColor={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors['surface-container-low'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  input: {
    color: colors['on-surface'],
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    flex: 1,
  },
});

export default Input;
