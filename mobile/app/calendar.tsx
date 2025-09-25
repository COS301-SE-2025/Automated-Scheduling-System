import * as React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar as RNCalendar, type ICalendarEventBase } from 'react-native-big-calendar';
import { useRouter } from 'expo-router';
import { getScheduledEvents, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import DetailModal from '@/components/ui/DetailModal';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export type MobileEventWithDates = Omit<MobileEvent, 'start' | 'end'> & {
  start: Date;
  end: Date;
};

type EventWithMeta = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  original?: MobileEvent;
};

function expandMultiDayWithDates(events: MobileEventWithDates[]): EventWithMeta[] {
  const out: EventWithMeta[] = [];
  
  for (const e of events) {
    if (!e.start || !e.end) {
      continue;
    }
    
    const seriesStart = e.start;
    const seriesEnd = e.end;
    
    // Validate dates
    if (isNaN(seriesStart.getTime()) || isNaN(seriesEnd.getTime())) {
      continue;
    }
    
    // Ensure end is after start
    const eventStart = seriesStart;
    const eventEnd = seriesEnd.getTime() > seriesStart.getTime() 
      ? seriesEnd 
      : new Date(seriesStart.getTime() + 60*60*1000); // Add 1 hour if end is not after start
    
    // For calendar library compatibility, create a simple event format
    const calendarEvent: EventWithMeta = {
      id: String(e.id),
      title: e.title || 'Untitled Event',
      start: eventStart,
      end: eventEnd,
      color: e.color || '#3788d8',
      original: {
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      },
    };
    
    out.push(calendarEvent);
  }
  
  return out;
}

function expandMultiDay(events: MobileEvent[]): EventWithMeta[] {
  const out: EventWithMeta[] = [];
  
  for (const e of events) {
    if (!e.start || !e.end) {
      continue;
    }
    
    let seriesStart: Date, seriesEnd: Date;
    
    // Handle both string and Date objects
    try {
      seriesStart = new Date(e.start);
      seriesEnd = new Date(e.end);
      
      // Validate dates
      if (isNaN(seriesStart.getTime()) || isNaN(seriesEnd.getTime())) {
        continue;
      }
    } catch (err) {
      continue;
    }
    
    // Single-day or same calendar day
    const startDay = new Date(seriesStart); 
    startDay.setHours(0,0,0,0);
    const endDay = new Date(seriesEnd); 
    endDay.setHours(0,0,0,0);
    const sameDay = startDay.getTime() === endDay.getTime();
    
    if (sameDay) {
      const eventEnd = seriesEnd.getTime() > seriesStart.getTime() 
        ? seriesEnd 
        : new Date(seriesStart.getTime() + 60*60*1000);
        
      out.push({
        id: String(e.id),
        title: e.title,
        start: seriesStart,
        end: eventEnd,
        original: e,
        color: e.color || '#3788d8',
      });
      continue;
    }
    
    // Expand to per-day instances for multi-day events
    const hStart = seriesStart.getHours();
    const mStart = seriesStart.getMinutes();
    const hEnd = seriesEnd.getHours();
    const mEnd = seriesEnd.getMinutes();
    const cur = new Date(startDay);
    
    while (cur.getTime() <= endDay.getTime()) {
      const instStart = new Date(cur); 
      instStart.setHours(hStart, mStart, 0, 0);
      const instEnd = new Date(cur); 
      instEnd.setHours(hEnd, mEnd, 0, 0);
      
      if (instEnd.getTime() <= instStart.getTime()) {
        instEnd.setTime(instStart.getTime() + 60*60*1000);
      }
      
      out.push({ 
        id: `${e.id}-${cur.toISOString().slice(0,10)}`, 
        title: e.title, 
        start: instStart, 
        end: instEnd, 
        original: e, 
        color: e.color || '#3788d8'
      });
      
      cur.setDate(cur.getDate() + 1);
    }
  }
  
  return out;
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarScreen() {
  const router = useRouter();
  const { user, permissions, isElevated } = useAuth();
  const [mode, setMode] = React.useState<ViewMode>('month');
  const [date, setDate] = React.useState<Date>(new Date(2025, 8, 25)); // September 25, 2025 to match events
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sourceEvents, setSourceEvents] = React.useState<MobileEvent[]>([]);
  const [events, setEvents] = React.useState<EventWithMeta[]>([]);
  const [selected, setSelected] = React.useState<MobileEvent | null>(null);

  const load = React.useCallback(async () => {
    if (!user) {
      setError('Please log in to view calendar.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const list = await getScheduledEvents();
      
      // Convert string dates to Date objects for the calendar
      const listWithDates: MobileEventWithDates[] = list.map(event => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        return {
          ...event,
          start: startDate,
          end: endDate
        };
      });
      
      // Sort then expand for stable rendering
      const sorted = listWithDates.sort((a,b) => a.start.getTime() - b.start.getTime());
      // Convert back to original format for display
      setSourceEvents(list.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      
      const expanded = expandMultiDayWithDates(sorted);
      
      setEvents(expanded);
      setError(null);
    } catch (e) {
      setError('Could not load calendar data. Please check your connection and try again.');
    } finally { setLoading(false); }
  }, [user]);

  React.useEffect(() => { 
    if (user) {
      load(); 
    }
  }, [user]); // Removed load from dependencies to prevent infinite loop

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

  // Memoize callbacks to prevent unnecessary re-renders
  const handlePressEvent = React.useCallback((ev: EventWithMeta) => {
    // Find the original event data
    if (ev.original) {
      setSelected(ev.original);
    } else {
      // For events without original data, create a mock event
      const mockEvent: MobileEvent = {
        id: parseInt(ev.id) || 0,
        definitionId: 0,
        title: ev.title,
        start: ev.start.toISOString(),
        end: ev.end.toISOString(),
        statusName: 'Event',
        creationDate: new Date().toISOString(),
        eventType: 'Scheduled Event'
      };
      setSelected(mockEvent);
    }
  }, []);

  const handlePressCell = React.useCallback((d: Date) => {
    setDate(d);
    setMode('day');
  }, []);

  const headerTitle = React.useMemo(() => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [date]);

  // Role-based UI rendering
  const canCreateDefinitions = permissions?.includes('event-definitions') || user?.role === 'Admin' || user?.role === 'HR';
  const canCreateSchedules = true; // All authenticated users can schedule events

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Please log in to view your calendar.</Text>
      </View>
    );
  }

      return (
        <View style={{ flex: 1 }}>
          {/* Header actions based on role */}
          <View style={styles.header}> 
            <Text style={styles.h1}>
              {isElevated ? 'All Events Calendar' : 'Your Events Calendar'}
            </Text>
            <View style={styles.actions}>
              {canCreateDefinitions && (
                <Button 
                  title="Create Event Types" 
                  variant="outline" 
                  onPress={() => router.push('/event-definitions')} 
                />
              )}
              {canCreateSchedules && (
                <Button 
                  title="Schedule Event" 
                  variant="primary" 
                  onPress={() => router.push('/events')} 
                />
              )}
            </View>
          </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 8, color: colors.muted }}>Loading your calendar...</Text>
        </View>
      )}
      
      {error && !loading && (
        <View style={[styles.center, { padding: 16 }]}>
          <Text style={{ color: colors.danger, fontWeight: '700', textAlign: 'center' }}>Failed to load calendar</Text>
          <Text style={{ color: colors.muted, marginTop: 4, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && !loading && sourceEvents.length === 0 && (
        <View style={[styles.center, { padding: 16 }]}>
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 16 }}>
            {isElevated ? 'No events scheduled in the system.' : 'You have no scheduled events.'}
          </Text>
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>
            {!isElevated && 'Events created by HR/Admin that include you will appear here.'}
          </Text>
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
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.title}>{headerTitle}</Text>
            </View>
            <View style={styles.modes}>
              {(['month','week','day'] as ViewMode[]).map(m => (
                <TouchableOpacity key={m} onPress={() => setMode(m)} style={[styles.modeBtn, mode===m && styles.modeBtnActive]}>
                  <Text style={[styles.modeText, mode===m && styles.modeTextActive]}>{m === 'day' ? 'Day' : m === 'week' ? 'Week' : 'Month'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <RNCalendar
            height={650}
            mode={mode}
            date={date}
            events={events}
            onPressEvent={handlePressEvent}
            onPressCell={handlePressCell}
            renderEvent={(event: EventWithMeta) => {
              return (
                <View style={{
                  flex: 1,
                  margin: 1,
                  padding: 3,
                  backgroundColor: event.color || '#3788d8',
                  borderRadius: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 18,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 1,
                  elevation: 2,
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '600', 
                    fontSize: 9,
                    textAlign: 'center',
                    textShadowColor: 'rgba(0,0,0,0.7)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  }} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>
              );
            }}
            swipeEnabled
          />
        </View>
      )}

      <DetailModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `Event Details: ${selected.title}` : undefined}>
        {selected && (
          <View style={{ gap: 8 }}>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Event Type: </Text>{selected.eventType || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Status: </Text>{selected.statusName || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Facilitator: </Text>{selected.facilitator || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Starts: </Text>{new Date(selected.start).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Ends: </Text>{new Date(selected.end).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Location: </Text>{selected.roomName || '—'}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Created: </Text>{new Date(selected.creationDate).toLocaleString()}</Text>
            <Text style={styles.detailRow}><Text style={styles.detailLabel}>Targets: </Text>{selected.relevantParties || 'Unassigned'}</Text>
            {isElevated && (
              <>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Employees: </Text>{(selected.employees?.length ?? 0)}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Positions: </Text>{(selected.positions?.length ?? 0)}</Text>
              </>
            )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600' },
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
