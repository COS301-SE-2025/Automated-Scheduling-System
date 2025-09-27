import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for reactflow hooks/components used by TriggerNode
const setNodesMock = vi.fn();
const deleteElementsMock = vi.fn();
const getEdgesMock = vi.fn(() => []);
const getNodesMock = vi.fn(() => []);
const getNodeMock = vi.fn((id: string) => ({ id, type: id.startsWith('r') ? 'rule' : 'trigger', data: {} }));

vi.mock('reactflow', async () => {
    return {
        Handle: (props: any) => <div data-testid={`handle-${props.type}-${props.position}`} />,
        Position: { Top: 'top', Bottom: 'bottom' },
        useReactFlow: () => ({
            setNodes: setNodesMock,
            deleteElements: deleteElementsMock,
            getEdges: getEdgesMock,
            getNodes: getNodesMock,
            getNode: getNodeMock,
        }),
    };
});

// Mock RulesMetadata context entirely inside the factory to avoid TDZ with hoisting
vi.mock('../../contexts/RulesMetadataContext', () => {
    const scheduledMeta = {
        type: 'scheduled_time',
        name: 'Scheduled Time',
        parameters: [
            { name: 'frequency', type: 'string', required: true, options: ['hourly', 'daily', 'weekly', 'monthly', 'once', 'cron'] },
            { name: 'minute_of_hour', type: 'number', required: false, options: [] },
            { name: 'time_of_day', type: 'time', required: false, options: [] },
            { name: 'timezone', type: 'string', required: true, options: ['UTC+0', 'UTC+1'] },
            { name: 'day_of_week', type: 'string', required: false, options: ['1', '2', '3', '4', '5', '6', '7'] },
            { name: 'day_of_month', type: 'number', required: false, options: [] },
            { name: 'date', type: 'date', required: false, options: [] },
            { name: 'cron_expression', type: 'string', required: true, options: [] },
        ],
    };
    const relativeMeta = {
        type: 'relative_time',
        name: 'Relative Time',
        parameters: [
            { name: 'entity_type', type: 'string', required: true, options: ['scheduled_event', 'employee_competency', 'employee', 'employment_history'] },
            { name: 'date_field', type: 'string', required: true, options: ['event_start_date', 'event_end_date', 'expiry_date', 'termination_date', 'start_date'] },
            { name: 'offset_days', type: 'integer', required: true, options: [] },
            { name: 'before', type: 'boolean', required: false, options: [] },
        ],
    };

    const triggers = [scheduledMeta, relativeMeta].map(m => ({ type: m.type, name: m.name, parameters: m.parameters }));
    const byTrigger = new Map<string, any>([
        [scheduledMeta.type, scheduledMeta],
        [relativeMeta.type, relativeMeta],
    ]);
    return {
        useRulesMetadata: () => ({ triggers, byTrigger }),
    };
});

import TriggerNode from '../../components/rules-canvas/TriggerNode';

describe('TriggerNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderNode = (overrides?: Partial<any>) => {
        const props = {
            id: 't1',
            data: {
                label: 'Trigger',
                triggerType: '',
                parameters: [],
                ...overrides?.data,
            },
            type: 'trigger',
            dragging: false,
            selected: false,
            isConnectable: true,
            ...overrides,
        } as any;
        return render(<TriggerNode {...props} />);
    };

    it('renders trigger selector and handles', () => {
        renderNode();
        expect(screen.getByText('Trigger')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // trigger type select
        expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
    });

    it('shows correct weekly parameter rows (day_of_week, time_of_day, timezone) and hides others', () => {
        renderNode({
            data: {
                label: 'Trigger',
                triggerType: 'scheduled_time',
                parameters: [
                    { key: 'frequency', value: 'weekly' },
                    { key: 'day_of_week', value: '1' },
                    { key: 'time_of_day', value: '08:00' },
                    { key: 'timezone', value: 'UTC+0' },
                    { key: 'minute_of_hour', value: '15' },
                    { key: 'day_of_month', value: '1' },
                    { key: 'date', value: '' },
                    { key: 'cron_expression', value: '' },
                ],
            },
        });

        // Visible rows
        expect(screen.getByDisplayValue('day_of_week')).toBeInTheDocument();
        expect(screen.getByDisplayValue('time_of_day')).toBeInTheDocument();
        expect(screen.getByDisplayValue('timezone')).toBeInTheDocument();

        // Hidden rows (filtered out)
        expect(screen.queryByDisplayValue('minute_of_hour')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('day_of_month')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('date')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('cron_expression')).not.toBeInTheDocument();
    });

    it('maps day_of_week numeric options to labels (e.g., 1 -> Monday)', () => {
        renderNode({
            data: {
                label: 'Trigger',
                triggerType: 'scheduled_time',
                parameters: [
                    { key: 'frequency', value: 'weekly' },
                    { key: 'day_of_week', value: '1' },
                    { key: 'time_of_day', value: '' },
                    { key: 'timezone', value: 'UTC+0' },
                ],
            },
        });

        const keyInput = screen.getByDisplayValue('day_of_week');
        const row = keyInput.parentElement as HTMLElement;
        const valueSelect = within(row).getByRole('combobox');
        expect(within(valueSelect).getByRole('option', { name: 'Monday' })).toBeInTheDocument();
        expect(within(valueSelect).queryByRole('option', { name: '7' })).not.toBeInTheDocument(); // should be "Sunday"
        expect(within(valueSelect).getByRole('option', { name: 'Sunday' })).toBeInTheDocument();
    });

    it('narrows relative_time date_field options based on entity_type', () => {
        renderNode({
            data: {
                label: 'Trigger',
                triggerType: 'relative_time',
                parameters: [
                    { key: 'entity_type', value: 'employee_competency' },
                    { key: 'date_field', value: '' },
                    { key: 'offset_days', value: '3' },
                ],
            },
        });

        const keyInput = screen.getByDisplayValue('date_field');
        const row = keyInput.parentElement as HTMLElement;
        const valueSelect = within(row).getByRole('combobox');

        // Only expiry_date should be present for employee_competency
        expect(within(valueSelect).getByRole('option', { name: /expiry_date/i })).toBeInTheDocument();
        expect(within(valueSelect).queryByRole('option', { name: /event_start_date/i })).not.toBeInTheDocument();
        expect(within(valueSelect).queryByRole('option', { name: /event_end_date/i })).not.toBeInTheDocument();
        expect(within(valueSelect).queryByRole('option', { name: /termination_date/i })).not.toBeInTheDocument();
    });

    it('calls deleteElements when clicking delete button', () => {
        renderNode({
            data: { label: 'Trigger', triggerType: '', parameters: [] },
            id: 't-delete',
        });

        const delBtn = screen.getByRole('button', { name: /delete trigger/i });
        fireEvent.click(delBtn);
        expect(deleteElementsMock).toHaveBeenCalledWith({ nodes: [{ id: 't-delete' }] });
    });

    it('invokes setNodes when changing trigger type', () => {
        renderNode({
            data: { label: 'Trigger', triggerType: '', parameters: [] },
            id: 't-change',
        });

        const triggerSelect = screen.getByRole('combobox');
        fireEvent.change(triggerSelect, { target: { value: 'scheduled_time' } });
        expect(setNodesMock).toHaveBeenCalledTimes(1);
        expect(typeof setNodesMock.mock.calls[0][0]).toBe('function');
    });
});