// frontend/services/competencyService.ts

import apiClient, { ApiError } from './api';
import type { Competency, AddCompetencyData, UpdateCompetencyData, CompetencyType } from '../types/competency';

export const getAllCompetencies = async (): Promise<Competency[]> => {
    try {
        const competencies = await apiClient<Competency[]>('competencies', {
            method: 'GET',
        });
        return competencies;
    } catch (error) {
        console.error('Error fetching all competencies:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            error instanceof Error ? error.message : 'An unknown error occurred while fetching competencies.',
            (error as any).status || 0,
            error
        );
    }
};

export const addCompetency = async (competencyData: AddCompetencyData): Promise<Competency> => {
    try {
        const newCompetency = await apiClient<Competency>('competencies', {
            method: 'POST',
            data: competencyData,
        });
        return newCompetency;
    } catch (error) {
        console.error('Error adding competency:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : 'An unknown error occurred while adding the competency.',
            (error as any).status || 0,
            error
        );
    }
};

export const updateCompetency = async (competencyID: number, updates: UpdateCompetencyData): Promise<Competency> => {
    try {
        const updatedCompetency = await apiClient<Competency>(`competencies/${competencyID}`, {
            method: 'PUT',
            data: updates,
        });
        return updatedCompetency;
    } catch (error) {
        console.error(`Error updating competency ${competencyID}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : `An unknown error occurred while updating competency ${competencyID}.`,
            (error as any).status || 0,
            error
        );
    }
};

export const deleteCompetency = async (competencyID: number): Promise<void> => {
    try {
        await apiClient<void>(`competencies/${competencyID}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error(`Error deactivating competency ${competencyID}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : `An unknown error occurred while deactivating competency ${competencyID}.`,
            (error as any).status || 0,
            error
        );
    }
};

export const addPrerequisite = async (competencyID: number, prerequisiteCompetencyID: number): Promise<void> => {
    try {
        await apiClient(`competencies/${competencyID}/prerequisites`, {
            method: 'POST',
            data: { prerequisiteCompetencyID },
        });
    } catch (error) {
        console.error(`Error adding prerequisite to competency ${competencyID}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : `An unknown error occurred while adding prerequisite.`,
            (error as any).status || 0,
            error
        );
    }
};

export const removePrerequisite = async (competencyID: number, prerequisiteCompetencyID: number): Promise<void> => {
    try {
        await apiClient(`competencies/${competencyID}/prerequisites/${prerequisiteCompetencyID}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error(`Error removing prerequisite from competency ${competencyID}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : `An unknown error occurred while removing prerequisite.`,
            (error as any).status || 0,
            error
        );
    }
};

export const getAllCompetencyTypes = async (): Promise<CompetencyType[]> => {
    try {
        const types = await apiClient<CompetencyType[]>('competency-types', {
            method: 'GET',
        });
        return types;
    } catch (error) {
        console.error('Error fetching competency types:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : 'An unknown error occurred while fetching competency types.',
            (error as any).status || 0,
            error
        );
    }
};

export const createCompetencyType = async (typeName: string, description: string): Promise<CompetencyType> => {
    try {
        const newType = await apiClient<CompetencyType>('competency-types', {
            method: 'POST',
            data: { typeName, description },
        });
        return newType;
    } catch (error) {
        console.error('Error creating competency type:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to create competency type.', (error as any).status, error);
    }
};

export const updateCompetencyType = async (typeName: string, description: string): Promise<CompetencyType> => {
    try {
        const updatedType = await apiClient<CompetencyType>(`competency-types/${encodeURIComponent(typeName)}`, {
            method: 'PUT',
            data: { typeName, description },
        });
        return updatedType;
    } catch (error) {
        console.error('Error updating competency type:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to update competency type.', (error as any).status, error);
    }
};

export const updateCompetencyTypeStatus = async (typeName: string, isActive: boolean): Promise<CompetencyType> => {
    try {
        const updatedType = await apiClient<CompetencyType>(`competency-types/${encodeURIComponent(typeName)}/status`, {
            method: 'PUT',
            data: { isActive },
        });
        return updatedType;
    } catch (error) {
        console.error('Error updating competency type status:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to update status.', (error as any).status, error);
    }
};