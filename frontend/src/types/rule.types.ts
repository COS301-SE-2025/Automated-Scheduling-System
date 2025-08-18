//frontend/src/components/rules-canvas/types.ts
// Defines the custom data we'll store inside each node
export interface NodeData {
    label: string;
}

// Generic key/value pair used for parameters in trigger and actions
export interface ParamKV {
    key: string;
    value: string;
}

// Rule node data
export interface RuleNodeData extends NodeData {
    name: string;
    saved?: boolean; // indicates if this rule is saved to storage
}

// Trigger node data
export interface TriggerNodeData extends NodeData {
    triggerType: string;
    parameters: ParamKV[];
}

// Condition row
export interface ConditionRow {
    fact: string;
    operator: string;
    value?: string;
}

// Conditions node data
export interface ConditionsNodeData extends NodeData {
    conditions: ConditionRow[];
}

// Action row
export interface ActionRow {
    type: string;
    parameters: ParamKV[];
}

// Actions node data
export interface ActionsNodeData extends NodeData {
    actions: ActionRow[];
}

export type AnyNodeData =
    | RuleNodeData
    | TriggerNodeData
    | ConditionsNodeData
    | ActionsNodeData;