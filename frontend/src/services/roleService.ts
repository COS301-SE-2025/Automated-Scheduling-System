import type { RoleRecord, AddRoleData, UpdateRoleData, AllowedPage } from '../types/role';

const STORAGE_KEY = 'customRoles';
const STORAGE_NEXT_ID = 'customRoles:nextId';

const DEFAULT_ROLES: RoleRecord[] = [
  {
    id: 1,
    name: 'Admin',
    description: 'Built-in administrator role with full access',
    permissions: [
      'dashboard',
      'users',
      'roles', // kept for completeness, even if nav visibility is hard-coded
      'calendar',
      'event-definitions',
      'events',
      'rules',
      'competencies',
      'main-help',
    ].filter(Boolean) as AllowedPage[],
    isSystem: true,
  },
  {
    id: 2,
    name: 'User',
    description: 'Default user role with standard access',
    permissions: ['dashboard', 'calendar', 'events', 'main-help'],
    isSystem: true,
  },
];

function loadRoles(): RoleRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return seedDefaults();
    const parsed = JSON.parse(raw) as RoleRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedDefaults();
    return parsed;
  } catch {
    return seedDefaults();
  }
}

function seedDefaults(): RoleRecord[] {
  saveRoles(DEFAULT_ROLES);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_NEXT_ID, String(3));
  }
  return DEFAULT_ROLES;
}

function saveRoles(roles: RoleRecord[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  }
}

function nextId(): number {
  if (typeof window === 'undefined') return Math.floor(Math.random() * 1000000);
  const raw = window.localStorage.getItem(STORAGE_NEXT_ID);
  const id = raw ? parseInt(raw, 10) : Math.max(0, ...loadRoles().map(r => r.id)) + 1;
  window.localStorage.setItem(STORAGE_NEXT_ID, String(id + 1));
  return id;
}

export const getAllRoles = async (): Promise<RoleRecord[]> => {
  return Promise.resolve(loadRoles());
};

export const createRole = async (data: AddRoleData): Promise<RoleRecord> => {
  const roles = loadRoles();
  if (roles.some(r => r.name.toLowerCase() === data.name.toLowerCase())) {
    throw new Error('A role with this name already exists.');
  }
  const newRole: RoleRecord = {
    id: nextId(),
    name: data.name.trim(),
    description: data.description?.trim() || '',
    permissions: Array.from(new Set(data.permissions)),
    isSystem: false,
  };
  const updated = [newRole, ...roles];
  saveRoles(updated);
  return Promise.resolve(newRole);
};

export const updateRole = async (id: number, data: UpdateRoleData): Promise<RoleRecord> => {
  const roles = loadRoles();
  const idx = roles.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Role not found');
  const current = roles[idx];
  const updated: RoleRecord = {
    ...current,
    name: data.name !== undefined ? data.name : current.name,
    description: data.description !== undefined ? data.description : current.description,
    permissions: data.permissions ? Array.from(new Set(data.permissions)) : current.permissions,
  };
  roles[idx] = updated;
  saveRoles(roles);
  return Promise.resolve(updated);
};

export const deleteRole = async (id: number): Promise<void> => {
  const roles = loadRoles();
  const toDelete = roles.find(r => r.id === id);
  if (!toDelete) return Promise.resolve();
  if (toDelete.isSystem) throw new Error('System roles cannot be deleted.');
  saveRoles(roles.filter(r => r.id !== id));
  return Promise.resolve();
};
