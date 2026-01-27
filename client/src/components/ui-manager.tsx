'use client';

import React, { useState, useEffect } from 'react';

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
    // State for collapsed/expanded containers (default to expanded for better UX)
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    const [seenContainers, setSeenContainers] = useState<Set<string>>(new Set());

    // Auto-expand new containers for better UX
    useEffect(() => {
        const allContainerIds = new Set<string>();
        const newContainerIds = new Set<string>();
        
        createdSketches.forEach(sketch => {
            sketch.elements.forEach(element => {
                if (element.is_container_only) {
                    allContainerIds.add(element.id);
                    if (!seenContainers.has(element.id)) {
                        newContainerIds.add(element.id);
                    }
                }
            });
        });
        
        if (newContainerIds.size > 0) {
            console.log('🆕 Auto-expanding new containers:', Array.from(newContainerIds));
            setExpandedContainers(prev => new Set([...prev, ...newContainerIds]));
            setSeenContainers(prev => new Set([...prev, ...newContainerIds]));
        }
    }, [createdSketches, seenContainers]);

    const handleItemClick = (id: string, type: string) => {
        onSelection(id, type);
    };

    const isSelected = (id: string, type: string) => {
        return selectedObject?.id === id && selectedObject?.type === type;
    };

    const toggleContainer = (elementId: string) => {
        console.log('🔄 Toggle container clicked:', elementId);
        setExpandedContainers(prev => {
            const next = new Set(prev);
            const wasExpanded = next.has(elementId);
            if (wasExpanded) {
                next.delete(elementId);
                console.log('📁 Collapsed container:', elementId);
            } else {
                next.add(elementId);
                console.log('📂 Expanded container:', elementId);
            }
            console.log('📊 Updated expanded containers:', Array.from(next));
            return next;
        });
    };

    const getElementIcon = (element: SketchElementInfo) => {
        if (element.is_container_only) {
            // Different icons for container elements
            switch (element.type) {
                case 'rectangle': return '▭';
                case 'polygon': return '⬢';
                default: return '📁';
            }
        } else {
            // Regular icons for rendered elements
            switch (element.type) {
                case 'line': return '📏';
                case 'circle': return '⭕';
                case 'rectangle': return '▭';
                case 'polygon': return '⬢';
                case 'arc': return '🌙';
                case 'chamfer': return '📏';
                case 'fillet': return '📏';
                default: return '◾';
            }
        }
    };

    // Helper function to determine if an element belongs to a container
    const getElementContainer = (element: SketchElementInfo, allElements: SketchElementInfo[]): string | null => {
        // If element has explicit parent_id, use that
        if (element.parent_id) {
            console.log('📎 Using explicit parent_id for', element.id, '→', element.parent_id);
            return element.parent_id;
        }

        // Check if element is a direct child of a container based on naming pattern
        // e.g., "rectangle_1_8122_line_bottom" belongs to "rectangle_1_8122"
        const containers = allElements.filter(el => el.is_container_only);
        for (const container of containers) {
            if (element.id.startsWith(container.id + '_line_')) {
                console.log('🔗 Found direct child', element.id, 'of container', container.id);
                return container.id;
            }
        }

        // For chamfer/fillet lines, try to find the parent rectangle/polygon they belong to
        if (element.type === 'line' && (element.id.includes('chamfer_') || element.id.includes('fillet_'))) {
            // Look for container elements that have child lines from the same base shape
            for (const container of containers) {
                // Check if there are any child lines from this container in the sketch
                const hasChildLines = allElements.some(el => 
                    el.id.startsWith(container.id + '_line_') && el.type === 'line'
                );
                
                if (hasChildLines) {
                    console.log('🔗 Associating chamfer/fillet', element.id, 'with container', container.id);
                    return container.id;
                }
            }
            
            console.log('❓ No container found for chamfer/fillet', element.id);
        }

        return null;
    };

    // Helper function to build hierarchical structure
    const buildElementHierarchy = (elements: SketchElementInfo[]) => {
        const containers: SketchElementInfo[] = [];
        const orphans: SketchElementInfo[] = [];
        const childMap = new Map<string, SketchElementInfo[]>();

        console.log('🏗️ Building hierarchy for', elements.length, 'elements:', elements.map(e => `${e.id}(${e.type}${e.is_container_only ? ', container' : ''})`));

        // First pass: identify containers and build child map
        for (const element of elements) {
            if (element.is_container_only) {
                containers.push(element);
                childMap.set(element.id, []);
                console.log('📦 Found container:', element.id, 'type:', element.type);
            }
        }

        // Second pass: assign children to containers or mark as orphans
        for (const element of elements) {
            if (!element.is_container_only) {
                const containerId = getElementContainer(element, elements);
                if (containerId && childMap.has(containerId)) {
                    childMap.get(containerId)!.push(element);
                    console.log('👶 Assigned child', element.id, 'to container', containerId);
                } else {
                    orphans.push(element);
                    console.log('🏠 Orphan element:', element.id);
                }
            }
        }

        console.log('📊 Hierarchy result:', {
            containers: containers.length,
            orphans: orphans.length,
            childMappings: Array.from(childMap.entries()).map(([id, children]) => ({ containerId: id, childCount: children.length }))
        });

        return { containers, childMap, orphans };
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-zinc-700 bg-zinc-800">
                <h3 className="font-semibold text-zinc-200">Scene Tree</h3>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto p-3">
                {createdPlanes.length === 0 && createdShapes.length === 0 ? (
                    <div className="text-zinc-500 text-center text-sm">
                        No objects in scene
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Shapes */}
                        {createdShapes.map((shape) => (
                            <div
                                key={`shape-${shape.id}`}
                                className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 ${
                                    isSelected(shape.id, 'feature') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
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
                                    className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 ${
                                        isSelected(plane.plane_id, 'plane') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
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
                                                className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 ${
                                                    isSelected(sketch.sketch_id, 'sketch') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
                                                }`}
                                                onClick={() => handleItemClick(sketch.sketch_id, 'sketch')}
                                            >
                                                {sketch.sketch_id} - {sketch.elements.length} elements
                                            </div>

                                            {/* Elements in this sketch - hierarchical view */}
                                            {(() => {
                                                const { containers, childMap, orphans } = buildElementHierarchy(sketch.elements);

                                                return (
                                                    <>
                                                        {/* Container elements with their children */}
                                                        {containers.map((container) => {
                                                            const isExpanded = expandedContainers.has(container.id);
                                                            const children = childMap.get(container.id) || [];

                                                            return (
                                                                <div key={`container-${container.id}`} className="ml-4">
                                                                    {/* Container header */}
                                                                    <div
                                                                        className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 flex items-center ${
                                                                            isSelected(container.id, 'element') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
                                                                        } ${container.is_container_only ? 'italic text-zinc-400' : ''}`}
                                                                        onClick={() => handleItemClick(container.id, 'element')}
                                                                        title={container.is_container_only ? 'Container (not rendered)' : undefined}
                                                                    >
                                                                        {/* Expand/collapse button */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleContainer(container.id);
                                                                            }}
                                                                            className="mr-1 w-4 h-4 flex items-center justify-center hover:bg-zinc-600 rounded"
                                                                        >
                                                                            {isExpanded ? '▼' : '▶'}
                                                                        </button>
                                                                        {getElementIcon(container)} {container.type.charAt(0).toUpperCase() + container.type.slice(1)} ({container.id})
                                                                        <span className="ml-1 text-xs text-zinc-500">({children.length} items)</span>
                                                                    </div>

                                                                    {/* Children elements (collapsible) */}
                                                                    {isExpanded && children.map((child) => (
                                                                        <div
                                                                            key={`child-${child.id}`}
                                                                            className={`ml-6 px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 ${
                                                                                isSelected(child.id, 'element') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
                                                                            }`}
                                                                            onClick={() => handleItemClick(child.id, 'element')}
                                                                        >
                                                                            {getElementIcon(child)} {child.type.charAt(0).toUpperCase() + child.type.slice(1)} ({child.id})
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Orphan elements (no container) */}
                                                        {orphans.map((element) => (
                                                            <div
                                                                key={`orphan-${element.id}`}
                                                                className={`ml-4 px-2 py-1 text-sm cursor-pointer rounded hover:bg-zinc-700 ${
                                                                    isSelected(element.id, 'element') ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-200'
                                                                }`}
                                                                onClick={() => handleItemClick(element.id, 'element')}
                                                            >
                                                                {getElementIcon(element)} {element.type.charAt(0).toUpperCase() + element.type.slice(1)} ({element.id})
                                                            </div>
                                                        ))}
                                                    </>
                                                );
                                            })()}
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