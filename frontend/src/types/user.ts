export type Role = string; 
export type Status = string;

export interface User {
  id: number;
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
//   phonenumber: string; TODO: add phone number later
}
export interface UpdateUserData {
  role?: Role;
}
