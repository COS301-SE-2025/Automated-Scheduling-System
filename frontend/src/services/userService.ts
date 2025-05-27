import apiClient, { ApiError } from '../services/api';
import type { ApiUser } from '../types/auth.types'; // Or from '../types/user.types' if you created that

export const getAllUsers = async (): Promise<ApiUser[]> => {
  try {
    // The Go backend route is /api/users
    // This requires authentication, apiClient will handle attaching the token
    const users = await apiClient<ApiUser[]>('api/users', {
      method: 'GET',
      // isAuthRequest: true is the default in apiClient, so it will send token
    });
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    // Re-throw to be handled by the calling component (UsersPage)
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'An unknown error occurred while fetching users.',
      (error as any).status || 0, // Try to get status if available
      error // Pass original error as data if possible
    );
  }
};