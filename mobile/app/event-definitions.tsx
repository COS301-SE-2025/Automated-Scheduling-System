import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { mockEventDefinitions } from '@/mock/data';

export default function EventDefinitionsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockEventDefinitions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
            {item.required ? <Text style={styles.req}>Required</Text> : null}
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
  req: { color: '#059669', marginTop: 4 }
});
