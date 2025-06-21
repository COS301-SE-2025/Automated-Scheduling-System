export type Role = 'Admin' | 'User';
export type Status = string;

export interface User {
  userId: number;
  employeeNumber: string;
  name: string;             
  email: string;           
  terminationDate: string | null; 
  employeeStatus: string;   
  role: Role;              
  status: Status;             
}