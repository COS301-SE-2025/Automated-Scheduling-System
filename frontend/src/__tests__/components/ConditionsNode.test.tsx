import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted store so the reactflow mock can read the latest graph
const h = vi.hoisted(() => ({
    store: { nodeInternals: new Map<any, any>(), edges: [] as any[] }
}));

// reactflow mocks: Handle, Position, useReactFlow, useStore
const setNodesMock = vi.fn();
const deleteElementsMock = vi.fn();
const getEdgesMock = vi.fn(() => h.store.edges);
const getNodesMock = vi.fn(() => Array.from(h.store.nodeInternals.values()));
const getNodeMock = vi.fn((id: string) => h.store.nodeInternals.get(id));

vi.mock('reactflow', () => {
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
        useStore: (selector: any) =>
            selector({ nodeInternals: h.store.nodeInternals, edges: h.store.edges }),
    };
});

// Rules metadata mock: facts + operators
vi.mock('../../contexts/RulesMetadataContext', () => {
    const operators = [
        { name: 'equals' },
        { name: 'contains' },
        { name: 'isTrue' },
        { name: 'isFalse' },
    ];
    const facts = [
        // For scheduled_time
        { name: 'cron_enabled', triggers: ['scheduled_time'], operators: ['isTrue', 'isFalse'] },
        // For relative_time + employee_competency
        { name: 'competency_expiry_date', triggers: ['employee_competency'], operators: ['equals', 'contains'] },
        { name: 'competency_is_active', triggers: ['employee_competency'], operators: ['isTrue', 'isFalse'] },
    ];
    return {
        useRulesMetadata: () => ({ facts, operators }),
    };
});

import ConditionsNode from '../../components/rules-canvas/ConditionsNode';

// Helpers to configure the graph per test
function setUnconnected() {
    h.store.nodeInternals = new Map([
        ['cond1', { id: 'cond1', type: 'conditions', data: {} }],
    ]);
    h.store.edges = [];
}
function setConnected(triggerType: string, parameters: Array<{ key: string; value: string }> = []) {
    h.store.nodeInternals = new Map([
        ['cond1', { id: 'cond1', type: 'conditions', data: {} }],
        ['rule1', { id: 'rule1', type: 'rule', data: {} }],
        ['trig1', { id: 'trig1', type: 'trigger', data: { triggerType, parameters } }],
    ]);
    h.store.edges = [
        { source: 'cond1', target: 'rule1' },
        { source: 'rule1', target: 'trig1' },
    ];
}

const makeProps = (overrides?: Partial<any>) => ({
    id: 'cond1',
    data: {
        label: 'Conditions',
        conditions: [],
        ...overrides?.data,
    },
    type: 'conditions',
    dragging: false,
    selected: false,
    isConnectable: true,
    ...overrides,
} as any);

describe('ConditionsNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setUnconnected();
    });

    it('renders header and handles', () => {
        const props = makeProps();
        render(<ConditionsNode {...props} />);
        expect(screen.getAllByText('Conditions').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
    });

    it('shows guidance when not connected and disables Add', () => {
        const props = makeProps();
        render(<ConditionsNode {...props} />);
        expect(screen.getByText(/To add conditions:/i)).toBeInTheDocument();
        const addBtn = screen.getByTitle(/Connect to a Rule and a Trigger/i);
        expect(addBtn).toBeDisabled();
    });

    it('disables Add and shows message when trigger is scheduled_time', () => {
        setConnected('scheduled_time');
        const props = makeProps();
        render(<ConditionsNode {...props} />);
        expect(screen.getByText(/Conditions are not supported for Scheduled Time triggers/i)).toBeInTheDocument();
        const addBtn = screen.getByTitle(/Conditions are not supported for Scheduled Time triggers/i);
        expect(addBtn).toBeDisabled();

        fireEvent.click(addBtn);
        expect(setNodesMock).not.toHaveBeenCalled();
    });

    it('enables Add when connected to relative_time and lists only allowed facts', () => {
        setConnected('relative_time', [{ key: 'entity_type', value: 'employee_competency' }]);
        const props = makeProps();
        const { rerender } = render(<ConditionsNode {...props} />);

        const addBtn = screen.getByTitle('Add condition');
        expect(addBtn).toBeEnabled();

        // Initially shows "No conditions"
        expect(screen.getByText(/No conditions/i)).toBeInTheDocument();

        // Click add -> component calls setNodes; simulate state update via rerender
        fireEvent.click(addBtn);
        expect(setNodesMock).toHaveBeenCalled();

        const nextProps = {
            ...props,
            data: {
                ...props.data,
                conditions: [{ fact: '', operator: 'equals', value: '' }],
            },
        };
        rerender(<ConditionsNode {...nextProps} />);

        // Row should appear with fact and operator selects
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(2);

        const factSelect = selects[0];
        expect(within(factSelect).getByRole('option', { name: 'competency_expiry_date' })).toBeInTheDocument();
        expect(within(factSelect).getByRole('option', { name: 'competency_is_active' })).toBeInTheDocument();
        expect(within(factSelect).queryByRole('option', { name: 'cron_enabled' })).not.toBeInTheDocument();
    });

    it('limits operators per fact and disables value for boolean operators', () => {
        setConnected('relative_time', [{ key: 'entity_type', value: 'employee_competency' }]);
        const props = makeProps({
            data: {
                label: 'Conditions',
                conditions: [{ fact: '', operator: 'equals', value: '' }],
            },
        });
        render(<ConditionsNode {...props} />);

        const selects = screen.getAllByRole('combobox');
        const factSelect = selects[0];
        const opSelect = selects[1];

        // Choose fact with boolean operators only
        fireEvent.change(factSelect, { target: { value: 'competency_is_active' } });

        // Ensure boolean operators are present
        expect(within(opSelect).getByRole('option', { name: 'isTrue' })).toBeInTheDocument();
        expect(within(opSelect).getByRole('option', { name: 'isFalse' })).toBeInTheDocument();

        // Select a boolean operator to trigger disabled value input
        fireEvent.change(opSelect, { target: { value: 'isTrue' } });

        const valueInput = screen.getByPlaceholderText('value') as HTMLInputElement;

        // Switch to a fact with equals/contains and select a non-boolean operator => value enabled
        fireEvent.change(factSelect, { target: { value: 'competency_expiry_date' } });
        fireEvent.change(opSelect, { target: { value: 'equals' } });

        expect(within(opSelect).getByRole('option', { name: 'equals' })).toBeInTheDocument();
        expect(within(opSelect).getByRole('option', { name: 'contains' })).toBeInTheDocument();
        expect(valueInput).not.toBeDisabled();
    });

    it('shows "No facts available" when none match and still allows Add (updates state)', () => {
        setConnected('relative_time', [{ key: 'entity_type', value: 'employee' }]); // no matching facts
        const props = makeProps();
        render(<ConditionsNode {...props} />);

        expect(screen.getByText(/No facts available for this trigger type/i)).toBeInTheDocument();

        const addBtn = screen.getByTitle('Add condition');
        expect(addBtn).toBeEnabled();

        fireEvent.click(addBtn);
        expect(setNodesMock).toHaveBeenCalled();
    });

    it('removes a row when clicking the remove button', () => {
        setConnected('relative_time', [{ key: 'entity_type', value: 'employee_competency' }]);
        const props = makeProps({
            data: {
                label: 'Conditions',
                conditions: [{ fact: '', operator: 'equals', value: '' }],
            },
        });
        const { rerender } = render(<ConditionsNode {...props} />);

        const removeBtn = screen.getByRole('button', { name: /Remove condition/i });
        fireEvent.click(removeBtn);
        expect(setNodesMock).toHaveBeenCalled();

        // Simulate node update resulting from setNodes by rerendering without conditions
        const nextProps = { ...props, data: { ...props.data, conditions: [] } };
        rerender(<ConditionsNode {...nextProps} />);

        expect(screen.getByText(/No conditions/i)).toBeInTheDocument();
    });

    it('delete button calls deleteElements with this node id', () => {
        setConnected('relative_time', [{ key: 'entity_type', value: 'employee_competency' }]);
        const props = makeProps();
        render(<ConditionsNode {...props} />);

        const del = screen.getByRole('button', { name: /Delete conditions/i });
        fireEvent.click(del);
        expect(deleteElementsMock).toHaveBeenCalledWith({ nodes: [{ id: 'cond1' }] });
    });
});