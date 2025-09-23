import * as React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getScheduledEvents, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import Button from '@/components/ui/Button';
import DetailModal from '@/components/ui/DetailModal';

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<MobileEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<MobileEvent | null>(null);

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
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected(item)} style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {new Date(item.start).toLocaleString()} — {new Date(item.end).toLocaleString()}
            </Text>
            <View style={styles.actions}><Button title="View" variant="outline" onPress={() => setSelected(item)} /></View>
          </TouchableOpacity>
        )}
      />
      <DetailModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `View: ${selected.title}` : undefined}>
        {selected && (
          <View style={{ gap: 8 }}>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Event Type: </Text>{selected.eventType || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Status: </Text>{selected.statusName || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Starts: </Text>{new Date(selected.start).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Ends: </Text>{new Date(selected.end).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Location: </Text>{selected.roomName || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created On: </Text>{new Date(selected.creationDate).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Targets: </Text>{selected.relevantParties || 'Unassigned'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Employees: </Text>{(selected.employees?.length ?? 0)}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Positions: </Text>{(selected.positions?.length ?? 0)}</Text>
          </View>
        )}
      </DetailModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  meta: { color: colors.muted, marginTop: 4 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
  detailRow: { color: colors.text },
  detailLabel: { fontWeight: '700', color: colors.text },
  reloadBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  reloadText: { color: 'white', fontWeight: '600' },
});
