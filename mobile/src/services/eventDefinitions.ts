import api from '@/services/api';

export type EventDefinition = {
  CustomEventID: number;
  EventName: string;
  ActivityDescription: string;
  StandardDuration: string;
  GrantsCertificateID?: number;
  Facilitator: string;
  CreatedBy: string;
  CreationDate: string;
};

export type CreateEventDefinitionPayload = {
  EventName: string;
  ActivityDescription?: string;
  StandardDuration: string;
  Facilitator?: string;
  GrantsCertificateID?: number;
};

// Get event definitions - backend automatically filters based on user role
// Non-admin/HR users only see their own definitions
export async function getEventDefinitions(): Promise<EventDefinition[]> {
  const { data } = await api.get<EventDefinition[]>('event-definitions');
  return data ?? [];
}

// Create a new event definition - available to all users
export async function createEventDefinition(payload: CreateEventDefinitionPayload): Promise<EventDefinition> {
  // Backend expects lower camelCase field names per CreateEventDefinitionRequest json tags.
  const body: Record<string, any> = {
    eventName: payload.EventName,
    activityDescription: payload.ActivityDescription,
    standardDuration: payload.StandardDuration,
    facilitator: payload.Facilitator,
  };
  if (payload.GrantsCertificateID !== undefined) {
    body.grantsCertificateId = payload.GrantsCertificateID;
  }
  const { data } = await api.post<EventDefinition>('event-definitions', body);
  return data;
}

// Update an event definition - only for creators
export async function updateEventDefinition(definitionId: number, payload: Partial<CreateEventDefinitionPayload>): Promise<EventDefinition> {
  const body: Record<string, any> = {};
  if (payload.EventName !== undefined) body.eventName = payload.EventName;
  if (payload.ActivityDescription !== undefined) body.activityDescription = payload.ActivityDescription;
  if (payload.StandardDuration !== undefined) body.standardDuration = payload.StandardDuration;
  if (payload.Facilitator !== undefined) body.facilitator = payload.Facilitator;
  if (payload.GrantsCertificateID !== undefined) body.grantsCertificateId = payload.GrantsCertificateID;
  const { data } = await api.put<EventDefinition>(`event-definitions/${definitionId}`, body);
  return data;
}

// Delete an event definition - only for creators
export async function deleteEventDefinition(definitionId: number): Promise<void> {
  await api.delete(`event-definitions/${definitionId}`);
}
