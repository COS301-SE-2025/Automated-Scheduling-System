import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { ApiError as ApiClientError } from '../../services/api';
import { getAllUsers, addUser, updateUser } from '../../services/userService';
import type { User, AddUserData, UpdateUserData } from '../../types/user';

vi.mock('../../services/api', async () => {
    const actual = await vi.importActual('../../services/api');
    return { __esModule: true, default: vi.fn(), ApiError: actual.ApiError };
});
const mockApi = apiClient as unknown as ReturnType<typeof vi.fn>;

describe('User Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockError = (message: string, status: number): Error => {

        return new ApiClientError(message, status as number);
    };

    const mockUsers: User[] = [
        {
            id: 1,
            employeeNumber: 'E001',
            username: 'john',
            name: 'John Doe',
            email: 'john@doe.com',
            terminationDate: null,
            employeeStatus: 'Active',
            role: 'Admin',
        },
        {
            id: 2,
            employeeNumber: 'E002',
            username: 'jane',
            name: 'Jane Smith',
            email: 'jane@smith.com',
            terminationDate: null,
            employeeStatus: 'Active',
            role: 'User',
        },
    ];

    describe('getAllUsers', () => {
        it('should fetch all users successfully', async () => {
            mockApi.mockResolvedValue(mockUsers);
            const result = await getAllUsers();
            expect(mockApi).toHaveBeenCalledWith('users', { method: 'GET' });
            expect(result).toEqual(mockUsers);
        });

        it('should handle API errors when fetching users', async () => {
            const error = createMockError('Server Down', 503);
            mockApi.mockRejectedValue(error);
            await expect(getAllUsers()).rejects.toThrow('Server Down');
        });
    });

    describe('addUser', () => {
        it('should add a new user successfully', async () => {
            const newUserData: AddUserData = { username: 'peterj', email: 'peter@jones.com', password: 'P@ssw0rd1', role: 'User' };
            const createdUser: User = {
                id: 3,
                employeeNumber: 'E003',
                username: 'peterj',
                name: 'Peter Jones',
                email: 'peter@jones.com',
                terminationDate: null,
                employeeStatus: 'Active',
                role: 'User',
            };
            mockApi.mockResolvedValue(createdUser);

            const result = await addUser(newUserData);

            expect(mockApi).toHaveBeenCalledWith('users', { method: 'POST', data: newUserData });
            expect(result).toEqual(createdUser);
        });

        it('should handle API errors when adding a user', async () => {
            const error = createMockError('Invalid email', 400);
            mockApi.mockRejectedValue(error);
            await expect(addUser({} as AddUserData)).rejects.toThrow('Invalid email');
        });
    });

    describe('updateUser', () => {
        it('should update a user successfully', async () => {
            const userId = 1;
            const updates: UpdateUserData = { role: 'Admin' };
            const updatedUser: User = { ...mockUsers[0], ...updates };
            mockApi.mockResolvedValue(updatedUser);

            const result = await updateUser(userId, updates);

            expect(mockApi).toHaveBeenCalledWith(`users/${userId}`, { method: 'PATCH', data: updates });
            expect(result).toEqual(updatedUser);
        });

        it('should handle API errors when updating a user', async () => {
            const error = createMockError('User not found', 404);
            mockApi.mockRejectedValue(error);
            await expect(updateUser(999, {})).rejects.toThrow('User not found');
        });
    });
});