import apiClient from './api';
import type { RoleRecord, AddRoleData, UpdateRoleData } from '../types/role';


export const getAllRoles = async (): Promise<RoleRecord[]> => {
  const roles = await apiClient<RoleRecord[]>('api/roles', { method: 'GET' });
  return roles;
};

export const createRole = async (data: AddRoleData): Promise<RoleRecord> => {
  const created = await apiClient<RoleRecord>('api/roles', {
    method: 'POST',
    data,
  });
  return created;
};

export const updateRole = async (id: number, data: UpdateRoleData): Promise<RoleRecord> => {
  const updated = await apiClient<RoleRecord>(`api/roles/${id}`, {
    method: 'PATCH',
    data,
  });
  return updated;
};

export const deleteRole = async (id: number): Promise<void> => {
  await apiClient<void>(`api/roles/${id}`, { method: 'DELETE' });
};
