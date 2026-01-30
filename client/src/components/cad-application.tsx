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

// Toast notification interface
interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

// Toast colors based on type
const TOAST_COLORS: Record<Toast['type'], { bg: string; border: string; text: string }> = {
    info: { bg: 'rgba(74, 158, 255, 0.15)', border: 'rgba(74, 158, 255, 0.4)', text: '#6AAFFF' },
    success: { bg: 'rgba(80, 200, 120, 0.15)', border: 'rgba(80, 200, 120, 0.4)', text: '#50C878' },
    warning: { bg: 'rgba(212, 160, 23, 0.15)', border: 'rgba(212, 160, 23, 0.4)', text: '#E8B520' },
    error: { bg: 'rgba(255, 107, 107, 0.15)', border: 'rgba(255, 107, 107, 0.4)', text: '#FF6B6B' },
};

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
    const [selectedObject, setSelectedObject] = useState<{ id: string; type: string; sketchId?: string } | null>(null);
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
    const [paletteExtrudeMode, setPaletteExtrudeMode] = useState(false);
    const [isSceneTreeOpen, setIsSceneTreeOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    // Toast notifications
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Current view for viewport controls
    const [currentView, setCurrentView] = useState<'front' | 'top' | 'right' | 'isometric'>('isometric');

    // Show toast notification - minimal, only for important messages
    const showToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now().toString();
        setToasts(prev => {
            // Limit to max 3 toasts, remove oldest if needed
            const newToasts = [...prev, { id, message, type }];
            return newToasts.slice(-3);
        });
        // Auto-dismiss after 2 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    }, []);

    const updateStatus = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
        setStatus({ message, type });
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Only show toasts for success and error - not info/warning spam
        if (type === 'success' || type === 'error') {
            showToast(message, type);
        }
    }, [showToast]);

    // Inline extrude state — shown immediately when a closed element is clicked outside sketch mode
    const [showInlineExtrude, setShowInlineExtrude] = useState(false);
    const [inlineExtrudeValue, setInlineExtrudeValue] = useState('10');
    const inlineExtrudeRef = useRef<HTMLInputElement>(null);

    // Inline fillet/chamfer state — shown when drawing a line across two sketch lines
    const [pendingFilletChamfer, setPendingFilletChamfer] = useState<{
        tool: 'fillet' | 'chamfer';
        sketchId: string;
        line1Id: string;
        line2Id: string;
    } | null>(null);
    const [inlineFilletValue, setInlineFilletValue] = useState('2');
    const inlineFilletRef = useRef<HTMLInputElement>(null);

    // Resolve a clicked element to its extrudable parent (if it's a child of a composite shape)
    const resolveExtrudableElement = useCallback((elementId: string, sketchId: string): SketchElementInfo | null => {
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (!sketch) return null;

        // Check if this element is directly extrudable
        const directMatch = sketch.elements.find(e => e.id === elementId);
        if (directMatch) {
            const isExtrudable = (directMatch.type === 'rectangle' || directMatch.type === 'circle' || directMatch.type === 'polygon');
            if (isExtrudable) return directMatch;

            // If it's a child, resolve to parent
            if (directMatch.parent_id) {
                const parent = sketch.elements.find(e => e.id === directMatch.parent_id);
                if (parent && (parent.type === 'rectangle' || parent.type === 'circle' || parent.type === 'polygon')) {
                    return parent;
                }
            }
        }
        return null;
    }, [createdSketches]);

    // Find sketch line elements that a drawn line segment intersects
    // Uses 2D line-line intersection in sketch plane coordinates
    const findIntersectingLines = useCallback((
        sketchId: string,
        drawStart: THREE.Vector2,
        drawEnd: THREE.Vector2
    ): string[] => {
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (!sketch || !rendererRef.current) return [];

        const intersectingIds: string[] = [];

        // Helper: check if two 2D line segments intersect
        const segmentsIntersect = (
            p1: THREE.Vector2, p2: THREE.Vector2,
            p3: THREE.Vector2, p4: THREE.Vector2
        ): boolean => {
            const d1 = (p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x);
            const d2 = (p4.x - p3.x) * (p2.y - p3.y) - (p4.y - p3.y) * (p2.x - p3.x);
            const d3 = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
            const d4 = (p2.x - p1.x) * (p4.y - p1.y) - (p2.y - p1.y) * (p4.x - p1.x);

            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
                return true;
            }
            return false;
        };

        // Get sketch plane info to convert 3D points to 2D
        const sketchVizData = sketch.visualization_data;
        if (!sketchVizData) return [];

        const origin = new THREE.Vector3(...sketchVizData.origin);
        const uAxis = new THREE.Vector3(...sketchVizData.u_axis);
        const vAxis = new THREE.Vector3(...sketchVizData.v_axis);

        // Convert 3D point to 2D sketch coordinates
        const worldTo2D = (worldPoint: THREE.Vector3): THREE.Vector2 => {
            const relative = worldPoint.clone().sub(origin);
            return new THREE.Vector2(relative.dot(uAxis), relative.dot(vAxis));
        };

        // Find all line elements in the sketch
        for (const element of sketch.elements) {
            // Only check line elements (including rectangle/polygon children which are lines)
            if (element.type !== 'line' && !element.id.includes('_line_')) continue;
            if (element.is_container_only) continue;

            // Find the Three.js object for this element
            const elementName = `element-${sketchId}-${element.id}`;
            const scene = rendererRef.current.getScene();
            const elementObject = scene.getObjectByName(elementName);

            if (!elementObject) continue;

            // Extract line geometry points
            let linePoints: THREE.Vector3[] = [];
            elementObject.traverse((child) => {
                if (child instanceof THREE.Line && child.geometry?.attributes?.position) {
                    const positions = child.geometry.attributes.position;
                    for (let i = 0; i < positions.count; i++) {
                        linePoints.push(new THREE.Vector3().fromBufferAttribute(positions, i));
                    }
                }
            });

            if (linePoints.length < 2) continue;

            // Convert to 2D and check intersection
            const line2DStart = worldTo2D(linePoints[0]);
            const line2DEnd = worldTo2D(linePoints[linePoints.length - 1]);

            if (segmentsIntersect(drawStart, drawEnd, line2DStart, line2DEnd)) {
                intersectingIds.push(element.id);
            }
        }

        return intersectingIds;
    }, [createdSketches]);

    const handleSelection = useCallback((id: string | null, type: string | null, sketchId?: string | null) => {
        // Set highlight in 3D scene
        if (rendererRef.current) {
            let sceneName = id;
            if (id && type === 'element' && sketchId) {
                sceneName = `element-${sketchId}-${id}`;
            } else if (id && type === 'sketch') {
                sceneName = `sketch-${id}`;
            } else if (id && type === 'plane') {
                sceneName = `plane-${id}`;
            }
            rendererRef.current.setHighlight(sceneName);
        }

        const newSelection = id && type ? { id, type, sketchId: sketchId ?? undefined } : null;
        setSelectedObject(newSelection);

        // Auto-show inline extrude when a closed element (or child of one) is clicked outside sketch mode
        if (newSelection && type === 'element' && sketchId && !activeSketchId) {
            const extrudable = resolveExtrudableElement(newSelection.id, sketchId);
            if (extrudable) {
                setShowInlineExtrude(true);
                setTimeout(() => inlineExtrudeRef.current?.focus(), 50);
            } else {
                setShowInlineExtrude(false);
            }
        } else {
            setShowInlineExtrude(false);
        }
    }, [activeSketchId, resolveExtrudableElement]);

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
        setCurrentDrawingTool('select');
        if (rendererRef.current) {
            rendererRef.current.setDrawingTool('select');
            rendererRef.current.clearActiveSketchHighlight();
            rendererRef.current.viewIsometric();
        }
        updateStatus('Exited sketch — click a shape to extrude', 'info');
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
                case 'chamfer': {
                    // Find lines that the drawn segment intersects
                    const intersectingLines = findIntersectingLines(currentActiveSketchId, start, end);
                    console.log(`🔍 Fillet/Chamfer: found ${intersectingLines.length} intersecting lines:`, intersectingLines);

                    if (intersectingLines.length < 2) {
                        updateStatus(`Draw across two lines to ${tool} them (found ${intersectingLines.length})`, 'info');
                        return;
                    }

                    // Take the first two intersecting lines
                    const [line1Id, line2Id] = intersectingLines.slice(0, 2);

                    // Store pending operation and show inline input
                    setPendingFilletChamfer({
                        tool: tool as 'fillet' | 'chamfer',
                        sketchId: currentActiveSketchId,
                        line1Id,
                        line2Id
                    });
                    setInlineFilletValue(tool === 'fillet' ? '2' : '2');
                    setTimeout(() => inlineFilletRef.current?.focus(), 50);

                    // Highlight the selected lines
                    if (rendererRef.current) {
                        rendererRef.current.setHighlight(`element-${currentActiveSketchId}-${line1Id}`);
                    }

                    updateStatus(`Selected lines for ${tool}. Enter ${tool === 'fillet' ? 'radius' : 'distance'}.`, 'info');
                    return;
                }
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
    }, [activeSketchId, updateStatus, currentPolygonSides, currentArcType, findIntersectingLines]);

    // Update the renderer's drawing callback whenever the handler changes
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.onDrawingComplete = handleInteractiveDrawing;
        }
    }, [handleInteractiveDrawing]);

    // Command palette callbacks
    const handlePaletteExtrude = useCallback(async (distance: number) => {
        if (!clientRef.current || !selectedObject) {
            updateStatus('Select an element to extrude (click a shape first)', 'error');
            return;
        }
        try {
            const { id: selectedId, type: selectedType, sketchId: selSketchId } = selectedObject;
            let sketchId: string | undefined;
            let elementId: string | undefined;

            if (selectedType === 'element') {
                sketchId = selSketchId;

                // Fallback: search createdSketches if sketchId wasn't provided
                if (!sketchId) {
                    for (const sketch of createdSketches) {
                        if (sketch.elements.find(e => e.id === selectedId)) {
                            sketchId = sketch.sketch_id;
                            break;
                        }
                    }
                }

                if (sketchId) {
                    // Resolve child elements to their extrudable parent
                    const extrudable = resolveExtrudableElement(selectedId, sketchId);
                    if (extrudable) {
                        elementId = extrudable.id;
                    } else {
                        elementId = selectedId; // fallback to raw ID
                    }
                }
            } else if (selectedType === 'sketch') {
                // Try to find the first extrudable element in this sketch
                sketchId = selectedId;
                const sketch = createdSketches.find(s => s.sketch_id === selectedId);
                if (sketch) {
                    // Look for composite parents (rectangle/polygon containers) or circles
                    const closedElement = sketch.elements.find(e =>
                        (e.type === 'rectangle' || e.type === 'circle' || e.type === 'polygon')
                    );
                    if (closedElement) {
                        elementId = closedElement.id;
                    }
                }
            }

            if (!sketchId) {
                updateStatus('Could not determine sketch — select an element to extrude', 'error');
                return;
            }
            if (!elementId) {
                updateStatus('Select a closed shape (rectangle, circle, polygon) to extrude', 'error');
                return;
            }

            updateStatus(`Extruding element...`, 'info');
            const distanceInMm = toMillimeters(distance, currentUnit);
            const response = await clientRef.current.extrudeFeature(sketchId, distanceInMm, elementId);
            if (response.success && response.data) {
                updateStatus(`Extruded object: ${response.data.feature_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to extrude feature:', error);
            updateStatus(`Error extruding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [selectedObject, createdSketches, currentUnit, updateStatus, resolveExtrudableElement]);

    const handleInlineExtrude = useCallback(async () => {
        const dist = parseFloat(inlineExtrudeValue);
        if (isNaN(dist) || dist <= 0) return;
        setShowInlineExtrude(false);
        await handlePaletteExtrude(dist);
    }, [inlineExtrudeValue, handlePaletteExtrude]);

    // Handle inline fillet/chamfer submission
    const handleInlineFilletChamfer = useCallback(async () => {
        if (!pendingFilletChamfer || !clientRef.current) return;

        const value = parseFloat(inlineFilletValue);
        if (isNaN(value) || value <= 0) {
            updateStatus(`Invalid ${pendingFilletChamfer.tool} value`, 'error');
            return;
        }

        const { tool, sketchId, line1Id, line2Id } = pendingFilletChamfer;
        const valueInMm = toMillimeters(value, currentUnit);

        try {
            updateStatus(`Creating ${tool}...`, 'info');

            let response;
            if (tool === 'fillet') {
                response = await clientRef.current.addFilletToSketch(sketchId, line1Id, line2Id, valueInMm);
            } else {
                response = await clientRef.current.addChamferToSketch(sketchId, line1Id, line2Id, valueInMm);
            }

            if (response.success) {
                updateStatus(`Created ${tool} with ${tool === 'fillet' ? 'radius' : 'distance'} ${value}${currentUnit}`, 'success');
            } else {
                updateStatus(`Failed to create ${tool}`, 'error');
            }
        } catch (error) {
            console.error(`${tool} failed:`, error);
            updateStatus(`Error creating ${tool}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setPendingFilletChamfer(null);
            if (rendererRef.current) {
                rendererRef.current.setHighlight(null);
            }
        }
    }, [pendingFilletChamfer, inlineFilletValue, currentUnit, updateStatus]);

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
        setCurrentView(view);
        switch (view) {
            case 'front': rendererRef.current.viewFront(); break;
            case 'top': rendererRef.current.viewTop(); break;
            case 'right': rendererRef.current.viewRight(); break;
            case 'isometric': rendererRef.current.viewIsometric(); break;
        }
    }, []);

    const handleDeleteSelected = useCallback(async () => {
        if (!selectedObject) {
            updateStatus('Nothing selected to delete', 'info');
            return;
        }

        if (!clientRef.current) {
            updateStatus('Client not initialized', 'error');
            return;
        }

        const { id: elementId, type, sketchId } = selectedObject;

        // Currently only support deleting sketch elements
        if (type !== 'element' || !sketchId) {
            updateStatus(`Delete not yet supported for ${type}`, 'warning');
            return;
        }

        // Check if this is a child element - if so, resolve to parent
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (!sketch) {
            updateStatus('Sketch not found', 'error');
            return;
        }

        const element = sketch.elements.find(e => e.id === elementId);
        let deleteId = elementId;
        let deleteDescription = elementId;

        // If this is a child of a composite (e.g., a rectangle line), ask about deleting the parent
        if (element?.parent_id) {
            const parent = sketch.elements.find(e => e.id === element.parent_id);
            if (parent) {
                // Delete the parent (which will delete all children)
                deleteId = parent.id;
                deleteDescription = `${parent.type} (${parent.id})`;
            }
        }

        try {
            updateStatus(`Deleting ${deleteDescription}...`, 'info');

            const response = await clientRef.current.deleteSketchElement(sketchId, deleteId);

            if (response.success) {
                // Remove from local state
                setCreatedSketches(prev => prev.map(s => {
                    if (s.sketch_id !== sketchId) return s;

                    // Find the element being deleted
                    const deletedElement = s.elements.find(e => e.id === deleteId);

                    // Collect all IDs to remove (element + its children if composite)
                    const idsToRemove = new Set<string>([deleteId]);
                    if (deletedElement?.child_ids) {
                        deletedElement.child_ids.forEach(childId => idsToRemove.add(childId));
                    }

                    return {
                        ...s,
                        elements: s.elements.filter(e => !idsToRemove.has(e.id))
                    };
                }));

                // Remove visualization from scene
                if (rendererRef.current) {
                    // Remove the main element
                    rendererRef.current.removeElementVisualization(deleteId);

                    // Remove children if it's a composite
                    const deletedElement = sketch.elements.find(e => e.id === deleteId);
                    if (deletedElement?.child_ids) {
                        deletedElement.child_ids.forEach(childId => {
                            rendererRef.current?.removeElementVisualization(childId);
                        });
                    }

                    // Clear selection highlight
                    rendererRef.current.setHighlight(null);
                }

                // Clear selection
                setSelectedObject(null);

                updateStatus(`Deleted ${deleteDescription}`, 'success');
            } else {
                updateStatus(`Failed to delete element`, 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            updateStatus(`Error deleting: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [selectedObject, createdSketches, updateStatus]);

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

    // Pending face selection for sketch-on-face confirmation
    const [pendingFace, setPendingFace] = useState<{ normal: THREE.Vector3; center: THREE.Vector3; meshId: string } | null>(null);

    const handleFaceSelected = useCallback((faceNormal: THREE.Vector3, faceCenter: THREE.Vector3, meshId: string) => {
        // Don't offer sketch-on-face while already in a sketch
        if (activeSketchId) return;
        // Show confirmation prompt
        setPendingFace({ normal: faceNormal, center: faceCenter, meshId });
    }, [activeSketchId]);

    const handleConfirmSketchOnFace = useCallback(async () => {
        if (!clientRef.current || !pendingFace) return;

        const { normal, center } = pendingFace;
        setPendingFace(null);

        // Map face normal to closest standard plane type
        const absX = Math.abs(normal.x);
        const absY = Math.abs(normal.y);
        const absZ = Math.abs(normal.z);

        let planeType: 'XZ' | 'XY' | 'YZ';
        if (absY >= absX && absY >= absZ) {
            planeType = 'XZ'; // Y-facing face → sketch on XZ plane
        } else if (absZ >= absX && absZ >= absY) {
            planeType = 'XY'; // Z-facing face → sketch on XY plane
        } else {
            planeType = 'YZ'; // X-facing face → sketch on YZ plane
        }

        const origin: [number, number, number] = [center.x, center.y, center.z];

        try {
            updateStatus(`Creating sketch on face (${planeType} at ${origin.map(v => v.toFixed(1)).join(', ')})...`, 'info');

            const planeResponse = await clientRef.current.createSketchPlane(planeType, origin);
            if (planeResponse.success && planeResponse.data) {
                const planeId = planeResponse.data.plane_id;
                const sketchResponse = await clientRef.current.createSketch(planeId);
                if (sketchResponse.success && sketchResponse.data) {
                    updateStatus(`Sketch on face ready — start drawing!`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to create sketch on face:', error);
            updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [pendingFace, updateStatus]);

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
                renderer.onFaceSelected = handleFaceSelected;
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
            // Enter confirms pending face selection
            if (pendingFace && event.key === 'Enter') {
                event.preventDefault();
                handleConfirmSketchOnFace();
                return;
            }

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
                    setPaletteExtrudeMode(false);
                    setIsPaletteOpen(true);
                    setShowWelcome(false);
                    break;
                case 'Escape':
                    event.preventDefault();
                    if (pendingFilletChamfer) {
                        setPendingFilletChamfer(null);
                        if (rendererRef.current) {
                            rendererRef.current.setHighlight(null);
                        }
                    } else if (pendingFace) {
                        setPendingFace(null);
                    } else if (showInlineExtrude) {
                        setShowInlineExtrude(false);
                    } else if (isPaletteOpen) {
                        setIsPaletteOpen(false);
                    } else if (isSceneTreeOpen) {
                        setIsSceneTreeOpen(false);
                    } else if (activeSketchId) {
                        // If using a drawing tool in sketch mode, return to select first
                        if (currentDrawingTool !== 'select') {
                            handleSetDrawingTool('select');
                        } else {
                            exitSketchMode();
                        }
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

                // Sketch workflow
                case 'n': case 'N':
                    // Quick: new sketch on XZ (top) plane
                    event.preventDefault();
                    handleNewSketch('XZ');
                    setShowWelcome(false);
                    break;
                case 's': case 'S':
                    // Opens palette pre-filtered to sketch commands
                    event.preventDefault();
                    setPaletteExtrudeMode(false);
                    setIsPaletteOpen(true);
                    setShowWelcome(false);
                    break;

                // 3D Operations
                case 'e': case 'E':
                    event.preventDefault();
                    if (selectedObject) {
                        // Element selected — go straight to extrude distance input
                        setPaletteExtrudeMode(true);
                    } else {
                        setPaletteExtrudeMode(false);
                    }
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
    }, [isPaletteOpen, isSceneTreeOpen, activeSketchId, currentDrawingTool, showInlineExtrude, pendingFace, pendingFilletChamfer, handleConfirmSketchOnFace, handleSetDrawingTool, handleDeleteSelected, handleSelection, exitSketchMode, updateStatus]);

    return (
        <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: '#12141C' }}>
            {/* Full-screen 3D Viewport */}
            <div
                ref={viewportRef}
                className="w-full h-full relative"
                style={{
                    cursor: currentDrawingTool !== 'select' ? 'crosshair' : 'default'
                }}
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

                {/* Inline Extrude Input — appears when clicking a closed contour */}
                {showInlineExtrude && selectedObject && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl shadow-black/60"
                            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        >
                            <span className="text-[#D4A017] text-sm font-medium">Extrude</span>
                            <input
                                ref={inlineExtrudeRef}
                                type="number"
                                value={inlineExtrudeValue}
                                onChange={(e) => setInlineExtrudeValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInlineExtrude();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setShowInlineExtrude(false);
                                    }
                                }}
                                className="w-20 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                style={{ caretColor: '#D4A017' }}
                                autoFocus
                            />
                            <span className="text-[#5A5D6A] text-xs">{currentUnit}</span>
                            <span className="text-[#5A5D6A] text-[10px]">Enter to apply</span>
                        </div>
                    </div>
                )}

                {/* Inline Fillet/Chamfer Input — appears after drawing across two lines */}
                {pendingFilletChamfer && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl shadow-black/60"
                            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        >
                            <span className="text-[#D4A017] text-sm font-medium capitalize">
                                {pendingFilletChamfer.tool}
                            </span>
                            <input
                                ref={inlineFilletRef}
                                type="number"
                                value={inlineFilletValue}
                                onChange={(e) => setInlineFilletValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInlineFilletChamfer();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setPendingFilletChamfer(null);
                                        if (rendererRef.current) {
                                            rendererRef.current.setHighlight(null);
                                        }
                                    }
                                }}
                                className="w-20 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                style={{ caretColor: '#D4A017' }}
                                autoFocus
                            />
                            <span className="text-[#5A5D6A] text-xs">{currentUnit}</span>
                            <span className="text-[#5A5D6A] text-[10px]">
                                {pendingFilletChamfer.tool === 'fillet' ? 'radius' : 'distance'} · Enter to apply
                            </span>
                        </div>
                    </div>
                )}

                {/* Sketch-on-Face Confirmation */}
                {pendingFace && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl shadow-black/60"
                            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        >
                            <span className="text-[#E8DCC8] text-sm">Sketch on this face?</span>
                            <button
                                onClick={handleConfirmSketchOnFace}
                                className="px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                style={{ backgroundColor: '#D4A017', color: '#12141C' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8B520'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4A017'; }}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setPendingFace(null)}
                                className="px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                style={{ backgroundColor: '#2A2D3A', color: '#A0A3B0' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3A3D4A'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2A2D3A'; }}
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom HUD — tool pill, key hints, builder button */}
                <BottomHud
                    currentTool={currentDrawingTool}
                    isConnected={isConnected}
                    onBuilderClick={openChat}
                    isChatOpen={isChatOpen}
                    unreadMessages={unreadMessages}
                />

                {/* Scene Tree Toggle Button — visible when panel is closed */}
                {!isSceneTreeOpen && (
                    <button
                        onClick={() => setIsSceneTreeOpen(true)}
                        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 px-1.5 py-3 rounded-r-md transition-all duration-200 hover:px-2"
                        style={{
                            backgroundColor: 'rgba(26, 29, 39, 0.9)',
                            border: '1px solid #2A2D3A',
                            borderLeft: 'none',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(42, 45, 58, 0.95)';
                            e.currentTarget.style.borderColor = '#D4A017';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(26, 29, 39, 0.9)';
                            e.currentTarget.style.borderColor = '#2A2D3A';
                        }}
                    >
                        <span className="text-[#D4A017] text-sm">▸</span>
                        <span className="text-[#6A6D7A] text-[9px] uppercase tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                            Tab
                        </span>
                    </button>
                )}

                {/* Toast Notifications — minimal, top right */}
                {toasts.length > 0 && (
                    <div className="fixed top-3 right-3 z-50 space-y-1 pointer-events-none">
                        {toasts.map(toast => (
                            <div
                                key={toast.id}
                                className="px-2.5 py-1 rounded text-[11px] font-medium shadow-md animate-in slide-in-from-right-5 fade-in duration-150"
                                style={{
                                    backgroundColor: TOAST_COLORS[toast.type].bg,
                                    borderLeft: `2px solid ${TOAST_COLORS[toast.type].text}`,
                                    color: TOAST_COLORS[toast.type].text,
                                }}
                            >
                                {toast.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Properties Panel — top right when object selected (below toasts) */}
                {selectedObject && !isChatOpen && (
                    <div
                        className="fixed right-3 z-20 rounded-lg p-3 backdrop-blur-sm"
                        style={{
                            top: toasts.length > 0 ? `${3 + toasts.length * 1.75}rem` : '3rem',
                            backgroundColor: 'rgba(26, 29, 39, 0.95)',
                            border: '1px solid #2A2D3A',
                            minWidth: '180px',
                        }}
                    >
                        <div className="text-[10px] uppercase tracking-wider text-[#6A6D7A] font-medium mb-1">Selected</div>
                        <div className="text-[#E8DCC8] text-sm font-medium">
                            {selectedObject.type === 'feature' && 'Model'}
                            {selectedObject.type === 'plane' && 'Plane'}
                            {selectedObject.type === 'sketch' && 'Sketch'}
                            {selectedObject.type === 'element' && (() => {
                                // Find element type from sketches
                                for (const sketch of createdSketches) {
                                    const element = sketch.elements.find(e => e.id === selectedObject.id);
                                    if (element) {
                                        return element.type.charAt(0).toUpperCase() + element.type.slice(1);
                                    }
                                }
                                return 'Element';
                            })()}
                        </div>
                        <div className="text-[#8A8D9A] text-xs mt-1 font-mono">
                            {selectedObject.id.substring(0, 20)}{selectedObject.id.length > 20 ? '...' : ''}
                        </div>
                        {selectedObject.type === 'feature' && (() => {
                            const shape = createdShapes.find(s => s.id === selectedObject.id);
                            if (shape) {
                                return (
                                    <div className="text-[#6A6D7A] text-[10px] mt-2 space-y-0.5">
                                        <div>Vertices: {shape.dimensions.vertices}</div>
                                        <div>Faces: {shape.dimensions.faces}</div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}

                {/* Viewport Controls — bottom right */}
                {!isChatOpen && (
                    <div
                        className="absolute bottom-16 right-4 z-10 flex flex-col gap-1"
                    >
                        {/* View buttons */}
                        <div className="flex gap-1">
                            {(['front', 'top', 'right', 'isometric'] as const).map(view => (
                                <button
                                    key={view}
                                    onClick={() => handlePaletteSetView(view)}
                                    className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium uppercase transition-colors ${
                                        currentView === view
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'text-[#8A8D9A] border border-[#2A2D3A] hover:bg-white/5 hover:text-[#DDD4C0]'
                                    }`}
                                    style={{ backgroundColor: currentView !== view ? 'rgba(26, 29, 39, 0.9)' : undefined }}
                                    title={`${view.charAt(0).toUpperCase() + view.slice(1)} view (${view === 'isometric' ? '0' : view === 'front' ? '1' : view === 'top' ? '2' : '3'})`}
                                >
                                    {view === 'front' && '1'}
                                    {view === 'top' && '2'}
                                    {view === 'right' && '3'}
                                    {view === 'isometric' && '0'}
                                </button>
                            ))}
                        </div>
                        {/* Reset view button */}
                        <button
                            onClick={() => handlePaletteSetView('isometric')}
                            className="w-full py-1 rounded text-[10px] font-medium text-[#6A6D7A] border border-[#2A2D3A] hover:bg-white/5 hover:text-[#DDD4C0] transition-colors"
                            style={{ backgroundColor: 'rgba(26, 29, 39, 0.9)' }}
                        >
                            Reset
                        </button>
                    </div>
                )}

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
                onClose={() => { setIsPaletteOpen(false); setPaletteExtrudeMode(false); }}
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
                startInExtrudeMode={paletteExtrudeMode}
            />
        </div>
    );
}
