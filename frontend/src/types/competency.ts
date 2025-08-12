// frontend/types/competency.ts
export interface Competency {
    competencyID: number;
    competencyName: string;
    description: string | null;
    competencyTypeName: string;
    source: 'LMS' | 'Custom';
    expiryPeriodMonths: number | null;
    isActive: boolean;
    creationDate: string;
    Prerequisites?: Competency[];
}

export interface AddCompetencyData {
    competencyName: string;
    description: string;
    competencyTypeName: string;
    expiryPeriodMonths: number | null;
    isActive?: boolean;
    source: 'Custom';
}

export interface CompetencyType {
    typeName: string;
    description: string | null;
    isActive: boolean;
}

export type UpdateCompetencyData = Partial<Omit<AddCompetencyData, 'source'>>;