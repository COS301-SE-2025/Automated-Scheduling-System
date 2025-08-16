import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompetencyModal from '../../components/competency/CompetencyModal';
import type { Competency, CompetencyType } from '../../types/competency';

describe('CompetencyModal', () => {
    const baseTypes = [
        { typeName: 'Certification' },
        { typeName: 'License' },
        { typeName: 'Skill' },
    ] as unknown as CompetencyType[];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        render(
            <CompetencyModal
                isOpen={false}
                onClose={vi.fn()}
                onSave={vi.fn()}
                mode="add"
                apiError={null}
                competencyTypes={baseTypes}
            />
        );
        expect(screen.queryByText('Add New Competency')).not.toBeInTheDocument();
        expect(screen.queryByText('Edit Competency')).not.toBeInTheDocument();
    });

    it('should render add mode with default values', () => {
        render(
            <CompetencyModal
                isOpen
                onClose={vi.fn()}
                onSave={vi.fn()}
                mode="add"
                apiError={null}
                competencyTypes={baseTypes}
            />
        );

        expect(screen.getByText('Add New Competency')).toBeInTheDocument();

        const nameInput = screen.getByLabelText('Competency Name') as HTMLInputElement;
        const descInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
        const typeSelect = screen.getByLabelText('Competency Type') as HTMLSelectElement;
        const expiryInput = screen.getByLabelText('Expiry Period (Months)') as HTMLInputElement;
        const isActiveCheckbox = screen.getByLabelText('Is Active') as HTMLInputElement;

        expect(nameInput).toHaveValue('');
        expect(descInput).toHaveValue('');
        expect(typeSelect).toHaveValue('Certification');
        expect(expiryInput).toHaveValue(null);
        expect(isActiveCheckbox).toBeChecked();

        baseTypes.forEach(t => {
            expect(screen.getByRole('option', { name: t.typeName })).toBeInTheDocument();
        });
    });

    it('should render edit mode with provided competency values', () => {
        const competency = {
            competencyName: 'Forklift Operation',
            description: 'Operate Class II forklifts',
            competencyTypeName: 'License',
            expiryPeriodMonths: 24,
            isActive: false,
        } as unknown as Competency;

        render(
            <CompetencyModal
                isOpen
                onClose={vi.fn()}
                onSave={vi.fn()}
                mode="edit"
                competency={competency}
                apiError={null}
                competencyTypes={baseTypes}
            />
        );

        expect(screen.getByText('Edit Competency')).toBeInTheDocument();

        expect(screen.getByLabelText('Competency Name')).toHaveValue('Forklift Operation');
        expect(screen.getByLabelText('Description')).toHaveValue('Operate Class II forklifts');
        expect(screen.getByLabelText('Competency Type')).toHaveValue('License');
        expect(screen.getByLabelText('Expiry Period (Months)')).toHaveValue(24);
        expect(screen.getByLabelText('Is Active')).not.toBeChecked();
    });

    it('should call onSave with parsed values when saving (including number and checkbox)', () => {
        const onSave = vi.fn();

        render(
            <CompetencyModal
                isOpen
                onClose={vi.fn()}
                onSave={onSave}
                mode="add"
                apiError={null}
                competencyTypes={baseTypes}
            />
        );

        fireEvent.change(screen.getByLabelText('Competency Name'), { target: { value: 'CPR Level 1' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Basic CPR' } });
        fireEvent.change(screen.getByLabelText('Competency Type'), { target: { value: 'License' } });
        fireEvent.change(screen.getByLabelText('Expiry Period (Months)'), { target: { value: '12' } });
        fireEvent.click(screen.getByLabelText('Is Active'));

        fireEvent.click(screen.getByRole('button', { name: /Save Competency/i }));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith({
            competencyName: 'CPR Level 1',
            description: 'Basic CPR',
            competencyTypeName: 'License',
            expiryPeriodMonths: 12,
            isActive: false,
        });
    });

    it('should pass null for expiryPeriodMonths when left blank', () => {
        const onSave = vi.fn();

        render(
            <CompetencyModal
                isOpen
                onClose={vi.fn()}
                onSave={onSave}
                mode="add"
                apiError={null}
                competencyTypes={baseTypes}
            />
        );

        fireEvent.change(screen.getByLabelText('Competency Name'), { target: { value: 'First Aid' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Basic first aid' } });
        fireEvent.change(screen.getByLabelText('Competency Type'), { target: { value: 'Certification' } });
        fireEvent.change(screen.getByLabelText('Expiry Period (Months)'), { target: { value: '' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Competency/i }));

        expect(onSave).toHaveBeenCalledWith({
            competencyName: 'First Aid',
            description: 'Basic first aid',
            competencyTypeName: 'Certification',
            expiryPeriodMonths: null,
            isActive: true,
        });
    });

    it('should call onClose when clicking Cancel and the close button', () => {
        const onClose = vi.fn();

        render(
            <CompetencyModal
                isOpen
                onClose={onClose}
                onSave={vi.fn()}
                mode="add"
                apiError={null}
                competencyTypes={baseTypes}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);

        const closeBtn = screen.getByRole('button', { name: /×/ });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('should display apiError when provided', () => {
        render(
            <CompetencyModal
                isOpen
                onClose={vi.fn()}
                onSave={vi.fn()}
                mode="add"
                apiError="Server error occurred"
                competencyTypes={baseTypes}
            />
        );

        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
    });

});