import api from './api';

export interface RuleMetadata {
  id: string;
  type: string;
  enabled: boolean;
  body: any;
}

export interface CreateRuleRequest {
  rule: {
    id: string;
    type: string;
    enabled: boolean;
    target?: string;
    frequency?: {
      years?: number;
      months?: number;
      days?: number;
    };
    conditions?: Record<string, any>;
    params?: Record<string, any>;
    when?: string;
    actions?: Array<{
      type: string;
      params?: Record<string, any>;
    }>;
  };
}

export interface RulesResponse {
  rules: RuleMetadata[];
}

// Get all rules
export const getRules = async (): Promise<RuleMetadata[]> => {
  const response = await api('api/rules', { method: 'GET' });
  const data = response as RulesResponse;
  return data.rules;
};

// Create a new rule
export const createRule = async (ruleData: CreateRuleRequest): Promise<{ message: string; rule: RuleMetadata }> => {
  return await api('api/rules', {
    method: 'POST',
    body: JSON.stringify(ruleData),
  });
};

// Update an existing rule
export const updateRule = async (ruleId: string, ruleData: CreateRuleRequest): Promise<{ message: string; rule: RuleMetadata }> => {
  return await api(`api/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData),
  });
};

// Delete a rule
export const deleteRule = async (ruleId: string): Promise<{ message: string }> => {
  return await api(`api/rules/${ruleId}`, {
    method: 'DELETE',
  });
};

// Trigger scheduled rules (for testing/admin)
export const triggerScheduledRules = async (): Promise<{ message: string }> => {
  return await api('api/rules/trigger-scheduled', {
    method: 'POST',
  });
};

// Helper function to create a cooldown rule
export const createCooldownRule = (
  id: string,
  checkType: string,
  days: number,
  enabled: boolean = true
): CreateRuleRequest => ({
  rule: {
    id,
    type: 'cooldown',
    enabled,
    params: {
      days,
      checkType,
    },
  },
});

// Helper function to create a recurring check rule
export const createRecurringRule = (
  id: string,
  checkType: string,
  frequency: { years?: number; months?: number; days?: number },
  notifyDaysBefore: number,
  enabled: boolean = true
): CreateRuleRequest => ({
  rule: {
    id,
    type: 'recurringCheck',
    enabled,
    frequency,
    params: {
      checkType,
      notifyDaysBefore,
    },
  },
});

// Helper function to create an action rule with conditions
export const createActionRule = (
  id: string,
  whenCondition: string,
  actions: Array<{ type: string; params?: Record<string, any> }>,
  enabled: boolean = true
): CreateRuleRequest => ({
  rule: {
    id,
    type: 'action',
    enabled,
    when: whenCondition,
    actions,
  },
});
