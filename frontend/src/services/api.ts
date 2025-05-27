const API_BASE_URL = 'http://localhost:' + (import.meta.env.VITE_GO_API_PORT || '8080');

import { type ApiError } from '../types/api.types';

interface RequestOptions extends RequestInit {
    data?: unknown;
    isAuthRequest?: boolean; //conditionally add Auth header
}

async function apiClient<T>(
    endpoint: string,
    { data, headers: customHeaders, isAuthRequest = true, ...customConfig }: RequestOptions = {}
): Promise<T> {
    const config: RequestInit = {
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Type': data ? 'application/json' : undefined,
            'Accept': 'application/json',
            ...customHeaders,
        } as HeadersInit,
        ...customConfig,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    if (!config.body && (config.headers as Record<string, string>)['Content-Type'] === undefined) {
        delete (config.headers as Record<string, string>)['Content-Type'];
    }

    if (isAuthRequest) {
        const token = localStorage.getItem('authToken'); //more sophisticated token management needed?
        if (token) {
            (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

        //"204 No Content"/another success without body
        if (response.status === 204 || (response.ok && response.headers.get('Content-Length') === '0')) {
            return undefined as T;
        }

        const responseData = await response.json();

        if (!response.ok) {
            const message = responseData?.message || responseData?.error || `API Error: ${response.status}`;
            const error = new Error(message) as ApiError;
            error.status = response.status;
            error.data = responseData;
            throw error;
        }
        
        return responseData as T; //might need to be responseData.data depending on Muller's API
    } catch (error: unknown) {
        //handle errors
        if (error instanceof Error) {
            const apiError = error as ApiError;
            console.error('API Client Error:', endpoint, apiError.status, apiError.message, apiError.data);
            
            if (!apiError.message) {
                apiError.message = "An unexpected network error occurred.";
            }
            throw apiError;
        } else {
            const fallbackError = new Error("An unexpected error occurred") as ApiError;
            console.error('Unknown API error:', fallbackError);
            throw fallbackError;
        }
    }
}

export default apiClient;