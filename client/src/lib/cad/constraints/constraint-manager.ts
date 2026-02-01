import * as THREE from 'three';
import { ConstraintRenderer } from './constraint-renderer';
import { detectLineConstraints, detectCoincidentConstraints, lineMidpoint2D, getPointPosition, InferredConstraint, CoincidentCandidate } from './constraint-inference';
import { Constraint } from '@/types/geometry';

/**
 * Callbacks for constraint operations.
 */
export interface ConstraintManagerCallbacks {
    onConstraintCreate?: (
        sketchId: string,
        type: string,
        elementIds: string[],
        value?: number,
        pointIndices?: number[]  // For coincident constraints
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
 * Extended inferred constraint with ghost ID.
 */
interface GhostConstraint extends InferredConstraint {
    ghostId: string;
}

/**
 * Ghost coincident constraint.
 */
interface GhostCoincidentConstraint extends CoincidentCandidate {
    ghostId: string;
    confidence: number;
}

/**
 * ConstraintManager coordinates constraint inference, rendering, and backend sync.
 *
 * Flow:
 * 1. Line is drawn -> detectConstraintsForLine() called
 * 2. Ghost icons appear for inferred constraints
 * 3. User clicks icon -> confirmConstraint() called
 * 4. Backend constraint created, icon turns solid
 * 5. User presses Escape or clicks away -> dismissGhostConstraints()
 */
export class ConstraintManager {
    private renderer: ConstraintRenderer;
    private callbacks: ConstraintManagerCallbacks = {};

    // Sketch coordinate systems
    private sketchCoords = new Map<string, SketchCoordinateSystem>();

    // Track ghost constraints (not yet confirmed)
    private ghostConstraints = new Map<string, GhostConstraint>();

    // Track ghost coincident constraints (not yet confirmed)
    private ghostCoincidentConstraints = new Map<string, GhostCoincidentConstraint>();

    // Track confirmed constraints
    private confirmedConstraints = new Map<string, Constraint>();

    // Store element endpoints for coincident detection
    private elementEndpoints = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();

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
     * Store element endpoints for coincident detection.
     */
    public setElementEndpoints(
        elementId: string,
        x1: number, y1: number, x2: number, y2: number
    ): void {
        this.elementEndpoints.set(elementId, { x1, y1, x2, y2 });
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

        // Detect H/V constraints
        const inferred = detectLineConstraints(x1, y1, x2, y2, elementId, sketchId);

        // Get sketch coordinate system
        const coords = this.sketchCoords.get(sketchId);
        if (!coords) {
            console.warn(`No coordinate system for sketch ${sketchId}`);
            return inferred;
        }

        // Render ghost icons for H/V constraints
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
                ghostId
            });

            console.log(`Created ghost ${constraint.type} constraint: ${ghostId}`);
        }

        // Also detect coincident constraints
        const coincidentCandidates = detectCoincidentConstraints(
            elementId, x1, y1, x2, y2,
            this.elementEndpoints,
            sketchId
        );

        // Render ghost icons for coincident candidates
        for (const candidate of coincidentCandidates) {
            const ghostId = `ghost_coinc_${++this.ghostIdCounter}_${Date.now()}`;

            // Get position of the point on the new element
            const pointPos = getPointPosition(x1, y1, x2, y2, candidate.point1Index);
            const position3D = coords.origin.clone()
                .addScaledVector(coords.uAxis, pointPos.x)
                .addScaledVector(coords.vAxis, pointPos.y);

            this.renderer.renderCoincidentIcon(
                ghostId,
                candidate.element1Id,
                candidate.element2Id,
                candidate.point1Index,
                candidate.point2Index,
                sketchId,
                position3D,
                coords.normal,
                false
            );

            this.ghostCoincidentConstraints.set(ghostId, {
                ...candidate,
                ghostId,
                confidence: 1 - (candidate.distance / 0.5)  // Closer = higher confidence
            });

            console.log(`Created ghost coincident constraint: ${ghostId}`);
        }

        // Store this element's endpoints for future detection
        this.elementEndpoints.set(elementId, { x1, y1, x2, y2 });

        return inferred;
    }

    /**
     * Confirm a ghost constraint, creating it in the backend.
     */
    public async confirmConstraint(ghostId: string): Promise<Constraint | null> {
        // Check if it's a H/V ghost
        const ghost = this.ghostConstraints.get(ghostId);
        // Check if it's a coincident ghost
        const coincGhost = this.ghostCoincidentConstraints.get(ghostId);

        if (!ghost && !coincGhost) {
            console.warn(`Ghost constraint ${ghostId} not found`);
            return null;
        }

        // Create in backend
        if (!this.callbacks.onConstraintCreate) {
            console.warn('No onConstraintCreate callback');
            return null;
        }

        try {
            let result;
            let constraint: Constraint;

            if (coincGhost) {
                // Coincident constraint
                result = await this.callbacks.onConstraintCreate(
                    coincGhost.sketchId,
                    'coincident',
                    [coincGhost.element1Id, coincGhost.element2Id],
                    undefined,
                    [coincGhost.point1Index, coincGhost.point2Index]
                );

                constraint = {
                    id: result.constraint_id,
                    type: 'coincident',
                    sketch_id: coincGhost.sketchId,
                    element_ids: [coincGhost.element1Id, coincGhost.element2Id],
                    point_indices: [coincGhost.point1Index, coincGhost.point2Index],
                    satisfied: true,
                    inferred: true,
                    confirmed: true
                };

                // Remove ghost and add confirmed
                this.ghostCoincidentConstraints.delete(ghostId);
            } else if (ghost) {
                // H/V constraint
                result = await this.callbacks.onConstraintCreate(
                    ghost.sketchId,
                    ghost.type,
                    [ghost.elementId]
                );

                constraint = {
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
            } else {
                return null;
            }

            this.confirmedConstraints.set(constraint.id, constraint);

            // Update icon appearance
            this.renderer.confirmConstraint(ghostId);

            // Fire callback
            if (this.callbacks.onConstraintConfirmed) {
                this.callbacks.onConstraintConfirmed(constraint);
            }

            console.log(`Confirmed constraint: ${constraint.id} (${constraint.type})`);
            return constraint;

        } catch (error) {
            console.error('Failed to confirm constraint:', error);
            // Remove the ghost icon since creation failed
            this.renderer.removeIcon(ghostId);
            this.ghostConstraints.delete(ghostId);
            this.ghostCoincidentConstraints.delete(ghostId);
            return null;
        }
    }

    /**
     * Dismiss all ghost constraints (user pressed Escape).
     */
    public dismissAllGhostConstraints(): void {
        // Dismiss H/V ghosts
        this.ghostConstraints.forEach((_, ghostId) => {
            this.renderer.removeIcon(ghostId);
            if (this.callbacks.onConstraintRejected) {
                this.callbacks.onConstraintRejected(ghostId);
            }
        });
        this.ghostConstraints.clear();

        // Dismiss coincident ghosts
        this.ghostCoincidentConstraints.forEach((_, ghostId) => {
            this.renderer.removeIcon(ghostId);
            if (this.callbacks.onConstraintRejected) {
                this.callbacks.onConstraintRejected(ghostId);
            }
        });
        this.ghostCoincidentConstraints.clear();

        console.log('Dismissed all ghost constraints');
    }

    /**
     * Dismiss ghost constraints for a specific element.
     */
    public dismissGhostConstraintsForElement(elementId: string): void {
        // Remove H/V ghosts
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

        // Remove coincident ghosts
        const coincToRemove: string[] = [];
        this.ghostCoincidentConstraints.forEach((ghost, ghostId) => {
            if (ghost.element1Id === elementId || ghost.element2Id === elementId) {
                coincToRemove.push(ghostId);
            }
        });
        coincToRemove.forEach(ghostId => {
            this.renderer.removeIcon(ghostId);
            this.ghostCoincidentConstraints.delete(ghostId);
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
        return this.ghostConstraints.has(id) || this.ghostCoincidentConstraints.has(id);
    }

    /**
     * Get ghost constraint info.
     */
    public getGhostConstraint(id: string): GhostConstraint | undefined {
        return this.ghostConstraints.get(id);
    }

    /**
     * Get confirmed constraint info.
     */
    public getConfirmedConstraint(id: string): Constraint | undefined {
        return this.confirmedConstraints.get(id);
    }

    /**
     * Get all ghost constraint IDs.
     */
    public getAllGhostIds(): string[] {
        return [
            ...Array.from(this.ghostConstraints.keys()),
            ...Array.from(this.ghostCoincidentConstraints.keys())
        ];
    }

    /**
     * Check if there are any ghost constraints.
     */
    public hasGhostConstraints(): boolean {
        return this.ghostConstraints.size > 0 || this.ghostCoincidentConstraints.size > 0;
    }

    /**
     * Clear all constraints for a sketch.
     */
    public clearConstraintsForSketch(sketchId: string): void {
        // Remove H/V ghosts
        const ghostsToRemove: string[] = [];
        this.ghostConstraints.forEach((ghost, ghostId) => {
            if (ghost.sketchId === sketchId) {
                ghostsToRemove.push(ghostId);
            }
        });
        ghostsToRemove.forEach(ghostId => {
            this.renderer.removeIcon(ghostId);
            this.ghostConstraints.delete(ghostId);
        });

        // Remove coincident ghosts
        const coincGhostsToRemove: string[] = [];
        this.ghostCoincidentConstraints.forEach((ghost, ghostId) => {
            if (ghost.sketchId === sketchId) {
                coincGhostsToRemove.push(ghostId);
            }
        });
        coincGhostsToRemove.forEach(ghostId => {
            this.renderer.removeIcon(ghostId);
            this.ghostCoincidentConstraints.delete(ghostId);
        });

        // Remove confirmed
        const confirmedToRemove: string[] = [];
        this.confirmedConstraints.forEach((constraint, id) => {
            if (constraint.sketch_id === sketchId) {
                confirmedToRemove.push(id);
            }
        });
        confirmedToRemove.forEach(id => {
            this.renderer.removeIcon(id);
            this.confirmedConstraints.delete(id);
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
        this.ghostCoincidentConstraints.clear();
        this.confirmedConstraints.clear();
        this.elementEndpoints.clear();
        this.sketchCoords.clear();
        this.callbacks = {};
    }
}
