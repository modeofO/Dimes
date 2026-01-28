'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CADRenderer } from '@/lib/cad/renderer/cad-renderer';
import { CADClient } from '@/lib/cad/api/cad-client';
import { AgentManager } from '@/lib/cad/agent/agent-manager';
import { UIManager } from '@/components/ui-manager';
import { ChatPanel } from '@/components/chat-panel';
import { CommandPalette } from '@/components/command-palette';
import { WelcomeOverlay } from '@/components/welcome-overlay';
import { BottomHud } from '@/components/bottom-hud';
import { MeshData, SketchVisualizationData } from '@/types/geometry';
import { DrawingTool } from '@/lib/cad/controls/cad-controls';
import { Unit, toMillimeters } from '@/lib/utils/units';

interface CreatedShape {
    id: string;
    type: string;
    dimensions: Record<string, number>;
    visible: boolean;
}

interface CreatedPlane {
    plane_id: string;
    plane_type: string;
    origin: [number, number, number];
}

interface SketchElementInfo {
    id: string;
    type: string;
    is_container_only?: boolean;
    parent_id?: string;
    child_ids?: string[];
}

interface CreatedSketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElementInfo[];
    visualization_data?: SketchVisualizationData;
}

export function CADApplication() {
    const viewportRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<CADRenderer | null>(null);
    const clientRef = useRef<CADClient | null>(null);
    const agentRef = useRef<AgentManager | null>(null);

    const [status, setStatus] = useState<{
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
    }>({ message: 'Initializing CAD Engine...', type: 'info' });

    const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 15)}`);
    const [createdShapes, setCreatedShapes] = useState<CreatedShape[]>([]);
    const [createdPlanes, setCreatedPlanes] = useState<CreatedPlane[]>([]);
    const [createdSketches, setCreatedSketches] = useState<CreatedSketch[]>([]);
    const [selectedObject, setSelectedObject] = useState<{ id: string; type: string; } | null>(null);
    const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([]);
    const [currentDrawingTool, setCurrentDrawingTool] = useState<DrawingTool>('select');
    const [activeSketchId, setActiveSketchId] = useState<string | null>(null);
    const [currentArcType, setCurrentArcType] = useState<'three_points' | 'endpoints_radius'>('endpoints_radius');
    const [currentPolygonSides, setCurrentPolygonSides] = useState(6);
    const [currentUnit, setCurrentUnit] = useState<Unit>('mm');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    // New overlay state
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isSceneTreeOpen, setIsSceneTreeOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    const updateStatus = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
        setStatus({ message, type });
        console.log(`[${type.toUpperCase()}] ${message}`);
    }, []);

    const handleSelection = useCallback((id: string | null, type: string | null) => {
        setSelectedObject(prevSelected => {
            if (prevSelected?.id === id) return prevSelected;
            if (rendererRef.current) {
                rendererRef.current.setHighlight(id);
            }
            return id && type ? { id, type } : null;
        });
    }, []);

    const handleChatMessage = useCallback((message: string) => {
        setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
        if (agentRef.current) {
            agentRef.current.sendMessage('agent_message', message);
        }
    }, []);

    const openChat = useCallback(() => {
        setIsChatOpen(true);
        setUnreadMessages(0);
    }, []);

    const exitSketchMode = useCallback(() => {
        setActiveSketchId(null);
        if (rendererRef.current) {
            rendererRef.current.clearActiveSketchHighlight();
            rendererRef.current.viewIsometric();
        }
        updateStatus('Exited sketch editing mode', 'info');
    }, [updateStatus]);

    const handleInteractiveChamfer = useCallback(async (sketchId: string, line1Id: string, line2Id: string) => {
        if (!clientRef.current) return;
        try {
            const distanceStr = prompt('Enter chamfer distance:', '1');
            if (!distanceStr) return;
            const distance = parseFloat(distanceStr);
            if (isNaN(distance) || distance <= 0) {
                updateStatus('Invalid chamfer distance', 'error');
                return;
            }
            updateStatus(`Creating chamfer between lines (distance: ${distance})...`, 'info');
            const response = await clientRef.current.addChamferToSketch(sketchId, line1Id, line2Id, distance);
            if (response.success) {
                updateStatus(`Created chamfer with distance ${distance}`, 'success');
            } else {
                updateStatus('Failed to create chamfer', 'error');
            }
        } catch (error) {
            console.error('Interactive chamfer failed:', error);
            updateStatus(`Chamfer error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handleInteractiveFillet = useCallback(async (sketchId: string, line1Id: string, line2Id: string) => {
        if (!clientRef.current) return;
        try {
            const radiusStr = prompt('Enter fillet radius:', '1');
            if (!radiusStr) return;
            const radius = parseFloat(radiusStr);
            if (isNaN(radius) || radius <= 0) {
                updateStatus('Invalid fillet radius', 'error');
                return;
            }
            updateStatus(`Creating fillet between lines (radius: ${radius})...`, 'info');
            const response = await clientRef.current.addFilletToSketch(sketchId, line1Id, line2Id, radius);
            if (response.success) {
                updateStatus(`Created fillet with radius ${radius}`, 'success');
            } else {
                updateStatus('Failed to create fillet', 'error');
            }
        } catch (error) {
            console.error('Interactive fillet failed:', error);
            updateStatus(`Fillet error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handleSetDrawingTool = useCallback((tool: DrawingTool) => {
        setCurrentDrawingTool(tool);
        if (rendererRef.current) {
            rendererRef.current.setDrawingTool(tool);
            if (tool === 'arc') {
                rendererRef.current.setArcType(currentArcType);
            }
            if (tool === 'polygon') {
                rendererRef.current.setPolygonSides(currentPolygonSides);
            }
        }
        setShowWelcome(false);
    }, [currentArcType, currentPolygonSides]);

    const handleSetActiveSketch = useCallback((sketchId: string) => {
        setActiveSketchId(sketchId);
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (sketch && rendererRef.current) {
            if (sketch.visualization_data) {
                rendererRef.current.setActiveSketchPlane(sketchId, sketch.visualization_data);
                rendererRef.current.viewTop();
                updateStatus(`Set active sketch: ${sketchId} (ready for drawing)`, 'success');
            } else {
                updateStatus(`Set active sketch: ${sketchId} (limited functionality)`, 'warning');
            }
        }
    }, [createdSketches, updateStatus]);

    const handleSetArcType = useCallback((arcType: 'three_points' | 'endpoints_radius') => {
        setCurrentArcType(arcType);
        if (rendererRef.current) {
            rendererRef.current.setArcType(arcType);
        }
    }, []);

    const handleSetPolygonSides = useCallback((sides: number) => {
        setCurrentPolygonSides(sides);
        if (rendererRef.current) {
            rendererRef.current.setPolygonSides(sides);
        }
    }, []);

    const handleInteractiveDrawing = useCallback(async (tool: DrawingTool, points: THREE.Vector2[], arcType?: 'three_points' | 'endpoints_radius') => {
        const currentActiveSketchId = activeSketchId;
        if (!clientRef.current || !currentActiveSketchId) return;

        const requiredPoints = (tool === 'arc' && arcType === 'three_points') ? 3 : 2;
        if (points.length < requiredPoints) return;

        try {
            const [start, end] = points;
            let response;

            switch (tool) {
                case 'line':
                    response = await clientRef.current.addLineToSketch(
                        currentActiveSketchId, start.x, start.y, end.x, end.y
                    );
                    break;
                case 'circle': {
                    const radius = start.distanceTo(end);
                    response = await clientRef.current.addCircleToSketch(
                        currentActiveSketchId, start.x, start.y, radius
                    );
                    break;
                }
                case 'rectangle': {
                    const width = Math.abs(end.x - start.x);
                    const height = Math.abs(end.y - start.y);
                    response = await clientRef.current.addRectangleToSketch(
                        currentActiveSketchId, [Math.min(start.x, end.x), Math.min(start.y, end.y)], width, height
                    );
                    break;
                }
                case 'arc':
                    if (arcType === 'three_points') {
                        if (points.length >= 3) {
                            const [p1, p2, p3] = points;
                            response = await clientRef.current.addArcToSketch(
                                currentActiveSketchId, {
                                    arc_type: 'three_points',
                                    x1: p1.x, y1: p1.y,
                                    x_mid: p2.x, y_mid: p2.y,
                                    x2: p3.x, y2: p3.y
                                }
                            );
                        } else return;
                    } else if (arcType === 'endpoints_radius') {
                        if (points.length >= 2) {
                            const arcRadius = parseFloat(prompt('Enter arc radius:') || '5');
                            response = await clientRef.current.addArcToSketch(
                                currentActiveSketchId, {
                                    arc_type: 'endpoints_radius',
                                    x1: points[0].x, y1: points[0].y,
                                    x2: points[1].x, y2: points[1].y,
                                    radius: arcRadius
                                }
                            );
                        } else return;
                    } else return;
                    break;
                case 'polygon': {
                    const polygonRadius = start.distanceTo(end);
                    response = await clientRef.current.addPolygonToSketch(
                        currentActiveSketchId, start.x, start.y, currentPolygonSides, polygonRadius
                    );
                    break;
                }
                case 'fillet':
                case 'chamfer':
                case 'trim':
                case 'extend':
                case 'mirror':
                case 'offset':
                case 'copy':
                case 'move':
                    updateStatus(`Please select elements first for ${tool} operations`, 'info');
                    return;
                default:
                    updateStatus(`Interactive ${tool} not yet implemented`, 'warning');
                    return;
            }

            if (response?.success) {
                updateStatus(`Created ${tool} interactively`, 'success');
            }
        } catch (error) {
            console.error('Interactive drawing error:', error);
            updateStatus(`Error creating ${tool}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [activeSketchId, updateStatus, currentPolygonSides, currentArcType]);

    // Update the renderer's drawing callback whenever the handler changes
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.onDrawingComplete = handleInteractiveDrawing;
        }
    }, [handleInteractiveDrawing]);

    // Command palette callbacks
    const handlePaletteExtrude = useCallback(async (distance: number) => {
        if (!clientRef.current || !selectedObject) {
            updateStatus('Select a sketch or element to extrude', 'error');
            return;
        }
        try {
            const { id: selectedId, type: selectedType } = selectedObject;
            let sketchId: string | undefined;
            let elementId: string | undefined;

            if (selectedType === 'sketch') {
                sketchId = selectedId;
            } else if (selectedType === 'element') {
                for (const sketch of createdSketches) {
                    const element = sketch.elements.find(e => e.id === selectedId);
                    if (element) {
                        sketchId = sketch.sketch_id;
                        elementId = element.id;
                        break;
                    }
                }
            }

            if (!sketchId) {
                updateStatus('Please select a sketch or element to extrude', 'error');
                return;
            }

            updateStatus(`Extruding ${elementId ? `element ${elementId}` : `sketch ${sketchId}`}...`, 'info');
            const distanceInMm = toMillimeters(distance, currentUnit);
            const response = await clientRef.current.extrudeFeature(sketchId, distanceInMm, elementId);
            if (response.success && response.data) {
                updateStatus(`Extruded object: ${response.data.feature_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to extrude feature:', error);
            updateStatus(`Error extruding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [selectedObject, createdSketches, currentUnit, updateStatus]);

    const handlePaletteCreatePlane = useCallback(async (type: 'XZ' | 'XY' | 'YZ') => {
        if (!clientRef.current) return;
        try {
            updateStatus(`Creating ${type} plane...`, 'info');
            const response = await clientRef.current.createSketchPlane(type as any);
            if (response.success && response.data) {
                updateStatus(`Created plane: ${response.data.plane_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create plane:', error);
            updateStatus(`Error creating plane: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handlePaletteCreateSketch = useCallback(async (planeId: string) => {
        if (!clientRef.current) return;
        try {
            updateStatus(`Creating sketch on plane ${planeId}...`, 'info');
            const response = await clientRef.current.createSketch(planeId);
            if (response.success && response.data) {
                updateStatus(`Created sketch: ${response.data.sketch_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch:', error);
            updateStatus(`Error creating sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handlePaletteSetView = useCallback((view: 'front' | 'top' | 'right' | 'isometric') => {
        if (!rendererRef.current) return;
        switch (view) {
            case 'front': rendererRef.current.viewFront(); break;
            case 'top': rendererRef.current.viewTop(); break;
            case 'right': rendererRef.current.viewRight(); break;
            case 'isometric': rendererRef.current.viewIsometric(); break;
        }
    }, []);

    const handleDeleteSelected = useCallback(() => {
        if (!selectedObject) {
            updateStatus('Nothing selected to delete', 'info');
            return;
        }
        updateStatus(`Delete not yet implemented for ${selectedObject.type}`, 'warning');
    }, [selectedObject, updateStatus]);

    const handleNewSketch = useCallback(async (planeType: 'XZ' | 'XY' | 'YZ') => {
        if (!clientRef.current) return;
        try {
            updateStatus(`Creating ${planeType} plane + sketch...`, 'info');
            const planeResponse = await clientRef.current.createSketchPlane(planeType as any);
            if (planeResponse.success && planeResponse.data) {
                const planeId = planeResponse.data.plane_id;
                updateStatus(`Plane created. Creating sketch...`, 'info');
                const sketchResponse = await clientRef.current.createSketch(planeId);
                if (sketchResponse.success && sketchResponse.data) {
                    updateStatus(`Sketch ready — start drawing!`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to create new sketch:', error);
            updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handleAIMessage = useCallback((message: string) => {
        handleChatMessage(message);
        setIsChatOpen(true);
        setUnreadMessages(0);
    }, [handleChatMessage]);

    // Initialize the CAD application
    useEffect(() => {
        const initialize = async () => {
            try {
                if (!viewportRef.current) return;

                updateStatus('Setting up 3D viewport...', 'info');
                const renderer = new CADRenderer(viewportRef.current);
                renderer.onObjectSelected = handleSelection;
                renderer.onChamferRequested = handleInteractiveChamfer;
                renderer.onFilletRequested = handleInteractiveFillet;
                rendererRef.current = renderer;

                updateStatus('Connecting to CAD server...', 'info');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const client = new CADClient(apiUrl, sessionId);

                client.onGeometryUpdate((meshData: MeshData) => {
                    const modelId = `model-${Date.now()}`;
                    renderer.updateGeometry(modelId, meshData);
                    const shape: CreatedShape = {
                        id: modelId,
                        type: 'CAD Model',
                        dimensions: { vertices: meshData.metadata.vertex_count, faces: meshData.metadata.face_count },
                        visible: true
                    };
                    setCreatedShapes(prev => [...prev, shape]);
                });

                client.onPlaneVisualization((data) => {
                    renderer.addPlaneVisualization(data);
                    if (data.plane_id && data.plane_type) {
                        const plane: CreatedPlane = {
                            plane_id: data.plane_id,
                            plane_type: data.plane_type,
                            origin: data.origin || [0, 0, 0]
                        };
                        setCreatedPlanes(prev => {
                            const exists = prev.some(p => p.plane_id === plane.plane_id);
                            return exists ? prev : [...prev, plane];
                        });
                    }
                });

                client.onSketchVisualization((data) => {
                    renderer.addSketchVisualization(data);
                    renderer.setActiveSketchPlane(data.sketch_id, data);
                    setActiveSketchId(data.sketch_id);
                    renderer.viewTop();
                    updateStatus('Switched to top-down view for sketch', 'info');

                    if (data.sketch_id && data.plane_id) {
                        const sketch: CreatedSketch = {
                            sketch_id: data.sketch_id,
                            plane_id: data.plane_id,
                            elements: [],
                            visualization_data: data
                        };
                        setCreatedSketches(prev => {
                            const exists = prev.some(s => s.sketch_id === sketch.sketch_id);
                            return exists ? prev : [...prev, sketch];
                        });
                    }
                });

                client.onElementVisualization((data) => {
                    renderer.addSketchElementVisualization(data);

                    if (data.element_id && data.sketch_id && data.element_type) {
                        setCreatedSketches(prev => prev.map(sketch =>
                            sketch.sketch_id === data.sketch_id
                                ? {
                                    ...sketch,
                                    elements: (() => {
                                        const existingElementIndex = sketch.elements.findIndex(e => e.id === data.element_id);

                                        if (existingElementIndex >= 0) {
                                            const updated = [...sketch.elements];
                                            const existingElement = updated[existingElementIndex];
                                            const hasSignificantChanges = (
                                                existingElement.type !== data.element_type ||
                                                existingElement.is_container_only !== data.is_container_only
                                            );
                                            if (hasSignificantChanges) {
                                                updated[existingElementIndex] = {
                                                    ...existingElement,
                                                    type: data.element_type,
                                                    is_container_only: data.is_container_only,
                                                    parent_id: existingElement.parent_id || undefined,
                                                    child_ids: existingElement.child_ids || undefined
                                                };
                                            }
                                            return updated;
                                        } else {
                                            const newElement: SketchElementInfo = {
                                                id: data.element_id,
                                                type: data.element_type,
                                                is_container_only: data.is_container_only
                                            };

                                            if (data.is_composite && data.child_elements) {
                                                newElement.child_ids = data.child_elements.map(child => child.element_id);
                                                const updatedElements = [...sketch.elements, newElement];
                                                const childElements: SketchElementInfo[] = data.child_elements.map(child => ({
                                                    id: child.element_id,
                                                    type: child.visualization_data.element_type,
                                                    parent_id: data.element_id
                                                }));
                                                updatedElements.push(...childElements);
                                                return updatedElements;
                                            } else {
                                                if ((data.element_type === 'line') &&
                                                    (data.element_id.includes('chamfer_') || data.element_id.includes('fillet_'))) {
                                                    const containerIds = sketch.elements
                                                        .filter(el => el.is_container_only)
                                                        .map(el => el.id);
                                                    const parentContainerId = containerIds.find(containerId =>
                                                        sketch.elements.some(el =>
                                                            el.id.startsWith(containerId + '_line_')
                                                        )
                                                    );
                                                    if (parentContainerId) {
                                                        newElement.parent_id = parentContainerId;
                                                    }
                                                }
                                                return [...sketch.elements, newElement];
                                            }
                                        }
                                    })()
                                }
                                : sketch
                        ));
                    }
                });

                clientRef.current = client;

                updateStatus('Initializing Agent...', 'info');
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const apiBase = process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
                const apiHost = new URL(apiBase).host;
                const agentServerUrl = `${wsProtocol}//${apiHost}/ws`;
                const agent = new AgentManager(agentServerUrl, sessionId);

                agent.onMessage((message) => {
                    if (message.type === 'agent_message' && message.data && message.data.content) {
                        setChatMessages(prev => [...prev, { sender: 'agent', text: message.data.content }]);
                        setUnreadMessages(prev => prev + 1);
                    }

                    if (message.type === 'geometry_update' && message.data) {
                        updateStatus('Agent created 3D geometry', 'success');
                        if (clientRef.current?.geometryUpdateCallback) {
                            clientRef.current.geometryUpdateCallback(message.data);
                        }
                    }

                    if (message.type === 'visualization_data' && message.payload) {
                        updateStatus('Agent created visualization', 'info');
                        if (clientRef.current) {
                            clientRef.current.handleVisualizationData(message.payload);
                        }
                    }
                });

                agentRef.current = agent;
                await testServerConnection();
                updateStatus('CAD Engine ready!', 'success');

            } catch (error) {
                console.error('Failed to initialize CAD application:', error);
                updateStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            }
        };

        const testServerConnection = async () => {
            try {
                const healthUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const healthResponse = await fetch(`${healthUrl}/api/v1/health`);
                if (healthResponse.ok) {
                    setIsConnected(true);
                } else {
                    throw new Error(`Server health check failed: ${healthResponse.status}`);
                }
            } catch (error) {
                console.warn('Server connection test failed:', error);
                setIsConnected(false);
                updateStatus('Server offline - running in demo mode', 'warning');
            }
        };

        initialize();

        return () => {
            if (rendererRef.current) rendererRef.current.dispose();
            if (clientRef.current) clientRef.current.dispose();
            if (agentRef.current) agentRef.current.dispose();
        };
    }, [sessionId, updateStatus]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (rendererRef.current) {
                rendererRef.current.handleResize();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Keyboard shortcut system — instant "game feel"
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't handle shortcuts when palette is open (except Escape)
            if (isPaletteOpen && event.key !== 'Escape') return;

            // Don't handle when typing in an input
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Ctrl/Cmd combos: only undo/redo
            if (event.ctrlKey || event.metaKey) {
                if (event.key === 'z' && event.shiftKey) {
                    event.preventDefault();
                    updateStatus('Redo (not yet implemented)', 'info');
                    return;
                }
                if (event.key === 'z') {
                    event.preventDefault();
                    updateStatus('Undo (not yet implemented)', 'info');
                    return;
                }
                return;
            }

            switch (event.key) {
                // Navigation
                case ' ':
                    event.preventDefault();
                    setIsPaletteOpen(true);
                    setShowWelcome(false);
                    break;
                case 'Escape':
                    event.preventDefault();
                    if (isPaletteOpen) {
                        setIsPaletteOpen(false);
                    } else if (isSceneTreeOpen) {
                        setIsSceneTreeOpen(false);
                    } else if (activeSketchId) {
                        exitSketchMode();
                    } else if (currentDrawingTool !== 'select') {
                        handleSetDrawingTool('select');
                    } else {
                        handleSelection(null, null);
                    }
                    break;
                case 'Tab':
                    event.preventDefault();
                    setIsSceneTreeOpen(prev => !prev);
                    setShowWelcome(false);
                    break;

                // Tools — Creation (instant, single key)
                case 'v': case 'V':
                    handleSetDrawingTool('select');
                    break;
                case 'l': case 'L':
                    handleSetDrawingTool('line');
                    break;
                case 'c': case 'C':
                    handleSetDrawingTool('circle');
                    break;
                case 'r': case 'R':
                    handleSetDrawingTool('rectangle');
                    break;
                case 'a': case 'A':
                    handleSetDrawingTool('arc');
                    break;
                case 'p': case 'P':
                    handleSetDrawingTool('polygon');
                    break;

                // Tools — Modification
                case 'f': case 'F':
                    handleSetDrawingTool('fillet');
                    break;
                case 'h': case 'H':
                    handleSetDrawingTool('chamfer');
                    break;
                case 't': case 'T':
                    handleSetDrawingTool('trim');
                    break;

                // 3D Operations
                case 'e': case 'E':
                    event.preventDefault();
                    setIsPaletteOpen(true);
                    setShowWelcome(false);
                    break;
                case 'x': case 'X':
                    handleDeleteSelected();
                    break;

                // Camera views (no modifier)
                case '1':
                    if (rendererRef.current) {
                        rendererRef.current.viewFront();
                    }
                    break;
                case '2':
                    if (rendererRef.current) {
                        rendererRef.current.viewTop();
                    }
                    break;
                case '3':
                    if (rendererRef.current) {
                        rendererRef.current.viewRight();
                    }
                    break;
                case '0':
                    if (rendererRef.current) {
                        rendererRef.current.viewIsometric();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isPaletteOpen, isSceneTreeOpen, activeSketchId, currentDrawingTool, handleSetDrawingTool, handleDeleteSelected, handleSelection, exitSketchMode, updateStatus]);

    return (
        <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: '#12141C' }}>
            {/* Full-screen 3D Viewport */}
            <div
                ref={viewportRef}
                className="w-full h-full relative"
            >
                {/* Sketch Mode Indicator */}
                {activeSketchId && (
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                        <div
                            className="px-3 py-1 rounded-md text-xs font-medium shadow-md backdrop-blur-sm"
                            style={{ backgroundColor: 'rgba(212, 160, 23, 0.2)', color: '#D4A017', border: '1px solid rgba(212, 160, 23, 0.3)' }}
                        >
                            Editing Sketch
                        </div>
                        <button
                            onClick={exitSketchMode}
                            className="px-3 py-1 rounded-md text-xs font-medium shadow-md transition-colors backdrop-blur-sm"
                            style={{ backgroundColor: 'rgba(26, 29, 39, 0.8)', color: '#C8BDA0', border: '1px solid #2A2D3A' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(34, 37, 47, 0.9)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(26, 29, 39, 0.8)'; }}
                        >
                            Exit Sketch
                        </button>
                    </div>
                )}

                {/* Welcome Overlay — first-time experience */}
                {showWelcome && (
                    <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />
                )}

                {/* Bottom HUD — tool pill, key hints, builder button */}
                <BottomHud
                    currentTool={currentDrawingTool}
                    isConnected={isConnected}
                    onBuilderClick={openChat}
                    isChatOpen={isChatOpen}
                    unreadMessages={unreadMessages}
                />

                {/* Floating Chat Panel */}
                {isChatOpen && (
                    <div
                        className="absolute bottom-4 right-4 z-20 w-[360px] h-[420px] rounded-lg shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
                        style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                    >
                        <ChatPanel
                            messages={chatMessages}
                            onSendMessage={handleChatMessage}
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                )}
            </div>

            {/* Scene Tree Overlay — left edge, toggled by Tab */}
            <UIManager
                isOpen={isSceneTreeOpen}
                createdPlanes={createdPlanes}
                createdSketches={createdSketches}
                createdShapes={createdShapes}
                selectedObject={selectedObject}
                onSelection={handleSelection}
            />

            {/* Command Palette — centered, toggled by Space */}
            <CommandPalette
                isOpen={isPaletteOpen}
                onClose={() => setIsPaletteOpen(false)}
                onSetDrawingTool={handleSetDrawingTool}
                onExtrude={handlePaletteExtrude}
                onCreatePlane={handlePaletteCreatePlane}
                onCreateSketch={handlePaletteCreateSketch}
                onNewSketch={handleNewSketch}
                onSetView={handlePaletteSetView}
                onSetUnit={setCurrentUnit}
                onSendAIMessage={handleAIMessage}
                currentTool={currentDrawingTool}
                currentUnit={currentUnit}
                activeSketchId={activeSketchId}
                availablePlanes={createdPlanes}
                availableSketches={createdSketches}
                onSetActiveSketch={handleSetActiveSketch}
                onDeleteSelected={handleDeleteSelected}
            />
        </div>
    );
}
