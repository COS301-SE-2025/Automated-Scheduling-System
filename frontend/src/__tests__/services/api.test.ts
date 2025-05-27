import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../../services/api';

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
        VITE_GO_API_PORT: '8080'
    }
}));

interface ErrorWithStatus extends Error {
    status?: number;
}

describe('apiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue('mock-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const constructExpectedUrl = (endpoint: string) => `http://localhost:8080/${endpoint}`;

    describe('successful requests', () => {
        it('should make a GET request successfully', async () => {
            const mockResponse = { id: 1, name: 'Test User' };
            const endpoint = 'api/users/1';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockResponse),
                headers: new Headers({ 'Content-Length': String(JSON.stringify(mockResponse).length) })
            });

            const result = await apiClient(endpoint);

            expect(mockFetch).toHaveBeenCalledWith(
                constructExpectedUrl(endpoint),
                expect.objectContaining({
                    method: 'GET',
                })
            );
            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.get('Accept')).toBe('application/json');
            expect(calledConfig.headers.get('Authorization')).toBe('Bearer mock-token');
            expect(result).toEqual(mockResponse);
        });

        it('should make a POST request with data successfully', async () => {
            const mockResponse = { id: 2, name: 'New User' };
            const postData = { name: 'New User', email: 'new@example.com' };
            const endpoint = 'api/users';

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve(mockResponse),
                headers: new Headers({ 'Content-Length': String(JSON.stringify(mockResponse).length) })
            });

            const result = await apiClient(endpoint, { data: postData });

            expect(mockFetch).toHaveBeenCalledWith(
                constructExpectedUrl(endpoint),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
            );
            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.get('Content-Type')).toBe('application/json');
            expect(calledConfig.headers.get('Accept')).toBe('application/json');
            expect(calledConfig.headers.get('Authorization')).toBe('Bearer mock-token');
            expect(result).toEqual(mockResponse);
        });

        it('should handle 204 No Content responses', async () => {
            const endpoint = 'api/users/1';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                headers: new Headers() 
            });

            const result = await apiClient(endpoint, { method: 'DELETE' });

            expect(result).toBeUndefined();
        });

        it('should handle responses with Content-Length 0', async () => {
            const endpoint = 'api/users/1';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(undefined),
                headers: new Headers({ 'Content-Length': '0' })
            });

            const result = await apiClient(endpoint, { method: 'PUT' });

            expect(result).toBeUndefined();
        });
    });

    describe('authentication handling', () => {
        it('should include Authorization header when token exists', async () => {
            const endpoint = 'api/protected-endpoint';
            mockLocalStorage.getItem.mockReturnValue('test-token');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Headers({ 'Content-Length': '2' })
            });

            await apiClient(endpoint);

            expect(mockFetch).toHaveBeenCalledWith(
                constructExpectedUrl(endpoint),
                expect.anything()
            );
            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.get('Authorization')).toBe('Bearer test-token');
        });

        it('should not include Authorization header when no token exists', async () => {
            const endpoint = 'api/public-endpoint';
            mockLocalStorage.getItem.mockReturnValue(null);
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Headers({ 'Content-Length': '2' })
            });

            await apiClient(endpoint);

            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.has('Authorization')).toBe(false);
        });

        it('should not include Authorization header when isAuthRequest is false', async () => {
            const endpoint = 'api/public-endpoint';
            mockLocalStorage.getItem.mockReturnValue('test-token');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Headers({ 'Content-Length': '2' })
            });

            await apiClient(endpoint, { isAuthRequest: false });

            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.has('Authorization')).toBe(false);
        });
    });

    describe('header handling', () => {
        it('should not include Content-Type header for GET requests without data', async () => {
            const endpoint = 'api/users';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                headers: new Headers({ 'Content-Length': '2' })
            });

            await apiClient(endpoint);

            const calledConfig = mockFetch.mock.calls[0][1];
            expect(calledConfig.headers.has('Content-Type')).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should throw ApiError for HTTP error responses with message field', async () => {
            const endpoint = 'api/users/999';
            const errorResponse = {
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve(errorResponse),
                headers: new Headers({'Content-Type': 'application/json'})
            });

            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'User not found',
                status: 404,
                data: errorResponse
            });
        });

        it('should throw ApiError for HTTP error responses with error field', async () => {
            const endpoint = 'api/users';
            const errorResponse = {
                error: 'Validation failed',
                details: ['Email is required']
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve(errorResponse),
                headers: new Headers({'Content-Type': 'application/json'})
            });

            await expect(apiClient(endpoint, { data: {} })).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Validation failed',
                status: 400,
                data: errorResponse
            });
        });

        it('should throw ApiError with default message for HTTP errors without known message/error fields', async () => {
            const endpoint = 'api/users';
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({}), 
                headers: new Headers({'Content-Type': 'application/json'}),
                statusText: 'Internal Server Error'
            });

            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'API Error: 500',
                status: 500
            });
        });
        
        it('should handle network errors', async () => {
            const endpoint = 'api/users';
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'Network error',
                status: 0
            });
        });

        it('should handle unknown errors (non-Error rejection)', async () => {
            const endpoint = 'api/users';
            mockFetch.mockRejectedValueOnce('Unknown error string');
            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: 'An unexpected and unknown error occurred',
                status: 0
            });
        });

        it('should add default message to ApiError when fetch rejects with a plain Error (no message, but has status)', async () => {
            const endpoint = 'api/users';
            const errorWithoutMessage = new Error() as ErrorWithStatus;
            
            mockFetch.mockRejectedValueOnce(errorWithoutMessage);
            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: "An unexpected network error occurred.",
                status: 0,
                data: { originalError: errorWithoutMessage }
            });
        });

        it('should throw ApiError if JSON parsing fails for a non-OK response', async () => {
            const endpoint = 'api/some/endpoint';
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Server Error",
                json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON at position 0")),
                headers: new Headers({ 'Content-Type': 'text/html' })
            });

            await expect(apiClient(endpoint)).rejects.toMatchObject({
                name: 'ApiError',
                message: "Server Error",
                status: 500,
            });
        });

    });
});