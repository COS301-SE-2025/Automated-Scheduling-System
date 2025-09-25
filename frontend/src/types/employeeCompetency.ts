export interface EmployeeCompetency {
    employeeCompetencyID: number;
    employeeNumber: string;
    competencyID: number;
    achievementDate: string | null; // ISO string or null
    expiryDate: string | null;
    grantedByScheduleID?: number | null;
    notes?: string;
    competencyDefinition?: {
        competencyID: number;
        competencyName: string;
        description?: string;
        competencyTypeName?: string;
        expiryPeriodMonths?: number | null;
        isActive: boolean;
    };
}

export interface CreateEmployeeCompetencyPayload {
    employeeNumber: string;
    competencyID: number;
    achievementDate?: string | null; // YYYY-MM-DD or omit/null for "Required"
    expiryDate?: string | null;
    grantedByScheduleID?: number | null;
    notes?: string;
}

export interface UpdateEmployeeCompetencyPayload {
    achievementDate?: string | null; // send "" to clear via backend logic, but we will handle null -> ""
    expiryDate?: string | null;
    grantedByScheduleID?: number | null;
    notes?: string | null;
}