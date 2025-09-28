import * as React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '@/constants/colors';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField: React.FC<Props> = ({ label, error, style, ...rest }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.muted}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});

export default TextField;
