'use client';

import React from 'react';

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

interface UIManagerProps {
    createdPlanes: CreatedPlane[];
    createdSketches: CreatedSketch[];
    createdShapes: CreatedShape[];
    selectedObject: { id: string; type: string; } | null;
    onSelection: (id: string | null, type: string | null) => void;
}

export function UIManager({ 
    createdPlanes, 
    createdSketches, 
    createdShapes, 
    selectedObject, 
    onSelection 
}: UIManagerProps) {
    const handleItemClick = (id: string, type: string) => {
        onSelection(id, type);
    };

    const isSelected = (id: string, type: string) => {
        return selectedObject?.id === id && selectedObject?.type === type;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-gray-300 bg-gray-50">
                <h3 className="font-semibold text-gray-800">Scene Tree</h3>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {createdPlanes.length === 0 && createdShapes.length === 0 ? (
                    <div className="text-gray-500 text-center text-sm">
                        No objects in scene
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Shapes */}
                        {createdShapes.map((shape) => (
                            <div
                                key={`shape-${shape.id}`}
                                className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100 ${
                                    isSelected(shape.id, 'feature') ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                                }`}
                                onClick={() => handleItemClick(shape.id, 'feature')}
                            >
                                📦 {shape.type} ({shape.id})
                            </div>
                        ))}

                        {/* Planes and their children */}
                        {createdPlanes.map((plane) => (
                            <div key={`plane-${plane.plane_id}`} className="space-y-1">
                                <div
                                    className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100 ${
                                        isSelected(plane.plane_id, 'plane') ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                                    }`}
                                    onClick={() => handleItemClick(plane.plane_id, 'plane')}
                                >
                                    🗂️ {plane.plane_type} Plane ({plane.plane_id})
                                </div>

                                {/* Sketches on this plane */}
                                {createdSketches
                                    .filter((sketch) => sketch.plane_id === plane.plane_id)
                                    .map((sketch) => (
                                        <div key={`sketch-${sketch.sketch_id}`} className="ml-4 space-y-1">
                                            <div
                                                className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100 ${
                                                    isSelected(sketch.sketch_id, 'sketch') ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                                                }`}
                                                onClick={() => handleItemClick(sketch.sketch_id, 'sketch')}
                                            >
                                                ✏️ Sketch ({sketch.sketch_id}) - {sketch.elements.length} elements
                                            </div>

                                            {/* Elements in this sketch */}
                                            {sketch.elements.map((element) => (
                                                <div
                                                    key={`element-${element.id}`}
                                                    className={`ml-4 px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100 ${
                                                        isSelected(element.id, 'element') ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                                                    }`}
                                                    onClick={() => handleItemClick(element.id, 'element')}
                                                >
                                                    {element.type === 'line' ? '📏' : '⭕'} {element.type.charAt(0).toUpperCase() + element.type.slice(1)} ({element.id})
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 