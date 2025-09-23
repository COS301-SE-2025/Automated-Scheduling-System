import * as React from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getEventDefinitions, type EventDefinition } from '@/services/eventDefinitions';
import { colors } from '@/constants/colors';
import Button from '@/components/ui/Button';
import DetailModal from '@/components/ui/DetailModal';

export default function EventDefinitionsScreen() {
  const [list, setList] = React.useState<EventDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [facilitator, setFacilitator] = React.useState('');
  const [selected, setSelected] = React.useState<EventDefinition | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const defs = await getEventDefinitions();
      setList(defs);
      setError(null);
    } catch (e) {
      setError('Could not load event definitions.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const facilitators = React.useMemo(() => Array.from(new Set(list.map(d => d.Facilitator).filter(Boolean))).sort(), [list]);
  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return list.filter(d => {
      const matchesSearch = !term || d.EventName.toLowerCase().includes(term) || d.ActivityDescription.toLowerCase().includes(term);
      const matchesFac = !facilitator || d.Facilitator === facilitator;
      return matchesSearch && matchesFac;
    });
  }, [list, query, facilitator]);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={{ marginTop: 8, color: colors.muted }}>Loading definitions...</Text></View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}><Text style={{ color: colors.danger }}>{error}</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Search definitions..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
        {/* Simple facilitator filter textbox for now; can be replaced by a picker */}
        <TextInput
          placeholder="Filter by facilitator"
          value={facilitator}
          onChangeText={setFacilitator}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.center}><Text style={{ color: colors.muted }}>No event definitions found.</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.CustomEventID)}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected(item)} style={styles.card}>
              <Text style={styles.title}>{item.EventName}</Text>
              <Text style={styles.meta}>{item.ActivityDescription}</Text>
              <Text style={styles.metaSmall}>Facilitator: {item.Facilitator || '—'}</Text>
              <View style={styles.actions}><Button title="View" variant="outline" onPress={() => setSelected(item)} /></View>
            </TouchableOpacity>
          )}
        />
      )}
      <DetailModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `View: ${selected.EventName}` : undefined}>
        {selected && (
          <View style={{ gap: 8 }}>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Description: </Text>{selected.ActivityDescription || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Facilitator: </Text>{selected.Facilitator || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Duration: </Text>{selected.StandardDuration || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created On: </Text>{new Date(selected.CreationDate).toLocaleString()}</Text>
            {selected.GrantsCertificateID ? (
              <Text style={styles.detailRow}><Text style={styles.detailLabel}>Grants Certificate ID: </Text>{selected.GrantsCertificateID}</Text>
            ) : null}
          </View>
        )}
      </DetailModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  filters: { flexDirection: 'column', gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  meta: { color: colors.text, marginTop: 4 },
  metaSmall: { color: colors.muted, marginTop: 2, fontSize: 12 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
  detailRow: { color: colors.text },
  detailLabel: { fontWeight: '700', color: colors.text },
});
