//frontend/src/components/rules-canvas/customNodes.ts
import RuleNode from './RuleNode';
import TriggerNode from './TriggerNode';
import ConditionsNode from './ConditionsNode';
import ActionsNode from './ActionsNode';

// This object is used by React Flow to know which component to render for each node type.
export const nodeTypes = {
    rule: RuleNode,
    trigger: TriggerNode,
    conditions: ConditionsNode,
    actions: ActionsNode,
};