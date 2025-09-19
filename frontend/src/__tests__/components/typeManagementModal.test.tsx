import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import TypeManagementModal from '../../components/competency/TypeManagementModal';
import type { CompetencyType } from '../../types/competency';

describe('TypeManagementModal', () => {
    const onClose = vi.fn();
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onToggleStatus = vi.fn();

    const types: CompetencyType[] = [
        { typeName: 'Core', description: 'Core skills', isActive: true },
        { typeName: 'Legacy', description: 'Old stuff', isActive: false },
    ];

    const renderModal = (override?: Partial<ComponentProps<typeof TypeManagementModal>>) =>
        render(
            <TypeManagementModal
                isOpen={true}
                onClose={onClose}
                types={types}
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
        expect(screen.queryByText('Manage Competency Types')).not.toBeInTheDocument();
    });

    it('renders types and marks inactive ones', () => {
        renderModal();

        expect(screen.getByText('Manage Competency Types')).toBeInTheDocument();
        expect(screen.getByText('Core')).toBeInTheDocument();
        expect(screen.getByText('Legacy')).toBeInTheDocument();
        expect(screen.getByText('Core skills')).toBeInTheDocument();
        expect(screen.getByText('Old stuff')).toBeInTheDocument();
        expect(screen.getByText('(Inactive)')).toBeInTheDocument();
    });

    it('enters edit mode when Edit Description is clicked and populates form', () => {
        renderModal();

        fireEvent.click(screen.getAllByTitle('Edit Description')[0]); // edit "Core"

        expect(screen.getByText(/Editing: Core/i)).toBeInTheDocument();
        const nameInput = screen.getByLabelText(/Type Name/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
        expect(nameInput.value).toBe('Core');
        expect(nameInput).toBeDisabled();
        expect(descInput.value).toBe('Core skills');
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel Edit/i })).toBeInTheDocument();
    });

    it('submits add flow and calls onAdd with form values, then resets', async () => {
        onAdd.mockResolvedValueOnce({});

        renderModal();

        const nameInput = screen.getByLabelText(/Type Name/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

        fireEvent.change(nameInput, { target: { value: 'Tech' } });
        fireEvent.change(descInput, { target: { value: 'Technical skills' } });

        fireEvent.click(screen.getByRole('button', { name: /Add Type/i }));

        await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Tech', 'Technical skills'));

        // Back to add mode and cleared
        expect(screen.getByRole('button', { name: /Add Type/i })).toBeInTheDocument();
        expect(nameInput).not.toBeDisabled();
        expect(nameInput.value).toBe('');
        expect(descInput.value).toBe('');
    });

    it('submits edit flow and calls onUpdate with original name and new description, then resets', async () => {
        onUpdate.mockResolvedValueOnce({});

        renderModal();

        fireEvent.click(screen.getAllByTitle('Edit Description')[0]); // Core
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
        fireEvent.change(descInput, { target: { value: 'Updated description' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('Core', 'Updated description'));

        // Wait for UI to return to add mode
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Add Type/i })).toBeInTheDocument()
        );

        const nameInput = screen.getByLabelText(/Type Name/i) as HTMLInputElement;
        const descInput2 = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
        expect(nameInput).not.toBeDisabled();
        expect(nameInput.value).toBe('');
        expect(descInput2.value).toBe('');
    });

    it('cancels edit and returns to add mode with cleared fields', () => {
        renderModal();

        fireEvent.click(screen.getAllByTitle('Edit Description')[0]); // Core
        fireEvent.click(screen.getByRole('button', { name: /Cancel Edit/i }));

        expect(screen.getByRole('button', { name: /Add Type/i })).toBeInTheDocument();
        const nameInput = screen.getByLabelText(/Type Name/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
        expect(nameInput).not.toBeDisabled();
        expect(nameInput.value).toBe('');
        expect(descInput.value).toBe('');
    });

    it('deactivates an active type after confirm', async () => {
        onToggleStatus.mockResolvedValueOnce({});

        renderModal();

        fireEvent.click(screen.getByTitle('Deactivate'));
        const confirmBtn = await screen.findByRole('button', { name: /Confirm/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => expect(onToggleStatus).toHaveBeenCalledWith('Core', false));
    });

    it('reactivates an inactive type after confirm', async () => {
        onToggleStatus.mockResolvedValueOnce({});

        renderModal();

        fireEvent.click(screen.getByTitle('Reactivate'));
        const confirmBtn = await screen.findByRole('button', { name: /Confirm/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => expect(onToggleStatus).toHaveBeenCalledWith('Legacy', true));
    });

    it('does not toggle status when confirm is cancelled', async () => {
        renderModal();

        fireEvent.click(screen.getByTitle('Deactivate'));
        const cancelBtn = await screen.findByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);

        await waitFor(() => expect(onToggleStatus).not.toHaveBeenCalled());
    });

    it('shows API error message when add fails', async () => {
        onAdd.mockRejectedValueOnce(new Error('Failed to add'));

        renderModal();

        fireEvent.change(screen.getByLabelText(/Type Name/i), { target: { value: 'Soft' } });
        fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Soft skills' } });

        fireEvent.click(screen.getByRole('button', { name: /Add Type/i }));

        expect(await screen.findByText('Failed to add')).toBeInTheDocument();
    });

});