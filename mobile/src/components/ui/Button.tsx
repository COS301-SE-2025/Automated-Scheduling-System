import * as React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle | ViewStyle[];
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, disabled, loading, variant = 'primary', style }) => {
  const variantStyle =
    variant === 'outline' ? styles.outline : variant === 'danger' ? styles.danger : styles.primary;
  const labelStyle = variant === 'outline' ? styles.labelOutline : styles.label;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'outline' ? colors.text : '#fff'} /> : <Text style={labelStyle}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  label: { color: '#fff', fontWeight: '600', fontSize: 16 },
  labelOutline: { color: colors.text, fontWeight: '600', fontSize: 16 },
});

export default Button;
