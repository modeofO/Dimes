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
    // Form states (only for sections 1-4)
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

    const createSketchPlane = useCallback(async () => {
        if (!client) return;
        
        try {
            onUpdateStatus(`Creating ${planeType} plane...`, 'info');
            
            const response = await client.createSketchPlane(planeType as any);
            
            if (response.success && response.data) {
                onUpdateStatus(`✅ Created plane: ${response.data.plane_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch plane:', error);
            onUpdateStatus(`❌ Error creating plane: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, planeType, onUpdateStatus]);

    const createSketch = useCallback(async () => {
        if (!client || !selectedPlane) return;
        
        try {
            onUpdateStatus(`Creating sketch on plane ${selectedPlane}...`, 'info');
            
            const response = await client.createSketch(selectedPlane);
            
            if (response.success && response.data) {
                onUpdateStatus(`✅ Created sketch: ${response.data.sketch_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create sketch:', error);
            onUpdateStatus(`❌ Error creating sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
                onUpdateStatus('❌ Please select a sketch or element to extrude', 'error');
                return;
            }
            
            onUpdateStatus(`Extruding ${elementId ? `element ${elementId}` : `sketch ${sketchId}`}...`, 'info');
            
            const distanceInMm = toMillimeters(extrudeDistance, currentUnit);
            const response = await client.extrudeFeature(sketchId, distanceInMm, elementId);
            
            if (response.success && response.data) {
                onUpdateStatus(`✅ Extruded object: ${response.data.feature_id}`, 'success');
            }
        } catch (error) {
            console.error('Failed to extrude feature:', error);
            onUpdateStatus(`❌ Error extruding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }, [client, selectedObject, extrudeDistance, createdSketches, onUpdateStatus, currentUnit]);

    return (
        <div className="flex items-center space-x-4 p-2 bg-zinc-800 border-b border-zinc-700 w-full">
            {/* Unit Selection */}
            <div className="flex items-center space-x-2">
                <label htmlFor="unit-select" className="text-sm font-medium text-zinc-300">Unit:</label>
                <select
                    id="unit-select"
                    value={currentUnit}
                    onChange={(e) => onUnitChange(e.target.value as Unit)}
                    className="px-2 py-1 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700"
                >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                </select>
            </div>
            {/* Section 1: Create Sketch Plane */}
            <div className="flex items-center space-x-2">
                <select
                    value={planeType}
                    onChange={(e) => setPlaneType(e.target.value)}
                    className="px-2 py-1 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700"
                >
                    <option value="XZ">XZ</option>
                    <option value="XY">XY</option>
                    <option value="YZ">YZ</option>
                </select>
                <button
                    onClick={createSketchPlane}
                    disabled={!client}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:bg-zinc-600 disabled:text-zinc-400"
                >
                    Create Plane
                </button>
            </div>

            {/* Section 2: Create Sketch */}
            <div className="flex items-center space-x-2">
                <select
                    value={selectedPlane}
                    onChange={(e) => setSelectedPlane(e.target.value)}
                    className="px-2 py-1 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700"
                >
                    <option value="">Plane</option>
                    {createdPlanes.map(plane => (
                        <option key={plane.plane_id} value={plane.plane_id}>
                            {plane.plane_id} ({plane.plane_type})
                        </option>
                    ))}
                </select>
                <button
                    onClick={createSketch}
                    disabled={!client || !selectedPlane}
                    className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 disabled:bg-zinc-600 disabled:text-zinc-400"
                >
                    Create Sketch
                </button>
            </div>

            {/* Section 3: Interactive Drawing Tools - Creation */}
            <div className="flex items-center space-x-1">
                <select
                    value={activeSketchId || ''}
                    onChange={(e) => {
                        const sketchId = e.target.value;
                        setSelectedSketch(sketchId);
                        if (onSetActiveSketch) {
                            onSetActiveSketch(sketchId);
                        }
                    }}
                    className="px-2 py-1 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700"
                >
                    <option value="">Active Sketch</option>
                    {createdSketches.map(sketch => (
                        <option key={sketch.sketch_id} value={sketch.sketch_id}>
                            {sketch.sketch_id} ({sketch.elements.length} el)
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => onSetDrawingTool?.('select')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'select' ? 'bg-zinc-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Select"
                >
                    🖱️
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('line')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'line' ? 'bg-green-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Line"
                >
                    ─
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('circle')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'circle' ? 'bg-red-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Circle"
                >
                    ○
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('rectangle')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Rectangle"
                >
                    ▭
                </button>
                <button
                    onClick={() => {
                        onSetDrawingTool?.('arc');
                        setShowArcSubTools(!showArcSubTools);
                    }}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'arc' ? 'bg-orange-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Arc"
                >
                    ⌒
                </button>
                <button
                    onClick={() => {
                        onSetDrawingTool?.('polygon');
                        setShowPolygonSubTools(!showPolygonSubTools);
                    }}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'polygon' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Polygon"
                >
                    ⬡
                </button>
            </div>

            {/* New Section: Modification Tools */}
            <div className="flex items-center space-x-1">
                <button
                    onClick={() => onSetDrawingTool?.('fillet')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'fillet' ? 'bg-indigo-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Fillet"
                >
                    ⤷
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('chamfer')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'chamfer' ? 'bg-yellow-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Chamfer"
                >
                    ⟋
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('trim')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'trim' ? 'bg-red-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Trim"
                >
                    ✂
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('extend')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'extend' ? 'bg-green-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Extend"
                >
                    →
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('mirror')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'mirror' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Mirror"
                >
                    ⇆
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('offset')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'offset' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Offset"
                >
                    ⇉
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('copy')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'copy' ? 'bg-orange-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Copy"
                >
                    ⎘
                </button>
                <button
                    onClick={() => onSetDrawingTool?.('move')}
                    className={`px-2 py-1 text-xs rounded text-zinc-200 ${currentDrawingTool === 'move' ? 'bg-zinc-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="Move"
                >
                    ↕
                </button>
            </div>

            {/* Section 4: Extrude Feature */}
            <div className="flex items-center space-x-2">
                <input
                    type="number"
                    value={extrudeDistance}
                    onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700"
                    placeholder="Distance"
                />
                <button
                    onClick={extrudeFeature}
                    disabled={!client || !selectedObject}
                    className="px-3 py-1 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 disabled:bg-zinc-600 disabled:text-zinc-400"
                >
                    Extrude
                </button>
            </div>
        </div>
    );
} 