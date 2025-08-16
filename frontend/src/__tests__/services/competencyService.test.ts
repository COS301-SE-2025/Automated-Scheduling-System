import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { ApiError as MockApiError } from '../../services/api';
import {
    getAllCompetencies,
    addCompetency,
    updateCompetency,
    deleteCompetency,
    addPrerequisite,
    removePrerequisite,
    getAllCompetencyTypes,
    createCompetencyType,
    updateCompetencyType,
    updateCompetencyTypeStatus,
} from '../../services/competencyService';

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

describe('competencyService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAllCompetencies', () => {
        it('fetches all competencies successfully', async () => {
            const mockData = [{ competencyID: 1, name: 'A' }];
            mockApi.mockResolvedValue(mockData as any);

            const res = await getAllCompetencies();

            expect(mockApi).toHaveBeenCalledWith('api/competencies', { method: 'GET' });
            expect(res).toEqual(mockData);
        });

        it('rethrows ApiError from apiClient', async () => {
            const err = new MockApiError('Server down', 503);
            mockApi.mockRejectedValue(err);

            await expect(getAllCompetencies()).rejects.toBe(err);
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('boom'));

            await expect(getAllCompetencies()).rejects.toMatchObject({
                name: 'ApiError',
                message: 'boom',
                status: 0,
            });
        });
    });

    describe('addCompetency', () => {
        it('creates a competency', async () => {
            const payload = { name: 'New', description: 'Desc', typeName: 'TypeA' } as any;
            const created = { competencyID: 2, ...payload };
            mockApi.mockResolvedValue(created as any);

            const res = await addCompetency(payload);

            expect(mockApi).toHaveBeenCalledWith('api/competencies', {
                method: 'POST',
                data: payload,
            });
            expect(res).toEqual(created);
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('bad'));

            await expect(addCompetency({} as any)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'bad',
                status: 0,
            });
        });
    });

    describe('updateCompetency', () => {
        it('updates a competency', async () => {
            const id = 10;
            const updates = { description: 'Updated' } as any;
            const updated = { competencyID: id, name: 'N', ...updates };
            mockApi.mockResolvedValue(updated as any);

            const res = await updateCompetency(id, updates);

            expect(mockApi).toHaveBeenCalledWith(`api/competencies/${id}`, {
                method: 'PUT',
                data: updates,
            });
            expect(res).toEqual(updated);
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('nope'));

            await expect(updateCompetency(1, {} as any)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'nope',
                status: 0,
            });
        });
    });

    describe('deleteCompetency', () => {
        it('deletes a competency', async () => {
            mockApi.mockResolvedValue(undefined);

            await deleteCompetency(5);

            expect(mockApi).toHaveBeenCalledWith('api/competencies/5', {
                method: 'DELETE',
            });
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('missing'));

            await expect(deleteCompetency(999)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'missing',
                status: 0,
            });
        });
    });

    describe('addPrerequisite', () => {
        it('adds a prerequisite', async () => {
            mockApi.mockResolvedValue(undefined);

            await addPrerequisite(10, 2);

            expect(mockApi).toHaveBeenCalledWith('api/competencies/10/prerequisites', {
                method: 'POST',
                data: { prerequisiteCompetencyID: 2 },
            });
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('fail'));

            await expect(addPrerequisite(1, 2)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'fail',
                status: 0,
            });
        });
    });

    describe('removePrerequisite', () => {
        it('removes a prerequisite', async () => {
            mockApi.mockResolvedValue(undefined);

            await removePrerequisite(10, 2);

            expect(mockApi).toHaveBeenCalledWith('api/competencies/10/prerequisites/2', {
                method: 'DELETE',
            });
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('cant remove'));

            await expect(removePrerequisite(1, 2)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'cant remove',
                status: 0,
            });
        });
    });

    describe('getAllCompetencyTypes', () => {
        it('fetches types', async () => {
            const types = [{ typeName: 'Core', description: '...' }];
            mockApi.mockResolvedValue(types as any);

            const res = await getAllCompetencyTypes();

            expect(mockApi).toHaveBeenCalledWith('api/competency-types', { method: 'GET' });
            expect(res).toEqual(types);
        });

        it('wraps unknown errors in ApiError', async () => {
            mockApi.mockRejectedValue(new Error('x'));

            await expect(getAllCompetencyTypes()).rejects.toMatchObject({
                name: 'ApiError',
                message: 'x',
                status: 0,
            });
        });
    });

    describe('createCompetencyType', () => {
        it('creates type', async () => {
            const payload = { typeName: 'Tech', description: 'Tech skills' };
            const created = { ...payload, isActive: true };
            mockApi.mockResolvedValue(created as any);

            const res = await createCompetencyType(payload.typeName, payload.description);

            expect(mockApi).toHaveBeenCalledWith('api/competency-types', {
                method: 'POST',
                data: payload,
            });
            expect(res).toEqual(created);
        });

        it('throws ApiError with generic message on failure', async () => {
            mockApi.mockRejectedValue(new Error('backend fail'));

            await expect(createCompetencyType('X', 'Y')).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Failed to create competency type.',
            });
        });
    });

    describe('updateCompetencyType', () => {
        it('updates type', async () => {
            const payload = { typeName: 'Tech', description: 'Updated' };
            const updated = { ...payload, isActive: true };
            mockApi.mockResolvedValue(updated as any);

            const res = await updateCompetencyType(payload.typeName, payload.description);

            expect(mockApi).toHaveBeenCalledWith(`api/competency-types/${encodeURIComponent(payload.typeName)}`, {
                method: 'PUT',
                data: payload,
            });
            expect(res).toEqual(updated);
        });

        it('throws ApiError with generic message on failure', async () => {
            mockApi.mockRejectedValue(new Error('no'));

            await expect(updateCompetencyType('A', 'B')).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Failed to update competency type.',
            });
        });
    });

    describe('updateCompetencyTypeStatus', () => {
        it('updates type status', async () => {
            const typeName = 'Core';
            const isActive = false;
            const updated = { typeName, description: 'd', isActive };
            mockApi.mockResolvedValue(updated as any);

            const res = await updateCompetencyTypeStatus(typeName, isActive);

            expect(mockApi).toHaveBeenCalledWith(`api/competency-types/${encodeURIComponent(typeName)}/status`, {
                method: 'PUT',
                data: { isActive },
            });
            expect(res).toEqual(updated);
        });

        it('throws ApiError with generic message on failure', async () => {
            mockApi.mockRejectedValue(new Error('nope'));

            await expect(updateCompetencyTypeStatus('X', true)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Failed to update status.',
            });
        });
    });
});