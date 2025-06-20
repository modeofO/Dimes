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
    const [extrudeDistance, setExtrudeDistance] = useState(10);

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
    }, [client, selectedSketch, elementType, lineParams, circleParams, onUpdateStatus]);

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