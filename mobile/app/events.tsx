import * as React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getScheduledEvents, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import Button from '@/components/ui/Button';
import DetailModal from '@/components/ui/DetailModal';

export default function EventsScreen() {
  const { user, permissions, isElevated } = useAuth();
  const [events, setEvents] = React.useState<MobileEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<MobileEvent | null>(null);

  const load = React.useCallback(async () => {
    if (!user) {
      setError('Please log in to view events.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const list = await getScheduledEvents();
      setEvents(list.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      setError(null);
    } catch (e) {
      setError('Failed to load events. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { 
    if (user) {
      load(); 
    }
  }, [user]); // Removed load from dependencies to prevent infinite loop

  // Filter events based on user role - show upcoming events for regular users, all events for elevated users
  const displayEvents = React.useMemo(() => {
    if (isElevated) {
      return events; // Show all events for Admin/HR
    } else {
      // Show upcoming events for regular users
      return events.filter(event => new Date(event.start) >= new Date());
    }
  }, [events, isElevated]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Please log in to view events.</Text>
      </View>
    );
  }

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
        <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: 8 }}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (displayEvents.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 16, marginBottom: 8 }}>
          {isElevated 
            ? 'No events scheduled in the system.' 
            : 'You have no upcoming events.'
          }
        </Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 16 }}>
          {!isElevated && 'Events created by HR/Admin that include you will appear here.'}
        </Text>
        <TouchableOpacity onPress={load} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isElevated ? 'All Scheduled Events' : 'Your Upcoming Events'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'}
        </Text>
      </View>
      
      <FlatList
        data={displayEvents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected(item)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statusName) }]}>
                <Text style={styles.statusText}>{item.statusName}</Text>
              </View>
            </View>
            <Text style={styles.eventType}>{item.eventType || 'Event'}</Text>
            <Text style={styles.meta}>
              📅 {new Date(item.start).toLocaleDateString()} at {new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.meta}>
              ⏱️ {new Date(item.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.roomName && (
              <Text style={styles.meta}>📍 {item.roomName}</Text>
            )}
            {item.facilitator && (
              <Text style={styles.meta}>👤 {item.facilitator}</Text>
            )}
            <View style={styles.actions}>
              <Button title="View Details" variant="outline" onPress={() => setSelected(item)} />
            </View>
          </TouchableOpacity>
        )}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      
      <DetailModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `Event Details: ${selected.title}` : undefined}>
        {selected && (
          <View style={{ gap: 8 }}>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Event Type: </Text>{selected.eventType || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Status: </Text>{selected.statusName || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Facilitator: </Text>{selected.facilitator || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Starts: </Text>{new Date(selected.start).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Ends: </Text>{new Date(selected.end).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Location: </Text>{selected.roomName || 'Not specified'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created: </Text>{new Date(selected.creationDate).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Participants: </Text>{selected.relevantParties || 'Unassigned'}</Text>
            {selected.maxAttendees && (
              <Text style={styles.detailRow}><Text style={styles.detailLabel}>Max Attendees: </Text>{selected.maxAttendees}</Text>
            )}
            {selected.minAttendees && (
              <Text style={styles.detailRow}><Text style={styles.detailLabel}>Min Attendees: </Text>{selected.minAttendees}</Text>
            )}
            {isElevated && (
              <>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Employee Count: </Text>{selected.employees?.length || 0}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Position Count: </Text>{selected.positions?.length || 0}</Text>
                {selected.canEdit && (
                  <Text style={styles.detailRow}><Text style={styles.detailLabel}>Permissions: </Text>Can edit</Text>
                )}
              </>
            )}
          </View>
        )}
      </DetailModal>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed': return '#10b981'; // green
    case 'cancelled': return '#ef4444'; // red
    case 'in progress': return '#f59e0b'; // amber
    case 'scheduled': return '#3b82f6'; // blue
    default: return '#6b7280'; // gray
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: colors.muted },
  card: { 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: colors.surface, 
    borderWidth: 1, 
    borderColor: colors.border, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  eventType: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  meta: { color: colors.muted, marginBottom: 2, fontSize: 14 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
  detailRow: { color: colors.text, fontSize: 14 },
  detailLabel: { fontWeight: '700', color: colors.text },
  reloadBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  reloadText: { color: 'white', fontWeight: '600' },
});
