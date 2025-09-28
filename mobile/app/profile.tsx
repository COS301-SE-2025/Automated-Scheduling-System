import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';
import { getEmployeeCompetencyProfile, type EmployeeCompetencyProfile } from '@/services/profile';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [data, setData] = React.useState<EmployeeCompetencyProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'completed' | 'required'>('completed');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getEmployeeCompetencyProfile();
        if (!cancelled) { setData(res); setError(null); }
      } catch (e) {
        if (!cancelled) setError('Failed to load your competency profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Employee Competency Profile</Text>

      <View style={styles.card}>
        {loading && <Text style={styles.muted}>Loading…</Text>}
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        {data && (
          <>
            {/* Header */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.h2}>{data.employee.name}</Text>
              <Text style={styles.meta}>Employee ID: {data.employee.employeeNumber}</Text>
              <Text style={styles.meta}>Position: {data.employee.positionTitle || '—'} {data.employee.positionCode ? `(${data.employee.positionCode})` : ''}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {(['completed', 'required'] as const).map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'completed' ? 'Completed Competencies' : 'Required Competencies'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Completed */}
            {activeTab === 'completed' && (
              <View style={styles.tableWrap}>
                {(data.completed?.length ?? 0) === 0 ? (
                  <Text style={styles.muted}>No completed competencies yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {data.completed.map(c => (
                      <View key={c.competencyID} style={styles.rowCard}>
                        <Text style={styles.rowTitle}>{c.competencyName}</Text>
                        <Text style={styles.rowMeta}>{c.competencyTypeName}</Text>
                        <View style={styles.rowGrid}>
                          <Field label="Completion Date" value={c.achievementDate ? new Date(c.achievementDate).toLocaleDateString() : '—'} />
                          <Field label="Expiry Date" value={c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'} />
                          <Field label="Status" value={<StatusPill status={c.status} />} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Required */}
            {activeTab === 'required' && (
              <View style={{ gap: 8 }}>
                {data.employee.positionCode === '' && (
                  <Text style={styles.muted}>Your required competencies will appear here once you are assigned a job position.</Text>
                )}
                {(data.required?.length ?? 0) === 0 ? (
                  <Text style={styles.muted}>No required competencies at the moment.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {data.required.map(c => (
                      <View key={c.competencyID} style={[styles.rowCard, styles.leftAccent]}>
                        <Text style={styles.rowTitle}>{c.competencyName}</Text>
                        <Text style={styles.rowMeta}>{c.competencyTypeName}</Text>
                        {c.prerequisites && c.prerequisites.length > 0 && (
                          <Text style={styles.rowMeta}>Prerequisites: {(c.prerequisites ?? []).map(pid => {
                            const pName = (data.completed ?? []).find(cm => cm.competencyID === pid)?.competencyName || `Competency #${pid}`;
                            return pName;
                          }).join(', ')}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ marginTop: 16 }}>
        <Button title="Sign Out" variant="danger" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.fieldValue}>{String(value)}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function StatusPill({ status }: { status: EmployeeCompetencyProfile['completed'][number]['status'] }) {
  const bg = status === 'Expired' ? '#fee2e2' : status === 'Expires Soon' ? '#fef3c7' : status === 'Archived' ? '#e5e7eb' : '#dcfce7';
  const fg = status === 'Expired' ? '#991b1b' : status === 'Expires Soon' ? '#92400e' : status === 'Archived' ? '#374151' : '#166534';
  return <Text style={{ backgroundColor: bg, color: fg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>{status || '—'}</Text>;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12, marginBottom: 12 },
  tabBtn: { paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tableWrap: { marginTop: 8 },
  rowCard: { padding: 12, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  leftAccent: { borderLeftWidth: 4, borderLeftColor: colors.secondary },
  rowTitle: { fontWeight: '700', color: colors.text },
  rowMeta: { color: colors.muted, marginTop: 2 },
  rowGrid: { flexDirection: 'row', gap: 12, marginTop: 8 },
  fieldLabel: { fontSize: 12, color: colors.muted },
  fieldValue: { fontSize: 14, color: colors.text },
  muted: { color: colors.muted },
});
