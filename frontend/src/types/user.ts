export type Role = 'Admin' | 'User';
export type Status = string;

export interface User {
  userId: number;
  employeeNumber: string;
  username: string;
  name: string;             
  email: string;           
  terminationDate: string | null; 
  employeeStatus: string;   
  role: Role;              
}

export interface AddUserData {
  username: string;
  email: string;
  password: string;
  role: Role; 
}
export interface UpdateUserData {
  email?: string;
  role?: Role;
}
