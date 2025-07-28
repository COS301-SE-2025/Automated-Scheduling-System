import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import { PlusCircle } from 'lucide-react';
import CompetencyTable from '../components/competency/CompetencyTable';
import CompetencyFilters from '../components/competency/CompetencyFilters';
import CompetencyModal from '../components/competency/CompetencyModal';
import type { Competency, AddCompetencyData, UpdateCompetencyData } from '../types/competency';
import { ApiError } from '../services/api';

// Mock service - replace with actual service calls
const competencyService = {
    getAllCompetencies: async (): Promise<Competency[]> => new Promise(resolve => setTimeout(() => resolve([
        { competencyID: 1, competencyName: 'Forklift Operation', description: 'Safe operation of a forklift for warehouse environments.', competencyTypeName: 'Certification', source: 'Custom', expiryPeriodMonths: 24, isActive: true, creationDate: new Date().toISOString() },
        { competencyID: 2, competencyName: 'First Aid & CPR', description: 'Basic first aid and CPR training.', competencyTypeName: 'Certification', source: 'LMS', expiryPeriodMonths: 12, isActive: true, creationDate: new Date().toISOString() },
        { competencyID: 3, competencyName: 'Advanced Welding', description: 'TIG and MIG welding techniques for specialized projects.', competencyTypeName: 'Skill', source: 'Custom', expiryPeriodMonths: null, isActive: false, creationDate: new Date().toISOString() },
    ]), 500)),
    addCompetency: async (data: AddCompetencyData): Promise<Competency> => new Promise(resolve => setTimeout(() => resolve({ competencyID: Math.random(), source: 'Custom', creationDate: new Date().toISOString(), ...data }), 500)),
    updateCompetency: async (id: number, data: UpdateCompetencyData): Promise<Competency> => new Promise(resolve => setTimeout(() => resolve({ competencyID: id, source: 'Custom', creationDate: new Date().toISOString(), competencyName: 'Updated', description: '', competencyTypeName: 'Skill', expiryPeriodMonths: null, isActive: true, ...data }), 500)),
    deleteCompetency: async (id: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(), 500)),
};

const CompetencyPage: React.FC = () => {
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ competencyTypeName: '', isActive: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingCompetency, setEditingCompetency] = useState<Competency | undefined>(undefined);
    const [modalApiError, setModalApiError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompetencies = async () => {
            setIsLoading(true);
            try {
                const apiCompetencies = await competencyService.getAllCompetencies();
                setCompetencies(apiCompetencies);
            } catch (err) {
                setPageError('An unknown error occurred while fetching competencies.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCompetencies();
    }, []);

    const availableFilterOptions = useMemo(() => ({
        types: Array.from(new Set(competencies.map(c => c.competencyTypeName).filter(Boolean) as string[])).sort(),
    }), [competencies]);

    const filteredCompetencies = useMemo(() => {
        return competencies.filter(c => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term || c.competencyName.toLowerCase().includes(term) || (c.description && c.description.toLowerCase().includes(term));
            const matchesType = !filters.competencyTypeName || c.competencyTypeName === filters.competencyTypeName;
            const matchesStatus = !filters.isActive || c.isActive.toString() === filters.isActive;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [competencies, searchTerm, filters]);

    const handleOpenAddModal = () => {
        setModalMode('add');
        setEditingCompetency(undefined);
        setModalApiError(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (competency: Competency) => {
        setModalMode('edit');
        setEditingCompetency(competency);
        setModalApiError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleSaveCompetency = async (data: AddCompetencyData | UpdateCompetencyData) => {
        setModalApiError(null);
        try {
            if (modalMode === 'add') {
                const newCompetency = await competencyService.addCompetency(data as AddCompetencyData);
                setCompetencies(prev => [newCompetency, ...prev]);
            } else if (editingCompetency) {
                const updated = await competencyService.updateCompetency(editingCompetency.competencyID, data as UpdateCompetencyData);
                setCompetencies(prev => prev.map(c => c.competencyID === editingCompetency.competencyID ? updated : c));
            }
            handleCloseModal();
        } catch (err) {
            setModalApiError('An error occurred. Please try again.');
        }
    };

    const handleDeleteRequest = (competency: Competency) => {
        if (window.confirm(`Are you sure you want to delete "${competency.competencyName}"?`)) {
            competencyService.deleteCompetency(competency.competencyID)
                .then(() => setCompetencies(prev => prev.filter(c => c.competencyID !== competency.competencyID)))
                .catch(() => alert("Failed to delete competency."));
        }
    };

    return (
        <MainLayout pageTitle="Competency Management">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">Competency Management</h1>
                        <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">
                            Define and manage competencies, skills, and certifications for your organization.
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <button type="button" onClick={handleOpenAddModal} className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary">
                            <PlusCircle size={20} className="inline-block mr-2" />
                            Add Competency
                        </button>
                    </div>
                </div>

                <CompetencyFilters
                    onSearch={setSearchTerm}
                    onFilterChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                    filters={filters}
                    availableTypes={availableFilterOptions.types}
                />

                <CompetencyTable
                    competencies={filteredCompetencies}
                    isLoading={isLoading}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteRequest}
                />
            </div>

            <CompetencyModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCompetency}
                mode={modalMode}
                competency={editingCompetency}
                apiError={modalApiError}
            />
        </MainLayout>
    );
};

export default CompetencyPage;