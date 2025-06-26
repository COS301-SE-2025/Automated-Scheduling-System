/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE_URL = 'http://localhost:' + (import.meta.env.VITE_GO_API_PORT || '8080');

export interface ApiErrorResponseData {
  error: string;
}
export class ApiError extends Error {
    status: number;
    data?: ApiErrorResponseData | any;

    constructor(message: string, status: number, data?: ApiErrorResponseData | unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

interface RequestOptions extends RequestInit {
    data?: unknown;
    isAuthRequest?: boolean;
    isFormData?: boolean;
}

async function apiClient<T>(
    endpoint: string,
    { data, headers: customHeaders, isAuthRequest = true, isFormData = false, ...customConfig }: RequestOptions = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(customHeaders as Record<string, string>),
    };

    const config: RequestInit = {
        method: data ? 'POST' : 'GET', 
        ...customConfig, 
        headers: headers, 
    };

    if (data) {
        if (isFormData && typeof data === 'object' && data !== null) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const formData = new URLSearchParams();
            for (const key in data as Record<string, any>) { 
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                     formData.append(key, String((data as Record<string, unknown>)[key]));
                }
            }
            config.body = formData; 
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(data);
        }
    }



    if (isAuthRequest) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    
    config.headers = new Headers(headers); 

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

        if (response.status === 204 || (response.ok && response.headers.get('Content-Length') === '0')) {
            return undefined as T;
        }

        const responseData = await response.json().catch((jsonError) => {
            if (!response.ok) {
                 throw new ApiError(response.statusText || `API Error: ${response.status}`, response.status);
            }
            console.error("Failed to parse JSON response:", jsonError);
            throw new ApiError(`Failed to parse JSON response from ${endpoint}`, response.status);
        });


        if (!response.ok) {
            const message = responseData?.error || responseData?.message || `API Error: ${response.status}`;
            throw new ApiError(message, response.status, responseData);
        }

        return responseData as T;
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            console.error('API Client Error (ApiError):', endpoint, error.status, error.message, error.data);
            throw error;
        } else if (error instanceof Error) {
            console.error('API Client Error (Std Error):', endpoint, error.message);
            const fallbackError = new ApiError(error.message || "An unexpected network error occurred.", 0, { originalError: error });
            throw fallbackError;
        } else {
            const fallbackError = new ApiError("An unexpected and unknown error occurred", 0);
            console.error('Unknown API error:', fallbackError);
            throw fallbackError;
        }
    }
}

export default apiClient;