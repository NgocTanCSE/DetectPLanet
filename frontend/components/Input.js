/**
 * AgriScan AI — Input component
 *
 * Ô nhập liệu có viền, placeholder màu nhạt, tập trung vào tính đọc được.
 */
import React from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';
import { colors, radius, spacing, typography } from '../utils/theme';

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
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.muted}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
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
    fontFamily: 'PlusJakartaSans-Regular',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    flex: 1,
  },
});

export default Input;
