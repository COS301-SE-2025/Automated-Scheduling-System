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

export type CreateEventSchedulePayload = {
  customEventId: number;
  title: string;
  eventStartDate: string; // ISO format
  eventEndDate: string;   // ISO format
  roomName?: string;
  maximumAttendees?: number;
  minimumAttendees?: number;
  statusName?: string;
  color?: string;
  employeeNumbers?: string[];
  positionCodes?: string[];
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

// Get scheduled events - backend automatically filters based on user role
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

// Create a new event schedule - only for employees to schedule themselves
export async function createScheduledEvent(payload: CreateEventSchedulePayload): Promise<MobileEvent[]> {
  const { data } = await api.post<BackendScheduledEvent[]>('event-schedules', {
    customEventId: payload.customEventId,
    title: payload.title,
    start: payload.eventStartDate,
    end: payload.eventEndDate,
    roomName: payload.roomName,
    maxAttendees: payload.maximumAttendees,
    minAttendees: payload.minimumAttendees,
    statusName: payload.statusName || 'Scheduled',
    color: payload.color,
    employeeNumbers: payload.employeeNumbers || [],
    positionCodes: payload.positionCodes || [],
  });
  
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

// Update an event schedule - only for creators
export async function updateScheduledEvent(scheduleId: number, payload: Partial<CreateEventSchedulePayload>): Promise<MobileEvent[]> {
  const { data } = await api.put<BackendScheduledEvent[]>(`event-schedules/${scheduleId}`, {
    customEventId: payload.customEventId,
    title: payload.title,
    start: payload.eventStartDate,
    end: payload.eventEndDate,
    roomName: payload.roomName,
    maxAttendees: payload.maximumAttendees,
    minAttendees: payload.minimumAttendees,
    statusName: payload.statusName,
    color: payload.color,
    employeeNumbers: payload.employeeNumbers,
    positionCodes: payload.positionCodes,
  });
  
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

// Delete an event schedule - only for creators
export async function deleteScheduledEvent(scheduleId: number): Promise<void> {
  await api.delete(`event-schedules/${scheduleId}`);
}
