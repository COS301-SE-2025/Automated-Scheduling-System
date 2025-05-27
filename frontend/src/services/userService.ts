import apiClient, { ApiError } from '../services/api';
import type { ApiUser } from '../types/auth.types'; 

export const getAllUsers = async (): Promise<ApiUser[]> => {
  try {
  
    const users = await apiClient<ApiUser[]>('api/users', {
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