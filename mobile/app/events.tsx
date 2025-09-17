import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { mockEvents } from '@/mock/data';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.date} • {item.status} • {item.attendees ?? 0} attendees</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  card: { padding: 12, borderRadius: 8, backgroundColor: '#f9fafb', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#6b7280', marginTop: 4 },
});
