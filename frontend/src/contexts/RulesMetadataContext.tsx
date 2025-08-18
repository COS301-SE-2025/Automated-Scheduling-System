import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    getRulesMetadata,
    type RulesMetadata,
    type TriggerMetadata,
    type ActionMetadata,
    type OperatorMetadata,
    type FactMetadata,
} from '../services/ruleService';

type Ctx = {
    loading: boolean;
    error?: string;
    triggers: TriggerMetadata[];
    actions: ActionMetadata[];
    facts: FactMetadata[];
    operators: OperatorMetadata[];
    byTrigger: Map<string, TriggerMetadata>;
    byAction: Map<string, ActionMetadata>;
    factNames: string[];
};

const RulesMetadataContext = createContext<Ctx>({
    loading: true,
    triggers: [],
    actions: [],
    facts: [],
    operators: [],
    byTrigger: new Map(),
    byAction: new Map(),
    factNames: [],
});

export const RulesMetadataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<{ loading: boolean; error?: string; data?: RulesMetadata }>({ loading: true });

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const data = await getRulesMetadata();
                if (!active) return;
                setState({ loading: false, data });
            } catch (e: any) {
                if (!active) return;
                setState({ loading: false, error: e?.message || 'Failed to load metadata' });
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const value: Ctx = useMemo(() => {
        const d = state.data;
        const triggers = d?.triggers ?? [];
        const actions = d?.actions ?? [];
        const facts = d?.facts ?? [];
        const operators = d?.operators ?? [];
        return {
            loading: state.loading,
            error: state.error,
            triggers,
            actions,
            facts,
            operators,
            byTrigger: new Map(triggers.map((t) => [t.type, t])),
            byAction: new Map(actions.map((a) => [a.type, a])),
            factNames: facts.map((f) => f.name),
        };
    }, [state]);

    return <RulesMetadataContext.Provider value={value}>{children}</RulesMetadataContext.Provider>;
};

export const useRulesMetadata = () => useContext(RulesMetadataContext);