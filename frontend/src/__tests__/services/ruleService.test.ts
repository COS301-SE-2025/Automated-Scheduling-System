import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { ApiError as ApiClientError } from '../../services/api';
import {
    getRulesMetadata,
    getTriggersMetadata,
    getActionsMetadata,
    getFactsMetadata,
    getOperatorsMetadata,
    validateRule,
    getRulesStatus,
    listRules,
    createRule,
    getRuleById,
    updateRule,
    deleteRule,
    enableRule,
    disableRule,
    listRuleRecords,
    type RuleV2,
} from '../../services/ruleService';

vi.mock('../../services/api', async () => {
    const actual = await vi.importActual('../../services/api');
    return { __esModule: true, default: vi.fn(), ApiError: actual.ApiError };
});
const mockApi = apiClient as unknown as ReturnType<typeof vi.fn>;

describe('ruleService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockApiError = (message: string, status: number): Error => new ApiClientError(message, status as number);

    describe('metadata', () => {
        it('getRulesMetadata success', async () => {
            const payload = { status: 'ok', data: { triggers: [], actions: [], facts: [], operators: [] } };
            mockApi.mockResolvedValue(payload);

            const res = await getRulesMetadata();

            expect(mockApi).toHaveBeenCalledWith('rules/metadata', { method: 'GET' });
            expect(res).toEqual(payload.data);
        });

        it('getRulesMetadata error passthrough', async () => {
            const err = createMockApiError('meta-fail', 500);
            mockApi.mockRejectedValue(err);
            await expect(getRulesMetadata()).rejects.toThrow('meta-fail');
        });

        it('getTriggersMetadata success', async () => {
            const payload = { status: 'ok', data: [{ type: 't', name: 'T', description: '', parameters: [] }] };
            mockApi.mockResolvedValue(payload);

            const res = await getTriggersMetadata();
            expect(mockApi).toHaveBeenCalledWith('rules/metadata/triggers', { method: 'GET' });
            expect(res).toEqual(payload.data);
        });

        it('getActionsMetadata success', async () => {
            const payload = { status: 'ok', data: [{ type: 'a', name: 'A', description: '', parameters: [] }] };
            mockApi.mockResolvedValue(payload);

            const res = await getActionsMetadata();
            expect(mockApi).toHaveBeenCalledWith('rules/metadata/actions', { method: 'GET' });
            expect(res).toEqual(payload.data);
        });

        it('getFactsMetadata success', async () => {
            const payload = { status: 'ok', data: [{ name: 'f', type: 'string', description: '', operators: [] }] };
            mockApi.mockResolvedValue(payload);

            const res = await getFactsMetadata();
            expect(mockApi).toHaveBeenCalledWith('rules/metadata/facts', { method: 'GET' });
            expect(res).toEqual(payload.data);
        });

        it('getOperatorsMetadata success', async () => {
            const payload = { status: 'ok', data: [{ name: 'equals', symbol: '==', description: '', types: ['string'] }] };
            mockApi.mockResolvedValue(payload);

            const res = await getOperatorsMetadata();
            expect(mockApi).toHaveBeenCalledWith('rules/metadata/operators', { method: 'GET' });
            expect(res).toEqual(payload.data);
        });
    });

    describe('validation', () => {
        it('validateRule success', async () => {
            const rule: RuleV2 = { name: 'R', trigger: { type: 'onEvent' }, actions: [] };
            const payload = { status: 'ok', data: { valid: true } };
            mockApi.mockResolvedValue(payload);

            const res = await validateRule(rule);

            expect(mockApi).toHaveBeenCalledWith('rules/validate', { method: 'POST', data: rule });
            expect(res).toEqual(payload.data);
        });

        it('validateRule wraps non-ApiError', async () => {
            mockApi.mockRejectedValue(new Error('boom'));
            await expect(validateRule({ name: 'R', trigger: { type: '' }, actions: [] })).rejects.toThrow(
                'Failed to validate rule'
            );
        });
    });

    describe('status', () => {
        it('getRulesStatus success', async () => {
            const payload = { status: 'ok', timestamp: '2024-01-01T00:00:00Z', stats: { total: 1 } };
            mockApi.mockResolvedValue(payload);

            const res = await getRulesStatus();

            expect(mockApi).toHaveBeenCalledWith('rules/status', { method: 'GET' });
            expect(res).toEqual(payload);
        });

        it('getRulesStatus error wraps', async () => {
            mockApi.mockRejectedValue(new Error('down'));
            await expect(getRulesStatus()).rejects.toThrow('Failed to fetch rules status');
        });
    });

    describe('CRUD simple list', () => {
        it('listRules success', async () => {
            const rules: RuleV2[] = [
                { name: 'A', trigger: { type: 't1' }, actions: [] },
                { name: 'B', trigger: { type: 't2' }, actions: [] },
            ];
            mockApi.mockResolvedValue({ rules });

            const res = await listRules();

            expect(mockApi).toHaveBeenCalledWith('rules/rules', { method: 'GET' });
            expect(res).toEqual(rules);
        });

        it('listRules returns [] on unexpected payload', async () => {
            mockApi.mockResolvedValue({ not: 'expected' });
            const res = await listRules();
            expect(res).toEqual([]);
        });

        it('createRule success', async () => {
            const rule: RuleV2 = { name: 'N', trigger: { type: 't' }, actions: [] };
            const payload = { id: '42', message: 'created' };
            mockApi.mockResolvedValue(payload);

            const res = await createRule(rule);

            expect(mockApi).toHaveBeenCalledWith('rules/rules', { method: 'POST', data: rule });
            expect(res).toEqual(payload);
        });

        it('getRuleById success', async () => {
            const rule: RuleV2 = { name: 'X', trigger: { type: 't' }, actions: [] };
            mockApi.mockResolvedValue({ rule });

            const res = await getRuleById('abc');

            expect(mockApi).toHaveBeenCalledWith('rules/rules/abc', { method: 'GET' });
            expect(res).toEqual(rule);
        });

        it('updateRule success', async () => {
            mockApi.mockResolvedValue({ message: 'ok' });
            const rule: RuleV2 = { name: 'U', trigger: { type: 't' }, actions: [] };

            const res = await updateRule('7', rule);

            expect(mockApi).toHaveBeenCalledWith('rules/rules/7', { method: 'PUT', data: rule });
            expect(res).toEqual({ message: 'ok' });
        });

        it('deleteRule success', async () => {
            mockApi.mockResolvedValue({ message: 'deleted' });

            const res = await deleteRule('7');

            expect(mockApi).toHaveBeenCalledWith('rules/rules/7', { method: 'DELETE' });
            expect(res).toEqual({ message: 'deleted' });
        });

        it('enable/disable success', async () => {
            mockApi.mockResolvedValueOnce({ message: 'enabled' });
            const en = await enableRule('5');
            expect(mockApi).toHaveBeenCalledWith('rules/rules/5/enable', { method: 'POST' });
            expect(en).toEqual({ message: 'enabled' });

            mockApi.mockResolvedValueOnce({ message: 'disabled' });
            const dis = await disableRule('5');
            expect(mockApi).toHaveBeenCalledWith('rules/rules/5/disable', { method: 'POST' });
            expect(dis).toEqual({ message: 'disabled' });
        });

        it('CRUD methods rethrow ApiError', async () => {
            const err = createMockApiError('nope', 400);
            mockApi.mockRejectedValue(err);
            await expect(listRules()).rejects.toThrow('nope');
            await expect(createRule({ name: '', trigger: { type: '' }, actions: [] })).rejects.toThrow('nope');
            await expect(getRuleById('x')).rejects.toThrow('nope');
            await expect(updateRule('x', { name: '', trigger: { type: '' }, actions: [] })).rejects.toThrow('nope');
            await expect(deleteRule('x')).rejects.toThrow('nope');
            await expect(enableRule('x')).rejects.toThrow('nope');
            await expect(disableRule('x')).rejects.toThrow('nope');
        });
    });

    describe('listRuleRecords normalization', () => {
        it('accepts raw array and normalizes items with spec', async () => {
            const apiPayload = [
                {
                    id: 10,
                    name: 'Rule A',
                    enabled: false,
                    spec: { name: 'Rule A', trigger: { type: 'onEvent' }, actions: [], _ui: {} },
                },
                {
                    id: 11,
                    spec: { name: 'Rule B', trigger: { type: 'cron' }, actions: [] },
                },
                {
                    name: 'Rule C',
                    trigger: { type: 'manual' },
                    _ui: { nodes: {}, edges: [] },
                },
                { random: 'ignore-me' },
            ];
            mockApi.mockResolvedValue(apiPayload);

            const res = await listRuleRecords();

            expect(mockApi).toHaveBeenCalledWith('rules/rules', { method: 'GET' });
            expect(res).toHaveLength(3);

            const r0 = res[0];
            expect(r0.id).toBe(10);
            expect(r0.name).toBe('Rule A');
            expect(r0.enabled).toBe(false);
            expect(r0.triggerType).toBe('onEvent');

            const r1 = res[1];
            expect(r1.id).toBe(11);
            expect(r1.name).toBe('Rule B');
            expect(r1.enabled).toBe(true);
            expect(r1.triggerType).toBe('cron');

            const r2 = res[2];
            expect(r2.id).toBe('3'); // fallback to index+1 string
            expect(r2.name).toBe('Rule C');
            expect(r2.enabled).toBe(true);
            expect(r2.triggerType).toBe('manual');
        });

        it('accepts { rules: [...] } and { data: [...] } shapes', async () => {
            const arr = [
                { id: 'a', spec: { name: 'A', trigger: { type: 't' }, actions: [] } },
                { id: 'b', name: 'B', trigger: { type: 't2' } },
            ];

            mockApi.mockResolvedValueOnce({ rules: arr });
            const r1 = await listRuleRecords();
            expect(r1.map((r) => r.id)).toEqual(['a', 'b']);

            mockApi.mockResolvedValueOnce({ data: arr });
            const r2 = await listRuleRecords();
            expect(r2.map((r) => r.id)).toEqual(['a', 'b']);
        });

        it('returns [] on unexpected payload', async () => {
            mockApi.mockResolvedValue({ hello: 'world' });
            const res = await listRuleRecords();
            expect(res).toEqual([]);
        });

        it('rethrows ApiError on failure', async () => {
            const err = createMockApiError('list-fail', 502);
            mockApi.mockRejectedValue(err);
            await expect(listRuleRecords()).rejects.toThrow('list-fail');
        });
    });
});