'use client';

import React, { useState, useCallback } from 'react';
import { CADClient } from '@/lib/cad/api/cad-client';

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

interface ControlsPanelProps {
    client: CADClient | null;
    createdShapes: CreatedShape[];
    createdPlanes: CreatedPlane[];
    createdSketches: CreatedSketch[];
    selectedObject: { id: string; type: string; } | null;
    onUpdateShapes: React.Dispatch<React.SetStateAction<CreatedShape[]>>;
    onUpdatePlanes: React.Dispatch<React.SetStateAction<CreatedPlane[]>>;
    onUpdateSketches: React.Dispatch<React.SetStateAction<CreatedSketch[]>>;
    onUpdateStatus: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    onClearRenderer?: () => void;
}

export function ControlsPanel({
    client,
    createdShapes,
    createdPlanes,
    createdSketches,
    selectedObject,
    onUpdateShapes,
    onUpdatePlanes,
    onUpdateSketches,
    onUpdateStatus,
    onClearRenderer
}: ControlsPanelProps) {
    // Form states
    const [planeType, setPlaneType] = useState('XY');
    const [planeOrigin, setPlaneOrigin] = useState({ x: 0, y: 0, z: 0 });
    const [selectedPlane, setSelectedPlane] = useState('');
    const [selectedSketch, setSelectedSketch] = useState('');
    const [elementType, setElementType] = useState('line');
    const [lineParams, setLineParams] = useState({ x1: 0, y1: 0, x2: 10, y2: 10 });
    const [circleParams, setCircleParams] = useState({ x: 0, y: 0, radius: 5 });
    const [rectangleParams, setRectangleParams] = useState({ x: 0, y: 0, width: 10, height: 5 });
    const [arcParams, setArcParams] = useState({ 
        type: 'center_radius' as 'center_radius' | 'three_points' | 'endpoints_radius',
        center: [0, 0] as [number, number], 
        radius: 5, 
        startAngle: 0, 
        endAngle: 90 
    });
    const [polygonParams, setPolygonParams] = useState({ center: [0, 0] as [number, number], sides: 6, radius: 5 });
    const [extrudeDistance, setExtrudeDistance] = useState(10);
    
    // Tool parameters
    const [filletRadius, setFilletRadius] = useState(1);
    const [chamferDistance, setChamferDistance] = useState(1);
    const [selectedElement1, setSelectedElement1] = useState('');
    const [selectedElement2, setSelectedElement2] = useState('');
    const [offsetDistance, setOffsetDistance] = useState(2);
    const [translation, setTranslation] = useState({ x: 10, y: 10 });
    const [mirrorLine, setMirrorLine] = useState({ 
        point1: [0, 0] as [number, number], 
        point2: [10, 0] as [number, number] 
    });
    const [arrayDirection, setArrayDirection] = useState({ x: 10, y: 0 });
    const [arrayCount, setArrayCount] = useState(3);

    const createSketchPlane = useCallback(async () => {
        if (!client) return;
        
        try {
            onUpdateStatus(`Creating ${planeType} plane...`, 'info');
            
            const response = await client.createSketchPlane(
                planeType as any,
                [planeOrigin.x, planeOrigin.y, planeOrigin.z]
            );
            
            if (response.success && response.data) {
                // State will be updated via WebSocket notification to avoid duplicates
                onUpdateStatus(`✅ Created plane: ${response.data.plane_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch plane:', error);
            onUpdateStatus(`❌ Error creating plane: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, planeType, planeOrigin, onUpdateStatus]);

    const createSketch = useCallback(async () => {
        if (!client || !selectedPlane) return;
        
        try {
            onUpdateStatus(`Creating sketch on plane ${selectedPlane}...`, 'info');
            
            const response = await client.createSketch(selectedPlane);
            
            if (response.success && response.data) {
                // State will be updated via WebSocket notification to avoid duplicates
                onUpdateStatus(`✅ Created sketch: ${response.data.sketch_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch:', error);
            onUpdateStatus(`❌ Error creating sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedPlane, onUpdateStatus]);

    const addSketchElement = useCallback(async () => {
        if (!client || !selectedSketch) return;
        
        try {
            onUpdateStatus(`Adding ${elementType}...`, 'info');
            
            let response;
            if (elementType === 'line') {
                response = await client.addLineToSketch(
                    selectedSketch,
                    lineParams.x1,
                    lineParams.y1,
                    lineParams.x2,
                    lineParams.y2
                );
            } else if (elementType === 'circle') {
                response = await client.addCircleToSketch(
                    selectedSketch,
                    circleParams.x,
                    circleParams.y,
                    circleParams.radius
                );
            } else if (elementType === 'rectangle') {
                response = await client.addRectangleToSketch(
                    selectedSketch,
                    [rectangleParams.x, rectangleParams.y],
                    rectangleParams.width,
                    rectangleParams.height
                );
            } else if (elementType === 'arc') {
                response = await client.addArcToSketch(selectedSketch, {
                    type: arcParams.type,
                    center: arcParams.center,
                    radius: arcParams.radius,
                    start_angle: arcParams.startAngle * Math.PI / 180, // Convert to radians
                    end_angle: arcParams.endAngle * Math.PI / 180
                });
            } else if (elementType === 'polygon') {
                response = await client.addPolygonToSketch(
                    selectedSketch,
                    polygonParams.center,
                    polygonParams.sides,
                    polygonParams.radius
                );
            } else {
                return;
            }
            
            if (response.success && response.data) {
                // State will be updated via WebSocket notification to avoid duplicates
                onUpdateStatus(`✅ Added ${elementType} to sketch`, 'success');
            }
        } catch (error) {
            console.error('Failed to add sketch element:', error);
            onUpdateStatus(`❌ Error adding element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, elementType, lineParams, circleParams, rectangleParams, arcParams, polygonParams, onUpdateStatus]);

    const extrudeFeature = useCallback(async () => {
        if (!client || !selectedObject) return;
        
        try {
            const { id: selectedId, type: selectedType } = selectedObject;
            
            let sketchId: string | undefined;
            let elementId: string | undefined;
            
            if (selectedType === 'sketch') {
                sketchId = selectedId;
            } else if (selectedType === 'element') {
                // Find the sketch that contains this element
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
                onUpdateStatus('❌ Please select a sketch or element to extrude', 'error');
                return;
            }
            
            onUpdateStatus(`Extruding ${elementId ? `element ${elementId}` : `sketch ${sketchId}`}...`, 'info');
            
            const response = await client.extrudeFeature(sketchId, extrudeDistance, elementId);
            
            if (response.success && response.data) {
                // State and renderer will be updated via WebSocket notification to avoid duplicates
                onUpdateStatus(`✅ Extruded object: ${response.data.feature_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to extrude feature:', error);
            onUpdateStatus(`❌ Error extruding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedObject, extrudeDistance, createdSketches, onUpdateStatus]);

    // New tool functions
    const addChamfer = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1 || !selectedElement2) {
            onUpdateStatus('Please select two elements for chamfer', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Adding chamfer...', 'info');
            const response = await client.addChamferToSketch(selectedSketch, selectedElement1, selectedElement2, chamferDistance);
            if (response.success) {
                onUpdateStatus('✅ Added chamfer', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error adding chamfer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, selectedElement2, chamferDistance, onUpdateStatus]);

    const trimLine = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1 || !selectedElement2) {
            onUpdateStatus('Please select line to trim and cutting line', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Trimming line...', 'info');
            const response = await client.trimLineToLine(selectedSketch, selectedElement1, selectedElement2);
            if (response.success) {
                onUpdateStatus('✅ Trimmed line', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error trimming line: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, selectedElement2, onUpdateStatus]);

    const extendLine = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1 || !selectedElement2) {
            onUpdateStatus('Please select line to extend and target line', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Extending line...', 'info');
            const response = await client.extendLineToLine(selectedSketch, selectedElement1, selectedElement2);
            if (response.success) {
                onUpdateStatus('✅ Extended line', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error extending line: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, selectedElement2, onUpdateStatus]);

    const mirrorElement = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element to mirror', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Mirroring element...', 'info');
            const response = await client.mirrorElement(selectedSketch, selectedElement1, mirrorLine);
            if (response.success) {
                onUpdateStatus('✅ Mirrored element', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error mirroring element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, mirrorLine, onUpdateStatus]);

    const offsetElement = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element to offset', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Offsetting element...', 'info');
            const response = await client.offsetElement(selectedSketch, selectedElement1, offsetDistance);
            if (response.success) {
                onUpdateStatus('✅ Offset element', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error offsetting element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, offsetDistance, onUpdateStatus]);

    const copyElement = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element to copy', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Copying element...', 'info');
            const response = await client.copyElement(selectedSketch, selectedElement1, [translation.x, translation.y]);
            if (response.success) {
                onUpdateStatus('✅ Copied element', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error copying element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, translation, onUpdateStatus]);

    const moveElement = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element to move', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Moving element...', 'info');
            const response = await client.moveElement(selectedSketch, selectedElement1, [translation.x, translation.y]);
            if (response.success) {
                onUpdateStatus('✅ Moved element', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error moving element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, translation, onUpdateStatus]);

    const createLinearArray = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element for linear array', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Creating linear array...', 'info');
            const response = await client.createLinearArray(selectedSketch, selectedElement1, [arrayDirection.x, arrayDirection.y], arrayCount);
            if (response.success) {
                onUpdateStatus('✅ Created linear array', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error creating linear array: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, arrayDirection, arrayCount, onUpdateStatus]);

    const createMirrorArray = useCallback(async () => {
        if (!client || !selectedSketch || !selectedElement1) {
            onUpdateStatus('Please select an element for mirror array', 'warning');
            return;
        }
        
        try {
            onUpdateStatus('Creating mirror array...', 'info');
            const response = await client.createMirrorArray(selectedSketch, selectedElement1, mirrorLine);
            if (response.success) {
                onUpdateStatus('✅ Created mirror array', 'success');
            }
        } catch (error) {
            onUpdateStatus(`❌ Error creating mirror array: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedSketch, selectedElement1, mirrorLine, onUpdateStatus]);

    const clearAllShapes = useCallback(() => {
        if (onClearRenderer) {
            onClearRenderer();
        }
        onUpdateShapes([]);
        onUpdatePlanes([]);
        onUpdateSketches([]);
        onUpdateStatus('Cleared all shapes and visualizations', 'info');
    }, [onClearRenderer, onUpdateShapes, onUpdatePlanes, onUpdateSketches, onUpdateStatus]);

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">CAD Controls</h2>
                </div>

                {/* Sketch Plane Section */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">1. Create Sketch Plane</h3>
                    <div className="space-y-2">
                        <select
                            value={planeType}
                            onChange={(e) => setPlaneType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="XY">XY Plane</option>
                            <option value="XZ">XZ Plane</option>
                            <option value="YZ">YZ Plane</option>
                        </select>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="number"
                                placeholder="X"
                                value={planeOrigin.x}
                                onChange={(e) => setPlaneOrigin(prev => ({ ...prev, x: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Y"
                                value={planeOrigin.y}
                                onChange={(e) => setPlaneOrigin(prev => ({ ...prev, y: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Z"
                                value={planeOrigin.z}
                                onChange={(e) => setPlaneOrigin(prev => ({ ...prev, z: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        
                        <button
                            onClick={createSketchPlane}
                            disabled={!client}
                            className="w-full px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300"
                        >
                            Create Plane
                        </button>
                    </div>
                </div>

                {/* Sketch Section */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">2. Create Sketch</h3>
                    <div className="space-y-2">
                        <select
                            value={selectedPlane}
                            onChange={(e) => setSelectedPlane(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">Select a plane</option>
                            {createdPlanes.map(plane => (
                                <option key={plane.plane_id} value={plane.plane_id}>
                                    {plane.plane_id} ({plane.plane_type})
                                </option>
                            ))}
                        </select>
                        
                        <button
                            onClick={createSketch}
                            disabled={!client || !selectedPlane}
                            className="w-full px-3 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 disabled:bg-gray-300"
                        >
                            Create Sketch
                        </button>
                    </div>
                </div>

                {/* Sketch Elements Section */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">3. Add Sketch Elements</h3>
                    <div className="space-y-2">
                        <select
                            value={selectedSketch}
                            onChange={(e) => setSelectedSketch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">Select a sketch</option>
                            {createdSketches.map(sketch => (
                                <option key={sketch.sketch_id} value={sketch.sketch_id}>
                                    {sketch.sketch_id} ({sketch.elements.length} elements)
                                </option>
                            ))}
                        </select>
                        
                        <select
                            value={elementType}
                            onChange={(e) => setElementType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="line">Line</option>
                            <option value="circle">Circle</option>
                            <option value="rectangle">Rectangle</option>
                            <option value="arc">Arc</option>
                            <option value="polygon">Polygon</option>
                        </select>
                        
                        {elementType === 'line' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="X1"
                                        value={lineParams.x1}
                                        onChange={(e) => setLineParams(prev => ({ ...prev, x1: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Y1"
                                        value={lineParams.y1}
                                        onChange={(e) => setLineParams(prev => ({ ...prev, y1: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="X2"
                                        value={lineParams.x2}
                                        onChange={(e) => setLineParams(prev => ({ ...prev, x2: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Y2"
                                        value={lineParams.y2}
                                        onChange={(e) => setLineParams(prev => ({ ...prev, y2: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {elementType === 'circle' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Center X"
                                        value={circleParams.x}
                                        onChange={(e) => setCircleParams(prev => ({ ...prev, x: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Center Y"
                                        value={circleParams.y}
                                        onChange={(e) => setCircleParams(prev => ({ ...prev, y: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <input
                                    type="number"
                                    placeholder="Radius"
                                    value={circleParams.radius}
                                    onChange={(e) => setCircleParams(prev => ({ ...prev, radius: Number(e.target.value) }))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                            </div>
                        )}
                        
                        {elementType === 'rectangle' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Corner X"
                                        value={rectangleParams.x}
                                        onChange={(e) => setRectangleParams(prev => ({ ...prev, x: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Corner Y"
                                        value={rectangleParams.y}
                                        onChange={(e) => setRectangleParams(prev => ({ ...prev, y: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Width"
                                        value={rectangleParams.width}
                                        onChange={(e) => setRectangleParams(prev => ({ ...prev, width: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Height"
                                        value={rectangleParams.height}
                                        onChange={(e) => setRectangleParams(prev => ({ ...prev, height: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {elementType === 'arc' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Center X"
                                        value={arcParams.center[0]}
                                        onChange={(e) => setArcParams(prev => ({ ...prev, center: [Number(e.target.value), prev.center[1]] }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Center Y"
                                        value={arcParams.center[1]}
                                        onChange={(e) => setArcParams(prev => ({ ...prev, center: [prev.center[0], Number(e.target.value)] }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <input
                                    type="number"
                                    placeholder="Radius"
                                    value={arcParams.radius}
                                    onChange={(e) => setArcParams(prev => ({ ...prev, radius: Number(e.target.value) }))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Start Angle (°)"
                                        value={arcParams.startAngle}
                                        onChange={(e) => setArcParams(prev => ({ ...prev, startAngle: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="End Angle (°)"
                                        value={arcParams.endAngle}
                                        onChange={(e) => setArcParams(prev => ({ ...prev, endAngle: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {elementType === 'polygon' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Center X"
                                        value={polygonParams.center[0]}
                                        onChange={(e) => setPolygonParams(prev => ({ ...prev, center: [Number(e.target.value), prev.center[1]] }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Center Y"
                                        value={polygonParams.center[1]}
                                        onChange={(e) => setPolygonParams(prev => ({ ...prev, center: [prev.center[0], Number(e.target.value)] }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Sides"
                                        min="3"
                                        value={polygonParams.sides}
                                        onChange={(e) => setPolygonParams(prev => ({ ...prev, sides: Math.max(3, Number(e.target.value)) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Radius"
                                        value={polygonParams.radius}
                                        onChange={(e) => setPolygonParams(prev => ({ ...prev, radius: Number(e.target.value) }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={addSketchElement}
                            disabled={!client || !selectedSketch}
                            className="w-full px-3 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 disabled:bg-gray-300"
                        >
                            Add {elementType}
                        </button>
                    </div>
                </div>

                {/* Extrude Section */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">4. Extrude Feature</h3>
                    <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                            {selectedObject ? (
                                `Selected: ${selectedObject.type} (${selectedObject.id})`
                            ) : (
                                'Select a sketch or element to extrude'
                            )}
                        </div>
                        
                        <input
                            type="number"
                            placeholder="Extrude Distance"
                            value={extrudeDistance}
                            onChange={(e) => setExtrudeDistance(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        
                        <button
                            onClick={extrudeFeature}
                            disabled={!client || !selectedObject || (selectedObject.type !== 'sketch' && selectedObject.type !== 'element')}
                            className="w-full px-3 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 disabled:bg-gray-300"
                        >
                            Extrude Feature
                        </button>
                    </div>
                </div>

                {/* 2D Modification Tools */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">5. Modification Tools</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={selectedElement1}
                                onChange={(e) => setSelectedElement1(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="">Element 1</option>
                                {createdSketches.find(s => s.sketch_id === selectedSketch)?.elements.map(el => (
                                    <option key={el.id} value={el.id}>{el.id} ({el.type})</option>
                                ))}
                            </select>
                            <select
                                value={selectedElement2}
                                onChange={(e) => setSelectedElement2(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="">Element 2</option>
                                {createdSketches.find(s => s.sketch_id === selectedSketch)?.elements.map(el => (
                                    <option key={el.id} value={el.id}>{el.id} ({el.type})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                placeholder="Fillet Radius"
                                value={filletRadius}
                                onChange={(e) => setFilletRadius(Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                                onClick={() => client?.addFilletToSketch(selectedSketch, selectedElement1, selectedElement2, filletRadius)}
                                disabled={!client || !selectedSketch || !selectedElement1 || !selectedElement2}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
                            >
                                Fillet
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                placeholder="Chamfer Distance"
                                value={chamferDistance}
                                onChange={(e) => setChamferDistance(Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                                onClick={addChamfer}
                                disabled={!client || !selectedSketch || !selectedElement1 || !selectedElement2}
                                className="px-2 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 disabled:bg-gray-300"
                            >
                                Chamfer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Positioning Tools */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">6. Positioning Tools</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={trimLine}
                                disabled={!client || !selectedSketch || !selectedElement1 || !selectedElement2}
                                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-300"
                            >
                                Trim
                            </button>
                            <button
                                onClick={extendLine}
                                disabled={!client || !selectedSketch || !selectedElement1 || !selectedElement2}
                                className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300"
                            >
                                Extend
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                placeholder="Offset Distance"
                                value={offsetDistance}
                                onChange={(e) => setOffsetDistance(Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                                onClick={offsetElement}
                                disabled={!client || !selectedSketch || !selectedElement1}
                                className="px-2 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-300"
                            >
                                Offset
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                placeholder="Translate X"
                                value={translation.x}
                                onChange={(e) => setTranslation(prev => ({ ...prev, x: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Translate Y"
                                value={translation.y}
                                onChange={(e) => setTranslation(prev => ({ ...prev, y: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={copyElement}
                                disabled={!client || !selectedSketch || !selectedElement1}
                                className="px-2 py-1 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600 disabled:bg-gray-300"
                            >
                                Copy
                            </button>
                            <button
                                onClick={moveElement}
                                disabled={!client || !selectedSketch || !selectedElement1}
                                className="px-2 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 disabled:bg-gray-300"
                            >
                                Move
                            </button>
                        </div>
                        
                        <button
                            onClick={mirrorElement}
                            disabled={!client || !selectedSketch || !selectedElement1}
                            className="w-full px-2 py-1 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 disabled:bg-gray-300"
                        >
                            Mirror
                        </button>
                    </div>
                </div>

                {/* Pattern Tools */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">7. Pattern Tools</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                            <input
                                type="number"
                                placeholder="Dir X"
                                value={arrayDirection.x}
                                onChange={(e) => setArrayDirection(prev => ({ ...prev, x: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Dir Y"
                                value={arrayDirection.y}
                                onChange={(e) => setArrayDirection(prev => ({ ...prev, y: Number(e.target.value) }))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Count"
                                min="2"
                                value={arrayCount}
                                onChange={(e) => setArrayCount(Math.max(2, Number(e.target.value)))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={createLinearArray}
                                disabled={!client || !selectedSketch || !selectedElement1}
                                className="px-2 py-1 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 disabled:bg-gray-300"
                            >
                                Linear Array
                            </button>
                            <button
                                onClick={createMirrorArray}
                                disabled={!client || !selectedSketch || !selectedElement1}
                                className="px-2 py-1 bg-violet-500 text-white rounded text-sm hover:bg-violet-600 disabled:bg-gray-300"
                            >
                                Mirror Array
                            </button>
                        </div>
                    </div>
                </div>

                {/* Utility Section */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Utilities</h3>
                    <button
                        onClick={clearAllShapes}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                    >
                        Clear All
                    </button>
                </div>

                {/* View Controls */}
                <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">View Controls</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-gray-600">Ctrl+1: Front</div>
                        <div className="text-gray-600">Ctrl+2: Top</div>
                        <div className="text-gray-600">Ctrl+3: Right</div>
                        <div className="text-gray-600">Ctrl+0: Iso</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 