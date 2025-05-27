import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../../services/api';
import type { ApiError } from '../../types/api.types';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

vi.mock('import.meta', () => ({
    env: {
        VITE_API_BASE_URL: 'http://localhost:3001/api'
    }
}));

describe('apiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue('mock-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('successful requests', () => {
        it('should make a GET request successfully', async () => {
            const mockResponse = { id: 1, name: 'Test User' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockResponse),
                headers: new Map([['Content-Length', '25']])
            });

            const result = await apiClient('users/1');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/users/1',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Accept': 'application/json',
                        'Authorization': 'Bearer mock-token'
                    })
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should make a POST request with data successfully', async () => {
            const mockResponse = { id: 2, name: 'New User' };
            const postData = { name: 'New User', email: 'new@example.com' };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve(mockResponse),
                headers: new Map([['Content-Length', '30']])
            });

            const result = await apiClient('users', { data: postData });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/users',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer mock-token'
                    }),
                    body: JSON.stringify(postData)
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should handle 204 No Content responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                headers: new Map()
            });

            const result = await apiClient('users/1', { method: 'DELETE' });

            expect(result).toBeUndefined();
        });

        it('should handle responses with Content-Length 0', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['Content-Length', '0']])
            });

            const result = await apiClient('users/1', { method: 'PUT' });

            expect(result).toBeUndefined();
        });
    });

    describe('authentication handling', () => {
        it('should include Authorization header when token exists', async () => {
            mockLocalStorage.getItem.mockReturnValue('test-token');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Map([['Content-Length', '2']])
            });

            await apiClient('protected-endpoint');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/protected-endpoint',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
        });

        it('should not include Authorization header when no token exists', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Map([['Content-Length', '2']])
            });

            await apiClient('public-endpoint');

            const callArgs = mockFetch.mock.calls[0][1];
            expect(callArgs.headers).not.toHaveProperty('Authorization');
        });

        it('should not include Authorization header when isAuthRequest is false', async () => {
            mockLocalStorage.getItem.mockReturnValue('test-token');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Map([['Content-Length', '2']])
            });

            await apiClient('public-endpoint', { isAuthRequest: false });

            const callArgs = mockFetch.mock.calls[0][1];
            expect(callArgs.headers).not.toHaveProperty('Authorization');
        });
    });

    describe('header handling', () => {
        it('should not include Content-Type header for GET requests', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Map([['Content-Length', '2']])
            });

            await apiClient('users');

            const callArgs = mockFetch.mock.calls[0][1];
            expect(callArgs.headers).not.toHaveProperty('Content-Type');
        });
    });

    describe('error handling', () => {
        it('should throw ApiError for HTTP error responses with message', async () => {
            const errorResponse = {
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve(errorResponse)
            });

            await expect(apiClient('users/999')).rejects.toMatchObject({
                message: 'User not found',
                status: 404,
                data: errorResponse
            });
        });

        it('should throw ApiError for HTTP error responses with error field', async () => {
            const errorResponse = {
                error: 'Validation failed',
                details: ['Email is required']
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve(errorResponse)
            });

            await expect(apiClient('users', { data: {} })).rejects.toMatchObject({
                message: 'Validation failed',
                status: 400,
                data: errorResponse
            });
        });

        it('should throw ApiError with default message for HTTP errors without message/error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({})
            });

            await expect(apiClient('users')).rejects.toMatchObject({
                message: 'API Error: 500',
                status: 500
            });
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(apiClient('users')).rejects.toMatchObject({
                message: 'Network error'
            });
        });

        it('should handle unknown errors', async () => {
            mockFetch.mockRejectedValueOnce('Unknown error');

            await expect(apiClient('users')).rejects.toMatchObject({
                message: 'An unexpected error occurred'
            });
        });

        it('should add default message to ApiError without message', async () => {
            const errorWithoutMessage = new Error() as ApiError;
            errorWithoutMessage.status = 401;
            mockFetch.mockRejectedValueOnce(errorWithoutMessage);

            await expect(apiClient('users')).rejects.toMatchObject({
                message: 'An unexpected network error occurred.',
                status: 401
            });
        });
    });
});