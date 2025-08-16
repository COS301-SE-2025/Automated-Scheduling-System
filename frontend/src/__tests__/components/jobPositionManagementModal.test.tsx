import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobPositionManagementModal from '../../components/competency/JobPositionManagementModal';
import type { JobPosition } from '../../services/jobPositionService';

describe('JobPositionManagementModal', () => {
    const onClose = vi.fn();
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onToggleStatus = vi.fn();

    const positions: JobPosition[] = [
        {
            positionMatrixCode: 'DEV',
            jobTitle: 'Developer',
            description: 'Builds software',
            isActive: true,
            creationDate: '2025-01-01',
        },
        {
            positionMatrixCode: 'OPS',
            jobTitle: 'Operations',
            description: 'Keeps things running',
            isActive: false,
            creationDate: '2025-01-02',
        },
    ];

    const renderModal = (override?: Partial<React.ComponentProps<typeof JobPositionManagementModal>>) =>
        render(
            <JobPositionManagementModal
                isOpen={true}
                onClose={onClose}
                positions={positions}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onToggleStatus={onToggleStatus}
                {...override}
            />
        );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when closed', () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText('Manage Job Positions')).not.toBeInTheDocument();
    });

    it('renders list of positions and marks inactive ones', () => {
        renderModal();

        expect(screen.getByText('Manage Job Positions')).toBeInTheDocument();
        expect(screen.getByText('Developer')).toBeInTheDocument();
        expect(screen.getByText('Operations')).toBeInTheDocument();

        // Code and description visible
        expect(screen.getByText('DEV')).toBeInTheDocument();
        expect(screen.getByText('OPS')).toBeInTheDocument();
        expect(screen.getByText('Builds software')).toBeInTheDocument();
        expect(screen.getByText('Keeps things running')).toBeInTheDocument();

        // Inactive badge
        expect(screen.getByText('(Inactive)')).toBeInTheDocument();
    });

    it('enters edit mode when Edit is clicked and populates form', () => {
        renderModal();

        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]); // Edit "Developer"

        expect(screen.getByText(/Editing: Developer/i)).toBeInTheDocument();

        const codeInput = screen.getByLabelText(/Position Matrix Code/i) as HTMLInputElement;
        const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

        expect(codeInput.value).toBe('DEV');
        expect(codeInput).toBeDisabled();
        expect(titleInput.value).toBe('Developer');
        expect(descInput.value).toBe('Builds software');

        // Save button visible in edit mode
        expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
        // Cancel Edit also visible
        expect(screen.getByRole('button', { name: /Cancel Edit/i })).toBeInTheDocument();
    });

    it('submits add flow and calls onAdd with form data', async () => {
        onAdd.mockResolvedValueOnce({});

        renderModal();

        const codeInput = screen.getByLabelText(/Position Matrix Code/i) as HTMLInputElement;
        const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

        fireEvent.change(codeInput, { target: { value: 'QA' } });
        fireEvent.change(titleInput, { target: { value: 'Tester' } });
        fireEvent.change(descInput, { target: { value: 'Ensures quality' } });

        fireEvent.click(screen.getByRole('button', { name: /Add/i }));

        expect(onAdd).toHaveBeenCalledWith({
            positionMatrixCode: 'QA',
            jobTitle: 'Tester',
            description: 'Ensures quality',
        });
    });

    it('submits edit flow and calls onUpdate with original code and updates', async () => {
        onUpdate.mockResolvedValueOnce({});

        renderModal();

        // Enter edit mode for Developer
        fireEvent.click(screen.getAllByTitle('Edit')[0]);

        const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

        fireEvent.change(titleInput, { target: { value: 'Senior Developer' } });
        fireEvent.change(descInput, { target: { value: 'Builds and reviews' } });

        fireEvent.click(screen.getByRole('button', { name: /Save/i }));

        await waitFor(() =>
            expect(onUpdate).toHaveBeenCalledWith('DEV', {
                jobTitle: 'Senior Developer',
                description: 'Builds and reviews',
            })
        );

        // After successful update, assert we are back in add mode
        expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
        const codeInput = screen.getByLabelText(/Position Matrix Code/i) as HTMLInputElement;
        const titleInput2 = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
        const descInput2 = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
        expect(codeInput).not.toBeDisabled();
        expect(codeInput.value).toBe('');
        expect(titleInput2.value).toBe('');
        expect(descInput2.value).toBe('');
    });

    it('cancels edit and returns to add mode', () => {
        renderModal();

        fireEvent.click(screen.getAllByTitle('Edit')[0]);

        fireEvent.click(screen.getByRole('button', { name: /Cancel Edit/i }));

        expect(screen.getByText('Add New Position')).toBeInTheDocument();

        const codeInput = screen.getByLabelText(/Position Matrix Code/i) as HTMLInputElement;
        const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

        expect(codeInput.value).toBe('');
        expect(titleInput.value).toBe('');
        expect(descInput.value).toBe('');
        expect(codeInput).not.toBeDisabled();
    });

    it('deactivates an active position after confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        onToggleStatus.mockResolvedValueOnce({});

        renderModal();

        // Button with title "Deactivate" belongs to active item
        const deactivateBtn = screen.getByTitle('Deactivate');
        // Click
        fireEvent.click(deactivateBtn);

        expect(onToggleStatus).toHaveBeenCalledWith('DEV', false);
    });

    it('reactivates an inactive position after confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        onToggleStatus.mockResolvedValueOnce({});

        renderModal();

        const reactivateBtn = screen.getByTitle('Reactivate');
        fireEvent.click(reactivateBtn);

        expect(onToggleStatus).toHaveBeenCalledWith('OPS', true);
    });

    it('does not toggle status when confirm is cancelled', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderModal();

        const deactivateBtn = screen.getByTitle('Deactivate');
        fireEvent.click(deactivateBtn);

        expect(onToggleStatus).not.toHaveBeenCalled();
    });

    it('shows API error message when add fails', async () => {
        onAdd.mockRejectedValueOnce(new Error('Failed to add'));

        renderModal();

        const codeInput = screen.getByLabelText(/Position Matrix Code/i) as HTMLInputElement;
        const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;

        fireEvent.change(codeInput, { target: { value: 'HR' } });
        fireEvent.change(titleInput, { target: { value: 'HR Manager' } });

        fireEvent.click(screen.getByRole('button', { name: /Add/i }));

        expect(await screen.findByText('Failed to add')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        renderModal();

        // Close button renders "&times;" which shows as ×
        const closeBtn = screen.getByRole('button', { name: /×/ });
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalled();
    });
});