import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface MessageBoxProps {
  type?: 'error' | 'success' | 'info';
  title?: string;
  children?: React.ReactNode;
}

export const MessageBox: React.FC<MessageBoxProps> = ({ type = 'info', title, children }) => {
  const palette = type === 'error' ? { bg: '#fef2f2', border: colors.danger, text: colors.danger }
    : type === 'success' ? { bg: '#ecfdf5', border: colors.success, text: colors.success }
    : { bg: '#eff6ff', border: colors.primary, text: colors.primary };

  return (
    <View style={[styles.box, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {title && <Text style={[styles.title, { color: palette.text }]}>{title}</Text>}
      {children ? <Text style={[styles.body, { color: palette.text }]}>{children}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  title: { fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 18 },
});

export default MessageBox;
