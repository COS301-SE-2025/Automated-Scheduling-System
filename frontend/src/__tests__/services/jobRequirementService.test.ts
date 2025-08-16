import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getAllJobRequirements,
    addJobRequirement,
    deleteJobRequirement,
    type JobRequirement,
} from '../../services/jobRequirementService';

vi.mock('../../services/api', () => ({
    default: vi.fn(),
}));

const mockApi = vi.mocked(api);

describe('jobRequirementService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAllJobRequirements', () => {
        it('calls base endpoint when no filters provided', async () => {
            const data: JobRequirement[] = [] as any;
            mockApi.mockResolvedValue(data);

            const res = await getAllJobRequirements();

            expect(mockApi).toHaveBeenCalledWith('api/job-requirements');
            expect(res).toEqual(data);
        });

        it('applies competencyId filter', async () => {
            mockApi.mockResolvedValue([] as any);

            await getAllJobRequirements({ competencyId: 5 });

            expect(mockApi).toHaveBeenCalledWith('api/job-requirements?competencyId=5');
        });

        it('applies positionMatrixCode filter with encoding', async () => {
            mockApi.mockResolvedValue([] as any);

            await getAllJobRequirements({ positionMatrixCode: 'ENG/LEAD' });

            const params = new URLSearchParams();
            params.append('positionMatrixCode', 'ENG/LEAD');

            expect(mockApi).toHaveBeenCalledWith(`api/job-requirements?${params.toString()}`);
        });

        it('applies both filters and preserves order', async () => {
            mockApi.mockResolvedValue([] as any);

            await getAllJobRequirements({ competencyId: 7, positionMatrixCode: 'OPS TEAM' });

            const params = new URLSearchParams();
            params.append('competencyId', '7');
            params.append('positionMatrixCode', 'OPS TEAM');

            expect(mockApi).toHaveBeenCalledWith(`api/job-requirements?${params.toString()}`);
        });

        it('propagates errors from api', async () => {
            mockApi.mockRejectedValue(new Error('down'));

            await expect(getAllJobRequirements()).rejects.toThrow('down');
        });
    });

    describe('addJobRequirement', () => {
        it('posts requirement', async () => {
            const payload = { competencyID: 1, positionMatrixCode: 'DEV', requirementStatus: 'Required' };
            const created = { customMatrixID: 10, ...payload } as any;
            mockApi.mockResolvedValue(created);

            const res = await addJobRequirement(payload);

            expect(mockApi).toHaveBeenCalledWith('api/job-requirements', {
                method: 'POST',
                data: payload,
            });
            expect(res).toEqual(created);
        });

        it('propagates errors', async () => {
            mockApi.mockRejectedValue(new Error('invalid'));

            await expect(addJobRequirement({} as any)).rejects.toThrow('invalid');
        });
    });

    describe('deleteJobRequirement', () => {
        it('deletes by id', async () => {
            mockApi.mockResolvedValue(undefined);

            await deleteJobRequirement(42);

            expect(mockApi).toHaveBeenCalledWith('api/job-requirements/42', { method: 'DELETE' });
        });

        it('propagates errors', async () => {
            mockApi.mockRejectedValue(new Error('not found'));

            await expect(deleteJobRequirement(999)).rejects.toThrow('not found');
        });
    });
});