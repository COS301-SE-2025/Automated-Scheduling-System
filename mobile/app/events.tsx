import * as React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getScheduledEvents, type UpcomingEvent } from '@/services/events';
import { colors } from '@/constants/colors';

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await getScheduledEvents();
      setEvents(list.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      setError(null);
    } catch (e) {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.muted }}>Loading events...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>{error}</Text>
      </View>
    );
  }
  if (events.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>No events available.</Text>
        <TouchableOpacity onPress={load} style={styles.reloadBtn}><Text style={styles.reloadText}>Reload</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {new Date(item.start).toLocaleString()} — {new Date(item.end).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { padding: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  reloadBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  reloadText: { color: 'white', fontWeight: '600' },
});
