import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const BrandHeader: React.FC<{ title: string; subtitle: string; tagline?: string; }> = ({ title, subtitle, tagline }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.company}>{title}</Text>
      <Text style={styles.product}>{subtitle}</Text>
      {tagline && <Text style={styles.tagline}>{tagline}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginBottom: 28 },
  company: { fontSize: 18, fontWeight: '600', color: colors.secondary },
  product: { fontSize: 28, fontWeight: '800', color: colors.primary, marginTop: 6, textAlign: 'center' },
  tagline: { marginTop: 8, fontSize: 14, color: colors.third, textAlign: 'center', paddingHorizontal: 12 },
});

export default BrandHeader;
