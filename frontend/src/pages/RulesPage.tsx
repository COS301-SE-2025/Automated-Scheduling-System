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
import EventEmployeeFilterModal from '../components/ui/EventEmployeeFilterModal';
import GenericSelectModal from '../components/ui/GenericSelectModal';
import { getAllUsers } from '../services/userService';
import { getAllJobPositions, type JobPosition } from '../services/jobPositionService';
import * as eventService from '../services/eventService';
import type { User } from '../types/user';

const initialNodes: any[] = [];

const RulesPage: React.FC = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [exported, setExported] = useState<string>('');
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);

    // Employee selector modal state
    const [users, setUsers] = useState<User[]>([]);
    const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
    const [currentEmployeeSelection, setCurrentEmployeeSelection] = useState<{
        currentValue: string[];
        onChange: (value: string) => void;
    } | null>(null);

    // Job position selector modal state
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [showJobPositionSelector, setShowJobPositionSelector] = useState(false);
    const [currentJobPositionSelection, setCurrentJobPositionSelection] = useState<{
        currentValue: string[];
        onChange: (value: string) => void;
    } | null>(null);

    // Event type selector modal state
    const [eventDefinitions, setEventDefinitions] = useState<eventService.EventDefinition[]>([]);
    const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
    const [currentEventTypeSelection, setCurrentEventTypeSelection] = useState<{
        currentValue: string;
        onChange: (value: string) => void;
    } | null>(null);

    const nodesRef = useRef<typeof nodes>(nodes);
    const edgesRef = useRef<typeof edges>(edges);

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    // Load users for employee selector, job positions, and event definitions for event type selector
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [userList, eventDefs, positions] = await Promise.all([
                    getAllUsers(),
                    eventService.getEventDefinitions(),
                    getAllJobPositions()
                ]);
                if (active) {
                    setUsers(userList);
                    setEventDefinitions(eventDefs);
                    setJobPositions(positions.filter(p => p.isActive));
                }
            } catch (error) {
                console.error('Failed to load users, event definitions, or job positions:', error);
            }
        })();
        return () => { active = false; };
    }, []);

    // Listen for employee selector events from ActionsNode
    useEffect(() => {
        const handleOpenEmployeeSelector = (event: CustomEvent) => {
            console.log('Employee selector event received in RulesPage', event.detail);
            const { currentValue, onChange } = event.detail;
            
            // Create a bridge function that converts array to string
            const bridgeOnChange = (jsonString: string) => {
                console.log('BRIDGE FUNCTION CALLED with:', typeof jsonString, jsonString);
                try {
                    const employeeArray = JSON.parse(jsonString);
                    console.log('Parsed employee array:', employeeArray, 'Type:', typeof employeeArray, 'IsArray:', Array.isArray(employeeArray));
                    if (Array.isArray(employeeArray)) {
                        console.log('About to call original onChange from ActionsNode with array:', employeeArray);
                        onChange(employeeArray);
                        console.log('Called original onChange successfully');
                    } else {
                        console.error('Parsed result is not an array:', employeeArray);
                        onChange([]);
                    }
                } catch (error) {
                    console.error('Error parsing employee JSON:', error);
                    onChange([]);
                }
            };
            
            console.log('🔧 Setting currentEmployeeSelection with bridge function');
            setCurrentEmployeeSelection({ currentValue, onChange: bridgeOnChange });
            setShowEmployeeSelector(true);
        };

        window.addEventListener('employees:open-selector', handleOpenEmployeeSelector as EventListener);
        
        return () => {
            window.removeEventListener('employees:open-selector', handleOpenEmployeeSelector as EventListener);
        };
    }, []);

    // Listen for job position selector events from ActionsNode
    useEffect(() => {
        const handleOpenJobPositionSelector = (event: CustomEvent) => {
            const { currentValue, onChange } = event.detail;
            setCurrentJobPositionSelection({ currentValue, onChange });
            setShowJobPositionSelector(true);
        };

        window.addEventListener('positions:open-selector', handleOpenJobPositionSelector as EventListener);
        
        return () => {
            window.removeEventListener('positions:open-selector', handleOpenJobPositionSelector as EventListener);
        };
    }, []);

    // Listen for event type selector events from ActionsNode
    useEffect(() => {
        const handleOpenEventTypeSelector = (event: CustomEvent) => {
            const { currentValue, onChange } = event.detail;
            setCurrentEventTypeSelection({ currentValue, onChange });
            setShowEventTypeSelector(true);
        };

        window.addEventListener('event-type:open-selector', handleOpenEventTypeSelector as EventListener);
        
        return () => {
            window.removeEventListener('event-type:open-selector', handleOpenEventTypeSelector as EventListener);
        };
    }, []);

    // Load rules from backend when component mounts
    useEffect(() => {
        let isActive = true;
        (async () => {
            try {
                setIsLoadingRules(true);
                console.log('Loading rules from backend...');
                const { nodes: loadedNodes, edges: loadedEdges } = await materializeFromBackend();
                console.log('Loaded rules:', { nodes: loadedNodes.length, edges: loadedEdges.length });
                if (isActive) {
                    setNodes(loadedNodes as any);
                    setEdges(loadedEdges as any);
                }
            } catch (error) {
                console.error('Failed to load rules from backend:', error);
                // Initialize with empty canvas on error
                if (isActive) {
                    setNodes([]);
                    setEdges([]);
                }
            } finally {
                if (isActive) {
                    setIsLoadingRules(false);
                }
            }
        })();
        
        return () => {
            isActive = false;
        };
    }, []); // Empty dependency array - only run on mount

    // Fit view after rules are initially loaded
    useEffect(() => {
        if (reactFlowInstance && !isLoadingRules && nodes.length > 0) {
            // Use setTimeout to ensure the nodes are fully rendered before fitting
            setTimeout(() => {
                reactFlowInstance.fitView({ padding: 50 });
            }, 100);
        }
    }, [reactFlowInstance, isLoadingRules]); // Only depend on loading state, not nodes

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

    const createNodeData = useCallback((type: string) => {
        switch (type) {
            case 'rule': {
                // Generate unique rule name by checking existing rules
                const existingRuleNames = new Set(
                    nodes.filter(n => n.type === 'rule')
                         .map(n => (n.data as any).name || '')
                         .filter(name => name.startsWith('Rule '))
                );
                
                let ruleNumber = 1;
                let ruleName = `Rule ${ruleNumber}`;
                while (existingRuleNames.has(ruleName)) {
                    ruleNumber++;
                    ruleName = `Rule ${ruleNumber}`;
                }
                
                return { label: 'Rule', name: ruleName, saved: false };
            }
            case 'trigger': {
                return { label: 'Trigger', triggerType: '', parameters: [] as any[] };
            }
            case 'conditions': {
                return { label: 'Conditions', conditions: [] as any[] };
            }
            case 'actions': {
                return { label: 'Actions', actions: [] as any[] };
            }
            default:
                return { label: type };
        }
    }, [nodes]);

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
        [reactFlowInstance, setNodes, createNodeData]
    );

    const togglePreview = () => {
        if (!showPreview) {
            const json = exportRulesJSON(nodes as any, edges as any);
            setExported(JSON.stringify(json, null, 2));
        }
        setShowPreview((v) => !v);
    };

    return (
        <MainLayout pageTitle="Rule Builder" helpText="Visually design rules by composing triggers, conditions, and actions. Drag items from the toolbox and connect them on the canvas.">
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
                                >
                                    <Controls />
                                    <Background />
                                </ReactFlow>

                                {isLoadingRules && (
                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span>Loading rules...</span>
                                        </div>
                                    </div>
                                )}

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

            {/* Employee Selection Modal - Rendered at page level */}
            <EventEmployeeFilterModal
                isOpen={showEmployeeSelector}
                mode="employees"
                title="Select Employees for Action"
                users={users}
                initialSelected={currentEmployeeSelection?.currentValue || []}
                onClose={() => {
                    setShowEmployeeSelector(false);
                    setCurrentEmployeeSelection(null);
                }}
                onConfirm={(selectedEmployeeNumbers) => {
                    console.log('Employee modal onConfirm called', { selectedEmployeeNumbers });
                    if (currentEmployeeSelection?.onChange) {
                        // Pass the JSON string to ActionsNode's onChange prop
                        const validEmployeeNumbers = selectedEmployeeNumbers.filter(emp => emp && emp.trim() !== '');
                        console.log('Calling ActionsNode onChange prop with JSON string:', { validEmployeeNumbers });
                        currentEmployeeSelection.onChange(JSON.stringify(validEmployeeNumbers));
                    }
                    setShowEmployeeSelector(false);
                    setCurrentEmployeeSelection(null);
                }}
            />

            {/* Job Position Selector Modal */}
            <EventEmployeeFilterModal
                isOpen={showJobPositionSelector}
                mode="positions"
                positions={jobPositions}
                initialSelected={currentJobPositionSelection?.currentValue || []}
                onClose={() => {
                    setShowJobPositionSelector(false);
                    setCurrentJobPositionSelection(null);
                }}
                onConfirm={(selectedPositionCodes) => {
                    if (currentJobPositionSelection?.onChange) {
                        currentJobPositionSelection.onChange(JSON.stringify(selectedPositionCodes));
                    }
                    setShowJobPositionSelector(false);
                    setCurrentJobPositionSelection(null);
                }}
            />

            {/* Event Type Selector Modal */}
            <GenericSelectModal<eventService.EventDefinition>
                isOpen={showEventTypeSelector}
                title="Select event type"
                items={eventDefinitions}
                idKey={(d) => String(d.CustomEventID)}
                columns={[
                    { header: 'Name', field: 'EventName' },
                    { header: 'Duration', field: 'StandardDuration', className: 'text-gray-500' }
                ]}
                searchFields={['EventName'] as any}
                multiSelect={false}
                onClose={() => {
                    setShowEventTypeSelector(false);
                    setCurrentEventTypeSelection(null);
                }}
                onConfirm={(ids) => {
                    if (currentEventTypeSelection?.onChange && ids.length > 0) {
                        currentEventTypeSelection.onChange(ids[0]);
                    }
                    setShowEventTypeSelector(false);
                    setCurrentEventTypeSelection(null);
                }}
                footerPrimaryLabel="Use Selection"
            />
        </MainLayout>
    );
};

export default RulesPage;