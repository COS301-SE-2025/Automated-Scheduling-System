import apiClient, { ApiError } from '../services/api';

/* ----------------------------- Shared types ----------------------------- */

export type RuleV2 = {
    name: string;
    trigger: TriggerSpec;
    conditions?: Condition[];
    actions: ActionSpec[];
    _ui?: UISnapshot;
};

export type TriggerSpec = {
    type: string;
    parameters?: Record<string, any>;
};

export type Condition = {
    fact: string;
    operator: string;
    value?: any;
    // extras are not serialized by backend; kept here for UI convenience
    extras?: Record<string, any>;
};

export type ActionSpec = {
    type: string;
    parameters?: Record<string, any>;
};

export type ValidationError = {
    parameter: string;
    message: string;
};
export type ValidationResult = {
    valid: boolean;
    errors?: ValidationError[];
};

export type ParameterMeta = {
    name: string;
    type: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'array' | 'object';
    required: boolean;
    description: string;
    example?: any;
    options?: any[]; // NEW: enum-like choices for dropdowns
};
export type TriggerMetadata = {
    type: string;
    name: string;
    description: string;
    parameters: ParameterMeta[];
};
export type ActionMetadata = {
    type: string;
    name: string;
    description: string;
    parameters: ParameterMeta[];
};
export type FactMetadata = {
    name: string;
    type: string;
    description: string;
    operators: string[];
    // Optional list of trigger types that provide this fact
    triggers?: string[];
};
export type OperatorMetadata = {
    name: string;
    symbol: string;
    description: string;
    types: string[];
};
export type RulesMetadata = {
    triggers: TriggerMetadata[];
    actions: ActionMetadata[];
    facts: FactMetadata[];
    operators: OperatorMetadata[];
};

export type UIPosition = { x: number; y: number };
export type UINode = { type: string; position: UIPosition };
export type UIEdge = { id?: string; source: string; target: string };
export type UISnapshot = { nodes?: Record<string, UINode>; edges?: UIEdge[] };

/* ------------------------------- Endpoints ------------------------------ */
/* Note: api base likely prefixes /api, so we use the 'rules/...' group as per backend. */

const BASE = 'rules';

/* ---------- Metadata ---------- */

export const getRulesMetadata = async (): Promise<RulesMetadata> => {
    try {
        const res = await apiClient<{ status: string; data: RulesMetadata }>(`${BASE}/metadata`, { method: 'GET' });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch rules metadata', (error as any)?.status || 0, error);
    }
};

export const getTriggersMetadata = async (): Promise<TriggerMetadata[]> => {
    try {
        const res = await apiClient<{ status: string; data: TriggerMetadata[] }>(`${BASE}/metadata/triggers`, { method: 'GET' });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch triggers metadata', (error as any)?.status || 0, error);
    }
};

export const getActionsMetadata = async (): Promise<ActionMetadata[]> => {
    try {
        const res = await apiClient<{ status: string; data: ActionMetadata[] }>(`${BASE}/metadata/actions`, { method: 'GET' });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch actions metadata', (error as any)?.status || 0, error);
    }
};

export const getFactsMetadata = async (): Promise<FactMetadata[]> => {
    try {
        const res = await apiClient<{ status: string; data: FactMetadata[] }>(`${BASE}/metadata/facts`, { method: 'GET' });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch facts metadata', (error as any)?.status || 0, error);
    }
};

export const getOperatorsMetadata = async (): Promise<OperatorMetadata[]> => {
    try {
        const res = await apiClient<{ status: string; data: OperatorMetadata[] }>(`${BASE}/metadata/operators`, { method: 'GET' });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch operators metadata', (error as any)?.status || 0, error);
    }
};

/* ---------- Validation ---------- */

export const validateRule = async (rule: RuleV2): Promise<ValidationResult> => {
    try {
        const res = await apiClient<{ status: string; data: ValidationResult }>(`${BASE}/validate`, {
            method: 'POST',
            data: rule,
        });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to validate rule', (error as any)?.status || 0, error);
    }
};

/* ---------- Status ---------- */

export const getRulesStatus = async (): Promise<{ status: string; timestamp: string; stats: any }> => {
    try {
        return await apiClient<{ status: string; timestamp: string; stats: any }>(`${BASE}/status`, { method: 'GET' });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to fetch rules status', (error as any)?.status || 0, error);
    }
};

/* ---------- CRUD (note the backend path is rules/rules) ---------- */

export const listRules = async (): Promise<RuleV2[]> => {
    try {
        const res = await apiClient<{ rules: RuleV2[] }>(`${BASE}/rules`, { method: 'GET' });
        return res.rules ?? [];
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to list rules', (error as any)?.status || 0, error);
    }
};

export const createRule = async (rule: RuleV2): Promise<{ id: string; message: string }> => {
    try {
        return await apiClient<{ id: string; message: string }>(`${BASE}/rules`, {
            method: 'POST',
            data: rule,
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to create rule', (error as any)?.status || 0, error);
    }
};

export const getRuleById = async (id: string): Promise<RuleV2> => {
    try {
        const res = await apiClient<{ rule: RuleV2 }>(`${BASE}/rules/${encodeURIComponent(id)}`, { method: 'GET' });
        return res.rule;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to get rule ${id}`, (error as any)?.status || 0, error);
    }
};

export const updateRule = async (id: string, rule: RuleV2): Promise<{ message: string }> => {
    try {
        return await apiClient<{ message: string }>(`${BASE}/rules/${encodeURIComponent(id)}`, {
            method: 'PUT',
            data: rule,
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to update rule ${id}`, (error as any)?.status || 0, error);
    }
};

export const deleteRule = async (id: string): Promise<{ message: string }> => {
    try {
        return await apiClient<{ message: string }>(`${BASE}/rules/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to delete rule ${id}`, (error as any)?.status || 0, error);
    }
};

export const enableRule = async (id: string): Promise<{ message: string }> => {
    try {
        return await apiClient<{ message: string }>(`${BASE}/rules/${encodeURIComponent(id)}/enable`, {
            method: 'POST',
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to enable rule ${id}`, (error as any)?.status || 0, error);
    }
};

export const disableRule = async (id: string): Promise<{ message: string }> => {
    try {
        return await apiClient<{ message: string }>(`${BASE}/rules/${encodeURIComponent(id)}/disable`, {
            method: 'POST',
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to disable rule ${id}`, (error as any)?.status || 0, error);
    }
};

export type RuleRecord = {
    id: string | number;
    name: string;
    triggerType: string;
    enabled: boolean;
    spec: RuleV2 & { _ui?: any };
};

export const listRuleRecords = async (): Promise<RuleRecord[]> => {
    try {
        const res = await apiClient<any>(`rules/rules`, { method: 'GET' });

        const arr = Array.isArray(res)
            ? res
            : Array.isArray(res?.rules)
                ? res.rules
                : Array.isArray(res?.data)
                    ? res.data
                    : [];

        if (!Array.isArray(arr)) return [];

        const normalized = arr
            .map((item: any, i: number): RuleRecord | null => {
                if (item && typeof item === 'object' && item.spec) {
                    const idVal: string | number = item.id ?? String(i + 1);
                    return {
                        id: idVal,
                        name: item.name ?? item.spec?.name ?? `Rule ${String(idVal)}`,
                        triggerType: item.triggerType ?? item.spec?.trigger?.type ?? '',
                        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
                        spec: item.spec as RuleV2,
                    };
                }

                if (item && typeof item === 'object' && (item.name || item.trigger || item._ui)) {
                    const idVal: string | number = item.id ?? String(i + 1);
                    return {
                        id: idVal,
                        name: item.name ?? `Rule ${String(idVal)}`,
                        triggerType: item.trigger?.type ?? '',
                        enabled: true,
                        spec: item as RuleV2,
                    };
                }

                return null;
            })
            .filter((x): x is RuleRecord => x !== null);

        return normalized;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('Failed to list rules', (error as any)?.status || 0, error);
    }
};