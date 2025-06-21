import apiClient, { ApiError } from '../services/api';
import type { User } from '../types/user';

export const getAllUsers = async (): Promise<User[]> => {
  try {
  
    const users = await apiClient<User[]>('api/users', {
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