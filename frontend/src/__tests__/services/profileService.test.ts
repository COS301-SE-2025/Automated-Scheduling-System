import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { ApiError as MockApiError } from '../../services/api';
import {
    getEmployeeCompetencyProfile,
    type EmployeeCompetencyProfile,
    type CompetencyBrief,
    type EmployeeHeader
} from '../../services/profileService';

// Mock the api module with a default function and a minimal ApiError class
vi.mock('../../services/api', () => {
    class ApiError extends Error {
        status: number;
        original?: unknown;
        constructor(message: string, status = 0, original?: unknown) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.original = original;
        }
    }
    return {
        default: vi.fn(),
        ApiError,
    };
});

const mockApi = vi.mocked(apiClient);

describe('profileService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockEmployee: EmployeeHeader = {
        employeeNumber: 'EMP001',
        name: 'John Doe',
        positionCode: 'DEV001',
        positionTitle: 'Software Developer'
    };

    const mockCompetencyBrief: CompetencyBrief = {
        competencyID: 1,
        competencyName: 'React Development',
        competencyTypeName: 'Technical',
        description: 'Frontend development with React',
        expiryPeriodMonths: 12,
        isActive: true,
        achievementDate: '2024-01-15',
        expiryDate: '2025-01-15',
        status: 'Valid',
        prerequisites: [2, 3]
    };

    const mockRequiredCompetency: CompetencyBrief = {
        competencyID: 4,
        competencyName: 'TypeScript',
        competencyTypeName: 'Technical',
        description: 'TypeScript programming language',
        expiryPeriodMonths: null,
        isActive: true,
        prerequisites: []
    };

    describe('getEmployeeCompetencyProfile', () => {
        it('fetches employee competency profile successfully', async () => {
            const mockProfile: EmployeeCompetencyProfile = {
                employee: mockEmployee,
                completed: [mockCompetencyBrief],
                required: [mockRequiredCompetency]
            };

            mockApi.mockResolvedValue(mockProfile as any);

            const result = await getEmployeeCompetencyProfile();

            expect(mockApi).toHaveBeenCalledWith('profile/competencies', { method: 'GET' });
            expect(result).toEqual(mockProfile);
            expect(result.employee).toEqual(mockEmployee);
            expect(result.completed).toHaveLength(1);
            expect(result.required).toHaveLength(1);
            expect(result.completed[0]).toEqual(mockCompetencyBrief);
            expect(result.required[0]).toEqual(mockRequiredCompetency);
        });

        it('handles empty competency arrays', async () => {
            const mockProfile: EmployeeCompetencyProfile = {
                employee: mockEmployee,
                completed: [],
                required: []
            };

            mockApi.mockResolvedValue(mockProfile as any);

            const result = await getEmployeeCompetencyProfile();

            expect(result.completed).toEqual([]);
            expect(result.required).toEqual([]);
        });

        it('handles competencies without optional fields', async () => {
            const minimalCompetency: CompetencyBrief = {
                competencyID: 5,
                competencyName: 'Basic Skill',
                competencyTypeName: 'Core',
                description: 'A basic required skill',
                isActive: true
            };

            const mockProfile: EmployeeCompetencyProfile = {
                employee: mockEmployee,
                completed: [],
                required: [minimalCompetency]
            };

            mockApi.mockResolvedValue(mockProfile as any);

            const result = await getEmployeeCompetencyProfile();

            expect(result.required[0]).toEqual(minimalCompetency);
            expect(result.required[0].expiryPeriodMonths).toBeUndefined();
            expect(result.required[0].achievementDate).toBeUndefined();
            expect(result.required[0].expiryDate).toBeUndefined();
            expect(result.required[0].status).toBeUndefined();
            expect(result.required[0].prerequisites).toBeUndefined();
        });

        it('handles competencies with different status values', async () => {
            const expiredCompetency: CompetencyBrief = {
                ...mockCompetencyBrief,
                competencyID: 6,
                status: 'Expired'
            };

            const expiresSoonCompetency: CompetencyBrief = {
                ...mockCompetencyBrief,
                competencyID: 7,
                status: 'Expires Soon'
            };

            const archivedCompetency: CompetencyBrief = {
                ...mockCompetencyBrief,
                competencyID: 8,
                status: 'Archived'
            };

            const mockProfile: EmployeeCompetencyProfile = {
                employee: mockEmployee,
                completed: [expiredCompetency, expiresSoonCompetency, archivedCompetency],
                required: []
            };

            mockApi.mockResolvedValue(mockProfile as any);

            const result = await getEmployeeCompetencyProfile();

            expect(result.completed).toHaveLength(3);
            expect(result.completed[0].status).toBe('Expired');
            expect(result.completed[1].status).toBe('Expires Soon');
            expect(result.completed[2].status).toBe('Archived');
        });

        it('rethrows ApiError from apiClient', async () => {
            const err = new MockApiError('Unauthorized', 401);
            mockApi.mockRejectedValue(err);

            await expect(getEmployeeCompetencyProfile()).rejects.toBe(err);
            expect(mockApi).toHaveBeenCalledWith('profile/competencies', { method: 'GET' });
        });

        it('propagates unknown errors from apiClient', async () => {
            const networkError = new Error('Network connection failed');
            mockApi.mockRejectedValue(networkError);

            // Current implementation propagates unknown errors from apiClient unchanged.
            await expect(getEmployeeCompetencyProfile()).rejects.toBe(networkError);
        });

        it('handles server errors properly', async () => {
            const serverError = new MockApiError('Internal Server Error', 500);
            mockApi.mockRejectedValue(serverError);

            await expect(getEmployeeCompetencyProfile()).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Internal Server Error',
                status: 500,
            });
        });

        it('verifies profile structure does not include explore property', async () => {
            const mockProfile: EmployeeCompetencyProfile = {
                employee: mockEmployee,
                completed: [mockCompetencyBrief],
                required: [mockRequiredCompetency]
            };

            mockApi.mockResolvedValue(mockProfile as any);

            const result = await getEmployeeCompetencyProfile();

            // Ensure the explore property is not present
            expect(result).not.toHaveProperty('explore');
            expect(Object.keys(result)).toEqual(['employee', 'completed', 'required']);
        });
    });
});
