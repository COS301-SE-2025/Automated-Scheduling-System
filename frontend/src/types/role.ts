export type AllowedPage =
  | 'dashboard'
  | 'users'
  | 'calendar'
  | 'event-definitions'
  | 'events'
  | 'rules'
  | 'competencies'
  | 'main-help';

export interface RoleRecord {
  id: number;
  name: string;
  description?: string | null;
  permissions: AllowedPage[];
  isSystem?: boolean;
}

export interface AddRoleData {
  name: string;
  description?: string;
  permissions: AllowedPage[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
  permissions?: AllowedPage[];
}
