export type EventItem = {
  id: string;
  title: string;
  date: string; // ISO date
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  attendees?: number;
};

export type EventDefinition = {
  id: string;
  name: string;
  description?: string;
  required?: boolean;
};

export const mockEvents: EventItem[] = [
  { id: '1', title: 'Safety Training', date: '2025-09-18', status: 'Scheduled', attendees: 12 },
  { id: '2', title: 'First Aid', date: '2025-09-18', status: 'Scheduled', attendees: 8 },
  { id: '3', title: 'Fire Drill', date: '2025-09-19', status: 'Completed', attendees: 20 },
  { id: '4', title: 'Confined Space', date: '2025-09-20', status: 'Cancelled', attendees: 0 },
];

export const mockEventDefinitions: EventDefinition[] = [
  { id: 'ed1', name: 'Safety Training', description: 'General safety training', required: true },
  { id: 'ed2', name: 'First Aid', description: 'Basic first aid course', required: false },
  { id: 'ed3', name: 'Fire Drill', description: 'Annual fire evacuation drill', required: true },
];
