import apiClient, { ApiError } from '../services/api';
import type { User, AddUserData, UpdateUserData } from '../types/user';

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

export const addUser = async (userData: AddUserData): Promise<User> => {
  console.log('--- MOCK API: Adding User ---', userData);
  return new Promise(resolve => {
    setTimeout(() => {
      const mockNewUser: User = {
        userId: Math.floor(Math.random() * 10000), // Random ID
        email: userData.email,
        role: userData.role,
        name: userData.username,
        employeeStatus: 'Active', 
        employeeNumber: `NEW-${Math.floor(Math.random() * 1000)}`,
        terminationDate: null,
      };
      resolve(mockNewUser);
    }, 500);
  });
};

// --- Placeholder for updating a user ---
export const updateUser = async (userId: number, updates: UpdateUserData): Promise<User> => {
  console.log(`--- MOCK API: Updating User ${userId} ---`, updates);
  return new Promise(resolve => {
    setTimeout(() => {
      const mockUpdatedFields: Partial<User> = {
        userId,
        ...updates,
      };
      resolve(mockUpdatedFields as User);
    }, 500);
  });
};