'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CADRenderer } from '@/lib/cad/renderer/cad-renderer';
import { CADClient } from '@/lib/cad/api/cad-client';
import { AgentManager } from '@/lib/cad/agent/agent-manager';
import { UIManager } from '@/components/ui-manager';
import { ChatPanel } from '@/components/chat-panel';
import { ControlsPanel } from '@/components/controls-panel';
import { StatusBar } from '@/components/status-bar';
import { MeshData } from '../../../shared/types/geometry';
import { DrawingTool } from '@/lib/cad/controls/cad-controls';
import { v4 as uuidv4 } from 'uuid';

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
}

interface CreatedSketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElementInfo[];
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

    const clearRenderer = useCallback(() => {
        if (rendererRef.current) {
            rendererRef.current.clearAllGeometry();
        }
    }, []);

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
            // We need the sketch visualization data to set the plane
            // For now, we'll just mark it as active
            updateStatus(`Set active sketch: ${sketchId}`, 'info');
            console.log('📝 Found sketch in state:', sketch);
        } else {
            console.log('❌ Sketch not found in state or no renderer');
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
                rendererRef.current = renderer;

                // Initialize CAD client
                updateStatus('Connecting to CAD server...', 'info');
                const client = new CADClient('http://localhost:3000', sessionId);
                
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
                    console.log('Received sketch visualization:', data);
                    renderer.addSketchVisualization(data);
                    
                    // Set this sketch as the active sketch plane for interactive drawing
                    renderer.setActiveSketchPlane(data.sketch_id, data);
                    
                    // Auto-select the newly created sketch as active
                    console.log('🎯 Setting activeSketchId to:', data.sketch_id);
                    setActiveSketchId(data.sketch_id);
                    
                    // Automatically switch to top-down view for sketch creation
                    renderer.viewTop();
                    updateStatus('Switched to top-down view for sketch', 'info');
                    
                    // Update frontend state for agent-created sketches
                    if (data.sketch_id && data.plane_id) {
                        const sketch: CreatedSketch = {
                            sketch_id: data.sketch_id,
                            plane_id: data.plane_id,
                            elements: []
                        };
                        setCreatedSketches(prev => {
                            const exists = prev.some(s => s.sketch_id === sketch.sketch_id);
                            if (!exists) {
                                console.log('📝 Adding new sketch to state:', sketch);
                                return [...prev, sketch];
                            }
                            console.log('📝 Sketch already exists in state');
                            return prev;
                        });
                    }
                });
                
                client.onElementVisualization((data) => {
                    console.log('Received element visualization:', data);
                    renderer.addSketchElementVisualization(data);
                    
                    // Update frontend state for agent-created elements
                    if (data.element_id && data.sketch_id && data.element_type) {
                        setCreatedSketches(prev => prev.map(sketch => 
                            sketch.sketch_id === data.sketch_id
                                ? {
                                    ...sketch,
                                    elements: sketch.elements.some(e => e.id === data.element_id)
                                        ? sketch.elements
                                        : [...sketch.elements, { id: data.element_id, type: data.element_type }]
                                }
                                : sketch
                        ));
                    }
                });
                
                clientRef.current = client;

                // Initialize Agent
                updateStatus('Initializing Agent...', 'info');
                const agentServerUrl = `ws://${window.location.hostname}:3000/ws`;
                const agent = new AgentManager(agentServerUrl, sessionId);
                
                agent.onMessage((message) => {
                    console.log('🤖 Agent message received:', message);
                    
                    if (message.type === 'agent_message' && message.data && message.data.content) {
                        setChatMessages(prev => [...prev, { sender: 'agent', text: message.data.content }]);
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
                const healthResponse = await fetch('http://localhost:3000/api/v1/health');
                
                if (healthResponse.ok) {
                    console.log('✅ Server connection successful');
                } else {
                    throw new Error(`Server health check failed: ${healthResponse.status}`);
                }
            } catch (error) {
                console.warn('⚠️  Server connection test failed:', error);
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
        <div className="flex h-screen w-screen bg-gray-100">
            {/* Left Sidebar */}
            <div className="w-[350px] bg-white border-r border-gray-300 shadow-lg flex flex-col">
                <ControlsPanel 
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
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <div 
                    ref={viewportRef} 
                    className={`flex-1 relative bg-white transition-all duration-300 ${
                        activeSketchId 
                            ? 'border-4 border-blue-400 shadow-lg shadow-blue-200' 
                            : 'border border-gray-200'
                    }`}
                >
                    {/* The 3D viewport will be mounted here */}
                    {activeSketchId && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium shadow-md z-10">
                            ✏️ Editing Sketch: {activeSketchId}
                        </div>
                    )}
                </div>
                <StatusBar status={status} />
            </div>

            {/* Right Sidebar */}
            <div className="w-[350px] bg-white border-l border-gray-300 shadow-lg flex flex-col h-0">
                {/* Scene Tree */}
                <div className="flex-1">
                    <UIManager 
                        createdPlanes={createdPlanes}
                        createdSketches={createdSketches}
                        createdShapes={createdShapes}
                        selectedObject={selectedObject}
                        onSelection={handleSelection}
                    />
                </div>
                
                {/* Spacer */}
                <div className="h-2 bg-gray-100 border-t border-b border-gray-300"></div>

                {/* Agent Chat */}
                <div className="flex-1">
                    <ChatPanel messages={chatMessages} onSendMessage={handleChatMessage} />
                </div>
            </div>
        </div>
    );
} 