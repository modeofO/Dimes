import * as THREE from 'three';
import { 
    PlaneVisualizationData, 
    SketchVisualizationData, 
    SketchElementVisualizationData 
} from '@/types/geometry';

export class VisualizationManager {
    private scene: THREE.Scene;
    private planeMeshes = new Map<string, THREE.Group>();
    private sketchMeshes = new Map<string, THREE.Group>();
    private elementMeshes = new Map<string, THREE.Group>();
    private activeSketchHighlight: THREE.Group | null = null;
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    public addPlaneVisualization(data: PlaneVisualizationData): void {
        const group = new THREE.Group();
        group.name = `plane-${data.plane_id}`;
        
        // Create light blue plane box
        const planeGeometry = new THREE.PlaneGeometry(data.size, data.size);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488aa, // Blue color tuned for dark background
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Position and orient the plane
        const origin = new THREE.Vector3(...data.origin);
        const normal = new THREE.Vector3(...data.normal);
        const uAxis = new THREE.Vector3(...data.u_axis);
        const vAxis = new THREE.Vector3(...data.v_axis);
        
        // Create transformation matrix
        const matrix = new THREE.Matrix4();
        matrix.makeBasis(uAxis, vAxis, normal);
        matrix.setPosition(origin);
        
        planeMesh.applyMatrix4(matrix);
        group.add(planeMesh);
        
        // Add coordinate axes for the plane
        const axesGroup = this.createCoordinateAxes(20, origin, uAxis, vAxis, normal);
        group.add(axesGroup);
        
        this.scene.add(group);
        this.planeMeshes.set(data.plane_id, group);
        
        console.log(`Added plane visualization: ${data.plane_id}`);
    }
    
    public addSketchVisualization(data: SketchVisualizationData): void {
        const group = new THREE.Group();
        group.name = `sketch-${data.sketch_id}`;
        
        // Position and orient the sketch coordinate system
        const origin = new THREE.Vector3(...data.origin);
        const normal = new THREE.Vector3(...data.normal);
        const uAxis = new THREE.Vector3(...data.u_axis);
        const vAxis = new THREE.Vector3(...data.v_axis);
        
        // Add smaller coordinate axes for the sketch
        const axesGroup = this.createCoordinateAxes(15, origin, uAxis, vAxis, normal);
        group.add(axesGroup);
        
        this.scene.add(group);
        this.sketchMeshes.set(data.sketch_id, group);
        
        console.log(`Added sketch visualization: ${data.sketch_id}`);
    }
    
    public addSketchElementVisualization(data: SketchElementVisualizationData): void {
        // If element already exists, remove it first to update it
        this.removeElementVisualization(data.element_id);

        const group = new THREE.Group();
        group.name = `element-${data.sketch_id}-${data.element_id}`;
        // Store element type for downstream selection logic
        group.userData.elementType = data.element_type;

        if (data.element_type === 'line') {
            const lineGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x44ff66,
                linewidth: 2
            });

            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);

            // Add invisible hit-test mesh for reliable raycasting
            this.addHitTestMesh(group, data.points_3d, false);

        } else if (data.element_type === 'circle') {
            const circleGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            circleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const circleMaterial = new THREE.LineBasicMaterial({
                color: 0xff4466,
                linewidth: 2
            });

            const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
            group.add(circle);

            // For snapping, add userData with center if available
            if (data.parameters_2d?.center) {
                group.userData.center = new THREE.Vector3(...data.parameters_2d.center);
            }

            // Add invisible hit-test mesh for reliable raycasting
            this.addHitTestMesh(group, data.points_3d, true);

        } else if (data.element_type === 'arc') {
            const arcGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            arcGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const arcMaterial = new THREE.LineBasicMaterial({
                color: 0xffaa33,
                linewidth: 2
            });

            const arc = new THREE.Line(arcGeometry, arcMaterial);
            group.add(arc);

            // Add invisible hit-test mesh for reliable raycasting
            this.addHitTestMesh(group, data.points_3d, false);

        } else if (data.element_type === 'rectangle') {
            const rectGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            rectGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const rectMaterial = new THREE.LineBasicMaterial({
                color: 0x4488ff,
                linewidth: 2
            });

            const rectangle = new THREE.LineLoop(rectGeometry, rectMaterial);
            group.add(rectangle);

            // Add invisible hit-test mesh for reliable raycasting
            this.addHitTestMesh(group, data.points_3d, true);

        } else if (data.element_type === 'polygon') {
            const polygonGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            polygonGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const polygonMaterial = new THREE.LineBasicMaterial({
                color: 0xaa55ff,
                linewidth: 2
            });

            const polygon = new THREE.LineLoop(polygonGeometry, polygonMaterial);
            group.add(polygon);

            // Add invisible hit-test mesh for reliable raycasting
            this.addHitTestMesh(group, data.points_3d, true);

        } else if (data.element_type === 'fillet') {
            const filletGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            filletGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const filletMaterial = new THREE.LineBasicMaterial({
                color: 0x44aaff,
                linewidth: 3
            });

            const fillet = new THREE.Line(filletGeometry, filletMaterial);
            group.add(fillet);

            this.addHitTestMesh(group, data.points_3d, false);

        } else if (data.element_type === 'chamfer') {
            const chamferGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            chamferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const chamferMaterial = new THREE.LineBasicMaterial({
                color: 0xff6633,
                linewidth: 3
            });

            const chamfer = new THREE.Line(chamferGeometry, chamferMaterial);
            group.add(chamfer);

            this.addHitTestMesh(group, data.points_3d, false);

        } else {
            console.warn(`Unknown element type for visualization: ${data.element_type}`);
            if (data.points_3d && data.points_3d.length >= 6) {
                const fallbackGeometry = new THREE.BufferGeometry();
                const positions = new Float32Array(data.points_3d);
                fallbackGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                const fallbackMaterial = new THREE.LineBasicMaterial({
                    color: 0xaaaaaa,
                    linewidth: 2
                });

                const fallback = new THREE.Line(fallbackGeometry, fallbackMaterial);
                group.add(fallback);

                this.addHitTestMesh(group, data.points_3d, false);
            }
        }

        this.scene.add(group);
        this.elementMeshes.set(data.element_id, group);

        console.log(`Added element visualization: ${data.element_id} (${data.element_type})`);
    }

    /**
     * Adds an invisible mesh behind line geometry for reliable raycasting.
     * Lines are nearly impossible to click in Three.js; this flat ribbon mesh
     * gives the raycaster a solid surface to hit.
     */
    private addHitTestMesh(group: THREE.Group, points3d: number[], isClosed: boolean): void {
        const pointCount = points3d.length / 3;
        if (pointCount < 2) return;

        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < pointCount; i++) {
            vertices.push(new THREE.Vector3(
                points3d[i * 3],
                points3d[i * 3 + 1],
                points3d[i * 3 + 2]
            ));
        }

        // Build a flat ribbon mesh along the polyline with a fixed half-width
        const HALF_WIDTH = 0.4; // world units — generous click target
        const ribbonPositions: number[] = [];
        const ribbonIndices: number[] = [];

        // Compute an "up" direction perpendicular to the general polyline plane.
        // For XZ-plane sketches the normal is Y; detect from first 3 non-collinear points.
        let up = new THREE.Vector3(0, 1, 0);
        if (vertices.length >= 3) {
            const e1 = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
            const e2 = new THREE.Vector3().subVectors(vertices[2], vertices[0]);
            const cross = new THREE.Vector3().crossVectors(e1, e2);
            if (cross.lengthSq() > 1e-8) {
                up = cross.normalize();
            }
        } else if (vertices.length === 2) {
            // Single segment — pick an arbitrary perpendicular
            const seg = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
            up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(seg.dot(up)) > 0.99 * seg.length()) {
                up = new THREE.Vector3(1, 0, 0);
            }
        }

        // For each vertex, compute a perpendicular offset in the plane
        const allVerts = isClosed ? [...vertices, vertices[0]] : vertices;

        for (let i = 0; i < allVerts.length; i++) {
            const prev = i > 0 ? allVerts[i - 1] : (isClosed ? vertices[vertices.length - 1] : allVerts[0]);
            const next = i < allVerts.length - 1 ? allVerts[i + 1] : (isClosed ? vertices[0] : allVerts[allVerts.length - 1]);

            const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
            const offset = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(HALF_WIDTH);

            if (offset.lengthSq() < 1e-8) {
                // Fallback: try another up vector
                const altUp = new THREE.Vector3(0, 0, 1);
                offset.crossVectors(tangent, altUp).normalize().multiplyScalar(HALF_WIDTH);
            }

            const p = allVerts[i];
            ribbonPositions.push(
                p.x + offset.x, p.y + offset.y, p.z + offset.z,
                p.x - offset.x, p.y - offset.y, p.z - offset.z
            );
        }

        // Create quad faces between consecutive ribbon vertex pairs
        const segCount = allVerts.length - 1;
        for (let i = 0; i < segCount; i++) {
            const base = i * 2;
            // Two triangles per quad
            ribbonIndices.push(base, base + 1, base + 2);
            ribbonIndices.push(base + 1, base + 3, base + 2);
        }

        if (ribbonPositions.length === 0 || ribbonIndices.length === 0) return;

        const ribbonGeo = new THREE.BufferGeometry();
        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
        ribbonGeo.setIndex(ribbonIndices);
        ribbonGeo.computeVertexNormals();

        const ribbonMat = new THREE.MeshBasicMaterial({
            visible: false, // invisible — only for raycasting
            side: THREE.DoubleSide,
        });

        const hitMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        hitMesh.userData.isHitTest = true;
        group.add(hitMesh);
    }
    
    public removePlaneVisualization(planeId: string): void {
        const group = this.planeMeshes.get(planeId);
        if (group) {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
            this.planeMeshes.delete(planeId);
        }
    }
    
    public removeSketchVisualization(sketchId: string): void {
        const group = this.sketchMeshes.get(sketchId);
        if (group) {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
            this.sketchMeshes.delete(sketchId);
        }
    }
    
    public removeElementVisualization(elementId: string): void {
        const group = this.elementMeshes.get(elementId);
        if (group) {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
            this.elementMeshes.delete(elementId);
        }
    }
    
    public clearAll(): void {
        // Clear all visualizations
        this.planeMeshes.forEach(group => {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
        });
        this.planeMeshes.clear();
        
        this.sketchMeshes.forEach(group => {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
        });
        this.sketchMeshes.clear();
        
        this.elementMeshes.forEach(group => {
            this.scene.remove(group);
            this.disposeMeshGroup(group);
        });
        this.elementMeshes.clear();
        
        // Clear active sketch highlight
        this.clearActiveSketchHighlight();
        
        console.log('Cleared all visualizations');
    }
    
    public dispose(): void {
        this.clearAll();
    }
    
    public highlightActiveSketch(sketchId: string): void {
        // Clear any existing highlight
        this.clearActiveSketchHighlight();
        
        // Find the sketch group
        const sketchGroup = this.sketchMeshes.get(sketchId);
        if (!sketchGroup) {
            console.warn(`Sketch ${sketchId} not found for highlighting`);
            return;
        }
        
        // Create a highlight ring around the sketch area
        const highlightGroup = new THREE.Group();
        highlightGroup.name = `active-sketch-highlight-${sketchId}`;
        
        // Create a glowing ring effect
        const ringGeometry = new THREE.RingGeometry(18, 22, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x3388ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Position the ring at the same location as the sketch
        ring.position.copy(sketchGroup.position);
        ring.rotation.copy(sketchGroup.rotation);
        
        // Add animated pulsing effect
        const animate = () => {
            if (this.activeSketchHighlight) {
                const time = Date.now() * 0.002;
                ring.material.opacity = 0.3 + Math.sin(time) * 0.1;
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        highlightGroup.add(ring);
        this.scene.add(highlightGroup);
        this.activeSketchHighlight = highlightGroup;
        
        console.log(`Added highlight for active sketch: ${sketchId}`);
    }
    
    public clearActiveSketchHighlight(): void {
        if (this.activeSketchHighlight) {
            this.scene.remove(this.activeSketchHighlight);
            this.disposeMeshGroup(this.activeSketchHighlight);
            this.activeSketchHighlight = null;
            console.log('Cleared active sketch highlight');
        }
    }
    
    private createCoordinateAxes(
        size: number, 
        origin: THREE.Vector3, 
        xAxis: THREE.Vector3, 
        yAxis: THREE.Vector3, 
        zAxis: THREE.Vector3
    ): THREE.Group {
        const axesGroup = new THREE.Group();
        
        // X axis (red)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            origin,
            origin.clone().add(xAxis.clone().multiplyScalar(size))
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xLine = new THREE.Line(xGeometry, xMaterial);
        axesGroup.add(xLine);
        
        // Y axis (green)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            origin,
            origin.clone().add(yAxis.clone().multiplyScalar(size))
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yLine = new THREE.Line(yGeometry, yMaterial);
        axesGroup.add(yLine);
        
        // Z axis (blue)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            origin,
            origin.clone().add(zAxis.clone().multiplyScalar(size))
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zLine = new THREE.Line(zGeometry, zMaterial);
        axesGroup.add(zLine);
        
        return axesGroup;
    }
    
    private disposeMeshGroup(group: THREE.Group): void {
        group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    }
} 