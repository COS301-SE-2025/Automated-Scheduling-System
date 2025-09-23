import api from '@/services/api';

export type BackendScheduledEvent = {
  CustomEventScheduleID: number;
  CustomEventID: number;
  Title: string;
  EventStartDate: string; // ISO
  EventEndDate: string;   // ISO
  StatusName: string;
  color?: string;
  CustomEventDefinition?: { EventName: string; Facilitator?: string };
};

export type UpcomingEvent = {
  id: number;
  title: string;
  start: string; // ISO
  end: string;   // ISO
};

export async function getScheduledEvents(): Promise<UpcomingEvent[]> {
  const { data } = await api.get<BackendScheduledEvent[]>('event-schedules');
  return (data || []).map(e => ({
    id: e.CustomEventScheduleID,
    title: e.Title,
    start: e.EventStartDate,
    end: e.EventEndDate,
  }));
}
