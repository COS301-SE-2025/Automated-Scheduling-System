import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getAllJobPositions,
    createJobPosition,
    updateJobPosition,
    updateJobPositionStatus,
    type JobPosition,
} from '../../services/jobPositionService';

vi.mock('../../services/api', () => ({
    default: vi.fn(),
}));

const mockApi = vi.mocked(api);

describe('jobPositionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getAllJobPositions returns positions', async () => {
        const data: JobPosition[] = [
            { positionMatrixCode: 'DEV', jobTitle: 'Developer', description: 'Build', isActive: true, creationDate: '2025-01-01' },
        ];
        mockApi.mockResolvedValue(data);

        const res = await getAllJobPositions();

        expect(mockApi).toHaveBeenCalledWith('api/job-positions');
        expect(res).toEqual(data);
    });

    it('createJobPosition posts data', async () => {
        const payload = { positionMatrixCode: 'QA', jobTitle: 'Tester', description: 'Test' };
        const created: JobPosition = { ...payload, isActive: true, creationDate: '2025-01-02' };
        mockApi.mockResolvedValue(created);

        const res = await createJobPosition(payload);

        expect(mockApi).toHaveBeenCalledWith('api/job-positions', {
            method: 'POST',
            data: payload,
        });
        expect(res).toEqual(created);
    });

    it('updateJobPosition puts data with encoded code', async () => {
        const code = 'ENG/LEAD';
        const payload = { jobTitle: 'Lead Eng', description: 'Leads' };
        const updated: JobPosition = {
            positionMatrixCode: code,
            jobTitle: payload.jobTitle,
            description: payload.description,
            isActive: true,
            creationDate: '2025-01-03',
        };
        mockApi.mockResolvedValue(updated);

        const res = await updateJobPosition(code, payload);

        expect(mockApi).toHaveBeenCalledWith(`api/job-positions/${encodeURIComponent(code)}`, {
            method: 'PUT',
            data: payload,
        });
        expect(res).toEqual(updated);
    });

    it('updateJobPositionStatus updates status with encoded code', async () => {
        const code = 'OPS TEAM';
        const isActive = false;
        const updated: JobPosition = {
            positionMatrixCode: code,
            jobTitle: 'Ops',
            description: 'Ops desc',
            isActive,
            creationDate: '2025-01-04',
        };
        mockApi.mockResolvedValue(updated);

        const res = await updateJobPositionStatus(code, isActive);

        expect(mockApi).toHaveBeenCalledWith(`api/job-positions/${encodeURIComponent(code)}/status`, {
            method: 'PUT',
            data: { isActive },
        });
        expect(res).toEqual(updated);
    });

    it('propagates errors from api', async () => {
        mockApi.mockRejectedValue(new Error('network'));

        await expect(getAllJobPositions()).rejects.toThrow('network');
    });
});