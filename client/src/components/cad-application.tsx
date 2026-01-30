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
import { DimensionInput } from '@/components/dimension-input';

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

// Counter for unique model IDs to avoid collisions when geometry updates arrive rapidly
let modelIdCounter = 0;

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

    // Inline offset state — shown when clicking an element with offset tool
    const [pendingOffset, setPendingOffset] = useState<{
        sketchId: string;
        elementId: string;
        direction: 'left' | 'right';
    } | null>(null);
    const [inlineOffsetValue, setInlineOffsetValue] = useState('5');
    const inlineOffsetRef = useRef<HTMLInputElement>(null);

    // Inline copy/move state — shown when clicking an element with copy or move tool
    const [pendingCopyMove, setPendingCopyMove] = useState<{
        tool: 'copy' | 'move';
        sketchId: string;
        elementId: string;
    } | null>(null);
    const [inlineCopyMoveX, setInlineCopyMoveX] = useState('10');
    const [inlineCopyMoveY, setInlineCopyMoveY] = useState('0');
    const [inlineCopyMoveCount, setInlineCopyMoveCount] = useState('1');
    const inlineCopyMoveXRef = useRef<HTMLInputElement>(null);

    // Dimension state
    const [pendingDimension, setPendingDimension] = useState<{
        sketchId: string;
        elementId: string;
        elementType: string;
    } | null>(null);
    const [editingDimension, setEditingDimension] = useState<{
        dimensionId: string;
        value: number;
        screenPosition: { x: number; y: number };
    } | null>(null);

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

    // Helper: Convert 2D sketch coordinates to 3D world coordinates (flat array for points_3d)
    const convert2DTo3DPoints = useCallback((
        sketchId: string,
        points2D: Array<{x: number, y: number}>
    ): number[] => {
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (!sketch?.visualization_data) return [];

        const origin = new THREE.Vector3(...sketch.visualization_data.origin);
        const uAxis = new THREE.Vector3(...sketch.visualization_data.u_axis);
        const vAxis = new THREE.Vector3(...sketch.visualization_data.v_axis);

        const points3D: number[] = [];
        for (const p of points2D) {
            const point = origin.clone()
                .add(uAxis.clone().multiplyScalar(p.x))
                .add(vAxis.clone().multiplyScalar(p.y));
            points3D.push(point.x, point.y, point.z);
        }
        return points3D;
    }, [createdSketches]);

    // Helper: Get element endpoints in 2D sketch coordinates from the Three.js scene
    const getElement2DEndpoints = useCallback((
        sketchId: string,
        elementId: string
    ): {start: {x: number, y: number}, end: {x: number, y: number}} | null => {
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        if (!sketch?.visualization_data || !rendererRef.current) return null;

        const scene = rendererRef.current.getScene();
        const elementName = `element-${sketchId}-${elementId}`;
        const elementObject = scene.getObjectByName(elementName);

        if (!elementObject) return null;

        let startWorld: THREE.Vector3 | null = null;
        let endWorld: THREE.Vector3 | null = null;

        elementObject.traverse((child) => {
            if (child instanceof THREE.Line && child.geometry?.attributes?.position) {
                const positions = child.geometry.attributes.position;
                if (positions.count >= 2) {
                    startWorld = new THREE.Vector3().fromBufferAttribute(positions, 0);
                    endWorld = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 1);
                }
            }
        });

        if (!startWorld || !endWorld) return null;

        const origin = new THREE.Vector3(...sketch.visualization_data.origin);
        const uAxis = new THREE.Vector3(...sketch.visualization_data.u_axis);
        const vAxis = new THREE.Vector3(...sketch.visualization_data.v_axis);

        const worldTo2D = (worldPoint: THREE.Vector3): {x: number, y: number} => {
            const relative = worldPoint.clone().sub(origin);
            return {x: relative.dot(uAxis), y: relative.dot(vAxis)};
        };

        return {
            start: worldTo2D(startWorld),
            end: worldTo2D(endWorld)
        };
    }, [createdSketches]);

    // Helper: Calculate intersection point of two lines defined by their endpoints
    const lineLineIntersection = (
        p1: {x: number, y: number}, p2: {x: number, y: number},
        p3: {x: number, y: number}, p4: {x: number, y: number}
    ): {x: number, y: number} | null => {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

        const t = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;

        return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
        };
    };

    // Helper: Update element visualization after operation (creates proper visualization_data and triggers update)
    const updateElementVisualization = useCallback((
        sketchId: string,
        elementId: string,
        elementType: string,
        points2D: Array<{x: number, y: number}>
    ) => {
        if (!rendererRef.current) return;

        const points3D = convert2DTo3DPoints(sketchId, points2D);
        if (points3D.length === 0) return;

        const vizData = {
            element_id: elementId,
            element_type: elementType,
            sketch_id: sketchId,
            points_3d: points3D,
            parameters_2d: points2D.length === 2 ? {
                x1: points2D[0].x,
                y1: points2D[0].y,
                x2: points2D[1].x,
                y2: points2D[1].y
            } : {}
        };

        rendererRef.current.addSketchElementVisualization(vizData as any);
        console.log(`📊 Updated visualization for element ${elementId}:`, vizData);
    }, [convert2DTo3DPoints]);

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

        // Handle offset/copy/move tool clicks on elements
        // Allow operation even when not in sketch editing mode - use the element's sketchId
        if (newSelection && type === 'element' && sketchId) {
            if (currentDrawingTool === 'offset') {
                setPendingOffset({
                    sketchId,
                    elementId: newSelection.id,
                    direction: 'right'
                });
                setInlineOffsetValue('5');
                setTimeout(() => inlineOffsetRef.current?.focus(), 50);
                return;
            } else if (currentDrawingTool === 'copy') {
                setPendingCopyMove({
                    tool: 'copy',
                    sketchId,
                    elementId: newSelection.id
                });
                setInlineCopyMoveX('10');
                setInlineCopyMoveY('0');
                setInlineCopyMoveCount('1');
                setTimeout(() => inlineCopyMoveXRef.current?.focus(), 50);
                return;
            } else if (currentDrawingTool === 'move') {
                setPendingCopyMove({
                    tool: 'move',
                    sketchId,
                    elementId: newSelection.id
                });
                setInlineCopyMoveX('10');
                setInlineCopyMoveY('0');
                setTimeout(() => inlineCopyMoveXRef.current?.focus(), 50);
                return;
            } else if (currentDrawingTool === 'dimension' && type === 'element' && sketchId) {
                // Check if element is a line
                const sketch = createdSketches.find(s => s.sketch_id === sketchId);
                const element = sketch?.elements.find(e => e.id === newSelection.id);
                if (element?.type === 'line') {
                    // Create dimension immediately with default offset
                    if (rendererRef.current) {
                        const defaultOffset = 3; // Default offset distance
                        const defaultDirection = 1 as const; // Default to one side
                        rendererRef.current.createDimensionForLine(
                            sketchId,
                            newSelection.id,
                            defaultOffset,
                            defaultDirection
                        );
                        updateStatus('Dimension created - double-click to edit value', 'success');
                    }
                } else {
                    updateStatus('Dimensions can only be added to lines', 'warning');
                }
                return;
            }
        }

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
    }, [activeSketchId, resolveExtrudableElement, currentDrawingTool]);

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

        // Auto-enter sketch mode for draw-based tools if an element is selected
        // This allows trim/extend/mirror to work without manually entering sketch mode
        const drawBasedTools = ['trim', 'extend', 'mirror', 'fillet', 'chamfer', 'dimension'];
        if (drawBasedTools.includes(tool) && !activeSketchId && selectedObject?.sketchId) {
            const sketch = createdSketches.find(s => s.sketch_id === selectedObject.sketchId);
            if (sketch?.visualization_data && rendererRef.current) {
                setActiveSketchId(selectedObject.sketchId);
                rendererRef.current.setActiveSketchPlane(selectedObject.sketchId, sketch.visualization_data);
                updateStatus(`Entered sketch mode for ${tool} tool`, 'info');
            }
        }
    }, [currentArcType, currentPolygonSides, activeSketchId, selectedObject, createdSketches, updateStatus]);

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
        if (!clientRef.current) return;

        // For sketch modification tools, provide feedback if not in sketch mode
        const sketchModificationTools = ['trim', 'extend', 'mirror', 'fillet', 'chamfer', 'line', 'circle', 'rectangle', 'arc', 'polygon'];
        if (!currentActiveSketchId && sketchModificationTools.includes(tool)) {
            updateStatus('Double-click a sketch to enter edit mode first', 'info');
            return;
        }
        if (!currentActiveSketchId) return;

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
                case 'trim': {
                    // Find lines that the drawn segment intersects
                    const trimIntersectingLines = findIntersectingLines(currentActiveSketchId, start, end);
                    console.log(`✂️ Trim: found ${trimIntersectingLines.length} intersecting lines:`, trimIntersectingLines);

                    if (trimIntersectingLines.length < 2) {
                        updateStatus(`Draw across two lines to trim (found ${trimIntersectingLines.length})`, 'info');
                        return;
                    }

                    // First line hit is the line to trim, second is the cutting line
                    const [lineToTrimId, cuttingLineId] = trimIntersectingLines.slice(0, 2);

                    // Determine keep_start based on draw direction
                    // We need to figure out which end of the line_to_trim is closer to the draw start point
                    const sketch = createdSketches.find(s => s.sketch_id === currentActiveSketchId);
                    let keepStart = true; // Default: keep the start side

                    if (sketch && rendererRef.current) {
                        const scene = rendererRef.current.getScene();
                        const elementName = `element-${currentActiveSketchId}-${lineToTrimId}`;
                        const elementObject = scene.getObjectByName(elementName);

                        if (elementObject) {
                            let lineStartWorld: THREE.Vector3 | null = null;
                            let lineEndWorld: THREE.Vector3 | null = null;

                            elementObject.traverse((child) => {
                                if (child instanceof THREE.Line && child.geometry?.attributes?.position) {
                                    const positions = child.geometry.attributes.position;
                                    if (positions.count >= 2) {
                                        lineStartWorld = new THREE.Vector3().fromBufferAttribute(positions, 0);
                                        lineEndWorld = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 1);
                                    }
                                }
                            });

                            if (lineStartWorld && lineEndWorld && sketch.visualization_data) {
                                // Convert line endpoints to 2D
                                const origin = new THREE.Vector3(...sketch.visualization_data.origin);
                                const uAxis = new THREE.Vector3(...sketch.visualization_data.u_axis);
                                const vAxis = new THREE.Vector3(...sketch.visualization_data.v_axis);

                                const worldTo2D = (worldPoint: THREE.Vector3): THREE.Vector2 => {
                                    const relative = worldPoint.clone().sub(origin);
                                    return new THREE.Vector2(relative.dot(uAxis), relative.dot(vAxis));
                                };

                                const lineStart2D = worldTo2D(lineStartWorld);
                                const lineEnd2D = worldTo2D(lineEndWorld);

                                // Determine which end is closer to the draw start point
                                const distToStart = start.distanceTo(lineStart2D);
                                const distToEnd = start.distanceTo(lineEnd2D);

                                // Keep the side closer to where the user started drawing
                                keepStart = distToStart < distToEnd;
                                console.log(`✂️ Trim decision: keepStart=${keepStart} (distToStart=${distToStart.toFixed(2)}, distToEnd=${distToEnd.toFixed(2)})`);
                            }
                        }
                    }

                    try {
                        updateStatus(`Trimming line...`, 'info');
                        response = await clientRef.current.trimLineToLine(
                            currentActiveSketchId,
                            lineToTrimId,
                            cuttingLineId,
                            keepStart
                        );

                        if (response.success) {
                            // Calculate and update the trimmed line visualization
                            const trimLineEndpoints = getElement2DEndpoints(currentActiveSketchId, lineToTrimId);
                            const cuttingLineEndpoints = getElement2DEndpoints(currentActiveSketchId, cuttingLineId);

                            if (trimLineEndpoints && cuttingLineEndpoints) {
                                // Calculate intersection point
                                const intersection = lineLineIntersection(
                                    trimLineEndpoints.start, trimLineEndpoints.end,
                                    cuttingLineEndpoints.start, cuttingLineEndpoints.end
                                );

                                if (intersection) {
                                    // Create new endpoints based on keepStart
                                    const newPoints = keepStart
                                        ? [trimLineEndpoints.start, intersection]
                                        : [intersection, trimLineEndpoints.end];

                                    updateElementVisualization(
                                        currentActiveSketchId,
                                        lineToTrimId,
                                        'line',
                                        newPoints
                                    );
                                }
                            }
                            updateStatus(`Trimmed line successfully`, 'success');
                        } else {
                            updateStatus(`Failed to trim line`, 'error');
                        }
                    } catch (trimError) {
                        console.error('Trim failed:', trimError);
                        updateStatus(`Trim error: ${trimError instanceof Error ? trimError.message : 'Unknown error'}`, 'error');
                    }
                    return;
                }
                case 'extend': {
                    // Find lines that the drawn segment intersects
                    const extendIntersectingLines = findIntersectingLines(currentActiveSketchId, start, end);
                    console.log(`🔗 Extend: found ${extendIntersectingLines.length} intersecting lines:`, extendIntersectingLines);

                    if (extendIntersectingLines.length < 2) {
                        updateStatus(`Draw from line to extend toward target line (found ${extendIntersectingLines.length})`, 'info');
                        return;
                    }

                    // First line hit is the line to extend, second is the target
                    const [lineToExtendId, targetLineId] = extendIntersectingLines.slice(0, 2);

                    // Determine extend_start based on draw direction
                    const extendSketch = createdSketches.find(s => s.sketch_id === currentActiveSketchId);
                    let extendStart = true;

                    if (extendSketch && rendererRef.current) {
                        const scene = rendererRef.current.getScene();
                        const elementName = `element-${currentActiveSketchId}-${lineToExtendId}`;
                        const elementObject = scene.getObjectByName(elementName);

                        if (elementObject) {
                            let lineStartWorld: THREE.Vector3 | null = null;
                            let lineEndWorld: THREE.Vector3 | null = null;

                            elementObject.traverse((child) => {
                                if (child instanceof THREE.Line && child.geometry?.attributes?.position) {
                                    const positions = child.geometry.attributes.position;
                                    if (positions.count >= 2) {
                                        lineStartWorld = new THREE.Vector3().fromBufferAttribute(positions, 0);
                                        lineEndWorld = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 1);
                                    }
                                }
                            });

                            if (lineStartWorld && lineEndWorld && extendSketch.visualization_data) {
                                const origin = new THREE.Vector3(...extendSketch.visualization_data.origin);
                                const uAxis = new THREE.Vector3(...extendSketch.visualization_data.u_axis);
                                const vAxis = new THREE.Vector3(...extendSketch.visualization_data.v_axis);

                                const worldTo2D = (worldPoint: THREE.Vector3): THREE.Vector2 => {
                                    const relative = worldPoint.clone().sub(origin);
                                    return new THREE.Vector2(relative.dot(uAxis), relative.dot(vAxis));
                                };

                                const lineStart2D = worldTo2D(lineStartWorld);
                                const lineEnd2D = worldTo2D(lineEndWorld);

                                // Extend the end that's closer to where the draw ended (toward target)
                                const distStartToDrawEnd = end.distanceTo(lineStart2D);
                                const distEndToDrawEnd = end.distanceTo(lineEnd2D);

                                extendStart = distStartToDrawEnd < distEndToDrawEnd;
                                console.log(`🔗 Extend decision: extendStart=${extendStart} (distStartToDrawEnd=${distStartToDrawEnd.toFixed(2)}, distEndToDrawEnd=${distEndToDrawEnd.toFixed(2)})`);
                            }
                        }
                    }

                    try {
                        updateStatus(`Extending line...`, 'info');
                        response = await clientRef.current.extendLineToLine(
                            currentActiveSketchId,
                            lineToExtendId,
                            targetLineId,
                            extendStart
                        );

                        if (response.success) {
                            // Calculate and update the extended line visualization
                            const extendLineEndpoints = getElement2DEndpoints(currentActiveSketchId, lineToExtendId);
                            const targetEndpoints = getElement2DEndpoints(currentActiveSketchId, targetLineId);

                            if (extendLineEndpoints && targetEndpoints) {
                                // Calculate intersection point
                                const intersection = lineLineIntersection(
                                    extendLineEndpoints.start, extendLineEndpoints.end,
                                    targetEndpoints.start, targetEndpoints.end
                                );

                                if (intersection) {
                                    // Create new endpoints based on extendStart
                                    const newPoints = extendStart
                                        ? [intersection, extendLineEndpoints.end]
                                        : [extendLineEndpoints.start, intersection];

                                    updateElementVisualization(
                                        currentActiveSketchId,
                                        lineToExtendId,
                                        'line',
                                        newPoints
                                    );
                                }
                            }
                            updateStatus(`Extended line successfully`, 'success');
                        } else {
                            updateStatus(`Failed to extend line`, 'error');
                        }
                    } catch (extendError) {
                        console.error('Extend failed:', extendError);
                        updateStatus(`Extend error: ${extendError instanceof Error ? extendError.message : 'Unknown error'}`, 'error');
                    }
                    return;
                }
                case 'mirror': {
                    // Mirror requires pre-selected elements, then draw the mirror axis
                    if (!selectedObject || selectedObject.type !== 'element' || !selectedObject.sketchId) {
                        updateStatus('Select an element first, then draw the mirror axis', 'info');
                        return;
                    }

                    // Use the selected element's sketch ID
                    const mirrorSketchId = selectedObject.sketchId;

                    // Use the drawn line as the mirror axis
                    try {
                        updateStatus(`Mirroring element...`, 'info');
                        response = await clientRef.current.mirrorElementsByTwoPoints(
                            mirrorSketchId,
                            [selectedObject.id],
                            start.x,
                            start.y,
                            end.x,
                            end.y,
                            true // keep original
                        );

                        if (response.success && response.data?.mirrored_element_ids?.length > 0) {
                            // Calculate and visualize the mirrored element
                            const originalEndpoints = getElement2DEndpoints(mirrorSketchId, selectedObject.id);

                            if (originalEndpoints) {
                                // Calculate mirror reflection across the axis defined by start -> end
                                const mirrorPoint = (p: {x: number, y: number}): {x: number, y: number} => {
                                    // Vector along mirror axis
                                    const ax = end.x - start.x;
                                    const ay = end.y - start.y;
                                    const lenSq = ax * ax + ay * ay;
                                    if (lenSq < 1e-10) return p;

                                    // Vector from start to point
                                    const dx = p.x - start.x;
                                    const dy = p.y - start.y;

                                    // Project point onto axis
                                    const t = (dx * ax + dy * ay) / lenSq;
                                    const projX = start.x + t * ax;
                                    const projY = start.y + t * ay;

                                    // Reflect point across axis
                                    return {
                                        x: 2 * projX - p.x,
                                        y: 2 * projY - p.y
                                    };
                                };

                                const mirroredPoints = [
                                    mirrorPoint(originalEndpoints.start),
                                    mirrorPoint(originalEndpoints.end)
                                ];

                                // Get the new element ID from response
                                const newElementId = response.data.mirrored_element_ids[0];
                                updateElementVisualization(
                                    mirrorSketchId,
                                    newElementId,
                                    'line',
                                    mirroredPoints
                                );
                            }
                            updateStatus(`Mirrored element successfully`, 'success');
                            // Clear selection after mirror
                            handleSelection(null, null);
                        } else {
                            updateStatus(`Failed to mirror element`, 'error');
                        }
                    } catch (mirrorError) {
                        console.error('Mirror failed:', mirrorError);
                        updateStatus(`Mirror error: ${mirrorError instanceof Error ? mirrorError.message : 'Unknown error'}`, 'error');
                    }
                    return;
                }
                case 'offset':
                case 'copy':
                case 'move':
                    updateStatus(`Click on an element to ${tool} it`, 'info');
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
    }, [activeSketchId, updateStatus, currentPolygonSides, currentArcType, findIntersectingLines, getElement2DEndpoints, updateElementVisualization, handleSelection]);

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

    // Handle inline offset submission
    const handleInlineOffset = useCallback(async () => {
        if (!pendingOffset || !clientRef.current) return;

        const value = parseFloat(inlineOffsetValue);
        if (isNaN(value) || value <= 0) {
            updateStatus('Invalid offset distance', 'error');
            return;
        }

        const { sketchId, elementId, direction } = pendingOffset;
        const valueInMm = toMillimeters(value, currentUnit);

        try {
            updateStatus(`Offsetting element...`, 'info');
            const response = await clientRef.current.offsetElementDirectional(sketchId, elementId, valueInMm, direction);

            if (response.success && response.data?.offset_element_id) {
                // Get the original element's endpoints
                const originalEndpoints = getElement2DEndpoints(sketchId, elementId);

                if (originalEndpoints) {
                    // Calculate perpendicular offset direction
                    const dx = originalEndpoints.end.x - originalEndpoints.start.x;
                    const dy = originalEndpoints.end.y - originalEndpoints.start.y;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    if (len > 0) {
                        // Perpendicular: rotate 90 degrees
                        let perpX = -dy / len;
                        let perpY = dx / len;

                        // Flip direction if 'left'
                        if (direction === 'left') {
                            perpX = -perpX;
                            perpY = -perpY;
                        }

                        // Create offset line
                        const offsetPoints = [
                            {x: originalEndpoints.start.x + perpX * valueInMm, y: originalEndpoints.start.y + perpY * valueInMm},
                            {x: originalEndpoints.end.x + perpX * valueInMm, y: originalEndpoints.end.y + perpY * valueInMm}
                        ];

                        updateElementVisualization(
                            sketchId,
                            response.data.offset_element_id,
                            'line',
                            offsetPoints
                        );
                    }
                }
                updateStatus(`Offset element by ${value}${currentUnit} to the ${direction}`, 'success');
            } else {
                updateStatus(`Failed to offset element`, 'error');
            }
        } catch (error) {
            console.error('Offset failed:', error);
            updateStatus(`Offset error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setPendingOffset(null);
            if (rendererRef.current) {
                rendererRef.current.setHighlight(null);
            }
        }
    }, [pendingOffset, inlineOffsetValue, currentUnit, updateStatus, getElement2DEndpoints, updateElementVisualization]);

    // Handle inline copy/move submission
    const handleInlineCopyMove = useCallback(async () => {
        if (!pendingCopyMove || !clientRef.current) return;

        const x = parseFloat(inlineCopyMoveX);
        const y = parseFloat(inlineCopyMoveY);
        const count = pendingCopyMove.tool === 'copy' ? parseInt(inlineCopyMoveCount) : 1;

        if (isNaN(x) || isNaN(y)) {
            updateStatus('Invalid X or Y value', 'error');
            return;
        }

        if (pendingCopyMove.tool === 'copy' && (isNaN(count) || count < 1)) {
            updateStatus('Invalid copy count', 'error');
            return;
        }

        const { tool, sketchId, elementId } = pendingCopyMove;
        const xInMm = toMillimeters(x, currentUnit);
        const yInMm = toMillimeters(y, currentUnit);

        // Calculate distance and direction
        const distance = Math.sqrt(xInMm * xInMm + yInMm * yInMm);
        const dirX = distance > 0 ? xInMm / distance : 1;
        const dirY = distance > 0 ? yInMm / distance : 0;

        try {
            updateStatus(`${tool === 'copy' ? 'Copying' : 'Moving'} element...`, 'info');

            // Get the original element's endpoints before the operation
            const originalEndpoints = getElement2DEndpoints(sketchId, elementId);

            if (tool === 'copy') {
                const copyResponse = await clientRef.current.copyElement(sketchId, elementId, count, dirX, dirY, distance);
                if (copyResponse.success && copyResponse.data?.copied_element_ids?.length > 0 && originalEndpoints) {
                    // Create visualization for each copy
                    copyResponse.data.copied_element_ids.forEach((copyId: string, idx: number) => {
                        const copyOffset = (idx + 1) * distance;
                        const copyPoints = [
                            {x: originalEndpoints.start.x + dirX * copyOffset, y: originalEndpoints.start.y + dirY * copyOffset},
                            {x: originalEndpoints.end.x + dirX * copyOffset, y: originalEndpoints.end.y + dirY * copyOffset}
                        ];
                        updateElementVisualization(sketchId, copyId, 'line', copyPoints);
                    });
                    updateStatus(`Copied element by (${x}, ${y})${currentUnit}`, 'success');
                } else {
                    updateStatus(`Failed to copy element`, 'error');
                }
            } else {
                const moveResponse = await clientRef.current.moveElement(sketchId, elementId, dirX, dirY, distance);
                if (moveResponse.success && originalEndpoints) {
                    // Update moved element's position
                    // Use moved_element_id from response, or fall back to original elementId (element keeps same ID when moved)
                    const responseData = moveResponse.data as Record<string, unknown> | undefined;
                    const movedElementId = (responseData?.moved_element_id || responseData?.element_id || elementId) as string;
                    const movedPoints = [
                        {x: originalEndpoints.start.x + xInMm, y: originalEndpoints.start.y + yInMm},
                        {x: originalEndpoints.end.x + xInMm, y: originalEndpoints.end.y + yInMm}
                    ];
                    updateElementVisualization(sketchId, movedElementId, 'line', movedPoints);
                    updateStatus(`Moved element by (${x}, ${y})${currentUnit}`, 'success');
                } else {
                    updateStatus(`Failed to move element`, 'error');
                }
            }
        } catch (error) {
            console.error(`${tool} failed:`, error);
            updateStatus(`${tool} error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setPendingCopyMove(null);
            if (rendererRef.current) {
                rendererRef.current.setHighlight(null);
            }
        }
    }, [pendingCopyMove, inlineCopyMoveX, inlineCopyMoveY, inlineCopyMoveCount, currentUnit, updateStatus, getElement2DEndpoints, updateElementVisualization]);

    // Handle dimension placement
    const handleDimensionPlacement = useCallback((offset: number, offsetDirection: 1 | -1) => {
        if (!pendingDimension || !rendererRef.current) return;

        rendererRef.current.createDimensionForLine(
            pendingDimension.sketchId,
            pendingDimension.elementId,
            offset,
            offsetDirection
        );

        setPendingDimension(null);
        updateStatus('Dimension created - double-click to edit', 'success');
    }, [pendingDimension, updateStatus]);

    // Handle dimension double-click for editing
    const handleDimensionDoubleClick = useCallback((dimensionId: string, screenX: number, screenY: number) => {
        if (!rendererRef.current) return;

        const dimension = rendererRef.current.getDimensionManager().getDimension(dimensionId);
        if (!dimension) return;

        setEditingDimension({
            dimensionId,
            value: dimension.value,
            screenPosition: { x: screenX, y: screenY }
        });
    }, []);

    // Handle dimension value submission
    const handleDimensionValueSubmit = useCallback(async (newValue: number) => {
        if (!editingDimension || !rendererRef.current || !clientRef.current) return;

        const dimensionManager = rendererRef.current.getDimensionManager();
        const dimension = dimensionManager.getDimension(editingDimension.dimensionId);
        if (!dimension) return;

        // Update dimension (this will trigger line resize)
        dimensionManager.updateDimensionValue(editingDimension.dimensionId, newValue);

        setEditingDimension(null);
        updateStatus(`Line resized to ${newValue.toFixed(2)} mm`, 'success');
    }, [editingDimension, updateStatus]);

    // Handle dimension edit cancel
    const handleDimensionEditCancel = useCallback(() => {
        setEditingDimension(null);
    }, []);

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
                renderer.onBoxSelection = (items) => {
                    // For now, select the first element in the box selection
                    // Future: support multi-selection
                    if (items.length > 0) {
                        const first = items[0];
                        handleSelection(first.id, first.type, first.sketchId);
                    }
                };
                rendererRef.current = renderer;

                updateStatus('Connecting to CAD server...', 'info');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const client = new CADClient(apiUrl, sessionId);

                client.onGeometryUpdate((meshData: MeshData) => {
                    const modelId = `model-${Date.now()}-${++modelIdCounter}`;
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

                    // Pass sketch visualization data to dimension manager
                    rendererRef.current?.getDimensionManager().setSketchVisualizationData(data.sketch_id, data);
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

                    // Track line data for dimension manager
                    if (data.element_type === 'line' && data.parameters_2d) {
                        const { x1, y1, x2, y2 } = data.parameters_2d;
                        if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
                            rendererRef.current?.getDimensionManager().setElementData(
                                data.element_id,
                                data.sketch_id,
                                x1, y1, x2, y2
                            );
                        }
                    }

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

                    if (message.type === 'geometry_update' && message.payload) {
                        updateStatus('Agent created 3D geometry', 'success');
                        if (clientRef.current?.geometryUpdateCallback) {
                            clientRef.current.geometryUpdateCallback(message.payload);
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

    // Update renderer's selection callback when handleSelection changes
    // This ensures the callback has the current value of currentDrawingTool
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.onObjectSelected = handleSelection;
        }
    }, [handleSelection]);

    // Set up dimension manager callbacks for line resize
    useEffect(() => {
        if (!rendererRef.current) return;

        const dimensionManager = rendererRef.current.getDimensionManager();
        dimensionManager.setCallbacks({
            onLineResizeRequested: async (sketchId, elementId, newX1, newY1, newX2, newY2) => {
                if (!clientRef.current) return;

                try {
                    await clientRef.current.updateLineEndpoints(sketchId, elementId, newX1, newY1, newX2, newY2);
                    updateStatus('Line resized via dimension', 'success');
                } catch (error) {
                    console.error('Failed to resize line:', error);
                    updateStatus('Failed to resize line', 'error');
                }
            }
        });
    }, [updateStatus]);

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

            // Shift+D for dimension tool
            if (event.shiftKey && event.key === 'D') {
                event.preventDefault();
                handleSetDrawingTool('dimension');
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
                    if (editingDimension) {
                        setEditingDimension(null);
                    } else if (pendingDimension) {
                        setPendingDimension(null);
                        if (rendererRef.current) {
                            rendererRef.current.setHighlight(null);
                        }
                    } else if (pendingFilletChamfer) {
                        setPendingFilletChamfer(null);
                        if (rendererRef.current) {
                            rendererRef.current.setHighlight(null);
                        }
                    } else if (pendingOffset) {
                        setPendingOffset(null);
                        if (rendererRef.current) {
                            rendererRef.current.setHighlight(null);
                        }
                    } else if (pendingCopyMove) {
                        setPendingCopyMove(null);
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
                case 'w': case 'W':
                    handleSetDrawingTool('extend');
                    break;
                case 'm': case 'M':
                    handleSetDrawingTool('mirror');
                    break;
                case 'o': case 'O':
                    handleSetDrawingTool('offset');
                    break;
                case 'd': case 'D':
                    handleSetDrawingTool('copy');
                    break;
                case 'g': case 'G':
                    handleSetDrawingTool('move');
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
    }, [isPaletteOpen, isSceneTreeOpen, activeSketchId, currentDrawingTool, showInlineExtrude, pendingFace, pendingFilletChamfer, pendingOffset, pendingCopyMove, pendingDimension, editingDimension, handleConfirmSketchOnFace, handleSetDrawingTool, handleDeleteSelected, handleSelection, exitSketchMode, updateStatus]);

    return (
        <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: '#12141C' }}>
            {/* Full-screen 3D Viewport */}
            <div
                ref={viewportRef}
                className="w-full h-full relative"
                style={{
                    cursor: ['fillet', 'chamfer', 'trim', 'extend', 'mirror'].includes(currentDrawingTool)
                        ? 'cell'
                        : ['offset', 'copy', 'move'].includes(currentDrawingTool)
                            ? 'pointer'
                            : currentDrawingTool !== 'select'
                                ? 'crosshair'
                                : 'default'
                }}
                onDoubleClick={(e) => {
                    if (!rendererRef.current) return;
                    const dimensionId = rendererRef.current.getDimensionAtScreenPosition(e.clientX, e.clientY);
                    if (dimensionId) {
                        handleDimensionDoubleClick(dimensionId, e.clientX, e.clientY);
                    }
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

                {/* Inline Offset Input — appears after clicking an element with offset tool */}
                {pendingOffset && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl shadow-black/60"
                            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        >
                            <span className="text-[#D4A017] text-sm font-medium">Offset</span>
                            <input
                                ref={inlineOffsetRef}
                                type="number"
                                value={inlineOffsetValue}
                                onChange={(e) => setInlineOffsetValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInlineOffset();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setPendingOffset(null);
                                        if (rendererRef.current) {
                                            rendererRef.current.setHighlight(null);
                                        }
                                    }
                                }}
                                className="w-16 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                style={{ caretColor: '#D4A017' }}
                                autoFocus
                            />
                            <span className="text-[#5A5D6A] text-xs">{currentUnit}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPendingOffset(prev => prev ? { ...prev, direction: 'left' } : null)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        pendingOffset.direction === 'left'
                                            ? 'bg-[#D4A017] text-[#12141C]'
                                            : 'bg-[#2A2D3A] text-[#A0A3B0] hover:bg-[#3A3D4A]'
                                    }`}
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setPendingOffset(prev => prev ? { ...prev, direction: 'right' } : null)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        pendingOffset.direction === 'right'
                                            ? 'bg-[#D4A017] text-[#12141C]'
                                            : 'bg-[#2A2D3A] text-[#A0A3B0] hover:bg-[#3A3D4A]'
                                    }`}
                                >
                                    →
                                </button>
                            </div>
                            <span className="text-[#5A5D6A] text-[10px]">Enter to apply</span>
                        </div>
                    </div>
                )}

                {/* Inline Copy/Move Input — appears after clicking an element with copy or move tool */}
                {pendingCopyMove && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl shadow-black/60"
                            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        >
                            <span className="text-[#D4A017] text-sm font-medium capitalize">
                                {pendingCopyMove.tool}
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="text-[#6A6D7A] text-xs">X:</span>
                                <input
                                    ref={inlineCopyMoveXRef}
                                    type="number"
                                    value={inlineCopyMoveX}
                                    onChange={(e) => setInlineCopyMoveX(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleInlineCopyMove();
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setPendingCopyMove(null);
                                            if (rendererRef.current) {
                                                rendererRef.current.setHighlight(null);
                                            }
                                        }
                                    }}
                                    className="w-14 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                    style={{ caretColor: '#D4A017' }}
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[#6A6D7A] text-xs">Y:</span>
                                <input
                                    type="number"
                                    value={inlineCopyMoveY}
                                    onChange={(e) => setInlineCopyMoveY(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleInlineCopyMove();
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setPendingCopyMove(null);
                                            if (rendererRef.current) {
                                                rendererRef.current.setHighlight(null);
                                            }
                                        }
                                    }}
                                    className="w-14 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                    style={{ caretColor: '#D4A017' }}
                                />
                            </div>
                            {pendingCopyMove.tool === 'copy' && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[#6A6D7A] text-xs">#:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={inlineCopyMoveCount}
                                        onChange={(e) => setInlineCopyMoveCount(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleInlineCopyMove();
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setPendingCopyMove(null);
                                                if (rendererRef.current) {
                                                    rendererRef.current.setHighlight(null);
                                                }
                                            }
                                        }}
                                        className="w-10 bg-[#12141C] text-[#E8DCC8] text-sm px-2 py-1 rounded outline-none border border-[#2A2D3A] focus:border-[#D4A017] transition-colors"
                                        style={{ caretColor: '#D4A017' }}
                                    />
                                </div>
                            )}
                            <span className="text-[#5A5D6A] text-xs">{currentUnit}</span>
                            <span className="text-[#5A5D6A] text-[10px]">Enter to apply</span>
                        </div>
                    </div>
                )}

                {/* Dimension Edit Input */}
                {editingDimension && (
                    <DimensionInput
                        value={editingDimension.value}
                        position={editingDimension.screenPosition}
                        onSubmit={handleDimensionValueSubmit}
                        onCancel={handleDimensionEditCancel}
                    />
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
