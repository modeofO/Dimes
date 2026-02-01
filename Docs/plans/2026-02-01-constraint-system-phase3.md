# Constraint System Phase 3: Horizontal/Vertical Constraints UI

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add frontend UI for horizontal and vertical constraints with automatic inference detection.

**Approach:** When a line is drawn near-horizontal or near-vertical (within 2°), show a ghost constraint icon. User clicks to confirm, making it permanent.

---

## Task 1: Create ConstraintRenderer Class

**Files:**
- Create: `client/src/lib/cad/constraints/constraint-renderer.ts`

**Step 1: Create the constraint renderer file**

```typescript
import * as THREE from 'three';

// Constraint icon colors
const CONSTRAINT_COLOR_GHOST = 0x4A9EFF;      // Blue, semi-transparent
const CONSTRAINT_COLOR_CONFIRMED = 0x50C878;  // Green, solid
const CONSTRAINT_OPACITY_GHOST = 0.5;
const CONSTRAINT_OPACITY_CONFIRMED = 1.0;

// Icon size
const ICON_SIZE = 1.2;

interface ConstraintIcon {
    id: string;
    type: 'horizontal' | 'vertical';
    elementId: string;
    sketchId: string;
    isConfirmed: boolean;
    group: THREE.Group;
}

/**
 * ConstraintRenderer handles Three.js rendering of constraint icons (H, V).
 * Ghost constraints are dashed/transparent, confirmed are solid.
 */
export class ConstraintRenderer {
    private scene: THREE.Scene;
    private icons = new Map<string, ConstraintIcon>();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Render an H or V constraint icon at the midpoint of a line.
     */
    public renderConstraintIcon(
        id: string,
        type: 'horizontal' | 'vertical',
        elementId: string,
        sketchId: string,
        midpoint3D: THREE.Vector3,
        normal: THREE.Vector3,
        isConfirmed: boolean
    ): void {
        // Remove existing icon with same ID
        this.removeIcon(id);

        const group = new THREE.Group();
        group.name = `constraint-${id}`;
        group.userData.constraintId = id;
        group.userData.isConstraint = true;
        group.userData.elementId = elementId;

        const color = isConfirmed ? CONSTRAINT_COLOR_CONFIRMED : CONSTRAINT_COLOR_GHOST;
        const opacity = isConfirmed ? CONSTRAINT_OPACITY_CONFIRMED : CONSTRAINT_OPACITY_GHOST;

        // Create icon sprite
        const sprite = this.createIconSprite(type, color, opacity, isConfirmed);
        sprite.position.copy(midpoint3D);
        // Offset slightly above the sketch plane
        sprite.position.addScaledVector(normal, 0.5);
        group.add(sprite);

        // Create hit-test mesh (invisible)
        const hitMesh = this.createHitTestMesh(midpoint3D, normal, id);
        group.add(hitMesh);

        this.scene.add(group);
        this.icons.set(id, {
            id,
            type,
            elementId,
            sketchId,
            isConfirmed,
            group
        });
    }

    /**
     * Create a sprite showing H or V text.
     */
    private createIconSprite(
        type: 'horizontal' | 'vertical',
        color: number,
        opacity: number,
        isConfirmed: boolean
    ): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Background circle
        ctx.fillStyle = isConfirmed ? 'rgba(80, 200, 120, 0.9)' : 'rgba(74, 158, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = isConfirmed ? '#50C878' : '#4A9EFF';
        ctx.lineWidth = 3;
        if (!isConfirmed) {
            ctx.setLineDash([6, 4]);
        }
        ctx.stroke();

        // Text
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(type === 'horizontal' ? 'H' : 'V', size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(ICON_SIZE, ICON_SIZE, 1);
        sprite.userData.isConstraintIcon = true;

        return sprite;
    }

    /**
     * Create invisible mesh for click detection.
     */
    private createHitTestMesh(
        position: THREE.Vector3,
        normal: THREE.Vector3,
        constraintId: string
    ): THREE.Mesh {
        const geometry = new THREE.CircleGeometry(ICON_SIZE / 2, 16);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.addScaledVector(normal, 0.5);

        // Orient to face camera (billboard-ish)
        mesh.lookAt(position.clone().add(normal));

        mesh.userData.isConstraintHitTest = true;
        mesh.userData.constraintId = constraintId;

        return mesh;
    }

    /**
     * Confirm a ghost constraint (change appearance to solid).
     */
    public confirmConstraint(id: string): void {
        const icon = this.icons.get(id);
        if (!icon || icon.isConfirmed) return;

        // Re-render with confirmed appearance
        const position = icon.group.position.clone();
        icon.group.traverse(child => {
            if (child instanceof THREE.Sprite) {
                position.copy(child.position);
            }
        });

        // Get sketch data to find normal
        const normal = new THREE.Vector3(0, 1, 0); // Default up

        this.renderConstraintIcon(
            id,
            icon.type,
            icon.elementId,
            icon.sketchId,
            position,
            normal,
            true
        );
    }

    /**
     * Remove a constraint icon.
     */
    public removeIcon(id: string): void {
        const icon = this.icons.get(id);
        if (icon) {
            this.scene.remove(icon.group);
            this.disposeGroup(icon.group);
            this.icons.delete(id);
        }
    }

    /**
     * Remove all ghost (unconfirmed) constraints for an element.
     */
    public removeGhostConstraintsForElement(elementId: string): void {
        const toRemove: string[] = [];
        this.icons.forEach((icon, id) => {
            if (icon.elementId === elementId && !icon.isConfirmed) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => this.removeIcon(id));
    }

    /**
     * Get constraint at raycaster position.
     */
    public getConstraintAtPosition(raycaster: THREE.Raycaster): string | null {
        const hitTestMeshes: THREE.Object3D[] = [];
        this.icons.forEach(icon => {
            icon.group.traverse(obj => {
                if (obj.userData.isConstraintHitTest) {
                    hitTestMeshes.push(obj);
                }
            });
        });

        const intersects = raycaster.intersectObjects(hitTestMeshes, false);
        if (intersects.length > 0) {
            return intersects[0].object.userData.constraintId || null;
        }
        return null;
    }

    /**
     * Get icon info by ID.
     */
    public getIcon(id: string): ConstraintIcon | undefined {
        return this.icons.get(id);
    }

    /**
     * Get all icons for a sketch.
     */
    public getIconsForSketch(sketchId: string): ConstraintIcon[] {
        const result: ConstraintIcon[] = [];
        this.icons.forEach(icon => {
            if (icon.sketchId === sketchId) {
                result.push(icon);
            }
        });
        return result;
    }

    /**
     * Clear all icons.
     */
    public clearAll(): void {
        this.icons.forEach((icon, id) => {
            this.scene.remove(icon.group);
            this.disposeGroup(icon.group);
        });
        this.icons.clear();
    }

    /**
     * Dispose of resources.
     */
    public dispose(): void {
        this.clearAll();
    }

    private disposeGroup(group: THREE.Group): void {
        group.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry?.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            } else if (obj instanceof THREE.Sprite) {
                const material = obj.material as THREE.SpriteMaterial;
                material.map?.dispose();
                material.dispose();
            }
        });
    }
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-renderer.ts
git commit -m "feat(constraints): add ConstraintRenderer for H/V icons"
```

---

## Task 2: Create ConstraintInference Class

**Files:**
- Create: `client/src/lib/cad/constraints/constraint-inference.ts`

**Step 1: Create the constraint inference file**

```typescript
/**
 * Constraint inference detects when a line is near-horizontal or near-vertical.
 * Returns suggested constraint types based on angle thresholds.
 */

// Angle threshold in degrees for H/V detection
const ANGLE_THRESHOLD_DEGREES = 2;
const ANGLE_THRESHOLD_RADIANS = (ANGLE_THRESHOLD_DEGREES * Math.PI) / 180;

export interface InferredConstraint {
    type: 'horizontal' | 'vertical';
    elementId: string;
    sketchId: string;
    confidence: number; // 0-1, how close to perfect alignment
}

/**
 * Detect if a line is near-horizontal or near-vertical.
 *
 * @param x1, y1 - Start point of line (2D sketch coords)
 * @param x2, y2 - End point of line (2D sketch coords)
 * @param elementId - ID of the line element
 * @param sketchId - ID of the containing sketch
 * @returns Array of inferred constraints (could be empty, or have H or V)
 */
export function detectLineConstraints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    elementId: string,
    sketchId: string
): InferredConstraint[] {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Avoid division by zero for zero-length lines
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.0001) {
        return [];
    }

    const results: InferredConstraint[] = [];

    // Check horizontal (dy should be near zero)
    const horizontalAngle = Math.abs(Math.atan2(dy, dx));
    const isNearHorizontal = horizontalAngle < ANGLE_THRESHOLD_RADIANS ||
                              Math.abs(horizontalAngle - Math.PI) < ANGLE_THRESHOLD_RADIANS;

    if (isNearHorizontal) {
        // Confidence: 1 at 0°, 0 at threshold
        const angleFromHorizontal = Math.min(horizontalAngle, Math.abs(horizontalAngle - Math.PI));
        const confidence = 1 - (angleFromHorizontal / ANGLE_THRESHOLD_RADIANS);

        results.push({
            type: 'horizontal',
            elementId,
            sketchId,
            confidence: Math.max(0, Math.min(1, confidence))
        });
    }

    // Check vertical (dx should be near zero)
    const verticalAngle = Math.abs(Math.atan2(dx, dy));
    const isNearVertical = verticalAngle < ANGLE_THRESHOLD_RADIANS ||
                            Math.abs(verticalAngle - Math.PI) < ANGLE_THRESHOLD_RADIANS;

    if (isNearVertical) {
        const angleFromVertical = Math.min(verticalAngle, Math.abs(verticalAngle - Math.PI));
        const confidence = 1 - (angleFromVertical / ANGLE_THRESHOLD_RADIANS);

        results.push({
            type: 'vertical',
            elementId,
            sketchId,
            confidence: Math.max(0, Math.min(1, confidence))
        });
    }

    return results;
}

/**
 * Check if a line is exactly horizontal (dy = 0).
 */
export function isExactlyHorizontal(y1: number, y2: number): boolean {
    return Math.abs(y2 - y1) < 0.0001;
}

/**
 * Check if a line is exactly vertical (dx = 0).
 */
export function isExactlyVertical(x1: number, x2: number): boolean {
    return Math.abs(x2 - x1) < 0.0001;
}

/**
 * Calculate the midpoint of a line in 2D.
 */
export function lineMidpoint2D(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-inference.ts
git commit -m "feat(constraints): add constraint inference for H/V detection"
```

---

## Task 3: Create ConstraintManager Class

**Files:**
- Create: `client/src/lib/cad/constraints/constraint-manager.ts`

**Step 1: Create the constraint manager file**

```typescript
import * as THREE from 'three';
import { ConstraintRenderer } from './constraint-renderer';
import { detectLineConstraints, lineMidpoint2D, InferredConstraint } from './constraint-inference';
import { Constraint } from '@/types/geometry';

/**
 * Callbacks for constraint operations.
 */
export interface ConstraintManagerCallbacks {
    onConstraintCreate?: (
        sketchId: string,
        type: string,
        elementIds: string[],
        value?: number
    ) => Promise<{ constraint_id: string; updated_elements: any[] }>;
    onConstraintDelete?: (constraintId: string) => Promise<boolean>;
    onConstraintConfirmed?: (constraint: Constraint) => void;
    onConstraintRejected?: (constraintId: string) => void;
}

/**
 * Stored sketch coordinate system.
 */
interface SketchCoordinateSystem {
    origin: THREE.Vector3;
    uAxis: THREE.Vector3;
    vAxis: THREE.Vector3;
    normal: THREE.Vector3;
}

/**
 * ConstraintManager coordinates constraint inference, rendering, and backend sync.
 *
 * Flow:
 * 1. Line is drawn → detectConstraintsForLine() called
 * 2. Ghost icons appear for inferred constraints
 * 3. User clicks icon → confirmConstraint() called
 * 4. Backend constraint created, icon turns solid
 * 5. User presses Escape or clicks away → dismissGhostConstraints()
 */
export class ConstraintManager {
    private renderer: ConstraintRenderer;
    private callbacks: ConstraintManagerCallbacks = {};

    // Sketch coordinate systems
    private sketchCoords = new Map<string, SketchCoordinateSystem>();

    // Track ghost constraints (not yet confirmed)
    private ghostConstraints = new Map<string, InferredConstraint>();

    // Track confirmed constraints
    private confirmedConstraints = new Map<string, Constraint>();

    // Counter for ghost IDs
    private ghostIdCounter = 0;

    constructor(scene: THREE.Scene) {
        this.renderer = new ConstraintRenderer(scene);
    }

    /**
     * Set callbacks for constraint operations.
     */
    public setCallbacks(callbacks: ConstraintManagerCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Store sketch coordinate system for 2D-to-3D conversion.
     */
    public setSketchCoordinateSystem(
        sketchId: string,
        origin: THREE.Vector3,
        uAxis: THREE.Vector3,
        vAxis: THREE.Vector3,
        normal: THREE.Vector3
    ): void {
        this.sketchCoords.set(sketchId, {
            origin: origin.clone(),
            uAxis: uAxis.clone(),
            vAxis: vAxis.clone(),
            normal: normal.clone()
        });
    }

    /**
     * Detect and display ghost constraints for a newly drawn line.
     */
    public detectConstraintsForLine(
        elementId: string,
        sketchId: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): InferredConstraint[] {
        // Remove any existing ghosts for this element
        this.dismissGhostConstraintsForElement(elementId);

        // Detect constraints
        const inferred = detectLineConstraints(x1, y1, x2, y2, elementId, sketchId);

        // Get sketch coordinate system
        const coords = this.sketchCoords.get(sketchId);
        if (!coords) {
            console.warn(`No coordinate system for sketch ${sketchId}`);
            return inferred;
        }

        // Render ghost icons
        for (const constraint of inferred) {
            const ghostId = `ghost_${++this.ghostIdCounter}_${Date.now()}`;

            // Calculate midpoint in 3D
            const mid2D = lineMidpoint2D(x1, y1, x2, y2);
            const midpoint3D = coords.origin.clone()
                .addScaledVector(coords.uAxis, mid2D.x)
                .addScaledVector(coords.vAxis, mid2D.y);

            this.renderer.renderConstraintIcon(
                ghostId,
                constraint.type,
                elementId,
                sketchId,
                midpoint3D,
                coords.normal,
                false // ghost
            );

            this.ghostConstraints.set(ghostId, {
                ...constraint,
                // Store ghostId for later reference
            });

            console.log(`Created ghost ${constraint.type} constraint: ${ghostId}`);
        }

        return inferred;
    }

    /**
     * Confirm a ghost constraint, creating it in the backend.
     */
    public async confirmConstraint(ghostId: string): Promise<Constraint | null> {
        const ghost = this.ghostConstraints.get(ghostId);
        if (!ghost) {
            console.warn(`Ghost constraint ${ghostId} not found`);
            return null;
        }

        // Create in backend
        if (!this.callbacks.onConstraintCreate) {
            console.warn('No onConstraintCreate callback');
            return null;
        }

        try {
            const result = await this.callbacks.onConstraintCreate(
                ghost.sketchId,
                ghost.type,
                [ghost.elementId]
            );

            // Create constraint object
            const constraint: Constraint = {
                id: result.constraint_id,
                type: ghost.type,
                sketch_id: ghost.sketchId,
                element_ids: [ghost.elementId],
                satisfied: true,
                inferred: true,
                confirmed: true
            };

            // Remove ghost and add confirmed
            this.ghostConstraints.delete(ghostId);
            this.confirmedConstraints.set(constraint.id, constraint);

            // Update icon appearance
            this.renderer.confirmConstraint(ghostId);

            // Fire callback
            if (this.callbacks.onConstraintConfirmed) {
                this.callbacks.onConstraintConfirmed(constraint);
            }

            console.log(`Confirmed constraint: ${constraint.id} (${ghost.type})`);
            return constraint;

        } catch (error) {
            console.error('Failed to confirm constraint:', error);
            // Remove the ghost icon since creation failed
            this.renderer.removeIcon(ghostId);
            this.ghostConstraints.delete(ghostId);
            return null;
        }
    }

    /**
     * Dismiss all ghost constraints (user pressed Escape).
     */
    public dismissAllGhostConstraints(): void {
        this.ghostConstraints.forEach((_, ghostId) => {
            this.renderer.removeIcon(ghostId);
            if (this.callbacks.onConstraintRejected) {
                this.callbacks.onConstraintRejected(ghostId);
            }
        });
        this.ghostConstraints.clear();
        console.log('Dismissed all ghost constraints');
    }

    /**
     * Dismiss ghost constraints for a specific element.
     */
    public dismissGhostConstraintsForElement(elementId: string): void {
        const toRemove: string[] = [];
        this.ghostConstraints.forEach((ghost, ghostId) => {
            if (ghost.elementId === elementId) {
                toRemove.push(ghostId);
            }
        });
        toRemove.forEach(ghostId => {
            this.renderer.removeIcon(ghostId);
            this.ghostConstraints.delete(ghostId);
        });
    }

    /**
     * Delete a confirmed constraint.
     */
    public async deleteConstraint(constraintId: string): Promise<boolean> {
        const constraint = this.confirmedConstraints.get(constraintId);
        if (!constraint) {
            console.warn(`Constraint ${constraintId} not found`);
            return false;
        }

        // Delete from backend
        if (this.callbacks.onConstraintDelete) {
            try {
                await this.callbacks.onConstraintDelete(constraintId);
            } catch (error) {
                console.error('Failed to delete constraint:', error);
                return false;
            }
        }

        // Remove from local state
        this.renderer.removeIcon(constraintId);
        this.confirmedConstraints.delete(constraintId);

        console.log(`Deleted constraint: ${constraintId}`);
        return true;
    }

    /**
     * Get constraint at raycaster position.
     */
    public getConstraintAtPosition(raycaster: THREE.Raycaster): string | null {
        return this.renderer.getConstraintAtPosition(raycaster);
    }

    /**
     * Check if a constraint ID is a ghost.
     */
    public isGhostConstraint(id: string): boolean {
        return this.ghostConstraints.has(id);
    }

    /**
     * Get ghost constraint info.
     */
    public getGhostConstraint(id: string): InferredConstraint | undefined {
        return this.ghostConstraints.get(id);
    }

    /**
     * Get confirmed constraint info.
     */
    public getConfirmedConstraint(id: string): Constraint | undefined {
        return this.confirmedConstraints.get(id);
    }

    /**
     * Clear all constraints for a sketch.
     */
    public clearConstraintsForSketch(sketchId: string): void {
        // Remove ghosts
        this.ghostConstraints.forEach((ghost, ghostId) => {
            if (ghost.sketchId === sketchId) {
                this.renderer.removeIcon(ghostId);
                this.ghostConstraints.delete(ghostId);
            }
        });

        // Remove confirmed
        this.confirmedConstraints.forEach((constraint, id) => {
            if (constraint.sketch_id === sketchId) {
                this.renderer.removeIcon(id);
                this.confirmedConstraints.delete(id);
            }
        });
    }

    /**
     * Get the renderer (for advanced use).
     */
    public getRenderer(): ConstraintRenderer {
        return this.renderer;
    }

    /**
     * Dispose of all resources.
     */
    public dispose(): void {
        this.renderer.dispose();
        this.ghostConstraints.clear();
        this.confirmedConstraints.clear();
        this.sketchCoords.clear();
        this.callbacks = {};
    }
}
```

**Step 2: Create index file for constraints module**

Create `client/src/lib/cad/constraints/index.ts`:

```typescript
export { ConstraintRenderer } from './constraint-renderer';
export { ConstraintManager, type ConstraintManagerCallbacks } from './constraint-manager';
export {
    detectLineConstraints,
    isExactlyHorizontal,
    isExactlyVertical,
    lineMidpoint2D,
    type InferredConstraint
} from './constraint-inference';
```

**Step 3: Commit**

```bash
git add client/src/lib/cad/constraints/
git commit -m "feat(constraints): add ConstraintManager for H/V constraint lifecycle"
```

---

## Task 4: Integrate ConstraintManager into CADRenderer

**Files:**
- Modify: `client/src/lib/cad/renderer/cad-renderer.ts`

**Step 1: Import and instantiate ConstraintManager**

Add to imports:
```typescript
import { ConstraintManager, ConstraintManagerCallbacks } from '../constraints';
```

Add as class property:
```typescript
private constraintManager: ConstraintManager;
```

In constructor, after dimensionManager initialization:
```typescript
this.constraintManager = new ConstraintManager(this.scene);
```

**Step 2: Add ConstraintManager methods**

Add these public methods:

```typescript
/**
 * Get the constraint manager instance.
 */
public getConstraintManager(): ConstraintManager {
    return this.constraintManager;
}

/**
 * Set constraint manager callbacks.
 */
public setConstraintCallbacks(callbacks: ConstraintManagerCallbacks): void {
    this.constraintManager.setCallbacks(callbacks);
}

/**
 * Detect constraints for a newly drawn line.
 */
public detectConstraintsForLine(
    elementId: string,
    sketchId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): void {
    this.constraintManager.detectConstraintsForLine(
        elementId, sketchId, x1, y1, x2, y2
    );
}

/**
 * Get constraint at raycaster position.
 */
public getConstraintAtPosition(raycaster: THREE.Raycaster): string | null {
    return this.constraintManager.getConstraintAtPosition(raycaster);
}
```

**Step 3: Update setSketchVisualizationData to also set constraint coords**

In the existing `setSketchVisualizationData` method, add:
```typescript
// Also set coordinate system for constraint manager
this.constraintManager.setSketchCoordinateSystem(
    data.sketch_id,
    new THREE.Vector3(...data.origin),
    new THREE.Vector3(...data.u_axis),
    new THREE.Vector3(...data.v_axis),
    new THREE.Vector3(...data.normal)
);
```

**Step 4: Update dispose method**

Add to dispose:
```typescript
this.constraintManager.dispose();
```

**Step 5: Commit**

```bash
git add client/src/lib/cad/renderer/cad-renderer.ts
git commit -m "feat(constraints): integrate ConstraintManager into CADRenderer"
```

---

## Task 5: Wire Up Constraint Callbacks in CADApplication

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Add constraint callback setup**

Find where `dimensionManager.setCallbacks` is called and add nearby:

```typescript
// Set up constraint callbacks
rendererRef.current.setConstraintCallbacks({
    onConstraintCreate: async (sketchId, type, elementIds, value) => {
        if (!clientRef.current) throw new Error('No client');
        const result = await clientRef.current.createConstraint(
            sketchId,
            type,
            elementIds,
            value
        );
        return {
            constraint_id: result.constraint.id,
            updated_elements: result.updated_elements
        };
    },
    onConstraintDelete: async (constraintId) => {
        if (!clientRef.current) return false;
        return await clientRef.current.deleteConstraint(constraintId);
    },
    onConstraintConfirmed: (constraint) => {
        updateStatus(`${constraint.type} constraint confirmed`, 'success');
    },
    onConstraintRejected: (constraintId) => {
        console.log(`Ghost constraint ${constraintId} rejected`);
    }
});
```

**Step 2: Detect constraints after line drawing**

Find the `onDrawingComplete` callback handler for lines. After a line is successfully created, add constraint detection:

```typescript
// After line creation succeeds, detect constraints
if (rendererRef.current && result.elements) {
    for (const element of result.elements) {
        if (element.type === 'line' && element.parameters_2d) {
            const params = element.parameters_2d;
            rendererRef.current.detectConstraintsForLine(
                element.element_id,
                sketchId,
                params.x1,
                params.y1,
                params.x2,
                params.y2
            );
        }
    }
}
```

**Step 3: Handle constraint icon clicks**

In the click handler, add constraint detection before element selection:

```typescript
// Check for constraint icon click
if (rendererRef.current) {
    const constraintId = rendererRef.current.getConstraintAtPosition(raycaster);
    if (constraintId) {
        const constraintManager = rendererRef.current.getConstraintManager();
        if (constraintManager.isGhostConstraint(constraintId)) {
            // Confirm the ghost constraint
            constraintManager.confirmConstraint(constraintId);
            return; // Don't process as element click
        }
    }
}
```

**Step 4: Dismiss ghosts on Escape**

In the keydown handler for Escape, add:

```typescript
// Dismiss ghost constraints
if (rendererRef.current) {
    const constraintManager = rendererRef.current.getConstraintManager();
    constraintManager.dismissAllGhostConstraints();
}
```

**Step 5: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(constraints): wire up H/V constraint UI in CADApplication"
```

---

## Task 6: Add Keyboard Shortcut for Quick Confirm

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Add Enter key to confirm all ghost constraints**

In the keydown handler, add a case for Enter:

```typescript
case 'Enter':
    // Confirm all ghost constraints
    if (rendererRef.current) {
        const constraintManager = rendererRef.current.getConstraintManager();
        const ghosts = Array.from(constraintManager['ghostConstraints'].keys());
        for (const ghostId of ghosts) {
            await constraintManager.confirmConstraint(ghostId);
        }
        if (ghosts.length > 0) {
            updateStatus(`Confirmed ${ghosts.length} constraint(s)`, 'success');
        }
    }
    break;
```

**Step 2: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(constraints): add Enter key to confirm ghost constraints"
```

---

## Task 7: Update Known Issues Doc

**Files:**
- Modify: `Docs/known-issues.md`

**Step 1: Update constraint system status**

Change the constraint system status to reflect Phase 3 completion:

```markdown
### 6. Constraint System - Phase 3 Complete

**Status:** In Progress

Phase 3 of the constraint system is implemented:
- ✅ Backend constraint solver (Newton-Raphson)
- ✅ Length, horizontal, vertical constraints
- ✅ API endpoints for constraint CRUD
- ✅ Dimension integration (Phase 2)
- ✅ H/V constraint inference and UI (Phase 3)
- ⏳ Phase 4: Coincident constraints
- ⏳ Phase 5: Perpendicular/Parallel constraints

See `Docs/plans/2026-02-01-constraint-system-design.md` for full design.
```

**Step 2: Commit**

```bash
git add Docs/known-issues.md
git commit -m "docs: update constraint system status to Phase 3"
```

---

## Summary

After completing all 7 tasks, Phase 3 provides:

1. **ConstraintRenderer** - Renders H/V icons in 3D space
2. **ConstraintInference** - Detects near-horizontal/vertical lines
3. **ConstraintManager** - Manages ghost → confirmed lifecycle
4. **UI Integration** - Click icons to confirm, Escape to dismiss, Enter to confirm all
5. **Backend sync** - Confirmed constraints are persisted

The workflow is:
1. User draws a line at ~0° or ~90°
2. Ghost H or V icon appears at line midpoint
3. User clicks icon → constraint confirmed → geometry snaps to exact H/V
4. Or user presses Escape → ghost dismissed

**Next Phase:** Coincident Constraints (endpoint snapping and merging)
