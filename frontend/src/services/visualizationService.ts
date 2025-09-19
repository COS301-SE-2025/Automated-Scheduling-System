import apiClient from './api';

// Types matching backend models
export interface CompetencyVisualizationItem {
  competencyID: number;
  competencyName: string;
  competencyTypeName: string;
  status: 'completed' | 'required' | 'expired' | 'expires_soon' | 'archived';
  achievementDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  label: string;
}

export interface VisualizationData {
  employee: {
    employeeNumber: string;
    name: string;
    positionCode: string;
    positionTitle: string;
  };
  completionOverview: {
    totalRequired: number;
    totalCompleted: number;
    completionRate: number;
    totalOutstanding: number;
  };
  competencyBreakdown: CompetencyVisualizationItem[];
  statusBreakdown: StatusBreakdownItem[];
}

export interface DepartmentComplianceItem {
  positionCode: string;
  positionTitle: string;
  employeeCount: number;
  requiredCount: number;
  completedCount: number;
  complianceRate: number;
  outstandingCount: number;
}

export interface CompetencyHotspotItem {
  competencyID: number;
  competencyName: string;
  competencyTypeName: string;
  totalRequired: number;
  totalCompleted: number;
  incompleteCount: number;
  incompleteRate: number;
}

export interface TrendDataPoint {
  date: string;
  completedCount: number;
  requiredCount: number;
  complianceRate: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  label: string;
}

export interface AdminComplianceData {
  companyOverview: {
    totalEmployees: number;
    totalCompetencies: number;
    totalRequired: number;
    totalCompleted: number;
    overallComplianceRate: number;
  };
  departmentBreakdown: DepartmentComplianceItem[];
  competencyHotspots: CompetencyHotspotItem[];
  trendData: TrendDataPoint[];
  statusDistribution: StatusDistributionItem[];
}

export interface AdminComplianceFilter {
  positionCodes?: string[];
  competencyTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export const getEmployeeVisualizationData = async (): Promise<VisualizationData> => {
  return apiClient<VisualizationData>('profile/visualization', { method: 'GET' });
};

export const getAdminComplianceData = async (filters?: AdminComplianceFilter): Promise<AdminComplianceData> => {
  const queryParams = new URLSearchParams();
  
  if (filters) {
    if (filters.positionCodes && filters.positionCodes.length > 0) {
      queryParams.append('positionCodes', filters.positionCodes.join(','));
    }
    if (filters.competencyTypes && filters.competencyTypes.length > 0) {
      queryParams.append('competencyTypes', filters.competencyTypes.join(','));
    }
    if (filters.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }
  }

  const url = `profile/admin/compliance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient<AdminComplianceData>(url, { method: 'GET' });
};