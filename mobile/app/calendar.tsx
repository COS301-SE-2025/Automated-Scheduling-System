import * as React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar as RNCalendar, type ICalendarEventBase } from 'react-native-big-calendar';
import { useRouter } from 'expo-router';
import { getScheduledEvents, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import DetailModal from '@/components/ui/DetailModal';
import Button from '@/components/ui/Button';

type EventWithMeta = ICalendarEventBase & { id: string; original: MobileEvent; color?: string };

function expandMultiDay(events: MobileEvent[]): EventWithMeta[] {
  const out: EventWithMeta[] = [];
  for (const e of events) {
    if (!e.start || !e.end) continue;
    const seriesStart = new Date(e.start);
    const seriesEnd = new Date(e.end);
    // Single-day or same calendar day
    const startDay = new Date(seriesStart); startDay.setHours(0,0,0,0);
    const endDay = new Date(seriesEnd); endDay.setHours(0,0,0,0);
    const sameDay = startDay.getTime() === endDay.getTime();
    if (sameDay) {
      out.push({
        id: String(e.id),
        title: e.title,
        start: seriesStart,
        end: seriesEnd.getTime() > seriesStart.getTime() ? seriesEnd : new Date(seriesStart.getTime() + 60*60*1000),
        original: e,
        color: e.color,
      });
      continue;
    }
    // Expand to per-day instances
    const hStart = seriesStart.getHours();
    const mStart = seriesStart.getMinutes();
    const hEnd = seriesEnd.getHours();
    const mEnd = seriesEnd.getMinutes();
    const cur = new Date(startDay);
    while (cur.getTime() <= endDay.getTime()) {
      const instStart = new Date(cur); instStart.setHours(hStart, mStart, 0, 0);
      const instEnd = new Date(cur); instEnd.setHours(hEnd, mEnd, 0, 0);
      if (instEnd.getTime() <= instStart.getTime()) instEnd.setTime(instStart.getTime() + 60*60*1000);
      out.push({ id: `${e.id}-${cur.toISOString().slice(0,10)}`, title: e.title, start: instStart, end: instEnd, original: e, color: e.color });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarScreen() {
  const router = useRouter();
  const [mode, setMode] = React.useState<ViewMode>('month');
  const [date, setDate] = React.useState<Date>(new Date());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sourceEvents, setSourceEvents] = React.useState<MobileEvent[]>([]);
  const [events, setEvents] = React.useState<EventWithMeta[]>([]);
  const [selected, setSelected] = React.useState<MobileEvent | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await getScheduledEvents();
      // Sort then expand for stable rendering
      const sorted = list.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setSourceEvents(sorted);
      setEvents(expandMultiDay(sorted));
      setError(null);
    } catch (e) {
      setError('Could not load calendar data.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const goToday = () => setDate(new Date());
  const goPrev = () => {
    const d = new Date(date);
    if (mode === 'month') d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - (mode === 'week' ? 7 : 1));
    setDate(d);
  };
  const goNext = () => {
    const d = new Date(date);
    if (mode === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + (mode === 'week' ? 7 : 1));
    setDate(d);
  };

  const headerTitle = React.useMemo(() => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [date]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header actions similar to web */}
      <View style={styles.header}> 
        <Text style={styles.h1}>View Events On Your Calendar</Text>
        <View style={styles.actions}>
          <Button title="Create New Event Types" variant="outline" onPress={() => router.push('/event-definitions')} />
          <Button title="Schedule Event" variant="primary" onPress={() => router.push('/events')} />
        </View>
      </View>

      {loading && (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={{ marginTop: 8, color: colors.muted }}>Loading your calendar...</Text></View>
      )}
      {error && !loading && (
        <View style={[styles.center, { padding: 16 }]}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Failed to load calendar</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{error}</Text>
        </View>
      )}

      {!error && (
        <View style={styles.calendarWrap}>
          {/* Non-blocking refresh veil */}
          {loading && (
            <View style={styles.veil}><Text style={styles.veilText}>Refreshing…</Text></View>
          )}
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              <TouchableOpacity onPress={goPrev} style={styles.navBtn}><Text style={styles.navBtnText}>Prev</Text></TouchableOpacity>
              <TouchableOpacity onPress={goToday} style={styles.navBtn}><Text style={styles.navBtnText}>Today</Text></TouchableOpacity>
              <TouchableOpacity onPress={goNext} style={styles.navBtn}><Text style={styles.navBtnText}>Next</Text></TouchableOpacity>
            </View>
            <Text style={styles.title}>{headerTitle}</Text>
            <View style={styles.modes}>
              {(['month','week','day'] as ViewMode[]).map(m => (
                <TouchableOpacity key={m} onPress={() => setMode(m)} style={[styles.modeBtn, mode===m && styles.modeBtnActive]}>
                  <Text style={[styles.modeText, mode===m && styles.modeTextActive]}>{m === 'day' ? 'Day' : m === 'week' ? 'Week' : 'Month'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <RNCalendar<EventWithMeta>
            height={650}
            mode={mode}
            date={date}
            events={events}
            onPressEvent={(ev) => setSelected((ev as any).original)}
            onPressCell={(d: Date) => { setDate(d); setMode('day'); }}
            onChangeDate={(range: Date[]) => { const first = range?.[0]; if (first) setDate(first); }}
            eventCellStyle={(ev) => ({
              backgroundColor: ((ev as any).color) || '#3788d8',
              borderRadius: 6,
            })}
            renderEvent={(ev) => (
              <View style={{ padding: 4 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>{(ev as any).title}</Text>
                <Text style={{ color: 'white', opacity: 0.9, fontSize: 10 }}>
                  {(ev as any).start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {(ev as any).end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            swipeEnabled
          />
        </View>
      )}

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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  h1: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, alignSelf: 'flex-end' },
  center: { alignItems: 'center', justifyContent: 'center' },
  calendarWrap: { flex: 1, backgroundColor: colors.surface, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  veil: { position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: '#ffffffcc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  veilText: { fontSize: 12, color: '#374151' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  navBtnText: { color: '#374151', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  modes: { flexDirection: 'row', gap: 6 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'transparent', borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { color: colors.text, fontWeight: '600' },
  modeTextActive: { color: 'white' },
  detailRow: { color: colors.text },
  detailLabel: { color: colors.text, fontWeight: '700' },
});
