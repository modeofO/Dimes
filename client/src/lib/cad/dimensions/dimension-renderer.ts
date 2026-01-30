import * as THREE from 'three';
import { DimensionVisualizationData } from '@/types/geometry';
import { calculateDimensionPositions } from '../utils/geometry-utils';

// Dimension colors
const DIMENSION_COLOR = 0x4A9EFF; // Blue
const DIMENSION_COLOR_SELECTED = 0x7FCFFF; // Lighter blue
const EXTENSION_LINE_OPACITY = 0.5;

// Arrow head dimensions
const ARROW_LENGTH = 1.5;
const ARROW_WIDTH = 0.5;

// Text sprite settings
const TEXT_FONT = 'bold 32px Arial';
const TEXT_COLOR = '#ffffff';
const TEXT_PADDING = 8;

/**
 * DimensionRenderer handles the Three.js rendering of dimension annotations.
 * Each dimension consists of:
 * - Two extension lines (from the line endpoints perpendicular to the offset)
 * - One dimension line (parallel to the measured line at the offset distance)
 * - Two arrow heads at the dimension line ends
 * - One text sprite showing the dimension value
 * - One invisible hit-test mesh for click detection
 */
export class DimensionRenderer {
    private scene: THREE.Scene;
    private dimensionGroups = new Map<string, THREE.Group>();
    private selectedDimensionId: string | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Render a dimension annotation in 3D space.
     * Converts 2D sketch coordinates to 3D using the sketch's coordinate system.
     */
    public renderDimension(
        data: DimensionVisualizationData,
        sketchOrigin: THREE.Vector3,
        sketchUAxis: THREE.Vector3,
        sketchVAxis: THREE.Vector3
    ): void {
        // Remove existing dimension with same ID if it exists
        this.removeDimension(data.dimension_id);

        const group = new THREE.Group();
        group.name = `dimension-${data.dimension_id}`;
        group.userData.dimensionId = data.dimension_id;
        group.userData.isDimension = true;

        // Extract 2D coordinates from the visualization data
        const lineStart2D = {
            x: data.line_start_3d[0],
            y: data.line_start_3d[2] // Using Z as the 2D Y (XZ plane)
        };
        const lineEnd2D = {
            x: data.line_end_3d[0],
            y: data.line_end_3d[2]
        };

        // Calculate all the dimension positions in 2D
        const positions = calculateDimensionPositions(
            lineStart2D.x,
            lineStart2D.y,
            lineEnd2D.x,
            lineEnd2D.y,
            data.offset,
            data.offset_direction
        );

        // Convert 2D positions to 3D using sketch coordinate system
        const to3D = (point: { x: number; y: number }): THREE.Vector3 => {
            return new THREE.Vector3()
                .copy(sketchOrigin)
                .addScaledVector(sketchUAxis, point.x)
                .addScaledVector(sketchVAxis, point.y);
        };

        const extStart1_3D = to3D(positions.extStart1);
        const extEnd1_3D = to3D(positions.extEnd1);
        const extStart2_3D = to3D(positions.extStart2);
        const extEnd2_3D = to3D(positions.extEnd2);
        const dimLineStart_3D = to3D(positions.dimLineStart);
        const dimLineEnd_3D = to3D(positions.dimLineEnd);
        const textPosition_3D = to3D(positions.textPosition);

        // Calculate direction vectors for arrows
        const dimDirection = new THREE.Vector3()
            .subVectors(dimLineEnd_3D, dimLineStart_3D)
            .normalize();
        const perpDirection = new THREE.Vector3()
            .subVectors(extEnd1_3D, extStart1_3D)
            .normalize();

        // Create extension lines
        const extLine1 = this.createExtensionLine(extStart1_3D, extEnd1_3D);
        const extLine2 = this.createExtensionLine(extStart2_3D, extEnd2_3D);
        group.add(extLine1);
        group.add(extLine2);

        // Create dimension line
        const dimLine = this.createDimensionLine(dimLineStart_3D, dimLineEnd_3D);
        group.add(dimLine);

        // Create arrow heads at both ends
        const arrow1 = this.createArrowHead(dimLineStart_3D, dimDirection);
        const arrow2 = this.createArrowHead(dimLineEnd_3D, dimDirection.clone().negate());
        group.add(arrow1);
        group.add(arrow2);

        // Create text sprite
        const textSprite = this.createTextSprite(data.value, textPosition_3D);
        group.add(textSprite);

        // Create invisible hit-test mesh
        const hitTestMesh = this.createHitTestMesh(
            dimLineStart_3D,
            dimLineEnd_3D,
            perpDirection,
            data.dimension_id
        );
        group.add(hitTestMesh);

        // Add to scene and store reference
        this.scene.add(group);
        this.dimensionGroups.set(data.dimension_id, group);

        console.log(`Rendered dimension: ${data.dimension_id} with value ${data.value} mm`);
    }

    /**
     * Create an extension line with reduced opacity.
     */
    private createExtensionLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
            color: DIMENSION_COLOR,
            transparent: true,
            opacity: EXTENSION_LINE_OPACITY,
            linewidth: 1
        });
        const line = new THREE.Line(geometry, material);
        line.userData.isDimensionPart = true;
        line.userData.partType = 'extension';
        return line;
    }

    /**
     * Create the main dimension line.
     */
    private createDimensionLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
            color: DIMENSION_COLOR,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        line.userData.isDimensionPart = true;
        line.userData.partType = 'dimension';
        return line;
    }

    /**
     * Create a chevron-style arrow head.
     */
    private createArrowHead(
        position: THREE.Vector3,
        direction: THREE.Vector3
    ): THREE.Line {
        // Calculate perpendicular direction for arrow width
        // Use world up for reference, fall back to another axis if parallel
        let worldUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(direction.dot(worldUp)) > 0.99) {
            worldUp = new THREE.Vector3(0, 0, 1);
        }
        const perpendicular = new THREE.Vector3()
            .crossVectors(direction, worldUp)
            .normalize();

        // Arrow points
        const tip = position.clone();
        const backPoint = position.clone().addScaledVector(direction, -ARROW_LENGTH);
        const leftPoint = backPoint.clone().addScaledVector(perpendicular, ARROW_WIDTH);
        const rightPoint = backPoint.clone().addScaledVector(perpendicular, -ARROW_WIDTH);

        // Create chevron shape (V shape pointing in direction)
        const points = [leftPoint, tip, rightPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: DIMENSION_COLOR,
            linewidth: 2
        });
        const arrow = new THREE.Line(geometry, material);
        arrow.userData.isDimensionPart = true;
        arrow.userData.partType = 'arrow';
        return arrow;
    }

    /**
     * Create a text sprite that always faces the camera.
     * Uses canvas rendering for crisp text.
     */
    private createTextSprite(value: number, position: THREE.Vector3): THREE.Sprite {
        const text = `${value.toFixed(2)} mm`;

        // Create canvas for text rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        // Set font to measure text
        context.font = TEXT_FONT;
        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        const textHeight = 32; // Approximate height based on font size

        // Set canvas size with padding
        canvas.width = textWidth + TEXT_PADDING * 2;
        canvas.height = textHeight + TEXT_PADDING * 2;

        // Draw background (semi-transparent dark)
        context.fillStyle = 'rgba(30, 30, 40, 0.85)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        context.strokeStyle = `#${DIMENSION_COLOR.toString(16).padStart(6, '0')}`;
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        // Draw text
        context.font = TEXT_FONT;
        context.fillStyle = TEXT_COLOR;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create sprite material
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);

        // Scale sprite to maintain readable size
        // Adjust scale based on canvas aspect ratio
        const scale = 5; // Base scale for visibility
        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(scale * aspectRatio, scale, 1);

        sprite.userData.isDimensionPart = true;
        sprite.userData.partType = 'text';
        sprite.userData.canvas = canvas;
        sprite.userData.texture = texture;

        return sprite;
    }

    /**
     * Create an invisible mesh for hit testing (click detection).
     */
    private createHitTestMesh(
        start: THREE.Vector3,
        end: THREE.Vector3,
        perpDirection: THREE.Vector3,
        dimensionId: string
    ): THREE.Mesh {
        // Create a thin box along the dimension line for hit testing
        const length = start.distanceTo(end);
        const width = 3; // Click target width
        const depth = 0.5; // Thin depth

        const geometry = new THREE.BoxGeometry(length, depth, width);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position at midpoint
        const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
        mesh.position.copy(midpoint);

        // Orient along dimension line
        const direction = new THREE.Vector3().subVectors(end, start).normalize();

        // Calculate rotation to align box with dimension line
        const quaternion = new THREE.Quaternion();
        const defaultDir = new THREE.Vector3(1, 0, 0); // Box default orientation
        quaternion.setFromUnitVectors(defaultDir, direction);
        mesh.quaternion.copy(quaternion);

        // Store dimension ID for raycasting identification
        mesh.userData.isDimension = true;
        mesh.userData.dimensionId = dimensionId;
        mesh.userData.isHitTest = true;

        return mesh;
    }

    /**
     * Remove a dimension from the scene.
     */
    public removeDimension(dimensionId: string): void {
        const group = this.dimensionGroups.get(dimensionId);
        if (group) {
            this.scene.remove(group);
            this.disposeGroup(group);
            this.dimensionGroups.delete(dimensionId);

            if (this.selectedDimensionId === dimensionId) {
                this.selectedDimensionId = null;
            }

            console.log(`Removed dimension: ${dimensionId}`);
        }
    }

    /**
     * Set a dimension as selected (highlighted).
     */
    public setSelected(dimensionId: string | null): void {
        // Deselect previous
        if (this.selectedDimensionId) {
            this.updateDimensionColor(this.selectedDimensionId, DIMENSION_COLOR);
        }

        this.selectedDimensionId = dimensionId;

        // Select new
        if (dimensionId) {
            this.updateDimensionColor(dimensionId, DIMENSION_COLOR_SELECTED);
        }
    }

    /**
     * Update the color of all parts of a dimension.
     */
    private updateDimensionColor(dimensionId: string, color: number): void {
        const group = this.dimensionGroups.get(dimensionId);
        if (!group) return;

        group.traverse((object) => {
            if (object instanceof THREE.Line) {
                const material = object.material as THREE.LineBasicMaterial;
                material.color.setHex(color);
                // Restore full opacity for dimension line when selected
                if (object.userData.partType === 'extension') {
                    material.opacity = color === DIMENSION_COLOR_SELECTED
                        ? 0.8
                        : EXTENSION_LINE_OPACITY;
                }
            } else if (object instanceof THREE.Sprite) {
                // Redraw text sprite with new color
                this.updateTextSpriteColor(object, color);
            }
        });
    }

    /**
     * Update the border color of a text sprite.
     */
    private updateTextSpriteColor(sprite: THREE.Sprite, color: number): void {
        const canvas = sprite.userData.canvas as HTMLCanvasElement;
        const texture = sprite.userData.texture as THREE.CanvasTexture;

        if (!canvas || !texture) return;

        const context = canvas.getContext('2d')!;

        // Get current text from canvas (extract from texture)
        // We need to redraw with new color
        const material = sprite.material as THREE.SpriteMaterial;

        // Redraw border
        context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        texture.needsUpdate = true;
    }

    /**
     * Get the dimension ID at a given raycaster position.
     */
    public getDimensionAtPosition(raycaster: THREE.Raycaster): string | null {
        const intersects = raycaster.intersectObjects(
            Array.from(this.dimensionGroups.values()).flatMap(group => {
                const hitTestMeshes: THREE.Object3D[] = [];
                group.traverse((object) => {
                    if (object.userData.isHitTest && object.userData.isDimension) {
                        hitTestMeshes.push(object);
                    }
                });
                return hitTestMeshes;
            }),
            false
        );

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            return hit.userData.dimensionId || null;
        }

        return null;
    }

    /**
     * Update the displayed value of a dimension.
     */
    public updateDimensionValue(dimensionId: string, newValue: number): void {
        const group = this.dimensionGroups.get(dimensionId);
        if (!group) {
            console.warn(`Cannot update dimension ${dimensionId}: not found`);
            return;
        }

        // Find and update the text sprite
        group.traverse((object) => {
            if (object instanceof THREE.Sprite && object.userData.partType === 'text') {
                // Recreate the text sprite content
                const canvas = object.userData.canvas as HTMLCanvasElement;
                const texture = object.userData.texture as THREE.CanvasTexture;

                if (canvas && texture) {
                    const context = canvas.getContext('2d')!;
                    const text = `${newValue.toFixed(2)} mm`;

                    // Clear and redraw
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw background
                    context.fillStyle = 'rgba(30, 30, 40, 0.85)';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw border
                    const color = this.selectedDimensionId === dimensionId
                        ? DIMENSION_COLOR_SELECTED
                        : DIMENSION_COLOR;
                    context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
                    context.lineWidth = 2;
                    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

                    // Draw text
                    context.font = TEXT_FONT;
                    context.fillStyle = TEXT_COLOR;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(text, canvas.width / 2, canvas.height / 2);

                    texture.needsUpdate = true;
                }
            }
        });

        console.log(`Updated dimension ${dimensionId} to ${newValue} mm`);
    }

    /**
     * Clear all dimensions from the scene.
     */
    public clearAll(): void {
        this.dimensionGroups.forEach((group, id) => {
            this.scene.remove(group);
            this.disposeGroup(group);
        });
        this.dimensionGroups.clear();
        this.selectedDimensionId = null;

        console.log('Cleared all dimensions');
    }

    /**
     * Dispose of all resources.
     */
    public dispose(): void {
        this.clearAll();
    }

    /**
     * Dispose of a group and all its resources.
     */
    private disposeGroup(group: THREE.Group): void {
        group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat) => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            } else if (object instanceof THREE.Line) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat) => mat.dispose());
                    } else {
                        (object.material as THREE.Material).dispose();
                    }
                }
            } else if (object instanceof THREE.Sprite) {
                const material = object.material as THREE.SpriteMaterial;
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            }
        });
    }

    /**
     * Get the currently selected dimension ID.
     */
    public getSelectedDimensionId(): string | null {
        return this.selectedDimensionId;
    }

    /**
     * Check if a dimension exists.
     */
    public hasDimension(dimensionId: string): boolean {
        return this.dimensionGroups.has(dimensionId);
    }

    /**
     * Get all dimension IDs.
     */
    public getAllDimensionIds(): string[] {
        return Array.from(this.dimensionGroups.keys());
    }

    /**
     * Get the Three.js group for a dimension (for advanced manipulation).
     */
    public getDimensionGroup(dimensionId: string): THREE.Group | undefined {
        return this.dimensionGroups.get(dimensionId);
    }
}
