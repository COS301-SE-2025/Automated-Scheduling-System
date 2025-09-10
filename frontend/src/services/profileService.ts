import apiClient from './api';

export interface CompetencyBrief {
  competencyID: number;
  competencyName: string;
  competencyTypeName: string;
  description: string;
  expiryPeriodMonths?: number | null;
  isActive: boolean;
  achievementDate?: string;
  expiryDate?: string | null;
  status?: 'Valid' | 'Expires Soon' | 'Expired' | 'Archived';
  prerequisites?: number[];
}

export interface EmployeeHeader {
  employeeNumber: string;
  name: string;
  positionCode: string;
  positionTitle: string;
}

export interface EmployeeCompetencyProfile {
  employee: EmployeeHeader;
  completed: CompetencyBrief[];
  required: CompetencyBrief[];
  explore: CompetencyBrief[];
}

export const getEmployeeCompetencyProfile = async (): Promise<EmployeeCompetencyProfile> => {
  return apiClient<EmployeeCompetencyProfile>('profile/competencies', { method: 'GET' });
};
