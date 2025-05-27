const API_BASE_URL = 'http://localhost:' + (import.meta.env.VITE_GO_API_PORT || '8080');

// Assuming ApiError is defined correctly as in previous examples or your types
export interface ApiErrorResponseData {
  error: string;
}
export class ApiError extends Error {
    status: number;
    data?: ApiErrorResponseData | any;

    constructor(message: string, status: number, data?: ApiErrorResponseData | any) {
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
    // Start with a mutable Record<string, string> for headers
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(customHeaders as Record<string, string>), // Assume customHeaders, if provided, is also a Record
    };

    const config: RequestInit = {
        method: data ? 'POST' : 'GET', // Default method, can be overridden in customConfig
        ...customConfig, // Spread customConfig first so its method can override default
        headers: headers, // Assign the mutable headers object
    };

    if (data) {
        if (isFormData && typeof data === 'object' && data !== null) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const formData = new URLSearchParams();
            for (const key in data as Record<string, any>) { // Type assertion for data
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                     formData.append(key, String((data as Record<string, any>)[key]));
                }
            }
            config.body = formData; // URLSearchParams will be stringified by fetch
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(data);
        }
    }

    // Only delete Content-Type if it was not explicitly set by form data or JSON data logic above
    // and it's a GET request without a body.
    if (!config.body && config.method?.toUpperCase() === 'GET' && !headers['Content-Type']) {
        // If Content-Type was never set (e.g., no data, no custom Content-Type)
        // then we don't need to explicitly set or delete it,
        // as fetch won't send it for GET with no body by default.
        // This part might be redundant if headers['Content-Type'] would be undefined anyway.
    }


    if (isAuthRequest) {
        const token = localStorage.getItem('authToken'); // Or use your getToken() utility
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Update config.headers with the final state of our headers object
    // This is important because we were modifying the 'headers' variable directly
    config.headers = new Headers(headers); // Convert Record to Headers object for fetch

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

        if (response.status === 204 || (response.ok && response.headers.get('Content-Length') === '0')) {
            return undefined as T;
        }

        const responseData = await response.json().catch((jsonError) => {
            // If parsing JSON fails, but response was not ok, still try to create an error
            if (!response.ok) {
                 throw new ApiError(response.statusText || `API Error: ${response.status}`, response.status);
            }
            // If response was ok but JSON parsing failed (e.g. empty but not 204), it's an issue.
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