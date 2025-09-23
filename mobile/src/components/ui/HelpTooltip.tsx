import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface HelpTooltipProps {
  text: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ text }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.help}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 32, maxWidth: 300, paddingHorizontal: 12 },
  help: { textAlign: 'center', fontSize: 12, color: colors.third },
});

export default HelpTooltip;
