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
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    public addPlaneVisualization(data: PlaneVisualizationData): void {
        const group = new THREE.Group();
        group.name = `plane-${data.plane_id}`;
        
        // Create plane grid
        const gridGeometry = new THREE.PlaneGeometry(data.size, data.size, 10, 10);
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        
        // Position and orient the plane
        const origin = new THREE.Vector3(...data.origin);
        const normal = new THREE.Vector3(...data.normal);
        const uAxis = new THREE.Vector3(...data.u_axis);
        const vAxis = new THREE.Vector3(...data.v_axis);
        
        // Create transformation matrix
        const matrix = new THREE.Matrix4();
        matrix.makeBasis(uAxis, vAxis, normal);
        matrix.setPosition(origin);
        
        gridMesh.applyMatrix4(matrix);
        group.add(gridMesh);
        
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
        const group = new THREE.Group();
        group.name = `element-${data.element_id}`;
        
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
        
        console.log('Cleared all visualizations');
    }
    
    public dispose(): void {
        this.clearAll();
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