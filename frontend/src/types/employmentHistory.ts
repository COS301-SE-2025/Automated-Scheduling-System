export interface EmploymentHistory {
  employmentID: number;
  employeeNumber: string;
  positionMatrixCode: string;
  startDate: string;     // ISO date
  endDate: string | null;
  employmentType: string;
  notes: string;
}

export interface CreateEmploymentHistoryPayload {
  employeeNumber: string;
  positionMatrixCode: string;
  startDate: string;      // YYYY-MM-DD
  endDate?: string | null;
  employmentType?: string;
  notes?: string;
}

export interface UpdateEmploymentHistoryPayload {
  endDate?: string | null;         // "" clears (send empty string)
  employmentType?: string;
  notes?: string | null;
}