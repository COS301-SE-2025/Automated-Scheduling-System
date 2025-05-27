import { type User } from './user';

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface AuthApiResponseData {
    user: User;
    token: string;
}

//API error interace
export interface ApiError extends Error {
    status?: number;
    data?: unknown;
}