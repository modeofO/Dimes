import * as THREE from 'three';
import { 
    PlaneVisualizationData, 
    SketchVisualizationData, 
    SketchElementVisualizationData 
} from '../../../../../shared/types/geometry';

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
            color: 0xadd8e6, // Light blue color
            transparent: true,
            opacity: 0.2,
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
        
        if (data.element_type === 'line') {
            const lineGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x00ff00,
                linewidth: 2
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            group.add(line);
            
        } else if (data.element_type === 'circle') {
            const circleGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            circleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const circleMaterial = new THREE.LineBasicMaterial({
                color: 0xff0000,
                linewidth: 2
            });
            
            const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
            group.add(circle);
            
            // For snapping, add userData with center if available
            if (data.parameters_2d?.center) {
                group.userData.center = new THREE.Vector3(...data.parameters_2d.center);
            }
        } else if (data.element_type === 'arc') {
            const arcGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            arcGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const arcMaterial = new THREE.LineBasicMaterial({
                color: 0xff8000, // Orange color for arcs
                linewidth: 2
            });
            
            const arc = new THREE.Line(arcGeometry, arcMaterial);
            group.add(arc);
            
        } else if (data.element_type === 'rectangle') {
            const rectGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            rectGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const rectMaterial = new THREE.LineBasicMaterial({
                color: 0x0066ff, // Blue color for rectangles
                linewidth: 2
            });
            
            const rectangle = new THREE.LineLoop(rectGeometry, rectMaterial);
            group.add(rectangle);
            
        } else if (data.element_type === 'polygon') {
            const polygonGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            polygonGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const polygonMaterial = new THREE.LineBasicMaterial({
                color: 0x8000ff, // Purple color for polygons
                linewidth: 2
            });
            
            const polygon = new THREE.LineLoop(polygonGeometry, polygonMaterial);
            group.add(polygon);
            
        } else if (data.element_type === 'fillet') {
            const filletGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            filletGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const filletMaterial = new THREE.LineBasicMaterial({
                color: 0x0080ff, // Blue color for fillets
                linewidth: 3
            });
            
            const fillet = new THREE.Line(filletGeometry, filletMaterial);
            group.add(fillet);
            
        } else if (data.element_type === 'chamfer') {
            const chamferGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(data.points_3d);
            chamferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const chamferMaterial = new THREE.LineBasicMaterial({
                color: 0xff4000, // Red-orange color for chamfers
                linewidth: 3
            });
            
            const chamfer = new THREE.Line(chamferGeometry, chamferMaterial);
            group.add(chamfer);
            
        } else {
            console.warn(`Unknown element type for visualization: ${data.element_type}`);
            // Fallback: render as a simple line if points_3d has at least 6 values (2 points)
            if (data.points_3d && data.points_3d.length >= 6) {
                const fallbackGeometry = new THREE.BufferGeometry();
                const positions = new Float32Array(data.points_3d);
                fallbackGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                
                const fallbackMaterial = new THREE.LineBasicMaterial({
                    color: 0x888888, // Gray color for unknown types
                    linewidth: 1
                });
                
                const fallback = new THREE.Line(fallbackGeometry, fallbackMaterial);
                group.add(fallback);
            }
        }
        
        this.scene.add(group);
        this.elementMeshes.set(data.element_id, group);
        
        console.log(`Added element visualization: ${data.element_id} (${data.element_type})`);
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
            color: 0x0066ff,
            transparent: true,
            opacity: 0.4,
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