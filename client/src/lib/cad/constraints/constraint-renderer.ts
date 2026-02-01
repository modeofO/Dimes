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

        // Get current position from sprite
        let position = new THREE.Vector3();
        let normal = new THREE.Vector3(0, 1, 0);
        icon.group.traverse(child => {
            if (child instanceof THREE.Sprite) {
                position.copy(child.position);
            }
        });

        // Re-render with confirmed appearance
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
        this.icons.forEach((icon) => {
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
