import { vi } from 'vitest';
import type { ApiError } from '../../types/api.types';

const mockApiClient = vi.fn();

export default mockApiClient;

export const createMockResponse = <T>(data: T): Promise<T> => {
    return Promise.resolve(data);
};

export const createMockError = (message: string, status: number): Promise<never> => {
    const error = new Error(message) as ApiError;
    error.status = status;
    return Promise.reject(error);
};