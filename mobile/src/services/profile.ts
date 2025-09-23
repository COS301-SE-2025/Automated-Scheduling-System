import api from '@/services/api';

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
}

export async function getEmployeeCompetencyProfile(): Promise<EmployeeCompetencyProfile> {
  const { data } = await api.get<EmployeeCompetencyProfile>('profile/competencies');
  return data as EmployeeCompetencyProfile;
}
