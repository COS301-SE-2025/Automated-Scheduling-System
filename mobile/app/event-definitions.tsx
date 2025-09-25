import * as React from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getEventDefinitions, type EventDefinition } from '@/services/eventDefinitions';
import { colors } from '@/constants/colors';
import Button from '@/components/ui/Button';
import DetailModal from '@/components/ui/DetailModal';
import { useAuth } from '@/contexts/AuthContext';

export default function EventDefinitionsScreen() {
  const { user, permissions, isElevated } = useAuth();
  const [list, setList] = React.useState<EventDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [facilitator, setFacilitator] = React.useState('');
  const [selected, setSelected] = React.useState<EventDefinition | null>(null);

  const load = React.useCallback(async () => {
    if (!user) {
      setError('Please log in to view event definitions.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const defs = await getEventDefinitions();
      setList(defs);
      setError(null);
    } catch (e) {
      setError('Could not load event definitions. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { 
    if (user) {
      load(); 
    }
  }, [user]); // Removed load from dependencies to prevent infinite loop

  const facilitators = React.useMemo(() => Array.from(new Set(list.map(d => d.Facilitator).filter(Boolean))).sort(), [list]);
  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return list.filter(d => {
      const matchesSearch = !term || d.EventName.toLowerCase().includes(term) || d.ActivityDescription.toLowerCase().includes(term);
      const matchesFac = !facilitator || d.Facilitator === facilitator;
      return matchesSearch && matchesFac;
    });
  }, [list, query, facilitator]);

  const canCreateDefinitions = permissions?.includes('event-definitions') || user?.role === 'Admin' || user?.role === 'HR' || true; // Allow all users to create for mobile

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Please log in to view event definitions.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.muted }}>Loading definitions...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isElevated ? 'All Event Definitions' : 'Your Event Definitions'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isElevated 
            ? 'All event templates in the system' 
            : 'Event templates you have created'
          }
        </Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          placeholder="Search definitions..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
        {facilitators.length > 1 && (
          <TextInput
            placeholder={`Filter by facilitator (${facilitators.length} available)`}
            value={facilitator}
            onChangeText={setFacilitator}
            style={styles.input}
            placeholderTextColor={colors.muted}
          />
        )}
      </View>

      {list.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 16, marginBottom: 8 }}>
            {isElevated 
              ? 'No event definitions exist in the system.' 
              : 'You haven\'t created any event definitions yet.'
            }
          </Text>
          <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 16 }}>
            {!isElevated && 'Event definitions are templates used to create scheduled events.'}
          </Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>No event definitions match your search.</Text>
          <TouchableOpacity 
            onPress={() => { setQuery(''); setFacilitator(''); }} 
            style={[styles.retryBtn, { backgroundColor: colors.muted }]}
          >
            <Text style={styles.retryText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.CustomEventID)}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected(item)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={2}>{item.EventName}</Text>
                <Text style={styles.duration}>{item.StandardDuration}</Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {item.ActivityDescription || 'No description provided'}
              </Text>
              <Text style={styles.metaSmall}>👤 {item.Facilitator || 'No facilitator assigned'}</Text>
              <Text style={styles.metaSmall}>📅 Created: {new Date(item.CreationDate).toLocaleDateString()}</Text>
              {!isElevated && item.CreatedBy && (
                <Text style={styles.createdBy}>Created by you</Text>
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
      )}
      
      <DetailModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.EventName}` : undefined}>
        {selected && (
          <View style={{ gap: 8 }}>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Event Name: </Text>{selected.EventName}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Description: </Text>{selected.ActivityDescription || 'No description provided'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Facilitator: </Text>{selected.Facilitator || 'Not assigned'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Duration: </Text>{selected.StandardDuration || 'Not specified'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created: </Text>{new Date(selected.CreationDate).toLocaleString()}</Text>
            {isElevated && selected.CreatedBy && (
              <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created By: </Text>{selected.CreatedBy}</Text>
            )}
            {selected.GrantsCertificateID && (
              <Text style={styles.detailRow}><Text style={styles.detailLabel}>Grants Certificate: </Text>ID {selected.GrantsCertificateID}</Text>
            )}
          </View>
        )}
      </DetailModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: colors.muted },
  filters: { flexDirection: 'column', gap: 8, marginBottom: 16 },
  input: { 
    borderWidth: 1, 
    borderColor: colors.border, 
    backgroundColor: colors.surface, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    color: colors.text,
    fontSize: 16,
  },
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
  duration: { 
    fontSize: 12, 
    color: colors.primary, 
    backgroundColor: `${colors.primary}20`, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    overflow: 'hidden',
  },
  description: { color: colors.text, marginBottom: 8, fontSize: 14, lineHeight: 20 },
  metaSmall: { color: colors.muted, marginBottom: 2, fontSize: 12 },
  createdBy: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
  detailRow: { color: colors.text, fontSize: 14 },
  detailLabel: { fontWeight: '700', color: colors.text },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  retryText: { color: 'white', fontWeight: '600' },
});
