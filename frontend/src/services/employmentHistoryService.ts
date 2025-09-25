import apiClient from './api';
import {
  type EmploymentHistory,
  type CreateEmploymentHistoryPayload,
  type UpdateEmploymentHistoryPayload
} from '../types/employmentHistory';

export const getEmploymentHistory = async (employeeNumber: string): Promise<EmploymentHistory[]> =>
  apiClient<EmploymentHistory[]>(`employees/${encodeURIComponent(employeeNumber)}/employment-history`, { method: 'GET' });

export const getCurrentPositions = async (employeeNumber: string): Promise<EmploymentHistory[]> =>
  apiClient<EmploymentHistory[]>(`employees/${encodeURIComponent(employeeNumber)}/current-positions`, { method: 'GET' });

export const createEmploymentHistory = async (payload: CreateEmploymentHistoryPayload): Promise<EmploymentHistory> =>
  apiClient<EmploymentHistory>('employment-history', { method: 'POST', data: payload });

export const updateEmploymentHistory = async (employmentID: number, payload: UpdateEmploymentHistoryPayload): Promise<EmploymentHistory> => {
  const data: any = {};
  if (payload.endDate !== undefined) data.endDate = payload.endDate === null ? "" : payload.endDate;
  if (payload.employmentType !== undefined) data.employmentType = payload.employmentType;
  if (payload.notes !== undefined) data.notes = payload.notes;
  return apiClient<EmploymentHistory>(`employment-history/${employmentID}`, { method: 'PUT', data });
};

export const deleteEmploymentHistory = async (employmentID: number): Promise<void> =>
  apiClient<void>(`employment-history/${employmentID}`, { method: 'DELETE' });