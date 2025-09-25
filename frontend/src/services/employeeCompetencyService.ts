import apiClient from './api';
import {
    type EmployeeCompetency,
    type CreateEmployeeCompetencyPayload,
    type UpdateEmployeeCompetencyPayload
} from '../types/employeeCompetency';

export const getEmployeeCompetencies = async (employeeNumber: string): Promise<EmployeeCompetency[]> => {
    return apiClient<EmployeeCompetency[]>(`employees/${encodeURIComponent(employeeNumber)}/competencies`, { method: 'GET' });
};

export const createEmployeeCompetency = async (payload: CreateEmployeeCompetencyPayload): Promise<EmployeeCompetency> => {
    // Omit undefined keys
    const data: any = { ...payload };
    if (data.achievementDate === null) delete data.achievementDate;
    if (data.expiryDate === null) delete data.expiryDate;
    return apiClient<EmployeeCompetency>('employee-competencies', { method: 'POST', data });
};

export const updateEmployeeCompetency = async (
    id: number,
    payload: UpdateEmployeeCompetencyPayload
): Promise<EmployeeCompetency> => {
    const data: any = {};
    if (payload.achievementDate !== undefined) data.achievementDate = payload.achievementDate === null ? "" : payload.achievementDate;
    if (payload.expiryDate !== undefined) data.expiryDate = payload.expiryDate === null ? "" : payload.expiryDate;
    if (payload.grantedByScheduleID !== undefined) data.grantedByScheduleID = payload.grantedByScheduleID;
    if (payload.notes !== undefined) data.notes = payload.notes;
    return apiClient<EmployeeCompetency>(`employee-competencies/${id}`, { method: 'PUT', data });
};

export const deleteEmployeeCompetency = async (id: number): Promise<void> => {
    await apiClient<void>(`employee-competencies/${id}`, { method: 'DELETE' });
};