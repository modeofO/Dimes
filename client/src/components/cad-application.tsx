'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CADRenderer } from '@/lib/cad/renderer/cad-renderer';
import { CADClient } from '@/lib/cad/api/cad-client';
import { AgentManager } from '@/lib/cad/agent/agent-manager';
import { UIManager } from '@/components/ui-manager';
import { ChatPanel } from '@/components/chat-panel';
import { ControlsPanel } from '@/components/controls-panel';
import { StatusIndicator } from '@/components/status-bar';
import { MeshData, SketchVisualizationData } from '@/types/geometry';
import { DrawingTool } from '@/lib/cad/controls/cad-controls';
import { v4 as uuidv4 } from 'uuid';
import { TopToolbar } from '@/components/top-toolbar';
import { Unit } from '@/lib/utils/units';


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
    is_container_only?: boolean;  // For composite shapes that are logical containers only
    parent_id?: string;  // ID of parent element (if this is a child)
    child_ids?: string[];  // IDs of child elements (if this is a parent)
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

    // Debug: Track activeSketchId changes
    useEffect(() => {
        console.log('🔄 activeSketchId state changed to:', activeSketchId);
    }, [activeSketchId]);

    const updateStatus = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
        setStatus({ message, type });
        console.log(`[${type.toUpperCase()}] ${message}`);
    }, []);

    const handleSelection = useCallback((id: string | null, type: string | null) => {
        setSelectedObject(prevSelected => {
            // Avoid unnecessary updates if same object is selected
            if (prevSelected?.id === id) return prevSelected;
            
            console.log(`Selection handled: id=${id}, type=${type}`);
            
            // Update renderer highlight
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

    const clearRenderer = useCallback(() => {
        if (rendererRef.current) {
            rendererRef.current.clearAllGeometry();
        }
    }, []);

    const exitSketchMode = useCallback(() => {
        console.log('🚪 Exiting sketch editing mode');
        setActiveSketchId(null);
        
        if (rendererRef.current) {
            // Clear the active sketch highlight
            rendererRef.current.clearActiveSketchHighlight();
            // Reset to isometric view
            rendererRef.current.viewIsometric();
        }
        
        updateStatus('Exited sketch editing mode', 'info');
    }, [updateStatus]);

    const handleInteractiveChamfer = useCallback(async (sketchId: string, line1Id: string, line2Id: string) => {
        if (!clientRef.current) return;
        
        try {
            // Prompt user for chamfer distance
            const distanceStr = prompt('Enter chamfer distance:', '1');
            if (!distanceStr) return; // User cancelled
            
            const distance = parseFloat(distanceStr);
            if (isNaN(distance) || distance <= 0) {
                updateStatus('❌ Invalid chamfer distance', 'error');
                return;
            }
            
            updateStatus(`Creating chamfer between lines (distance: ${distance})...`, 'info');
            
            const response = await clientRef.current.addChamferToSketch(sketchId, line1Id, line2Id, distance);
            
            if (response.success) {
                updateStatus(`✅ Created chamfer with distance ${distance}`, 'success');
            } else {
                updateStatus('❌ Failed to create chamfer', 'error');
            }
        } catch (error) {
            console.error('Interactive chamfer failed:', error);
            updateStatus(`❌ Chamfer error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handleInteractiveFillet = useCallback(async (sketchId: string, line1Id: string, line2Id: string) => {
        if (!clientRef.current) return;
        
        try {
            // Prompt user for fillet radius
            const radiusStr = prompt('Enter fillet radius:', '1');
            if (!radiusStr) return; // User cancelled
            
            const radius = parseFloat(radiusStr);
            if (isNaN(radius) || radius <= 0) {
                updateStatus('❌ Invalid fillet radius', 'error');
                return;
            }
            
            updateStatus(`Creating fillet between lines (radius: ${radius})...`, 'info');
            
            const response = await clientRef.current.addFilletToSketch(sketchId, line1Id, line2Id, radius);
            
            if (response.success) {
                updateStatus(`✅ Created fillet with radius ${radius}`, 'success');
            } else {
                updateStatus('❌ Failed to create fillet', 'error');
            }
        } catch (error) {
            console.error('Interactive fillet failed:', error);
            updateStatus(`❌ Fillet error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [updateStatus]);

    const handleSetDrawingTool = useCallback((tool: DrawingTool) => {
        setCurrentDrawingTool(tool);
        if (rendererRef.current) {
            rendererRef.current.setDrawingTool(tool);
            // For arc tool, also set the current arc type
            if (tool === 'arc') {
                rendererRef.current.setArcType(currentArcType);
            }
            // For polygon tool, also set the current polygon sides
            if (tool === 'polygon') {
                rendererRef.current.setPolygonSides(currentPolygonSides);
            }
        }
        updateStatus(`Selected tool: ${tool}`, 'info');
    }, [updateStatus, currentArcType]);

    const handleSetActiveSketch = useCallback((sketchId: string) => {
        console.log('🎯 handleSetActiveSketch called with:', sketchId);
        setActiveSketchId(sketchId);
        
        // Find the sketch and set it as active in the renderer
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (sketch && rendererRef.current) {
            console.log('📝 Found sketch in state:', sketch);
            
            // Configure the renderer for interactive drawing if we have visualization data
            if (sketch.visualization_data) {
                console.log('🎯 Setting up renderer for interactive drawing on sketch:', sketchId);
                rendererRef.current.setActiveSketchPlane(sketchId, sketch.visualization_data);
                rendererRef.current.viewTop();
                updateStatus(`Set active sketch: ${sketchId} (ready for drawing)`, 'success');
            } else {
                console.log('⚠️ No visualization data available for sketch:', sketchId);
                updateStatus(`Set active sketch: ${sketchId} (limited functionality)`, 'warning');
            }
        } else {
            console.log('❌ Sketch not found in state or no renderer');
            updateStatus('❌ Sketch not found', 'error');
        }
    }, [createdSketches, updateStatus]);

    const handleSetArcType = useCallback((arcType: 'three_points' | 'endpoints_radius') => {
        setCurrentArcType(arcType);
        if (rendererRef.current) {
            rendererRef.current.setArcType(arcType);
        }
        updateStatus(`Set arc type: ${arcType}`, 'info');
    }, [updateStatus]);

    const handleSetPolygonSides = useCallback((sides: number) => {
        setCurrentPolygonSides(sides);
        if (rendererRef.current) {
            rendererRef.current.setPolygonSides(sides);
        }
        updateStatus(`Set polygon sides: ${sides}`, 'info');
    }, [updateStatus]);

    const handleInteractiveDrawing = useCallback(async (tool: DrawingTool, points: THREE.Vector2[], arcType?: 'three_points' | 'endpoints_radius') => {
        // Get the current activeSketchId from state at call time (not closure time)
        const currentActiveSketchId = activeSketchId;
        
        console.log('🎯 handleInteractiveDrawing called:', {
            tool,
            points,
            arcType,
            currentActiveSketchId,
            clientExists: !!clientRef.current,
            pointsLength: points.length,
            expectedArcType: currentArcType
        });
        
        if (!clientRef.current || !currentActiveSketchId) {
            console.log('❌ handleInteractiveDrawing: Missing requirements', {
                client: !!clientRef.current,
                currentActiveSketchId,
                pointsLength: points.length
            });
            return;
        }
        
        // Validate points based on tool and arc type
        const requiredPoints = (tool === 'arc' && arcType === 'three_points') ? 3 : 2;
        if (points.length < requiredPoints) {
            console.log('❌ handleInteractiveDrawing: Insufficient points', {
                required: requiredPoints,
                actual: points.length
            });
            return;
        }
        
        try {
            const [start, end] = points;
            console.log('🔧 Drawing coordinates:', { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } });
            
            let response;
            
            switch (tool) {
                case 'line':
                    console.log('📏 Creating line via API...');
                    response = await clientRef.current.addLineToSketch(
                        currentActiveSketchId, start.x, start.y, end.x, end.y
                    );
                    break;
                case 'circle':
                    const radius = start.distanceTo(end);
                    console.log('⭕ Creating circle via API with radius:', radius);
                    response = await clientRef.current.addCircleToSketch(
                        currentActiveSketchId, start.x, start.y, radius
                    );
                    break;
                case 'rectangle':
                    const width = Math.abs(end.x - start.x);
                    const height = Math.abs(end.y - start.y);
                    console.log('📐 Creating rectangle via API:', { width, height });
                    response = await clientRef.current.addRectangleToSketch(
                        currentActiveSketchId, [Math.min(start.x, end.x), Math.min(start.y, end.y)], width, height
                    );
                    break;
                case 'arc':
                    if (arcType === 'three_points') {
                        if (points.length >= 3) {
                            const [p1, p2, p3] = points;
                            console.log('🌙 Creating three-point arc via API');
                            response = await clientRef.current.addArcToSketch(
                                currentActiveSketchId, {
                                    arc_type: 'three_points',
                                    x1: p1.x,
                                    y1: p1.y,
                                    x_mid: p2.x,
                                    y_mid: p2.y,
                                    x2: p3.x,
                                    y2: p3.y
                                }
                            );
                        } else {
                            console.log('❌ Three-point arc requires 3 points, got:', points.length);
                            return;
                        }
                    } else if (arcType === 'endpoints_radius') {
                        if (points.length >= 2) {
                            // endpoints_radius arc - prompt for radius
                            const radius = parseFloat(prompt('Enter arc radius:') || '5');
                            console.log('🌙 Creating endpoints-radius arc via API with radius:', radius);
                            response = await clientRef.current.addArcToSketch(
                                currentActiveSketchId, {
                                    arc_type: 'endpoints_radius',
                                    x1: points[0].x,
                                    y1: points[0].y,
                                    x2: points[1].x,
                                    y2: points[1].y,
                                    radius: radius
                                }
                            );
                        } else {
                            console.log('❌ Endpoints-radius arc requires 2 points, got:', points.length);
                            return;
                        }
                    } else {
                        console.log('❌ Unknown arc type:', arcType);
                        return;
                    }
                    break;
                case 'polygon':
                    const polygonRadius = start.distanceTo(end);
                    console.log('⬡ Creating polygon via API:', { center_x: start.x, center_y: start.y, sides: currentPolygonSides, radius: polygonRadius });
                    response = await clientRef.current.addPolygonToSketch(
                        currentActiveSketchId, start.x, start.y, currentPolygonSides, polygonRadius
                    );
                    break;
                case 'fillet':
                case 'chamfer':
                case 'trim':
                case 'extend':
                case 'mirror':
                case 'offset':
                case 'copy':
                case 'move':
                    updateStatus(`Please use the controls panel for ${tool} operations - select elements first`, 'info');
                    return;
                default:
                    updateStatus(`Interactive ${tool} not yet implemented`, 'warning');
                    return;
            }
            
            console.log('📨 API response:', response);
            
            if (response?.success) {
                updateStatus(`✅ Created ${tool} interactively`, 'success');
            }
        } catch (error) {
            console.error('Interactive drawing error:', error);
            updateStatus(`❌ Error creating ${tool}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [activeSketchId, updateStatus, currentPolygonSides, currentArcType]);

    // Update the renderer's drawing callback whenever the handler changes
    useEffect(() => {
        if (rendererRef.current) {
            console.log('🔄 Updating renderer onDrawingComplete callback');
            rendererRef.current.onDrawingComplete = handleInteractiveDrawing;
        }
    }, [handleInteractiveDrawing]);

    // Initialize the CAD application
    useEffect(() => {
        const initialize = async () => {
            try {
                if (!viewportRef.current) return;

                // Initialize Three.js renderer
                updateStatus('Setting up 3D viewport...', 'info');
                const renderer = new CADRenderer(viewportRef.current);
                renderer.onObjectSelected = handleSelection;
                
                // Set up interactive chamfer/fillet callbacks
                renderer.onChamferRequested = handleInteractiveChamfer;
                renderer.onFilletRequested = handleInteractiveFillet;
                
                rendererRef.current = renderer;

                // Initialize CAD client
                updateStatus('Connecting to CAD server...', 'info');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const client = new CADClient(apiUrl, sessionId);
                
                // Set up geometry update callback
                client.onGeometryUpdate((meshData: MeshData) => {
                    console.log('📦 Received geometry update from CAD operations:', meshData);
                    
                    // Generate a unique ID for the model
                    const modelId = `model-${Date.now()}`;
                    renderer.updateGeometry(modelId, meshData);
                    
                    // Add to shapes state for 3D objects
                    const shape: CreatedShape = {
                        id: modelId,
                        type: 'CAD Model',
                        dimensions: { vertices: meshData.metadata.vertex_count, faces: meshData.metadata.face_count },
                        visible: true
                    };
                    setCreatedShapes(prev => [...prev, shape]);
                });
                
                // Set up visualization callbacks
                client.onPlaneVisualization((data) => {
                    console.log('Received plane visualization:', data);
                    renderer.addPlaneVisualization(data);
                    
                    // Update frontend state for agent-created planes
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
                    console.log('🎯 Received sketch visualization (CALLBACK TRIGGERED):', data);
                    console.log('📊 Sketch visualization data structure:', {
                        hasSketchId: !!data.sketch_id,
                        hasPlaneId: !!data.plane_id,
                        hasOrigin: !!data.origin,
                        hasNormal: !!data.normal,
                        dataKeys: Object.keys(data)
                    });
                    
                    renderer.addSketchVisualization(data);
                    
                    // Set this sketch as the active sketch plane for interactive drawing
                    console.log('🎯 Setting active sketch plane in renderer...');
                    renderer.setActiveSketchPlane(data.sketch_id, data);
                    
                    // Auto-select the newly created sketch as active
                    console.log('🎯 Setting activeSketchId state to:', data.sketch_id);
                    setActiveSketchId(data.sketch_id);
                    
                    // Automatically switch to top-down view for sketch creation
                    console.log('📐 Switching to top-down view...');
                    renderer.viewTop();
                    updateStatus('Switched to top-down view for sketch', 'info');
                    
                    // Update frontend state for agent-created sketches
                    if (data.sketch_id && data.plane_id) {
                        const sketch: CreatedSketch = {
                            sketch_id: data.sketch_id,
                            plane_id: data.plane_id,
                            elements: [],
                            visualization_data: data
                        };
                        setCreatedSketches(prev => {
                            const exists = prev.some(s => s.sketch_id === sketch.sketch_id);
                            if (!exists) {
                                console.log('📝 Adding new sketch to state with visualization data:', sketch);
                                return [...prev, sketch];
                            }
                            console.log('📝 Sketch already exists in state');
                            return prev;
                        });
                    }
                    
                    console.log('✅ Sketch visualization callback completed successfully');
                });
                
                client.onElementVisualization((data) => {
                    console.log('🔍 Received element visualization:', data);
                    console.log('🔍 Element processing details:', {
                        element_id: data.element_id,
                        element_type: data.element_type,
                        is_container_only: data.is_container_only,
                        is_composite: data.is_composite,
                        has_child_elements: !!data.child_elements,
                        child_count: data.child_elements?.length || 0
                    });
                    renderer.addSketchElementVisualization(data);
                    
                    // Update frontend state for agent-created elements
                    if (data.element_id && data.sketch_id && data.element_type) {
                        setCreatedSketches(prev => prev.map(sketch => 
                            sketch.sketch_id === data.sketch_id
                                ? {
                                    ...sketch,
                                    elements: (() => {
                                        // Check if this element already exists
                                        const existingElementIndex = sketch.elements.findIndex(e => e.id === data.element_id);
                                        
                                        if (existingElementIndex >= 0) {
                                            // Update existing element while preserving parent-child relationships
                                            const updated = [...sketch.elements];
                                            const existingElement = updated[existingElementIndex];
                                            
                                            // Only update if this is actually new information
                                            const hasSignificantChanges = (
                                                existingElement.type !== data.element_type ||
                                                existingElement.is_container_only !== data.is_container_only
                                            );
                                            
                                            if (hasSignificantChanges) {
                                                updated[existingElementIndex] = {
                                                    ...existingElement,
                                                    type: data.element_type,
                                                    is_container_only: data.is_container_only,
                                                    // Preserve existing parent_id and child_ids if they exist
                                                    parent_id: existingElement.parent_id || undefined,
                                                    child_ids: existingElement.child_ids || undefined
                                                };
                                                
                                                console.log('🔄 Updated existing element while preserving hierarchy:', {
                                                    id: data.element_id,
                                                    parent_id: updated[existingElementIndex].parent_id,
                                                    child_ids: updated[existingElementIndex].child_ids,
                                                    changes: { type: data.element_type, container: data.is_container_only }
                                                });
                                            } else {
                                                console.log('⏭️ Skipping redundant update for element:', data.element_id);
                                            }
                                            
                                            return updated;
                                        } else {
                                            // Add new element with hierarchy info
                                            const newElement: SketchElementInfo = {
                                                id: data.element_id,
                                                type: data.element_type,
                                                is_container_only: data.is_container_only
                                            };
                                            
                                            // Handle parent-child relationships for composite elements
                                            if (data.is_composite && data.child_elements) {
                                                console.log('🏗️ Processing composite element:', data.element_id, 'with', data.child_elements.length, 'children');
                                                
                                                // This is a parent element
                                                newElement.child_ids = data.child_elements.map(child => child.element_id);
                                                
                                                // Add the parent element first
                                                const updatedElements = [...sketch.elements, newElement];
                                                
                                                // Add all child elements and mark their parent
                                                const childElements: SketchElementInfo[] = data.child_elements.map(child => ({
                                                    id: child.element_id,
                                                    type: child.visualization_data.element_type,
                                                    parent_id: data.element_id
                                                }));
                                                
                                                // Add children to the elements array
                                                updatedElements.push(...childElements);
                                                
                                                console.log('📋 Added container + children to state:', {
                                                    container: newElement.id,
                                                    children: childElements.map(c => c.id),
                                                    totalElements: updatedElements.length
                                                });
                                                
                                                return updatedElements;
                                            } else {
                                                // Check if this is a chamfer/fillet that should be associated with a container
                                                if ((data.element_type === 'line') && 
                                                    (data.element_id.includes('chamfer_') || data.element_id.includes('fillet_'))) {
                                                    // Extract rectangle/polygon ID from existing elements
                                                    // Chamfers are created between lines like "rectangle_1_2663_line_bottom" and "rectangle_1_2663_line_right"
                                                    // So we look for any container that matches the pattern
                                                    const containerIds = sketch.elements
                                                        .filter(el => el.is_container_only)
                                                        .map(el => el.id);
                                                    
                                                    // Find a container ID that appears in the existing line elements
                                                    const parentContainerId = containerIds.find(containerId => 
                                                        sketch.elements.some(el => 
                                                            el.id.startsWith(containerId + '_line_')
                                                        )
                                                    );
                                                    
                                                    if (parentContainerId) {
                                                        newElement.parent_id = parentContainerId;
                                                        console.log('🔗 Associated chamfer/fillet', data.element_id, 'with container', parentContainerId);
                                                    } else {
                                                        console.log('❓ Could not find parent container for chamfer/fillet', data.element_id, 'available containers:', containerIds);
                                                    }
                                                }
                                                
                                                // Regular element or child being added individually
                                                console.log('📝 Added regular element to state:', {
                                                    id: newElement.id,
                                                    type: newElement.type,
                                                    is_container_only: newElement.is_container_only,
                                                    parent_id: newElement.parent_id
                                                });
                                                
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

                // Initialize Agent
                updateStatus('Initializing Agent...', 'info');
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const apiBase = process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
                const apiHost = new URL(apiBase).host;
                const agentServerUrl = `${wsProtocol}//${apiHost}/ws`;
                const agent = new AgentManager(agentServerUrl, sessionId);
                
                agent.onMessage((message) => {
                    console.log('🤖 Agent message received:', message);
                    
                    if (message.type === 'agent_message' && message.data && message.data.content) {
                        setChatMessages(prev => [...prev, { sender: 'agent', text: message.data.content }]);
                        // Track unread when chat is closed
                        setUnreadMessages(prev => prev + 1);
                    }
                    
                    // Forward CAD-related messages to CAD client for processing
                    if (message.type === 'geometry_update' && message.data) {
                        console.log('🎯 Forwarding geometry update to CAD client:', message.data);
                        updateStatus('🤖 Agent created 3D geometry', 'success');
                        if (clientRef.current?.geometryUpdateCallback) {
                            clientRef.current.geometryUpdateCallback(message.data);
                        }
                    }
                    
                    if (message.type === 'visualization_data' && message.payload) {
                        console.log('🎨 Forwarding visualization data to CAD client:', message.payload);
                        updateStatus('🤖 Agent created visualization', 'info');
                        if (clientRef.current) {
                            clientRef.current.handleVisualizationData(message.payload);
                        }
                    }
                });
                
                agentRef.current = agent;

                // Test server connection
                await testServerConnection();
                
                updateStatus('CAD Engine ready! 🎉', 'success');
                
            } catch (error) {
                console.error('Failed to initialize CAD application:', error);
                updateStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            }
        };

        const testServerConnection = async () => {
            try {
                console.log('Testing server connection...');
                const healthUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const healthResponse = await fetch(`${healthUrl}/api/v1/health`);

                if (healthResponse.ok) {
                    console.log('✅ Server connection successful');
                    setIsConnected(true);
                } else {
                    throw new Error(`Server health check failed: ${healthResponse.status}`);
                }
            } catch (error) {
                console.warn('⚠️  Server connection test failed:', error);
                setIsConnected(false);
                updateStatus('Server offline - running in demo mode', 'warning');
            }
        };

        initialize();

        // Cleanup function
        return () => {
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            if (clientRef.current) {
                clientRef.current.dispose();
            }
            if (agentRef.current) {
                agentRef.current.dispose();
            }
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

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && rendererRef.current) {
                switch (event.key.toLowerCase()) {
                    case '1':
                        event.preventDefault();
                        rendererRef.current.viewFront();
                        updateStatus('Front view', 'info');
                        break;
                    case '2':
                        event.preventDefault();
                        rendererRef.current.viewTop();
                        updateStatus('Top view', 'info');
                        break;
                    case '3':
                        event.preventDefault();
                        rendererRef.current.viewRight();
                        updateStatus('Right view', 'info');
                        break;
                    case '0':
                        event.preventDefault();
                        rendererRef.current.viewIsometric();
                        updateStatus('Isometric view', 'info');
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [updateStatus]);

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-900">
            {/* Top Toolbar */}
            <TopToolbar 
                client={clientRef.current}
                createdShapes={createdShapes}
                createdPlanes={createdPlanes}
                createdSketches={createdSketches}
                selectedObject={selectedObject}
                onUpdateShapes={setCreatedShapes}
                onUpdatePlanes={setCreatedPlanes}
                onUpdateSketches={setCreatedSketches}
                onUpdateStatus={updateStatus}
                onClearRenderer={clearRenderer}
                onSetDrawingTool={handleSetDrawingTool}
                onSetActiveSketch={handleSetActiveSketch}
                onSetArcType={handleSetArcType}
                onSetPolygonSides={handleSetPolygonSides}
                currentDrawingTool={currentDrawingTool}
                activeSketchId={activeSketchId}
                currentArcType={currentArcType}
                currentPolygonSides={currentPolygonSides}
                currentUnit={currentUnit}
                onUnitChange={setCurrentUnit}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Center Viewport */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div
                        ref={viewportRef}
                        className={`flex-1 relative bg-zinc-950 transition-all duration-300 ${
                            activeSketchId
                                ? 'border-4 border-blue-500 shadow-lg shadow-blue-500/20'
                                : 'border border-zinc-700'
                        }`}
                    >
                        {/* The 3D viewport will be mounted here */}
                        {activeSketchId && (
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                <div className="bg-blue-600/90 text-white px-3 py-1 rounded-md text-xs font-medium shadow-md backdrop-blur-sm">
                                    Editing Sketch
                                </div>
                                <button
                                    onClick={exitSketchMode}
                                    className="bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded-md text-xs font-medium shadow-md transition-colors backdrop-blur-sm"
                                    title="Exit sketch editing mode"
                                >
                                    Exit Sketch
                                </button>
                            </div>
                        )}

                        {/* Floating Chat Toggle */}
                        {!isChatOpen && (
                            <button
                                onClick={openChat}
                                className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-300 hover:text-white rounded-md text-xs font-medium shadow-lg shadow-black/30 transition-colors backdrop-blur-sm border border-zinc-600/50"
                                title="Open AI Builder chat"
                            >
                                Builder
                                {unreadMessages > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Floating Chat Panel */}
                        {isChatOpen && (
                            <div className="absolute bottom-4 right-4 z-20 w-[360px] h-[420px] bg-zinc-800 rounded-lg shadow-2xl shadow-black/50 border border-zinc-600/50 flex flex-col overflow-hidden">
                                <ChatPanel
                                    messages={chatMessages}
                                    onSendMessage={handleChatMessage}
                                    onClose={() => setIsChatOpen(false)}
                                />
                            </div>
                        )}

                        {/* Connection Status Indicator */}
                        <div className="absolute bottom-3 left-3 z-10">
                            <StatusIndicator connected={isConnected} />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar — Scene Tree only */}
                <div className="w-[280px] bg-zinc-800 border-l border-zinc-700 flex flex-col">
                    <UIManager
                        createdPlanes={createdPlanes}
                        createdSketches={createdSketches}
                        createdShapes={createdShapes}
                        selectedObject={selectedObject}
                        onSelection={handleSelection}
                    />
                </div>
            </div>
        </div>
    );
} 