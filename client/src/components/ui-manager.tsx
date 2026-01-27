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
    is_container_only?: boolean;
    parent_id?: string;
    child_ids?: string[];
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
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    const [seenContainers, setSeenContainers] = useState<Set<string>>(new Set());

    // Auto-expand new containers
    useEffect(() => {
        const newContainerIds = new Set<string>();
        createdSketches.forEach(sketch => {
            sketch.elements.forEach(element => {
                if (element.is_container_only && !seenContainers.has(element.id)) {
                    newContainerIds.add(element.id);
                }
            });
        });
        if (newContainerIds.size > 0) {
            setExpandedContainers(prev => new Set([...prev, ...newContainerIds]));
            setSeenContainers(prev => new Set([...prev, ...newContainerIds]));
        }
    }, [createdSketches, seenContainers]);

    // --- Display name helpers ---

    const formatShapeName = (shape: CreatedShape, index: number) => {
        if (shape.type === 'CAD Model') return `Model ${index + 1}`;
        return `${shape.type} ${index + 1}`;
    };

    const formatPlaneName = (plane: CreatedPlane) => {
        const sameType = createdPlanes.filter(p => p.plane_type === plane.plane_type);
        if (sameType.length > 1) {
            return `${plane.plane_type} Plane ${sameType.indexOf(plane) + 1}`;
        }
        return `${plane.plane_type} Plane`;
    };

    const formatSketchName = (sketch: CreatedSketch) => {
        const sketches = createdSketches.filter(s => s.plane_id === sketch.plane_id);
        const sketchIndex = sketches.indexOf(sketch) + 1;
        return `Sketch ${sketchIndex}`;
    };

    const formatElementName = (element: SketchElementInfo): string => {
        const id = element.id;

        if (element.is_container_only) {
            return element.type.charAt(0).toUpperCase() + element.type.slice(1);
        }

        // Rectangle children: "xxx_line_bottom" → "Bottom Edge"
        const rectSide = id.match(/_line_(top|bottom|left|right)$/);
        if (rectSide) {
            return `${rectSide[1].charAt(0).toUpperCase() + rectSide[1].slice(1)} Edge`;
        }

        // Polygon children: "xxx_line_0" → "Side 1"
        const polySide = id.match(/_line_(\d+)$/);
        if (polySide) {
            return `Side ${parseInt(polySide[1]) + 1}`;
        }

        // Chamfer/fillet
        if (id.includes('chamfer_')) return 'Chamfer';
        if (id.includes('fillet_')) return 'Fillet';

        return element.type.charAt(0).toUpperCase() + element.type.slice(1);
    };

    // --- Interaction ---

    const handleItemClick = (id: string, type: string) => {
        onSelection(id, type);
    };

    const isSelected = (id: string, type: string) => {
        return selectedObject?.id === id && selectedObject?.type === type;
    };

    const toggleContainer = (elementId: string) => {
        setExpandedContainers(prev => {
            const next = new Set(prev);
            if (next.has(elementId)) {
                next.delete(elementId);
            } else {
                next.add(elementId);
            }
            return next;
        });
    };

    // --- Hierarchy builder ---

    const getElementContainer = (element: SketchElementInfo, allElements: SketchElementInfo[]): string | null => {
        if (element.parent_id) return element.parent_id;

        const containers = allElements.filter(el => el.is_container_only);
        for (const container of containers) {
            if (element.id.startsWith(container.id + '_line_')) {
                return container.id;
            }
        }

        if (element.type === 'line' && (element.id.includes('chamfer_') || element.id.includes('fillet_'))) {
            for (const container of containers) {
                const hasChildLines = allElements.some(el =>
                    el.id.startsWith(container.id + '_line_') && el.type === 'line'
                );
                if (hasChildLines) return container.id;
            }
        }

        return null;
    };

    const buildElementHierarchy = (elements: SketchElementInfo[]) => {
        const containers: SketchElementInfo[] = [];
        const orphans: SketchElementInfo[] = [];
        const childMap = new Map<string, SketchElementInfo[]>();

        for (const element of elements) {
            if (element.is_container_only) {
                containers.push(element);
                childMap.set(element.id, []);
            }
        }

        for (const element of elements) {
            if (!element.is_container_only) {
                const containerId = getElementContainer(element, elements);
                if (containerId && childMap.has(containerId)) {
                    childMap.get(containerId)!.push(element);
                } else {
                    orphans.push(element);
                }
            }
        }

        return { containers, childMap, orphans };
    };

    // --- Shared styles ---

    const itemBase = 'px-2 py-0.5 text-xs cursor-pointer rounded transition-colors';
    const itemHover = 'hover:bg-zinc-700/50';
    const itemSelected = 'bg-blue-900/50 text-blue-300';
    const itemDefault = 'text-zinc-300';

    const itemClass = (id: string, type: string) =>
        `${itemBase} ${itemHover} ${isSelected(id, type) ? itemSelected : itemDefault}`;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scene Tree</h3>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto px-2 py-1.5">
                {createdPlanes.length === 0 && createdShapes.length === 0 ? (
                    <div className="text-zinc-600 text-center text-xs py-4">
                        No objects in scene
                    </div>
                ) : (
                    <div className="space-y-px">
                        {/* Shapes (3D models) */}
                        {createdShapes.map((shape, index) => (
                            <div
                                key={`shape-${shape.id}`}
                                className={itemClass(shape.id, 'feature')}
                                onClick={() => handleItemClick(shape.id, 'feature')}
                            >
                                {formatShapeName(shape, index)}
                            </div>
                        ))}

                        {/* Planes */}
                        {createdPlanes.map((plane) => (
                            <div key={`plane-${plane.plane_id}`}>
                                <div
                                    className={itemClass(plane.plane_id, 'plane')}
                                    onClick={() => handleItemClick(plane.plane_id, 'plane')}
                                >
                                    {formatPlaneName(plane)}
                                </div>

                                {/* Sketches on this plane */}
                                {createdSketches
                                    .filter((sketch) => sketch.plane_id === plane.plane_id)
                                    .map((sketch) => (
                                        <div key={`sketch-${sketch.sketch_id}`} className="ml-3">
                                            <div
                                                className={itemClass(sketch.sketch_id, 'sketch')}
                                                onClick={() => handleItemClick(sketch.sketch_id, 'sketch')}
                                            >
                                                <span>{formatSketchName(sketch)}</span>
                                                <span className="text-zinc-600 ml-1">
                                                    · {sketch.elements.length} el
                                                </span>
                                            </div>

                                            {/* Elements hierarchy */}
                                            {(() => {
                                                const { containers, childMap, orphans } = buildElementHierarchy(sketch.elements);
                                                return (
                                                    <>
                                                        {/* Containers */}
                                                        {containers.map((container) => {
                                                            const isExpanded = expandedContainers.has(container.id);
                                                            const children = childMap.get(container.id) || [];

                                                            return (
                                                                <div key={`c-${container.id}`} className="ml-3">
                                                                    <div
                                                                        className={`${itemBase} ${itemHover} flex items-center gap-1 ${
                                                                            isSelected(container.id, 'element') ? itemSelected : 'text-zinc-400'
                                                                        }`}
                                                                        onClick={() => handleItemClick(container.id, 'element')}
                                                                    >
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleContainer(container.id);
                                                                            }}
                                                                            className="w-3 h-3 flex items-center justify-center text-[10px] text-zinc-500 hover:text-zinc-300"
                                                                        >
                                                                            {isExpanded ? '▾' : '▸'}
                                                                        </button>
                                                                        <span>{formatElementName(container)}</span>
                                                                        <span className="text-zinc-600 text-[10px]">({children.length})</span>
                                                                    </div>

                                                                    {isExpanded && children.map((child) => (
                                                                        <div
                                                                            key={`ch-${child.id}`}
                                                                            className={`ml-4 ${itemClass(child.id, 'element')}`}
                                                                            onClick={() => handleItemClick(child.id, 'element')}
                                                                        >
                                                                            {formatElementName(child)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Orphan elements */}
                                                        {orphans.map((element, i) => (
                                                            <div
                                                                key={`o-${element.id}`}
                                                                className={`ml-3 ${itemClass(element.id, 'element')}`}
                                                                onClick={() => handleItemClick(element.id, 'element')}
                                                            >
                                                                {formatElementName(element)}
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
