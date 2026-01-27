import React, { useState, useCallback } from 'react';
import { CADClient } from '@/lib/cad/api/cad-client';
import { DrawingTool, ArcType } from '@/lib/cad/controls/cad-controls';
import { Unit, toMillimeters } from '@/lib/utils/units';

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

interface TopToolbarProps {
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
    onSetDrawingTool?: (tool: DrawingTool) => void;
    onSetActiveSketch?: (sketchId: string) => void;
    onSetArcType?: (arcType: ArcType) => void;
    onSetPolygonSides?: (sides: number) => void;
    currentDrawingTool?: DrawingTool;
    activeSketchId?: string | null;
    currentArcType?: ArcType;
    currentPolygonSides?: number;
    currentUnit: Unit;
    onUnitChange: (unit: Unit) => void;
}

export function TopToolbar({
    client,
    createdShapes,
    createdPlanes,
    createdSketches,
    selectedObject,
    onUpdateShapes,
    onUpdatePlanes,
    onUpdateSketches,
    onUpdateStatus,
    onClearRenderer,
    onSetDrawingTool,
    onSetActiveSketch,
    onSetArcType,
    onSetPolygonSides,
    currentDrawingTool = 'select',
    activeSketchId,
    currentArcType = 'endpoints_radius',
    currentPolygonSides = 6,
    currentUnit,
    onUnitChange
}: TopToolbarProps) {
    // Form states
    const [planeType, setPlaneType] = useState('XZ');
    const [selectedPlane, setSelectedPlane] = useState('');
    const [selectedSketch, setSelectedSketch] = useState('');
    const [extrudeDistance, setExtrudeDistance] = useState(10);

    // Arc sub-tool state
    const [selectedArcType, setSelectedArcType] = useState<ArcType>('endpoints_radius');
    const [showArcSubTools, setShowArcSubTools] = useState(false);

    // Polygon sub-tool state
    const [selectedPolygonSides, setSelectedPolygonSides] = useState(6);
    const [polygonSidesInput, setPolygonSidesInput] = useState('6');
    const [showPolygonSubTools, setShowPolygonSubTools] = useState(false);

    // --- Display name helpers ---

    const formatPlaneName = (plane: CreatedPlane, index: number) => {
        return `${plane.plane_type} Plane ${index + 1}`;
    };

    const formatSketchName = (sketch: CreatedSketch, index: number) => {
        const plane = createdPlanes.find(p => p.plane_id === sketch.plane_id);
        const planeLabel = plane ? plane.plane_type : '';
        return `Sketch ${index + 1}${planeLabel ? ` · ${planeLabel}` : ''} — ${sketch.elements.length} el`;
    };

    // --- Tool button style helper ---

    const toolBtnClass = (tool: DrawingTool) =>
        `flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
            currentDrawingTool === tool
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/30'
                : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200'
        }`;

    const selectClass = 'px-2 py-1.5 border border-zinc-600/50 rounded-md text-xs text-zinc-200 bg-zinc-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50';

    const actionBtnClass = (disabled: boolean) =>
        `px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            disabled
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
        }`;

    // --- Callbacks ---

    const createSketchPlane = useCallback(async () => {
        if (!client) return;

        try {
            onUpdateStatus(`Creating ${planeType} plane...`, 'info');

            const response = await client.createSketchPlane(planeType as any);

            if (response.success && response.data) {
                onUpdateStatus(`Created plane: ${response.data.plane_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch plane:', error);
            onUpdateStatus(`Error creating plane: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, planeType, onUpdateStatus]);

    const createSketch = useCallback(async () => {
        if (!client || !selectedPlane) return;

        try {
            onUpdateStatus(`Creating sketch on plane ${selectedPlane}...`, 'info');

            const response = await client.createSketch(selectedPlane);

            if (response.success && response.data) {
                onUpdateStatus(`Created sketch: ${response.data.sketch_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch:', error);
            onUpdateStatus(`Error creating sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedPlane, onUpdateStatus]);

    const extrudeFeature = useCallback(async () => {
        if (!client || !selectedObject) return;

        try {
            const { id: selectedId, type: selectedType } = selectedObject;

            let sketchId: string | undefined;
            let elementId: string | undefined;

            if (selectedType === 'sketch') {
                sketchId = selectedId;
            } else if (selectedType === 'element') {
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
                onUpdateStatus('Please select a sketch or element to extrude', 'error');
                return;
            }

            onUpdateStatus(`Extruding ${elementId ? `element ${elementId}` : `sketch ${sketchId}`}...`, 'info');

            const distanceInMm = toMillimeters(extrudeDistance, currentUnit);
            const response = await client.extrudeFeature(sketchId, distanceInMm, elementId);

            if (response.success && response.data) {
                onUpdateStatus(`Extruded object: ${response.data.feature_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to extrude feature:', error);
            onUpdateStatus(`Error extruding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedObject, extrudeDistance, createdSketches, onUpdateStatus, currentUnit]);

    return (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 w-full overflow-x-auto">

            {/* Unit Selection */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-600/40">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium select-none">Unit</span>
                <select
                    value={currentUnit}
                    onChange={(e) => onUnitChange(e.target.value as Unit)}
                    className={selectClass}
                >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                </select>
            </div>

            {/* Create Sketch Plane */}
            <div className="flex items-center gap-1.5 px-3 border-r border-zinc-600/40">
                <select
                    value={planeType}
                    onChange={(e) => setPlaneType(e.target.value)}
                    className={selectClass}
                >
                    <option value="XZ">XZ — Top</option>
                    <option value="XY">XY — Front</option>
                    <option value="YZ">YZ — Right</option>
                </select>
                <button
                    onClick={createSketchPlane}
                    disabled={!client}
                    className={actionBtnClass(!client)}
                >
                    + Plane
                </button>
            </div>

            {/* Create Sketch */}
            <div className="flex items-center gap-1.5 px-3 border-r border-zinc-600/40">
                <select
                    value={selectedPlane}
                    onChange={(e) => setSelectedPlane(e.target.value)}
                    className={`${selectClass} min-w-[120px]`}
                >
                    <option value="">Select Plane...</option>
                    {createdPlanes.map((plane, i) => (
                        <option key={plane.plane_id} value={plane.plane_id}>
                            {formatPlaneName(plane, i)}
                        </option>
                    ))}
                </select>
                <button
                    onClick={createSketch}
                    disabled={!client || !selectedPlane}
                    className={actionBtnClass(!client || !selectedPlane)}
                >
                    + Sketch
                </button>
            </div>

            {/* Drawing Tools — Creation */}
            <div className="flex items-center gap-1 px-3 border-r border-zinc-600/40">
                <select
                    value={activeSketchId || ''}
                    onChange={(e) => {
                        const sketchId = e.target.value;
                        setSelectedSketch(sketchId);
                        if (onSetActiveSketch) {
                            onSetActiveSketch(sketchId);
                        }
                    }}
                    className={`${selectClass} min-w-[140px] mr-1`}
                >
                    <option value="">Active Sketch...</option>
                    {createdSketches.map((sketch, i) => (
                        <option key={sketch.sketch_id} value={sketch.sketch_id}>
                            {formatSketchName(sketch, i)}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => onSetDrawingTool?.('select')}
                    className={toolBtnClass('select')}
                    title="Select tool"
                >
                    <span className="text-sm leading-none">↖</span>
                    <span className="font-medium">Select</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('line')}
                    className={toolBtnClass('line')}
                    title="Draw a line"
                >
                    <span className="text-sm leading-none">╱</span>
                    <span className="font-medium">Line</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('circle')}
                    className={toolBtnClass('circle')}
                    title="Draw a circle"
                >
                    <span className="text-sm leading-none">○</span>
                    <span className="font-medium">Circle</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('rectangle')}
                    className={toolBtnClass('rectangle')}
                    title="Draw a rectangle"
                >
                    <span className="text-sm leading-none">▭</span>
                    <span className="font-medium">Rect</span>
                </button>
                <button
                    onClick={() => {
                        onSetDrawingTool?.('arc');
                        setShowArcSubTools(!showArcSubTools);
                    }}
                    className={toolBtnClass('arc')}
                    title="Draw an arc"
                >
                    <span className="text-sm leading-none">⌒</span>
                    <span className="font-medium">Arc</span>
                </button>
                <button
                    onClick={() => {
                        onSetDrawingTool?.('polygon');
                        setShowPolygonSubTools(!showPolygonSubTools);
                    }}
                    className={toolBtnClass('polygon')}
                    title="Draw a polygon"
                >
                    <span className="text-sm leading-none">⬡</span>
                    <span className="font-medium">Poly</span>
                </button>
            </div>

            {/* Drawing Tools — Modification */}
            <div className="flex items-center gap-1 px-3 border-r border-zinc-600/40">
                <button
                    onClick={() => onSetDrawingTool?.('fillet')}
                    className={toolBtnClass('fillet')}
                    title="Round a corner (fillet)"
                >
                    <span className="text-sm leading-none">⤷</span>
                    <span className="font-medium">Fillet</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('chamfer')}
                    className={toolBtnClass('chamfer')}
                    title="Bevel a corner (chamfer)"
                >
                    <span className="text-sm leading-none">⟋</span>
                    <span className="font-medium">Chamfer</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('trim')}
                    className={toolBtnClass('trim')}
                    title="Trim geometry"
                >
                    <span className="text-sm leading-none">✂</span>
                    <span className="font-medium">Trim</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('extend')}
                    className={toolBtnClass('extend')}
                    title="Extend geometry"
                >
                    <span className="text-sm leading-none">⟶</span>
                    <span className="font-medium">Extend</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('mirror')}
                    className={toolBtnClass('mirror')}
                    title="Mirror geometry"
                >
                    <span className="text-sm leading-none">⇆</span>
                    <span className="font-medium">Mirror</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('offset')}
                    className={toolBtnClass('offset')}
                    title="Offset geometry"
                >
                    <span className="text-sm leading-none">⇉</span>
                    <span className="font-medium">Offset</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('copy')}
                    className={toolBtnClass('copy')}
                    title="Copy geometry"
                >
                    <span className="text-sm leading-none">⎘</span>
                    <span className="font-medium">Copy</span>
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('move')}
                    className={toolBtnClass('move')}
                    title="Move geometry"
                >
                    <span className="text-sm leading-none">✥</span>
                    <span className="font-medium">Move</span>
                </button>
            </div>

            {/* Extrude Feature */}
            <div className="flex items-center gap-1.5 pl-3">
                <input
                    type="number"
                    value={extrudeDistance}
                    onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
                    className="w-16 px-2 py-1.5 border border-zinc-600/50 rounded-md text-xs text-zinc-200 bg-zinc-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    placeholder="Dist"
                />
                <button
                    onClick={extrudeFeature}
                    disabled={!client || !selectedObject}
                    className={actionBtnClass(!client || !selectedObject)}
                >
                    Extrude
                </button>
            </div>
        </div>
    );
}
