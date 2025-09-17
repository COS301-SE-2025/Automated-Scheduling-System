import React from 'react';
import { SectionList, Text, View, StyleSheet } from 'react-native';
import { mockEvents } from '@/mock/data';

function groupByDate() {
  const groups: Record<string, typeof mockEvents> = {};
  for (const e of mockEvents) {
    const key = e.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ title: date, data }));
}

export default function CalendarScreen() {
  const sections = React.useMemo(() => groupByDate(), []);
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <Text style={styles.section}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.badge}>{item.status}</Text>
        </View>
      )}
      contentContainerStyle={{ padding: 16, paddingTop: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: '700', fontSize: 16, marginTop: 12, marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  title: { fontSize: 16, marginBottom: 4 },
  badge: { fontSize: 12, color: '#6b7280' }
});
