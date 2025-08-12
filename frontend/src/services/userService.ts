/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient, { ApiError } from '../services/api';
import type { User, AddUserData, UpdateUserData } from '../types/user';

export const getAllUsers = async (): Promise<User[]> => {
    try {

        const users = await apiClient<User[]>('users', {
            method: 'GET',
        });
        return users;
    } catch (error) {
        console.error('Error fetching all users:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            error instanceof Error ? error.message : 'An unknown error occurred while fetching users.',
            (error as any).status || 0,
            error
        );
    }
};

export const addUser = async (userData: AddUserData): Promise<User> => {

    try {
        const newUser = await apiClient<User>('users', {
            method: 'POST',
            data: userData,
        });
        return newUser;
    } catch (error) {
        console.error('Error adding user:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : 'An unknown error occurred while adding the user.',
            (error as any).status || 0,
            error
        );
    }
};

export const updateUser = async (userId: number, updates: UpdateUserData): Promise<User> => {

    try {
        const updatedUser = await apiClient<User>(`users/${userId}`, {
            method: 'PATCH',
            data: updates,
        });
        return updatedUser;
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : `An unknown error occurred while updating user ${userId}.`,
            (error as any).status || 0,
            error
        );
    }
};