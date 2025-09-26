import * as React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Calendar as RNCalendar, type ICalendarEventBase } from 'react-native-big-calendar';
import { useRouter } from 'expo-router';
import { getScheduledEvents, createScheduledEvent, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import DetailModal from '@/components/ui/DetailModal';
import EventScheduleFormModal from '@/components/ui/EventScheduleFormModal';
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
    
    // Check if this is a multi-day event
    const startDay = new Date(seriesStart);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(seriesEnd);
    endDay.setHours(0, 0, 0, 0);
    const sameDay = startDay.getTime() === endDay.getTime();
    
    if (sameDay) {
      // Single day event - create one instance
      const eventEnd = seriesEnd.getTime() > seriesStart.getTime() 
        ? seriesEnd 
        : new Date(seriesStart.getTime() + 60*60*1000);
      
      out.push({
        id: String(e.id),
        title: e.title || 'Untitled Event',
        start: seriesStart,
        end: eventEnd,
        color: e.color || '#3788d8',
        original: {
          ...e,
          start: e.start.toISOString(),
          end: e.end.toISOString()
        },
      });
    } else {
      // Multi-day event - create instances for each day
      const originalHours = seriesStart.getHours();
      const originalMinutes = seriesStart.getMinutes();
      const endHours = seriesEnd.getHours();
      const endMinutes = seriesEnd.getMinutes();
      const currentDay = new Date(startDay);
      
      while (currentDay.getTime() <= endDay.getTime()) {
        const dayStart = new Date(currentDay);
        const dayEnd = new Date(currentDay);
        
        if (currentDay.getTime() === startDay.getTime()) {
          // First day - use original start time
          dayStart.setHours(originalHours, originalMinutes, 0, 0);
          dayEnd.setHours(23, 59, 59, 999); // End of day
        } else if (currentDay.getTime() === endDay.getTime()) {
          // Last day - use original end time
          dayStart.setHours(0, 0, 0, 0); // Start of day
          dayEnd.setHours(endHours, endMinutes, 0, 0);
        } else {
          // Middle days - full day
          dayStart.setHours(0, 0, 0, 0);
          dayEnd.setHours(23, 59, 59, 999);
        }
        
        // Ensure end is after start
        if (dayEnd.getTime() <= dayStart.getTime()) {
          dayEnd.setTime(dayStart.getTime() + 60*60*1000);
        }
        
        out.push({
          id: `${e.id}-${currentDay.toISOString().slice(0, 10)}`,
          title: e.title || 'Untitled Event',
          start: dayStart,
          end: dayEnd,
          color: e.color || '#3788d8',
          original: {
            ...e,
            start: e.start.toISOString(),
            end: e.end.toISOString()
          },
        });
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
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
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);

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

  const handleScheduleEvent = async (formData: {
    title: string;
    customEventId: number;
    start: string;
    end: string;
    roomName: string;
    maximumAttendees: number;
    minimumAttendees: number;
    statusName: string;
    color: string;
  }) => {
    try {
      await createScheduledEvent({
        title: formData.title,
        customEventId: formData.customEventId,
        eventStartDate: formData.start,
        eventEndDate: formData.end,
        roomName: formData.roomName,
        maximumAttendees: formData.maximumAttendees,
        minimumAttendees: formData.minimumAttendees,
        statusName: formData.statusName,
        color: formData.color,
      });
      await load(); // Refresh the calendar
      setShowScheduleModal(false);
    } catch (error) {
      throw error; // Let the modal handle the error
    }
  };

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
                  onPress={() => setShowScheduleModal(true)} 
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
          <ResponsiveToolbar 
            headerTitle={headerTitle}
            mode={mode}
            setMode={setMode}
            goPrev={goPrev}
            goNext={goNext}
            goToday={goToday}
          />
          <RNCalendar
            // Let calendar fill available space minus header + padding.
            height={Platform.OS === 'web' ? 660 : 600}
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
                  padding: 4,
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
                    fontSize: 10,
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

      <EventScheduleFormModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSave={handleScheduleEvent}
      />
    </View>
  );
}

// Responsive toolbar extracted for clarity & reusability
function ResponsiveToolbar({ headerTitle, mode, setMode, goPrev, goNext, goToday }: {
  headerTitle: string;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < 500; // breakpoint for stacking

  return (
    <View style={[styles.toolbarContainer, stacked && styles.toolbarStacked]}> 
      <View style={[styles.toolbarRow, stacked && styles.rowSpacing]}> 
        <View style={styles.navGroup}>
          <ToolbarButton label="Prev" onPress={goPrev} accessibilityLabel="Previous period" />
          <ToolbarButton label="Today" onPress={goToday} />
          <ToolbarButton label="Next" onPress={goNext} accessibilityLabel="Next period" />
        </View>
        {!stacked && (
          <View style={styles.titleWrap}> 
            <Text style={styles.title}>{headerTitle}</Text>
          </View>
        )}
        <View style={styles.modeGroup}>
          {(['month','week','day'] as ViewMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === 'month' ? 'Month' : m === 'week' ? 'Week' : 'Day'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {stacked && (
        <View style={[styles.toolbarRow, styles.titleRowStacked]}> 
          <Text style={styles.title}>{headerTitle}</Text>
        </View>
      )}
    </View>
  );
}

function ToolbarButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string; }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}>
      <Text style={styles.navBtnText}>{label}</Text>
    </TouchableOpacity>
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
  // Toolbar (responsive)
  toolbarContainer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  toolbarStacked: { paddingBottom: 10 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowSpacing: { marginBottom: 8 },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { minWidth: 64, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  navBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  titleRowStacked: { justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  modeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBtn: { minWidth: 70, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  modeTextActive: { color: 'white' },
  detailRow: { color: colors.text },
  detailLabel: { color: colors.text, fontWeight: '700' },
});
