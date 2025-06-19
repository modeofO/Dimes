'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CADRenderer } from '@/lib/cad/renderer/cad-renderer';
import { CADClient } from '@/lib/cad/api/cad-client';
import { AgentManager } from '@/lib/cad/agent/agent-manager';
import { UIManager } from '@/components/ui-manager';
import { ChatPanel } from '@/components/chat-panel';
import { ControlsPanel } from '@/components/controls-panel';
import { StatusBar } from '@/components/status-bar';
import { MeshData } from '../../../shared/types/geometry';
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
                    console.log('Received geometry update:', meshData);
                    renderer.updateGeometry('current-model', meshData);
                });
                
                // Set up visualization callbacks
                client.onPlaneVisualization((data) => {
                    console.log('Received plane visualization:', data);
                    renderer.addPlaneVisualization(data);
                });
                
                client.onSketchVisualization((data) => {
                    console.log('Received sketch visualization:', data);
                    renderer.addSketchVisualization(data);
                });
                
                client.onElementVisualization((data) => {
                    console.log('Received element visualization:', data);
                    renderer.addSketchElementVisualization(data);
                });
                
                clientRef.current = client;

                // Initialize Agent
                updateStatus('Initializing Agent...', 'info');
                const agentServerUrl = `ws://${window.location.hostname}:3000/ws`;
                const agent = new AgentManager(agentServerUrl);
                
                agent.onMessage((message) => {
                    if (message.type === 'agent_message' && message.data && message.data.content) {
                        setChatMessages(prev => [...prev, { sender: 'agent', text: message.data.content }]);
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
        <div className="flex h-screen bg-gray-100">
            {/* Left Panel - Controls */}
            <div className="w-80 bg-white border-r border-gray-300 overflow-y-auto">
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
                    renderer={rendererRef.current}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* 3D Viewport */}
                <div className="flex-1 relative">
                    <div 
                        ref={viewportRef}
                        className="w-full h-full"
                        style={{ background: '#f0f0f0' }}
                    />
                </div>

                {/* Status Bar */}
                <StatusBar status={status} />
            </div>

            {/* Right Panel - Scene Tree and Chat */}
            <div className="w-80 bg-white border-l border-gray-300 flex flex-col">
                {/* Scene Tree */}
                <div className="flex-1 border-b border-gray-300">
                    <UIManager 
                        createdPlanes={createdPlanes}
                        createdSketches={createdSketches}
                        createdShapes={createdShapes}
                        selectedObject={selectedObject}
                        onSelection={handleSelection}
                    />
                </div>

                {/* Chat Panel */}
                <div className="h-80">
                    <ChatPanel 
                        messages={chatMessages}
                        onSendMessage={handleChatMessage}
                    />
                </div>
            </div>
        </div>
    );
} 