# Linear Dimensions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SolidWorks-style smart dimensions for lines - click a line to show its length, edit the dimension to resize the line symmetrically.

**Architecture:** Client-side dimension management with Three.js rendering. Dimensions stored in sketch data, persisted via API. Line resizing uses direct calculation (midpoint-anchored symmetric resize).

**Tech Stack:** TypeScript, Three.js (sprites for text), React (inline edit component), Express (API endpoints)

---

## Task 1: Add Dimension Type Definitions

**Files:**
- Modify: `shared/types/geometry.ts:153-157`
- Modify: `client/src/types/geometry.ts:153-157`

**Step 1: Add LinearDimension interface to shared types**

Add after the `Sketch` interface (line 157) in `shared/types/geometry.ts`:

```typescript
// Dimension types
export type DimensionType = 'linear';

export interface LinearDimension {
    id: string;
    type: 'linear';
    element_id: string;        // The line being dimensioned
    sketch_id: string;         // Parent sketch
    value: number;             // Current length value (in mm)
    offset: number;            // Perpendicular distance from line
    offset_direction: 1 | -1;  // Which side of the line
}

export interface DimensionVisualizationData {
    dimension_id: string;
    dimension_type: DimensionType;
    sketch_id: string;
    element_id: string;
    value: number;
    offset: number;
    offset_direction: 1 | -1;
    // 3D coordinates for rendering
    line_start_3d: [number, number, number];
    line_end_3d: [number, number, number];
    text_position_3d: [number, number, number];
}
```

**Step 2: Copy the same types to client types**

Add the same interfaces to `client/src/types/geometry.ts` after line 157.

**Step 3: Commit**

```bash
git add shared/types/geometry.ts client/src/types/geometry.ts
git commit -m "feat(types): add LinearDimension and DimensionVisualizationData types"
```

---

## Task 2: Add 'dimension' to DrawingTool Type

**Files:**
- Modify: `client/src/lib/cad/controls/cad-controls.ts:4-18`

**Step 1: Add 'dimension' to the DrawingTool union type**

Change line 4-18 from:
```typescript
export type DrawingTool =
    | 'select'
    | 'line'
    | 'circle'
    | 'rectangle'
    | 'arc'
    | 'polygon'
    | 'fillet'
    | 'chamfer'
    | 'trim'
    | 'extend'
    | 'mirror'
    | 'offset'
    | 'copy'
    | 'move';
```

To:
```typescript
export type DrawingTool =
    | 'select'
    | 'line'
    | 'circle'
    | 'rectangle'
    | 'arc'
    | 'polygon'
    | 'fillet'
    | 'chamfer'
    | 'trim'
    | 'extend'
    | 'mirror'
    | 'offset'
    | 'copy'
    | 'move'
    | 'dimension';
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/controls/cad-controls.ts
git commit -m "feat(controls): add dimension to DrawingTool type"
```

---

## Task 3: Create Geometry Utilities

**Files:**
- Create: `client/src/lib/cad/utils/geometry-utils.ts`

**Step 1: Create the geometry utilities file**

```typescript
import * as THREE from 'three';

/**
 * Calculate the length of a line segment
 */
export function lineLength(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the midpoint of a line segment
 */
export function lineMidpoint(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };
}

/**
 * Calculate the unit direction vector of a line
 */
export function lineDirection(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    const length = lineLength(x1, y1, x2, y2);
    if (length === 0) return { x: 1, y: 0 };
    return {
        x: (x2 - x1) / length,
        y: (y2 - y1) / length
    };
}

/**
 * Calculate perpendicular vector (rotated 90 degrees counterclockwise)
 */
export function perpendicularVector(dx: number, dy: number): { x: number; y: number } {
    return { x: -dy, y: dx };
}

/**
 * Resize a line symmetrically around its midpoint to a new length
 */
export function resizeLineSymmetric(
    x1: number, y1: number, x2: number, y2: number,
    newLength: number
): { x1: number; y1: number; x2: number; y2: number } {
    const mid = lineMidpoint(x1, y1, x2, y2);
    const dir = lineDirection(x1, y1, x2, y2);
    const half = newLength / 2;

    return {
        x1: mid.x - dir.x * half,
        y1: mid.y - dir.y * half,
        x2: mid.x + dir.x * half,
        y2: mid.y + dir.y * half
    };
}

/**
 * Calculate dimension visualization positions
 * Returns positions for extension lines and dimension text
 */
export function calculateDimensionPositions(
    x1: number, y1: number, x2: number, y2: number,
    offset: number, offsetDirection: 1 | -1
): {
    extStart1: { x: number; y: number };
    extEnd1: { x: number; y: number };
    extStart2: { x: number; y: number };
    extEnd2: { x: number; y: number };
    dimLineStart: { x: number; y: number };
    dimLineEnd: { x: number; y: number };
    textPosition: { x: number; y: number };
} {
    const dir = lineDirection(x1, y1, x2, y2);
    const perp = perpendicularVector(dir.x, dir.y);
    const perpOffset = {
        x: perp.x * offset * offsetDirection,
        y: perp.y * offset * offsetDirection
    };

    // Small gap between element and extension line start
    const gap = 0.5;
    const gapOffset = { x: perp.x * gap * offsetDirection, y: perp.y * gap * offsetDirection };

    return {
        // Extension line 1 (from point 1)
        extStart1: { x: x1 + gapOffset.x, y: y1 + gapOffset.y },
        extEnd1: { x: x1 + perpOffset.x, y: y1 + perpOffset.y },
        // Extension line 2 (from point 2)
        extStart2: { x: x2 + gapOffset.x, y: y2 + gapOffset.y },
        extEnd2: { x: x2 + perpOffset.x, y: y2 + perpOffset.y },
        // Dimension line (parallel to element, at offset distance)
        dimLineStart: { x: x1 + perpOffset.x, y: y1 + perpOffset.y },
        dimLineEnd: { x: x2 + perpOffset.x, y: y2 + perpOffset.y },
        // Text position (midpoint of dimension line)
        textPosition: {
            x: (x1 + x2) / 2 + perpOffset.x,
            y: (y1 + y2) / 2 + perpOffset.y
        }
    };
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/utils/geometry-utils.ts
git commit -m "feat(utils): add geometry calculation utilities for dimensions"
```

---

## Task 4: Create Dimension Renderer

**Files:**
- Create: `client/src/lib/cad/dimensions/dimension-renderer.ts`

**Step 1: Create the dimension renderer**

```typescript
import * as THREE from 'three';
import { LinearDimension, DimensionVisualizationData } from '@/types/geometry';
import { calculateDimensionPositions, lineLength } from '../utils/geometry-utils';

const DIMENSION_COLOR = 0x4A9EFF; // Blue
const DIMENSION_COLOR_SELECTED = 0x7FCFFF; // Lighter blue when selected
const EXTENSION_LINE_OPACITY = 0.5;

export class DimensionRenderer {
    private scene: THREE.Scene;
    private dimensionGroups = new Map<string, THREE.Group>();
    private selectedDimensionId: string | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Render a dimension with extension lines, dimension line, arrows, and text
     */
    public renderDimension(
        data: DimensionVisualizationData,
        sketchOrigin: THREE.Vector3,
        sketchUAxis: THREE.Vector3,
        sketchVAxis: THREE.Vector3
    ): void {
        // Remove existing if updating
        this.removeDimension(data.dimension_id);

        const group = new THREE.Group();
        group.name = `dimension-${data.dimension_id}`;
        group.userData.dimensionId = data.dimension_id;
        group.userData.elementId = data.element_id;
        group.userData.sketchId = data.sketch_id;

        // Convert 3D positions back to 2D for calculations
        const start2D = this.world3DToSketch2D(
            new THREE.Vector3(...data.line_start_3d),
            sketchOrigin, sketchUAxis, sketchVAxis
        );
        const end2D = this.world3DToSketch2D(
            new THREE.Vector3(...data.line_end_3d),
            sketchOrigin, sketchUAxis, sketchVAxis
        );

        // Calculate all positions
        const positions = calculateDimensionPositions(
            start2D.x, start2D.y, end2D.x, end2D.y,
            data.offset, data.offset_direction
        );

        // Helper to convert 2D sketch coords to 3D world
        const to3D = (p: { x: number; y: number }) => {
            return sketchOrigin.clone()
                .add(sketchUAxis.clone().multiplyScalar(p.x))
                .add(sketchVAxis.clone().multiplyScalar(p.y));
        };

        // Create extension lines
        const extLineMaterial = new THREE.LineBasicMaterial({
            color: DIMENSION_COLOR,
            transparent: true,
            opacity: EXTENSION_LINE_OPACITY
        });

        const ext1Geometry = new THREE.BufferGeometry().setFromPoints([
            to3D(positions.extStart1),
            to3D(positions.extEnd1)
        ]);
        const ext1Line = new THREE.Line(ext1Geometry, extLineMaterial);
        group.add(ext1Line);

        const ext2Geometry = new THREE.BufferGeometry().setFromPoints([
            to3D(positions.extStart2),
            to3D(positions.extEnd2)
        ]);
        const ext2Line = new THREE.Line(ext2Geometry, extLineMaterial);
        group.add(ext2Line);

        // Create dimension line with arrows
        const dimLineMaterial = new THREE.LineBasicMaterial({ color: DIMENSION_COLOR });
        const dimLineGeometry = new THREE.BufferGeometry().setFromPoints([
            to3D(positions.dimLineStart),
            to3D(positions.dimLineEnd)
        ]);
        const dimLine = new THREE.Line(dimLineGeometry, dimLineMaterial);
        group.add(dimLine);

        // Create arrow heads
        const arrowSize = 0.8;
        this.createArrowHead(group, to3D(positions.dimLineStart), to3D(positions.dimLineEnd), arrowSize, sketchUAxis, sketchVAxis);
        this.createArrowHead(group, to3D(positions.dimLineEnd), to3D(positions.dimLineStart), arrowSize, sketchUAxis, sketchVAxis);

        // Create text sprite
        const textSprite = this.createTextSprite(data.value.toFixed(2) + ' mm');
        textSprite.position.copy(to3D(positions.textPosition));
        textSprite.userData.isText = true;
        group.add(textSprite);

        // Add invisible hit-test plane for dimension selection
        this.addHitTestPlane(group, positions, to3D);

        this.scene.add(group);
        this.dimensionGroups.set(data.dimension_id, group);
    }

    private createArrowHead(
        group: THREE.Group,
        tip: THREE.Vector3,
        from: THREE.Vector3,
        size: number,
        uAxis: THREE.Vector3,
        vAxis: THREE.Vector3
    ): void {
        const direction = new THREE.Vector3().subVectors(tip, from).normalize();

        // Create arrow head using lines (simple chevron shape)
        const perpInPlane = new THREE.Vector3().crossVectors(direction, vAxis.clone().cross(uAxis)).normalize();
        if (perpInPlane.lengthSq() < 0.01) {
            perpInPlane.copy(uAxis);
        }

        const arrowBack = tip.clone().sub(direction.clone().multiplyScalar(size));
        const arrowLeft = arrowBack.clone().add(perpInPlane.clone().multiplyScalar(size * 0.3));
        const arrowRight = arrowBack.clone().sub(perpInPlane.clone().multiplyScalar(size * 0.3));

        const arrowMaterial = new THREE.LineBasicMaterial({ color: DIMENSION_COLOR });
        const arrowGeometry = new THREE.BufferGeometry().setFromPoints([arrowLeft, tip, arrowRight]);
        const arrow = new THREE.Line(arrowGeometry, arrowMaterial);
        group.add(arrow);
    }

    private createTextSprite(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        // Set canvas size for good resolution
        canvas.width = 256;
        canvas.height = 64;

        // Clear with transparent background
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.font = 'bold 32px Arial';
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);

        // Scale sprite to reasonable size in world units
        sprite.scale.set(4, 1, 1);

        return sprite;
    }

    private addHitTestPlane(
        group: THREE.Group,
        positions: ReturnType<typeof calculateDimensionPositions>,
        to3D: (p: { x: number; y: number }) => THREE.Vector3
    ): void {
        // Create an invisible plane along the dimension line for click detection
        const width = Math.sqrt(
            Math.pow(positions.dimLineEnd.x - positions.dimLineStart.x, 2) +
            Math.pow(positions.dimLineEnd.y - positions.dimLineStart.y, 2)
        );
        const height = 2; // Click target height

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            side: THREE.DoubleSide
        });
        const hitPlane = new THREE.Mesh(geometry, material);

        // Position at text location
        const center = to3D(positions.textPosition);
        hitPlane.position.copy(center);

        // Rotate to align with dimension line
        const direction = new THREE.Vector3().subVectors(
            to3D(positions.dimLineEnd),
            to3D(positions.dimLineStart)
        ).normalize();
        hitPlane.lookAt(hitPlane.position.clone().add(direction.clone().cross(new THREE.Vector3(0, 1, 0))));

        hitPlane.userData.isHitTest = true;
        hitPlane.userData.isDimension = true;
        group.add(hitPlane);
    }

    private world3DToSketch2D(
        worldPoint: THREE.Vector3,
        origin: THREE.Vector3,
        uAxis: THREE.Vector3,
        vAxis: THREE.Vector3
    ): { x: number; y: number } {
        const relative = worldPoint.clone().sub(origin);
        return {
            x: relative.dot(uAxis),
            y: relative.dot(vAxis)
        };
    }

    public removeDimension(dimensionId: string): void {
        const group = this.dimensionGroups.get(dimensionId);
        if (group) {
            this.scene.remove(group);
            this.disposeGroup(group);
            this.dimensionGroups.delete(dimensionId);
        }
    }

    public setSelected(dimensionId: string | null): void {
        // Reset previous selection
        if (this.selectedDimensionId) {
            const prevGroup = this.dimensionGroups.get(this.selectedDimensionId);
            if (prevGroup) {
                this.setGroupColor(prevGroup, DIMENSION_COLOR);
            }
        }

        this.selectedDimensionId = dimensionId;

        // Highlight new selection
        if (dimensionId) {
            const group = this.dimensionGroups.get(dimensionId);
            if (group) {
                this.setGroupColor(group, DIMENSION_COLOR_SELECTED);
            }
        }
    }

    private setGroupColor(group: THREE.Group, color: number): void {
        group.traverse((child) => {
            if (child instanceof THREE.Line) {
                const material = child.material as THREE.LineBasicMaterial;
                material.color.setHex(color);
            }
        });
    }

    public getDimensionAtPosition(raycaster: THREE.Raycaster): string | null {
        const intersects: THREE.Intersection[] = [];

        this.dimensionGroups.forEach((group, dimensionId) => {
            group.traverse((child) => {
                if (child instanceof THREE.Mesh && child.userData.isDimension) {
                    const childIntersects = raycaster.intersectObject(child);
                    if (childIntersects.length > 0) {
                        intersects.push(...childIntersects.map(i => ({ ...i, object: { ...i.object, userData: { ...i.object.userData, dimensionId } } })));
                    }
                }
            });
        });

        if (intersects.length > 0) {
            intersects.sort((a, b) => a.distance - b.distance);
            return (intersects[0].object.userData as any).dimensionId || null;
        }

        return null;
    }

    public updateDimensionValue(dimensionId: string, newValue: number): void {
        const group = this.dimensionGroups.get(dimensionId);
        if (!group) return;

        // Find and update text sprite
        group.traverse((child) => {
            if (child instanceof THREE.Sprite && child.userData.isText) {
                // Recreate the sprite with new text
                const newSprite = this.createTextSprite(newValue.toFixed(2) + ' mm');
                newSprite.position.copy(child.position);
                newSprite.userData.isText = true;

                group.remove(child);
                child.material.map?.dispose();
                child.material.dispose();

                group.add(newSprite);
            }
        });
    }

    public clearAll(): void {
        this.dimensionGroups.forEach((group, id) => {
            this.scene.remove(group);
            this.disposeGroup(group);
        });
        this.dimensionGroups.clear();
        this.selectedDimensionId = null;
    }

    private disposeGroup(group: THREE.Group): void {
        group.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                object.geometry?.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
            if (object instanceof THREE.Sprite) {
                object.material.map?.dispose();
                object.material.dispose();
            }
        });
    }

    public dispose(): void {
        this.clearAll();
    }
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-renderer.ts
git commit -m "feat(dimensions): add DimensionRenderer for Three.js visualization"
```

---

## Task 5: Create Dimension Manager

**Files:**
- Create: `client/src/lib/cad/dimensions/dimension-manager.ts`

**Step 1: Create the dimension manager**

```typescript
import * as THREE from 'three';
import { LinearDimension, DimensionVisualizationData, SketchVisualizationData } from '@/types/geometry';
import { DimensionRenderer } from './dimension-renderer';
import { lineLength, resizeLineSymmetric } from '../utils/geometry-utils';

export interface DimensionManagerCallbacks {
    onDimensionCreated?: (dimension: LinearDimension) => void;
    onDimensionUpdated?: (dimension: LinearDimension) => void;
    onDimensionDeleted?: (dimensionId: string) => void;
    onLineResizeRequested?: (sketchId: string, elementId: string, newX1: number, newY1: number, newX2: number, newY2: number) => void;
}

export class DimensionManager {
    private dimensions = new Map<string, LinearDimension>();
    private renderer: DimensionRenderer;
    private callbacks: DimensionManagerCallbacks = {};
    private sketchVisualizationData = new Map<string, SketchVisualizationData>();
    private elementData = new Map<string, { x1: number; y1: number; x2: number; y2: number; sketchId: string }>();
    private idCounter = 0;

    constructor(scene: THREE.Scene) {
        this.renderer = new DimensionRenderer(scene);
    }

    public setCallbacks(callbacks: DimensionManagerCallbacks): void {
        this.callbacks = callbacks;
    }

    public setSketchVisualizationData(sketchId: string, data: SketchVisualizationData): void {
        this.sketchVisualizationData.set(sketchId, data);
    }

    public setElementData(elementId: string, sketchId: string, x1: number, y1: number, x2: number, y2: number): void {
        this.elementData.set(elementId, { x1, y1, x2, y2, sketchId });
    }

    /**
     * Create a dimension for a line element
     */
    public createDimension(
        sketchId: string,
        elementId: string,
        offset: number,
        offsetDirection: 1 | -1
    ): LinearDimension | null {
        const elementInfo = this.elementData.get(elementId);
        const sketchData = this.sketchVisualizationData.get(sketchId);

        if (!elementInfo || !sketchData) {
            console.warn('Cannot create dimension: missing element or sketch data');
            return null;
        }

        const { x1, y1, x2, y2 } = elementInfo;
        const value = lineLength(x1, y1, x2, y2);

        const dimension: LinearDimension = {
            id: `dim_${++this.idCounter}_${Date.now()}`,
            type: 'linear',
            element_id: elementId,
            sketch_id: sketchId,
            value,
            offset,
            offset_direction: offsetDirection
        };

        this.dimensions.set(dimension.id, dimension);

        // Render the dimension
        this.renderDimension(dimension, sketchData, elementInfo);

        this.callbacks.onDimensionCreated?.(dimension);

        return dimension;
    }

    private renderDimension(
        dimension: LinearDimension,
        sketchData: SketchVisualizationData,
        elementInfo: { x1: number; y1: number; x2: number; y2: number }
    ): void {
        const origin = new THREE.Vector3(...sketchData.origin);
        const uAxis = new THREE.Vector3(...sketchData.u_axis);
        const vAxis = new THREE.Vector3(...sketchData.v_axis);

        // Convert 2D endpoints to 3D
        const start3D = origin.clone()
            .add(uAxis.clone().multiplyScalar(elementInfo.x1))
            .add(vAxis.clone().multiplyScalar(elementInfo.y1));
        const end3D = origin.clone()
            .add(uAxis.clone().multiplyScalar(elementInfo.x2))
            .add(vAxis.clone().multiplyScalar(elementInfo.y2));

        const vizData: DimensionVisualizationData = {
            dimension_id: dimension.id,
            dimension_type: dimension.type,
            sketch_id: dimension.sketch_id,
            element_id: dimension.element_id,
            value: dimension.value,
            offset: dimension.offset,
            offset_direction: dimension.offset_direction,
            line_start_3d: [start3D.x, start3D.y, start3D.z],
            line_end_3d: [end3D.x, end3D.y, end3D.z],
            text_position_3d: [0, 0, 0] // Calculated by renderer
        };

        this.renderer.renderDimension(vizData, origin, uAxis, vAxis);
    }

    /**
     * Update dimension value and resize the line
     */
    public updateDimensionValue(dimensionId: string, newValue: number): void {
        const dimension = this.dimensions.get(dimensionId);
        if (!dimension) return;

        const elementInfo = this.elementData.get(dimension.element_id);
        if (!elementInfo) return;

        // Calculate new line endpoints
        const { x1, y1, x2, y2 } = elementInfo;
        const newEndpoints = resizeLineSymmetric(x1, y1, x2, y2, newValue);

        // Update stored element data
        this.elementData.set(dimension.element_id, {
            ...elementInfo,
            x1: newEndpoints.x1,
            y1: newEndpoints.y1,
            x2: newEndpoints.x2,
            y2: newEndpoints.y2
        });

        // Update dimension value
        dimension.value = newValue;
        this.dimensions.set(dimensionId, dimension);

        // Update renderer
        this.renderer.updateDimensionValue(dimensionId, newValue);

        // Re-render with new positions
        const sketchData = this.sketchVisualizationData.get(dimension.sketch_id);
        if (sketchData) {
            this.renderDimension(dimension, sketchData, {
                x1: newEndpoints.x1,
                y1: newEndpoints.y1,
                x2: newEndpoints.x2,
                y2: newEndpoints.y2,
                sketchId: dimension.sketch_id
            });
        }

        // Request line resize via callback
        this.callbacks.onLineResizeRequested?.(
            dimension.sketch_id,
            dimension.element_id,
            newEndpoints.x1,
            newEndpoints.y1,
            newEndpoints.x2,
            newEndpoints.y2
        );

        this.callbacks.onDimensionUpdated?.(dimension);
    }

    public deleteDimension(dimensionId: string): void {
        this.dimensions.delete(dimensionId);
        this.renderer.removeDimension(dimensionId);
        this.callbacks.onDimensionDeleted?.(dimensionId);
    }

    public getDimension(dimensionId: string): LinearDimension | undefined {
        return this.dimensions.get(dimensionId);
    }

    public getDimensionsForElement(elementId: string): LinearDimension[] {
        return Array.from(this.dimensions.values()).filter(d => d.element_id === elementId);
    }

    public getDimensionsForSketch(sketchId: string): LinearDimension[] {
        return Array.from(this.dimensions.values()).filter(d => d.sketch_id === sketchId);
    }

    public setSelectedDimension(dimensionId: string | null): void {
        this.renderer.setSelected(dimensionId);
    }

    public getDimensionAtPosition(raycaster: THREE.Raycaster): string | null {
        return this.renderer.getDimensionAtPosition(raycaster);
    }

    public clearAll(): void {
        this.dimensions.clear();
        this.renderer.clearAll();
    }

    public dispose(): void {
        this.clearAll();
        this.renderer.dispose();
    }
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-manager.ts
git commit -m "feat(dimensions): add DimensionManager for dimension CRUD operations"
```

---

## Task 6: Create Dimension Input Component

**Files:**
- Create: `client/src/components/dimension-input.tsx`

**Step 1: Create the inline dimension edit component**

```typescript
'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DimensionInputProps {
    value: number;
    position: { x: number; y: number };
    onSubmit: (newValue: number) => void;
    onCancel: () => void;
}

export function DimensionInput({ value, position, onSubmit, onCancel }: DimensionInputProps) {
    const [inputValue, setInputValue] = useState(value.toFixed(2));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const parsed = parseFloat(inputValue);
            if (!isNaN(parsed) && parsed > 0) {
                onSubmit(parsed);
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleBlur = () => {
        onCancel();
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
            }}
        >
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                style={{
                    width: '80px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    backgroundColor: '#1a2a3a',
                    color: '#fff',
                    border: '2px solid #4A9EFF',
                    borderRadius: '4px',
                    outline: 'none'
                }}
            />
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add client/src/components/dimension-input.tsx
git commit -m "feat(ui): add DimensionInput component for inline editing"
```

---

## Task 7: Integrate Dimension Manager into CAD Renderer

**Files:**
- Modify: `client/src/lib/cad/renderer/cad-renderer.ts`

**Step 1: Add DimensionManager import and property**

At the top of the file, add import:
```typescript
import { DimensionManager } from '../dimensions/dimension-manager';
```

In the class properties section, add:
```typescript
private dimensionManager: DimensionManager;
```

**Step 2: Initialize DimensionManager in constructor**

In the constructor, after scene initialization:
```typescript
this.dimensionManager = new DimensionManager(this.scene);
```

**Step 3: Add public methods to expose dimension functionality**

Add these methods to the CADRenderer class:
```typescript
public getDimensionManager(): DimensionManager {
    return this.dimensionManager;
}

public createDimensionForLine(
    sketchId: string,
    elementId: string,
    offset: number,
    offsetDirection: 1 | -1
): void {
    this.dimensionManager.createDimension(sketchId, elementId, offset, offsetDirection);
}

public getDimensionAtScreenPosition(screenX: number, screenY: number): string | null {
    const rect = this.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    return this.dimensionManager.getDimensionAtPosition(this.raycaster);
}
```

**Step 4: Update dispose method**

In the dispose method, add:
```typescript
this.dimensionManager.dispose();
```

**Step 5: Commit**

```bash
git add client/src/lib/cad/renderer/cad-renderer.ts
git commit -m "feat(renderer): integrate DimensionManager into CADRenderer"
```

---

## Task 8: Add Dimension Tool Handling to CAD Application

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Add dimension-related state**

After the existing inline state declarations (around line 125), add:
```typescript
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
```

**Step 2: Add DimensionInput import**

At the top with other imports:
```typescript
import { DimensionInput } from '@/components/dimension-input';
```

**Step 3: Add dimension tool handling in handleSetDrawingTool**

In the `handleSetDrawingTool` callback (around line 509), add dimension to the list of tools that auto-enter sketch mode:
```typescript
const drawBasedTools = ['trim', 'extend', 'mirror', 'fillet', 'chamfer', 'dimension'];
```

**Step 4: Handle dimension tool selection in handleSelection**

In the `handleSelection` callback, after the copy/move handling (around line 423), add:
```typescript
} else if (currentDrawingTool === 'dimension' && type === 'element') {
    // Check if element is a line
    const sketch = createdSketches.find(s => s.sketch_id === sketchId);
    const element = sketch?.elements.find(e => e.id === newSelection.id);
    if (element?.type === 'line') {
        setPendingDimension({
            sketchId,
            elementId: newSelection.id,
            elementType: 'line'
        });
        updateStatus('Move mouse to set dimension offset, then click to place', 'info');
    } else {
        updateStatus('Dimensions can only be added to lines', 'warning');
    }
    return;
}
```

**Step 5: Add dimension creation handler**

Add a new callback for dimension creation:
```typescript
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
```

**Step 6: Add dimension edit handlers**

```typescript
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

const handleDimensionEditCancel = useCallback(() => {
    setEditingDimension(null);
}, []);
```

**Step 7: Add keyboard shortcut for dimension tool**

In the keyboard event handler (search for existing key handlers), add:
```typescript
if (e.shiftKey && e.key === 'D') {
    e.preventDefault();
    handleSetDrawingTool('dimension');
    return;
}
```

**Step 8: Add DimensionInput to JSX**

In the return statement, add after other inline inputs:
```jsx
{editingDimension && (
    <DimensionInput
        value={editingDimension.value}
        position={editingDimension.screenPosition}
        onSubmit={handleDimensionValueSubmit}
        onCancel={handleDimensionEditCancel}
    />
)}
```

**Step 9: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(app): add dimension tool handling and inline editing"
```

---

## Task 9: Add Dimension Command to Command Palette

**Files:**
- Modify: `client/src/components/command-palette.tsx`

**Step 1: Add dimension command to the commands list**

Find the commands array and add:
```typescript
{
    id: 'tool-dimension',
    name: 'Dimension (Shift+D)',
    category: 'tool',
    action: () => onToolSelect?.('dimension'),
    keywords: ['dimension', 'measure', 'length', 'size', 'constraint']
},
```

**Step 2: Commit**

```bash
git add client/src/components/command-palette.tsx
git commit -m "feat(palette): add dimension command to command palette"
```

---

## Task 10: Add Dimension Tool Hint to Bottom HUD

**Files:**
- Modify: `client/src/components/bottom-hud.tsx`

**Step 1: Add dimension to TOOL_COLORS**

Find the TOOL_COLORS object and add:
```typescript
dimension: '#4A9EFF', // blue - matches dimension color
```

**Step 2: Add keyboard hint for dimension**

In the keyboard hints section, add:
```typescript
{ key: 'Shift+D', label: 'Dimension' },
```

**Step 3: Commit**

```bash
git add client/src/components/bottom-hud.tsx
git commit -m "feat(hud): add dimension tool color and keyboard hint"
```

---

## Task 11: Wire Up Element Data to Dimension Manager

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Pass element data to dimension manager when elements are created**

In the element visualization callback (search for `onElementVisualization`), add code to track line element data:
```typescript
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
```

**Step 2: Pass sketch visualization data to dimension manager**

In the sketch visualization callback, add:
```typescript
rendererRef.current?.getDimensionManager().setSketchVisualizationData(data.sketch_id, data);
```

**Step 3: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(app): wire element and sketch data to dimension manager"
```

---

## Task 12: Add API Endpoint for Line Update

**Files:**
- Modify: `api-server/src/routes/cad.js`
- Modify: `client/src/lib/cad/api/cad-client.ts`

**Step 1: Add validation for update line endpoint**

In cad.js, add after the other validations:
```javascript
// Update line endpoint validation
const validateUpdateLine = [
  body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
  body('element_id').isString().notEmpty().withMessage('Element ID is required'),
  body('x1').isFloat().withMessage('X1 must be a number'),
  body('y1').isFloat().withMessage('Y1 must be a number'),
  body('x2').isFloat().withMessage('X2 must be a number'),
  body('y2').isFloat().withMessage('Y2 must be a number'),
  handleValidationErrors,
];
```

**Step 2: Add the route handler**

```javascript
// Update line endpoint (for dimension-driven resize)
router.put('/sketch-elements/line', sessionValidator, validateUpdateLine, async (req, res, next) => {
  try {
    const { sketch_id, element_id, x1, y1, x2, y2 } = req.body;
    const sessionId = req.sessionId;

    logger.info(`Updating line ${element_id} in sketch ${sketch_id}`);

    const result = await cadBackend.updateLine(sessionId, sketch_id, element_id, x1, y1, x2, y2);

    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    next(error);
  }
});
```

**Step 3: Add client method in cad-client.ts**

```typescript
public async updateLineEndpoints(
    sketchId: string,
    elementId: string,
    x1: number, y1: number,
    x2: number, y2: number
): Promise<AddSketchElementResponse> {
    const request = {
        sketch_id: sketchId,
        element_id: elementId,
        x1, y1, x2, y2
    };

    console.log('📏 Updating line endpoints:', request);

    const response = await this.makeRequest<AddSketchElementResponse>(
        '/api/v1/cad/sketch-elements/line',
        'PUT',
        request
    );

    if (response.data?.visualization_data && this.elementVisualizationCallback) {
        this.elementVisualizationCallback(response.data.visualization_data);
    }

    return response;
}
```

**Step 4: Commit**

```bash
git add api-server/src/routes/cad.js client/src/lib/cad/api/cad-client.ts
git commit -m "feat(api): add endpoint for updating line endpoints"
```

---

## Task 13: Connect Dimension Manager Line Resize to API

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Set up dimension manager callback for line resize**

In the useEffect that initializes the renderer (or create a new one), add:
```typescript
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
```

**Step 2: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(app): connect dimension manager to API for line resize"
```

---

## Task 14: Test and Verify

**Step 1: Start the application**

```bash
cd /Users/modeofo/conductor/workspaces/dimes/krakow
npm run dev
```

**Step 2: Test dimension workflow**

1. Create a sketch on XZ plane (press N)
2. Draw a line (press L, click two points)
3. Press Shift+D to activate dimension tool
4. Click the line - should show "Move mouse to set dimension offset"
5. Move mouse perpendicular to line to set offset
6. Click to place dimension
7. Verify dimension appears with value
8. Double-click dimension text
9. Type new value and press Enter
10. Verify line resizes symmetrically

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(dimensions): complete linear dimension implementation

Implements SolidWorks-style smart dimensions:
- Click line to dimension its length
- Offset placement (dimension parallel to line)
- Double-click to edit dimension value
- Line resizes symmetrically around midpoint
- Keyboard shortcut: Shift+D"
```

---

## Summary

This plan implements the linear dimension system in 14 tasks:

1. **Types** - Add dimension interfaces
2. **DrawingTool** - Add 'dimension' tool type
3. **Geometry utils** - Length, midpoint, resize calculations
4. **Renderer** - Three.js dimension visualization
5. **Manager** - CRUD operations for dimensions
6. **Input component** - Inline editing UI
7. **CADRenderer integration** - Expose dimension methods
8. **CADApplication** - Tool handling and state
9. **Command palette** - Add dimension command
10. **Bottom HUD** - Add tool hint
11. **Wire element data** - Track line geometry
12. **API endpoint** - Line update endpoint
13. **Connect to API** - Line resize callback
14. **Test** - Verify full workflow
