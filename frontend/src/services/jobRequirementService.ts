import apiClient from './api';
import type { JobPosition } from './jobPositionService';

export interface JobRequirement {
    customMatrixID: number;
    positionMatrixCode: string;
    competencyID: number;
    requirementStatus: string;
    notes: string;
    jobPosition: JobPosition; 
}

export const getAllJobRequirements = async (filters?: { competencyId?: number, positionMatrixCode?: string }): Promise<JobRequirement[]> => {
    const params = new URLSearchParams();
    if (filters?.competencyId) {
        params.append('competencyId', filters.competencyId.toString());
    }
    if (filters?.positionMatrixCode) {
        params.append('positionMatrixCode', filters.positionMatrixCode);
    }
    const queryString = params.toString();
    const url = queryString ? `job-requirements?${queryString}` : 'job-requirements';
    
    return apiClient<JobRequirement[]>(url);
};

export const addJobRequirement = async (data: { competencyID: number; positionMatrixCode: string; requirementStatus: string }): Promise<JobRequirement> => {
    return apiClient<JobRequirement>('job-requirements', { method: 'POST', data });
};

export const deleteJobRequirement = async (matrixID: number): Promise<void> => {
    await apiClient<void>(`job-requirements/${matrixID}`, { method: 'DELETE' });
};