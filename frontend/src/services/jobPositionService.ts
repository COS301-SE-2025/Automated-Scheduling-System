import apiClient from './api';

export interface JobPosition {
    positionMatrixCode: string;
    jobTitle: string;
    description: string;
    isActive: boolean;
    creationDate: string;
}

export const getAllJobPositions = async (): Promise<JobPosition[]> => {
    return apiClient<JobPosition[]>('api/job-positions');
};

export const createJobPosition = async (data: { positionMatrixCode: string; jobTitle: string; description: string }): Promise<JobPosition> => {
    return apiClient<JobPosition>('api/job-positions', { method: 'POST', data });
};

export const updateJobPosition = async (code: string, data: { jobTitle: string; description: string }): Promise<JobPosition> => {
    return apiClient<JobPosition>(`api/job-positions/${encodeURIComponent(code)}`, { method: 'PUT', data });
};

export const updateJobPositionStatus = async (code: string, isActive: boolean): Promise<JobPosition> => {
    return apiClient<JobPosition>(`api/job-positions/${encodeURIComponent(code)}/status`, {
        method: 'PUT',
        data: { isActive },
    });
};