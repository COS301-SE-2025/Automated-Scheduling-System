export interface Competency {
    competencyID: number;
    competencyName: string;
    description: string | null;
    competencyTypeName: string | null;
    source: 'LMS' | 'Custom';
    expiryPeriodMonths: number | null;
    isActive: boolean;
    creationDate: string;
}

export interface AddCompetencyData {
    competencyName: string;
    description: string | null;
    competencyTypeName: string | null;
    expiryPeriodMonths: number | null;
    isActive: boolean;
}

export type UpdateCompetencyData = Partial<AddCompetencyData>;