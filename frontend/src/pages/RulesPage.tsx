//frontend/src/pages/RulesPage.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    type Connection,
    type Edge,
    type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import MainLayout from '../layouts/MainLayout';
import Toolbox from '../components/rules-canvas/Toolbox';
import { nodeTypes } from '../components/rules-canvas/nodeTypes';
import { v4 as uuidv4 } from 'uuid';
import { exportRulesJSON } from '../utils/ruleSerialiser';
import CanvasNavigator from '../components/rules-canvas/CanvasNavigator';
import CanvasToast from '../components/rules-canvas/CanvasToast';
import CanvasConfirm from '../components/rules-canvas/CanvasConfirm';
import { materializeFromBackend, deleteRuleInBackend } from '../utils/canvasBackend';
import { RulesMetadataProvider } from '../contexts/RulesMetadataContext';

const initialNodes: any[] = [];

const RulesPage: React.FC = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [exported, setExported] = useState<string>('');
    const [showPreview, setShowPreview] = useState<boolean>(false);

    const nodesRef = useRef<typeof nodes>(nodes);
    const edgesRef = useRef<typeof edges>(edges);

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    useEffect(() => {
        (async () => {
            try {
                const { nodes, edges } = await materializeFromBackend();
                setNodes(nodes as any);
                setEdges(edges as any);
            } catch {
                // no-op: empty canvas
            }
        })();
    }, [setNodes, setEdges]);

    // Handle confirmed deletions centrally (remove from canvas and storage)
    useEffect(() => {
        const onConfirm = (e: Event) => {
            const { id: ruleId } = (e as CustomEvent<{ id: string }>).detail;
            const currNodes = nodesRef.current as any[];
            const currEdges = edgesRef.current as any[];

            const ruleNode = currNodes.find(n => n.id === ruleId);
            const backendId = ruleNode?.data?.backendId as string | number | undefined;

            const nextNodes = currNodes.filter(n => n.id !== ruleId);
            const nextEdges = currEdges.filter(e => e.source !== ruleId && e.target !== ruleId);
            setNodes(nextNodes as any);
            setEdges(nextEdges as any);

            (async () => {
                try { await deleteRuleInBackend(backendId); } catch { /* no-op */ }
            })();
        };
        window.addEventListener('rule:delete-confirmed', onConfirm as any);
        return () => window.removeEventListener('rule:delete-confirmed', onConfirm as any);
    }, [setNodes, setEdges]);

    const isConnectAllowed = useCallback((c: Edge | Connection) => {
        if (!c.source || !c.target) return false;
        const s = nodes.find(n => n.id === c.source);
        const t = nodes.find(n => n.id === c.target);
        if (!s || !t) return false;

        // must involve a rule
        if (!(s.type === 'rule' || t.type === 'rule')) return false;

        // if rule-to-rule, allow
        if (s.type === 'rule' && t.type === 'rule') return true;

        // identify the rule and the other node
        const rule = s.type === 'rule' ? s : t;
        const other = s.type === 'rule' ? t : s;

        // enforce only one of each type per rule
        if (other.type === 'trigger' || other.type === 'conditions' || other.type === 'actions') {
            // block duplicate edge between the same two nodes
            const duplicate = edges.some(e =>
                (e.source === c.source && e.target === c.target) ||
                (e.source === c.target && e.target === c.source)
            );
            if (duplicate) return false;

            // block if rule already linked to a node of this type (in either direction)
            const hasSameType = edges.some(e => {
                const a = nodes.find(n => n.id === e.source);
                const b = nodes.find(n => n.id === e.target);
                if (!a || !b) return false;
                // ensure the edge involves this rule
                if (!(e.source === rule.id || e.target === rule.id)) return false;
                // find the non-rule end for this edge
                const nonRule = a.type === 'rule' ? b : a;
                return nonRule.type === other.type;
            });
            if (hasSameType) return false;
        }

        return true;
    }, [nodes, edges]);

    const onConnect = useCallback((params: Edge | Connection) => {
        if (isConnectAllowed(params)) {
            setEdges((eds) => addEdge(params, eds));
        }
    }, [setEdges, isConnectAllowed]);

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        // apply default behavior
        onNodesChange(changes);

        // detect moved/resized nodes and mark linked rules unsaved
        const movedIds = changes
            .filter((ch) => ch.type === 'position' || ch.type === 'dimensions')
            .map((ch) => ch.id);
        if (movedIds.length === 0) return;

        setNodes((nds) => {
            const ruleIds = new Set<string>();
            for (const id of movedIds) {
                const n = nds.find((n) => n.id === id);
                if (!n) continue;
                if (n.type === 'rule') {
                    ruleIds.add(n.id);
                } else {
                    edges.forEach((e) => {
                        if (e.source === id || e.target === id) {
                            const otherId = e.source === id ? e.target : e.source;
                            const other = nds.find((x) => x.id === otherId);
                            if (other?.type === 'rule') ruleIds.add(other.id);
                        }
                    });
                }
            }
            if (!ruleIds.size) return nds;
            return nds.map((n) =>
                n.type === 'rule' && ruleIds.has(n.id) ? { ...n, data: { ...(n.data as any), saved: false } } : n
            );
        });
    }, [onNodesChange, setNodes, edges]);

    const createNodeData = (type: string) => {
        switch (type) {
            case 'rule':
                return { label: 'Rule name', name: 'rule1 name', saved: false };
            case 'trigger':
                return { label: 'Trigger', triggerType: '', parameters: [] as any[] };
            case 'conditions':
                return { label: 'Conditions', conditions: [] as any[] };
            case 'actions':
                return { label: 'Actions', actions: [] as any[] };
            default:
                return { label: type };
        }
    };

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();

            if (!reactFlowInstance || !reactFlowWrapper.current) return;

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode = {
                id: uuidv4(),
                type,
                position,
                data: createNodeData(type),
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const togglePreview = () => {
        if (!showPreview) {
            const json = exportRulesJSON(nodes as any, edges as any);
            setExported(JSON.stringify(json, null, 2));
        }
        setShowPreview((v) => !v);
    };

    return (
        <MainLayout pageTitle="Rule Builder">
            <div className="flex flex-col h-[calc(100vh-120px)] min-h-0">
                <ReactFlowProvider>
                    <RulesMetadataProvider>
                        <Toolbox />
                        <div className="flex flex-1 min-h-0">
                            <div className="flex-1 min-w-0 relative" ref={reactFlowWrapper}>
                                <div className="absolute z-10 right-3 top-3 flex gap-2">
                                    <button
                                        className="px-3 py-1 border rounded bg-white text-sm shadow dark:bg-gray-900 dark:text-gray-100"
                                        onClick={togglePreview}
                                        type="button"
                                    >
                                        {showPreview ? 'Hide Preview' : 'Preview JSON'}
                                    </button>
                                </div>

                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={handleNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onInit={setReactFlowInstance}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    nodeTypes={nodeTypes}
                                    fitView
                                >
                                    <Controls />
                                    <Background />
                                </ReactFlow>

                                <CanvasNavigator />
                                <CanvasToast />
                                <CanvasConfirm />
                            </div>

                            {showPreview && (
                                <aside className="w-96 p-3 border-l bg-gray-50 overflow-auto
                                              dark:bg-dark-input/90 dark:border-gray-700/40">
                                    <h3 className="font-semibold mb-2 text-sm text-custom-primary dark:text-dark-primary">Preview</h3>
                                    <pre className="text-xs whitespace-pre-wrap text-gray-800 dark:text-dark-primary">
                                        {exported}
                                    </pre>
                                </aside>
                            )}
                        </div>
                    </RulesMetadataProvider>
                </ReactFlowProvider>
            </div>
        </MainLayout>
    );
};

export default RulesPage;