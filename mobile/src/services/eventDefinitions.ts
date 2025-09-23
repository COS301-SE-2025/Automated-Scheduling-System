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

export async function getEventDefinitions(): Promise<EventDefinition[]> {
  const { data } = await api.get<EventDefinition[]>('event-definitions');
  return data ?? [];
}
