import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import { PlusCircle, Settings } from 'lucide-react';
import CompetencyTable from '../components/competency/CompetencyTable';
import CompetencyFilters from '../components/competency/CompetencyFilters';
import CompetencyModal from '../components/competency/CompetencyModal';
import PrerequisiteModal from '../components/competency/PrerequisiteModal';
import TypeManagementModal from '../components/competency/TypeManagementModal';
import * as competencyService from '../services/competencyService';
import { ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Competency, AddCompetencyData, UpdateCompetencyData, CompetencyType } from '../types/competency';

const CompetencyPage: React.FC = () => {
    // --- Page-level state ---
    const { isAuthenticated } = useAuth();
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [competencyTypes, setCompetencyTypes] = useState<CompetencyType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // --- Filter and search state ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ competencyTypeName: '', isActive: '' });

    // --- State for Add/Edit Competency Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingCompetency, setEditingCompetency] = useState<Competency | undefined>(undefined);
    const [modalApiError, setModalApiError] = useState<string | null>(null);

    // --- State for Prerequisite Modal ---
    const [isPrereqModalOpen, setIsPrereqModalOpen] = useState(false);
    const [managingPrereqsFor, setManagingPrereqsFor] = useState<Competency | null>(null);
    const [prereqApiError, setPrereqApiError] = useState<string | null>(null);
    const [isPrereqLoading, setIsPrereqLoading] = useState(false);

    // --- State for Type Management Modal ---
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            setPageError('You must be logged in to view competencies.');
            return;
        }

        const fetchInitialData = async () => {
            setIsLoading(true);
            setPageError(null);
            try {
                const [apiCompetencies, apiTypes] = await Promise.all([
                    competencyService.getAllCompetencies(),
                    competencyService.getAllCompetencyTypes()
                ]);
                setCompetencies(apiCompetencies);
                setCompetencyTypes(apiTypes);
            } catch (err) {
                if (err instanceof ApiError) {
                    setPageError(err.data?.error || err.message);
                } else if (err instanceof Error) {
                    setPageError(err.message);
                } else {
                    setPageError('An unknown error occurred while fetching data.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [isAuthenticated]);

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

    const handleSaveCompetency = async (data: Omit<AddCompetencyData, 'source'> | UpdateCompetencyData) => {
        setModalApiError(null);
        try {
            if (modalMode === 'add') {
                const payload: AddCompetencyData = {
                    ...(data as Omit<AddCompetencyData, 'source'>),
                    source: 'Custom',
                };
                const newCompetency = await competencyService.addCompetency(payload);
                setCompetencies(prev => [newCompetency, ...prev]);
            } else if (editingCompetency) {
                const updated = await competencyService.updateCompetency(editingCompetency.competencyID, data as UpdateCompetencyData);
                setCompetencies(prev => prev.map(c => c.competencyID === editingCompetency.competencyID ? updated : c));
            }
            handleCloseModal();
        } catch (err) {
            if (err instanceof ApiError) {
                setModalApiError(err.data?.error || err.message);
            } else if (err instanceof Error) {
                setModalApiError(err.message);
            } else {
                setModalApiError('An unknown error occurred. Please try again.');
            }
        }
    };

    const handleDeleteRequest = async (competency: Competency) => {
        if (window.confirm(`Are you sure you want to deactivate "${competency.competencyName}"? This is a soft delete.`)) {
            try {
                await competencyService.deleteCompetency(competency.competencyID);
                setCompetencies(prev => prev.map(c => c.competencyID === competency.competencyID ? { ...c, isActive: false } : c));
            } catch (err) {
                const message = err instanceof ApiError ? (err.data?.error || err.message) : 'Failed to deactivate competency.';
                alert(message);
            }
        }
    };

    const handleOpenPrereqModal = (competency: Competency) => {
        setManagingPrereqsFor(competency);
        setIsPrereqModalOpen(true);
        setPrereqApiError(null);
    };

    const handleClosePrereqModal = () => {
        setIsPrereqModalOpen(false);
        setManagingPrereqsFor(null);
    };

    const handleAddPrerequisite = async (prerequisiteId: number) => {
        if (!managingPrereqsFor) return;
        setIsPrereqLoading(true);
        setPrereqApiError(null);
        try {
            await competencyService.addPrerequisite(managingPrereqsFor.competencyID, prerequisiteId);
            const newPrereq = competencies.find(c => c.competencyID === prerequisiteId);
            if (newPrereq) {
                const updatedCompetencies = competencies.map(c => {
                    if (c.competencyID === managingPrereqsFor.competencyID) {
                        const newPrerequisites = [...(c.Prerequisites || []), newPrereq];
                        const updatedComp = { ...c, Prerequisites: newPrerequisites };
                        setManagingPrereqsFor(updatedComp);
                        return updatedComp;
                    }
                    return c;
                });
                setCompetencies(updatedCompetencies);
            }
        } catch (err) {
            setPrereqApiError(err instanceof ApiError ? (err.data?.error || err.message) : 'Failed to add prerequisite.');
        } finally {
            setIsPrereqLoading(false);
        }
    };

    const handleRemovePrerequisite = async (prerequisiteId: number) => {
        if (!managingPrereqsFor) return;
        setIsPrereqLoading(true);
        setPrereqApiError(null);
        try {
            await competencyService.removePrerequisite(managingPrereqsFor.competencyID, prerequisiteId);
            const updatedCompetencies = competencies.map(c => {
                if (c.competencyID === managingPrereqsFor.competencyID) {
                    const newPrerequisites = (c.Prerequisites || []).filter(p => p.competencyID !== prerequisiteId);
                    const updatedComp = { ...c, Prerequisites: newPrerequisites };
                    setManagingPrereqsFor(updatedComp);
                    return updatedComp;
                }
                return c;
            });
            setCompetencies(updatedCompetencies);
        } catch (err) {
            setPrereqApiError(err instanceof ApiError ? (err.data?.error || err.message) : 'Failed to remove prerequisite.');
        } finally {
            setIsPrereqLoading(false);
        }
    };

    const handleAddType = async (name: string, description: string) => {
        const newType = await competencyService.createCompetencyType(name, description);
        setCompetencyTypes(prev => [...prev, newType].sort((a, b) => a.typeName.localeCompare(b.typeName)));
    };

    const handleUpdateType = async (name: string, description: string) => {
        const updatedType = await competencyService.updateCompetencyType(name, description);
        setCompetencyTypes(prev => prev.map(t => t.typeName === name ? updatedType : t));
    };

    const handleDeleteType = async (name: string) => {
        await competencyService.deleteCompetencyType(name);
        setCompetencyTypes(prev => prev.map(t => t.typeName === name ? { ...t, isActive: false } : t));
    };

    if (pageError) {
        return (
            <MainLayout pageTitle='Competency Management'>
                <div className="text-center py-10 px-4">
                    <h1 className="text-2xl font-semibold text-red-600">Error</h1>
                    <p className="mt-2 text-custom-third dark:text-dark-secondary">{pageError}</p>
                </div>
            </MainLayout>
        );
    }

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
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-3">
                        <button type="button" onClick={() => setIsTypeModalOpen(true)} className="block rounded-md bg-white dark:bg-dark-input px-3 py-2 text-center text-sm font-semibold text-custom-primary dark:text-dark-primary shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-dark-div">
                            <Settings size={20} className="inline-block mr-2" />
                            Manage Types
                        </button>
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
                    availableTypes={competencyTypes.filter(t => t.isActive)}
                />

                <CompetencyTable
                    competencies={filteredCompetencies}
                    isLoading={isLoading}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteRequest}
                    onViewPrerequisites={handleOpenPrereqModal}
                />
            </div>

            <CompetencyModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCompetency}
                mode={modalMode}
                competency={editingCompetency}
                apiError={modalApiError}
                competencyTypes={competencyTypes.filter(t => t.isActive)}
            />
            
            <PrerequisiteModal
                isOpen={isPrereqModalOpen}
                onClose={handleClosePrereqModal}
                onAddPrerequisite={handleAddPrerequisite}
                onRemovePrerequisite={handleRemovePrerequisite}
                competency={managingPrereqsFor}
                allCompetencies={competencies}
                apiError={prereqApiError}
                isLoading={isPrereqLoading}
            />

            <TypeManagementModal
                isOpen={isTypeModalOpen}
                onClose={() => setIsTypeModalOpen(false)}
                types={competencyTypes}
                onAdd={handleAddType}
                onUpdate={handleUpdateType}
                onDelete={handleDeleteType}
            />
        </MainLayout>
    );
};

export default CompetencyPage;