import api from '@/services/api';

export type BackendScheduledEvent = {
  CustomEventScheduleID: number;
  CustomEventID: number;
  Title: string;
  EventStartDate: string; // ISO
  EventEndDate: string;   // ISO
  RoomName?: string;
  MaximumAttendees?: number;
  MinimumAttendees?: number;
  StatusName: string;
  CreationDate: string;
  color?: string;
  CustomEventDefinition: { EventName: string; Facilitator?: string };
  Employees?: { employee_number: string }[];
  Positions?: { position_matrix_code: string }[];
  canEdit?: boolean;
  canDelete?: boolean;
  creatorUserId?: number;
};

export type MobileEvent = {
  id: number;
  definitionId: number;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  roomName?: string;
  maxAttendees?: number;
  minAttendees?: number;
  statusName: string;
  creationDate: string;
  facilitator?: string;
  employees?: string[];
  positions?: string[];
  relevantParties?: string;
  color?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  creatorUserId?: number;
  eventType?: string;
};

function buildRelevantParties(e: BackendScheduledEvent): string {
  const empCount = e.Employees?.length ?? 0;
  const posCount = e.Positions?.length ?? 0;
  if (empCount === 0 && posCount === 0) return 'Unassigned';
  const parts: string[] = [];
  if (empCount > 0) parts.push(`${empCount} employee${empCount > 1 ? 's' : ''}`);
  if (posCount > 0) parts.push(`${posCount} position${posCount > 1 ? 's' : ''}`);
  return parts.join(', ');
}

export async function getScheduledEvents(): Promise<MobileEvent[]> {
  const { data } = await api.get<BackendScheduledEvent[]>('event-schedules');
  return (data || []).map(e => ({
    id: e.CustomEventScheduleID,
    definitionId: e.CustomEventID,
    title: e.Title,
    start: e.EventStartDate,
    end: e.EventEndDate,
    roomName: e.RoomName,
    maxAttendees: e.MaximumAttendees,
    minAttendees: e.MinimumAttendees,
    statusName: e.StatusName,
    creationDate: e.CreationDate,
    facilitator: e.CustomEventDefinition?.Facilitator,
    employees: (e.Employees || []).map(x => x.employee_number),
    positions: (e.Positions || []).map(x => x.position_matrix_code),
    relevantParties: buildRelevantParties(e),
    color: e.color,
    canEdit: e.canEdit,
    canDelete: e.canDelete,
    creatorUserId: e.creatorUserId,
    eventType: e.CustomEventDefinition?.EventName,
  }));
}
