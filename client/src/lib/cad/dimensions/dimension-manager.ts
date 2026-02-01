import * as THREE from 'three';
import { LinearDimension, DimensionVisualizationData, SketchVisualizationData } from '@/types/geometry';
import { DimensionRenderer } from './dimension-renderer';
import { lineLength, resizeLineSymmetric } from '../utils/geometry-utils';

/**
 * Callback interface for dimension events.
 * These callbacks allow external systems to react to dimension changes.
 */
export interface DimensionManagerCallbacks {
    onDimensionCreated?: (dimension: LinearDimension) => void;
    onDimensionUpdated?: (dimension: LinearDimension) => void;
    onDimensionDeleted?: (dimensionId: string) => void;
    // Constraint integration callbacks
    onConstraintCreate?: (
        sketchId: string,
        elementId: string,
        value: number
    ) => Promise<{ constraint_id: string; updated_elements: any[] }>;
    onConstraintUpdate?: (
        constraintId: string,
        sketchId: string,
        value: number
    ) => Promise<{ updated_elements: any[] }>;
    onConstraintDelete?: (constraintId: string) => Promise<boolean>;
    // Keep for backwards compatibility during transition
    onLineResizeRequested?: (
        sketchId: string,
        elementId: string,
        newX1: number,
        newY1: number,
        newX2: number,
        newY2: number
    ) => void;
}

/**
 * Stored element data for lines being dimensioned.
 */
interface ElementData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    sketchId: string;
}

/**
 * DimensionManager handles dimension CRUD operations, stores dimension data,
 * and coordinates with the DimensionRenderer for visualization.
 *
 * Responsibilities:
 * - Store and manage dimension data (LinearDimension objects)
 * - Store sketch visualization data (coordinate systems)
 * - Store element geometry data (line endpoints)
 * - Delegate rendering to DimensionRenderer
 * - Calculate line resizes when dimension values change
 * - Provide dimension lookup by ID, element, or sketch
 */
export class DimensionManager {
    // All dimensions indexed by ID
    private dimensions = new Map<string, LinearDimension>();

    // The renderer instance for visualization
    private renderer: DimensionRenderer;

    // Callback handlers
    private callbacks: DimensionManagerCallbacks = {};

    // Sketch coordinate system data indexed by sketch ID
    private sketchVisualizationData = new Map<string, SketchVisualizationData>();

    // Line element geometry indexed by element ID
    private elementData = new Map<string, ElementData>();

    // Counter for generating unique IDs
    private idCounter = 0;

    constructor(scene: THREE.Scene) {
        this.renderer = new DimensionRenderer(scene);
    }

    /**
     * Set callback handlers for dimension events.
     */
    public setCallbacks(callbacks: DimensionManagerCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Store sketch visualization data (coordinate system info).
     * This is needed to convert 2D sketch coordinates to 3D world coordinates.
     */
    public setSketchVisualizationData(sketchId: string, data: SketchVisualizationData): void {
        this.sketchVisualizationData.set(sketchId, data);
    }

    /**
     * Store element geometry data for a line.
     * This is needed to calculate dimension values and handle resizes.
     */
    public setElementData(
        elementId: string,
        sketchId: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): void {
        this.elementData.set(elementId, { x1, y1, x2, y2, sketchId });
    }

    /**
     * Create a new dimension for a line element.
     *
     * @param sketchId - The sketch containing the element
     * @param elementId - The line element to dimension
     * @param offset - Perpendicular distance from the line to the dimension
     * @param offsetDirection - Which side of the line (1 or -1)
     * @returns The created dimension, or null if creation failed
     */
    public async createDimension(
        sketchId: string,
        elementId: string,
        offset: number,
        offsetDirection: 1 | -1
    ): Promise<LinearDimension | null> {
        // Get element data
        const element = this.elementData.get(elementId);
        if (!element) {
            console.warn(`Cannot create dimension: element ${elementId} not found`);
            return null;
        }

        // Get sketch visualization data
        const sketchData = this.sketchVisualizationData.get(sketchId);
        if (!sketchData) {
            console.warn(`Cannot create dimension: sketch ${sketchId} visualization data not found`);
            return null;
        }

        // Calculate the current line length
        const value = lineLength(element.x1, element.y1, element.x2, element.y2);

        // Generate unique ID
        const id = `dim_${++this.idCounter}_${Date.now()}`;

        // Create constraint in backend if callback available
        let constraintId: string | undefined;
        if (this.callbacks.onConstraintCreate) {
            try {
                const result = await this.callbacks.onConstraintCreate(sketchId, elementId, value);
                constraintId = result.constraint_id;
                console.log(`Created backend constraint ${constraintId} for dimension ${id}`);
            } catch (error) {
                console.error('Failed to create constraint:', error);
                // Continue without constraint - dimension still works locally
            }
        }

        // Create the dimension object
        const dimension: LinearDimension = {
            id,
            type: 'linear',
            element_id: elementId,
            sketch_id: sketchId,
            value,
            offset,
            offset_direction: offsetDirection,
            constraint_id: constraintId
        };

        // Store the dimension
        this.dimensions.set(id, dimension);

        // Render the dimension
        this.renderDimension(dimension);

        // Fire callback
        if (this.callbacks.onDimensionCreated) {
            this.callbacks.onDimensionCreated(dimension);
        }

        console.log(`Created dimension ${id} for element ${elementId} with value ${value.toFixed(2)} mm`);

        return dimension;
    }

    /**
     * Update the value of a dimension and resize the associated line.
     * Uses the constraint solver if available, otherwise falls back to local calculation.
     *
     * @param dimensionId - The dimension to update
     * @param newValue - The new dimension value (line length)
     * @returns true if update succeeded, false otherwise
     */
    public async updateDimensionValue(dimensionId: string, newValue: number): Promise<boolean> {
        const dimension = this.dimensions.get(dimensionId);
        if (!dimension) {
            console.warn(`Cannot update dimension: ${dimensionId} not found`);
            return false;
        }

        // Get element data
        const element = this.elementData.get(dimension.element_id);
        if (!element) {
            console.warn(`Cannot update dimension: element ${dimension.element_id} not found`);
            return false;
        }

        // Validate new value
        if (newValue <= 0) {
            console.warn(`Cannot set dimension to non-positive value: ${newValue}`);
            return false;
        }

        // If we have a constraint, update via solver
        if (dimension.constraint_id && this.callbacks.onConstraintUpdate) {
            try {
                const result = await this.callbacks.onConstraintUpdate(
                    dimension.constraint_id,
                    dimension.sketch_id,
                    newValue
                );

                // Apply updated geometry from solver
                if (result.updated_elements && result.updated_elements.length > 0) {
                    for (const elem of result.updated_elements) {
                        if (elem.element_id === dimension.element_id) {
                            // Update local element data from solver response
                            const params = elem.parameters_2d;
                            if (params) {
                                this.elementData.set(dimension.element_id, {
                                    x1: params.x1 ?? element.x1,
                                    y1: params.y1 ?? element.y1,
                                    x2: params.x2 ?? element.x2,
                                    y2: params.y2 ?? element.y2,
                                    sketchId: dimension.sketch_id
                                });
                            }
                        }
                    }
                }

                // Update dimension value
                dimension.value = newValue;

                // Re-render the dimension with new geometry
                this.renderDimension(dimension);

                // Fire dimension updated callback
                if (this.callbacks.onDimensionUpdated) {
                    this.callbacks.onDimensionUpdated(dimension);
                }

                console.log(`Updated dimension ${dimensionId} to ${newValue.toFixed(2)} mm via constraint solver`);
                return true;
            } catch (error) {
                console.error('Constraint update failed:', error);
                return false;
            }
        }

        // Fallback: local calculation (legacy behavior for dimensions without constraints)
        const newEndpoints = resizeLineSymmetric(
            element.x1,
            element.y1,
            element.x2,
            element.y2,
            newValue
        );

        // Update stored element data
        this.elementData.set(dimension.element_id, {
            ...element,
            x1: newEndpoints.x1,
            y1: newEndpoints.y1,
            x2: newEndpoints.x2,
            y2: newEndpoints.y2
        });

        // Update dimension value
        dimension.value = newValue;

        // Re-render the dimension with new geometry
        this.renderDimension(dimension);

        // Fire line resize callback (legacy path)
        if (this.callbacks.onLineResizeRequested) {
            this.callbacks.onLineResizeRequested(
                dimension.sketch_id,
                dimension.element_id,
                newEndpoints.x1,
                newEndpoints.y1,
                newEndpoints.x2,
                newEndpoints.y2
            );
        }

        // Fire dimension updated callback
        if (this.callbacks.onDimensionUpdated) {
            this.callbacks.onDimensionUpdated(dimension);
        }

        console.log(`Updated dimension ${dimensionId} to ${newValue.toFixed(2)} mm (local calculation)`);
        return true;
    }

    /**
     * Delete a dimension.
     *
     * @param dimensionId - The dimension to delete
     */
    public deleteDimension(dimensionId: string): void {
        const dimension = this.dimensions.get(dimensionId);
        if (!dimension) {
            console.warn(`Cannot delete dimension: ${dimensionId} not found`);
            return;
        }

        // Remove from renderer
        this.renderer.removeDimension(dimensionId);

        // Remove from storage
        this.dimensions.delete(dimensionId);

        // Fire callback
        if (this.callbacks.onDimensionDeleted) {
            this.callbacks.onDimensionDeleted(dimensionId);
        }

        console.log(`Deleted dimension ${dimensionId}`);
    }

    /**
     * Get a dimension by ID.
     */
    public getDimension(dimensionId: string): LinearDimension | undefined {
        return this.dimensions.get(dimensionId);
    }

    /**
     * Get all dimensions for a specific element.
     */
    public getDimensionsForElement(elementId: string): LinearDimension[] {
        const result: LinearDimension[] = [];
        this.dimensions.forEach((dimension) => {
            if (dimension.element_id === elementId) {
                result.push(dimension);
            }
        });
        return result;
    }

    /**
     * Get all dimensions for a specific sketch.
     */
    public getDimensionsForSketch(sketchId: string): LinearDimension[] {
        const result: LinearDimension[] = [];
        this.dimensions.forEach((dimension) => {
            if (dimension.sketch_id === sketchId) {
                result.push(dimension);
            }
        });
        return result;
    }

    /**
     * Set the selected dimension (for highlighting).
     * Pass null to deselect.
     */
    public setSelectedDimension(dimensionId: string | null): void {
        this.renderer.setSelected(dimensionId);
    }

    /**
     * Get the dimension at a raycaster position.
     * Used for click detection.
     */
    public getDimensionAtPosition(raycaster: THREE.Raycaster): string | null {
        return this.renderer.getDimensionAtPosition(raycaster);
    }

    /**
     * Get the currently selected dimension ID.
     */
    public getSelectedDimensionId(): string | null {
        return this.renderer.getSelectedDimensionId();
    }

    /**
     * Get all dimension IDs.
     */
    public getAllDimensionIds(): string[] {
        return Array.from(this.dimensions.keys());
    }

    /**
     * Get the total number of dimensions.
     */
    public getDimensionCount(): number {
        return this.dimensions.size;
    }

    /**
     * Check if a dimension exists.
     */
    public hasDimension(dimensionId: string): boolean {
        return this.dimensions.has(dimensionId);
    }

    /**
     * Clear all dimensions from the manager and renderer.
     */
    public clearAll(): void {
        this.renderer.clearAll();
        this.dimensions.clear();
        this.sketchVisualizationData.clear();
        this.elementData.clear();
        this.idCounter = 0;

        console.log('Cleared all dimensions from manager');
    }

    /**
     * Dispose of all resources.
     */
    public dispose(): void {
        this.clearAll();
        this.renderer.dispose();
        this.callbacks = {};
    }

    /**
     * Render a dimension using the renderer.
     * Converts dimension data to visualization data and calls the renderer.
     */
    private renderDimension(dimension: LinearDimension): void {
        // Get element data
        const element = this.elementData.get(dimension.element_id);
        if (!element) {
            console.warn(`Cannot render dimension: element ${dimension.element_id} not found`);
            return;
        }

        // Get sketch visualization data
        const sketchData = this.sketchVisualizationData.get(dimension.sketch_id);
        if (!sketchData) {
            console.warn(`Cannot render dimension: sketch ${dimension.sketch_id} visualization data not found`);
            return;
        }

        // Create visualization data
        // Note: line_start_3d and line_end_3d store 2D coordinates that the renderer
        // will convert to 3D using the sketch coordinate system
        const visualizationData: DimensionVisualizationData = {
            dimension_id: dimension.id,
            dimension_type: 'linear',
            sketch_id: dimension.sketch_id,
            element_id: dimension.element_id,
            value: dimension.value,
            offset: dimension.offset,
            offset_direction: dimension.offset_direction,
            // Store 2D coordinates in 3D format (x, 0, y) for XZ plane convention
            line_start_3d: [element.x1, 0, element.y1],
            line_end_3d: [element.x2, 0, element.y2],
            text_position_3d: [
                (element.x1 + element.x2) / 2,
                0,
                (element.y1 + element.y2) / 2
            ]
        };

        // Convert sketch coordinate system to Three.js vectors
        const sketchOrigin = new THREE.Vector3(
            sketchData.origin[0],
            sketchData.origin[1],
            sketchData.origin[2]
        );
        const sketchUAxis = new THREE.Vector3(
            sketchData.u_axis[0],
            sketchData.u_axis[1],
            sketchData.u_axis[2]
        );
        const sketchVAxis = new THREE.Vector3(
            sketchData.v_axis[0],
            sketchData.v_axis[1],
            sketchData.v_axis[2]
        );

        // Render the dimension
        this.renderer.renderDimension(
            visualizationData,
            sketchOrigin,
            sketchUAxis,
            sketchVAxis
        );
    }

    /**
     * Re-render all dimensions.
     * Useful after sketch coordinate system changes.
     */
    public rerenderAllDimensions(): void {
        this.dimensions.forEach((dimension) => {
            this.renderDimension(dimension);
        });
    }

    /**
     * Update element data and re-render associated dimensions.
     * Called when line geometry changes externally.
     */
    public updateElementData(
        elementId: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): void {
        const element = this.elementData.get(elementId);
        if (!element) {
            console.warn(`Cannot update element data: element ${elementId} not found`);
            return;
        }

        // Update stored data
        this.elementData.set(elementId, { ...element, x1, y1, x2, y2 });

        // Update all dimensions for this element
        const dimensions = this.getDimensionsForElement(elementId);
        dimensions.forEach((dimension) => {
            // Recalculate dimension value based on new geometry
            dimension.value = lineLength(x1, y1, x2, y2);
            // Re-render
            this.renderDimension(dimension);
        });
    }

    /**
     * Get the renderer instance (for advanced use).
     */
    public getRenderer(): DimensionRenderer {
        return this.renderer;
    }
}
