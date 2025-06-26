import * as THREE from 'three';
import { MeshManager } from '../mesh/mesh-manager';
import { CADControls, DrawingTool } from '../controls/cad-controls';
import { VisualizationManager } from './visualization-manager';
import { 
    PlaneVisualizationData, 
    SketchVisualizationData, 
    SketchElementVisualizationData,
    MeshData
} from '../../../../../shared/types/geometry';

export class CADRenderer {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: CADControls;
    private meshManager!: MeshManager;
    private visualizationManager!: VisualizationManager;
    private container: HTMLElement;
    private raycaster = new THREE.Raycaster();
    private pointerDownPos = new THREE.Vector2();
    private selectionBox: THREE.BoxHelper | null = null;
    public onObjectSelected: ((id: string | null, type: string | null) => void) | null = null;
    public onDrawingComplete: ((tool: DrawingTool, points: THREE.Vector2[], arcType?: 'three_points' | 'endpoints_radius') => void) | null = null;
    
    // Current active sketch plane for drawing
    private activeSketchPlane: {
        sketch_id: string;
        origin: THREE.Vector3;
        normal: THREE.Vector3;
        u_axis: THREE.Vector3;
        v_axis: THREE.Vector3;
    } | null = null;
    
    constructor(container: HTMLElement) {
        this.container = container;
        
        this.initializeScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.setupMeshManager();
        
        // Start render loop
        this.animate();
        
        console.log('CAD Renderer initialized');
    }
    
    private initializeScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(100, 100);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        this.scene.add(gridHelper);
        
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(20);
        this.scene.add(axesHelper);
    }
    
    private setupCamera(): void {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
    }
    
    private setupRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);

        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    }
    
    private setupControls(): void {
        this.controls = new CADControls(this.camera, this.renderer.domElement, this.scene);
        
        // Set up drawing callbacks
        this.controls.onDrawingComplete = (tool: DrawingTool, points: THREE.Vector2[], arcType?: 'three_points' | 'endpoints_radius') => {
            if (this.onDrawingComplete) {
                this.onDrawingComplete(tool, points, arcType);
            }
        };
        
        this.controls.onToolChanged = (tool: DrawingTool) => {
            console.log(`Tool changed to: ${tool}`);
        };
    }
    
    private setupLighting(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point light for fill
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-50, 50, -50);
        this.scene.add(pointLight);
    }
    
    private setupMeshManager(): void {
        this.meshManager = new MeshManager(this.scene);
        this.visualizationManager = new VisualizationManager(this.scene);
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
    
    public updateGeometry(modelId: string, meshData: MeshData): void {
        this.meshManager.updateMesh(modelId, meshData);
    }

    public setHighlight(id: string | null): void {
        // Clear previous highlight
        if (this.selectionBox) {
            this.scene.remove(this.selectionBox);
            this.selectionBox.dispose();
            this.selectionBox = null;
        }

        if (id === null) {
            return;
        }

        // Find and highlight new object
        const objectToHighlight = this.scene.getObjectByName(id);
        if (objectToHighlight) {
            this.selectionBox = new THREE.BoxHelper(objectToHighlight, 0x00ff00);
            this.scene.add(this.selectionBox);
        }
    }

    private onPointerDown = (event: PointerEvent): void => {
        this.pointerDownPos.set(event.clientX, event.clientY);
    }

    private onPointerUp = (event: PointerEvent): void => {
        const pointerUpPos = new THREE.Vector2(event.clientX, event.clientY);
        if (this.pointerDownPos.distanceTo(pointerUpPos) > 2) {
            return; // It was a drag, not a click
        }
        this.performRaycasting(event);
    }

    private performRaycasting(event: PointerEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let selectedId: string | null = null;
        let selectedType: string | null = null;

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            // Traverse up to find the parent group with a meaningful name
            while (clickedObject.parent && !clickedObject.name) {
                clickedObject = clickedObject.parent;
            }

            if (clickedObject.name) {
                const name = clickedObject.name;
                const parts = name.split('-');
                if (parts.length > 1) {
                    const typePrefix = parts[0];
                    selectedId = parts.slice(1).join('-'); // Re-join in case ID has hyphens
                    switch(typePrefix) {
                        case 'plane':
                            selectedType = 'plane';
                            break;
                        case 'sketch':
                            selectedType = 'sketch';
                            break;
                        case 'element':
                            // For elements, we need to determine if it's a line, circle, etc.
                            // The 'type' is stored in the element's user data, but that's not easily accessible here.
                            // For now, we'll just use a generic 'element' type.
                            // The logic in main.ts can handle this.
                            selectedType = 'element';
                            break;
                        default:
                            selectedId = name; // Revert if prefix is unknown
                            selectedType = 'feature';
                            break;
                    }
                } else {
                     selectedId = name;
                     // Assume things without prefix are features (e.g., from boolean ops)
                     if (name.toLowerCase().includes('extru')) {
                         selectedType = 'feature';
                     } else {
                         selectedType = 'unknown';
                     }
                }
                console.log(`Clicked object ID: ${selectedId}, Type: ${selectedType}`);
            }
        }
        
        if (this.onObjectSelected) {
            this.onObjectSelected(selectedId, selectedType);
        }
    }

    public clearAllGeometry(): void {
        this.setHighlight(null);
        this.meshManager.clearAllMeshes();
        this.visualizationManager.clearAll();
    }
    
    public removeGeometry(modelId: string): void {
        this.meshManager.removeMesh(modelId);
    }
    
    // New visualization methods
    public addPlaneVisualization(data: PlaneVisualizationData): void {
        this.visualizationManager.addPlaneVisualization(data);
    }
    
    public addSketchVisualization(data: SketchVisualizationData): void {
        this.visualizationManager.addSketchVisualization(data);
    }
    
    public addSketchElementVisualization(data: SketchElementVisualizationData): void {
        this.visualizationManager.addSketchElementVisualization(data);
    }
    
    public removePlaneVisualization(planeId: string): void {
        this.visualizationManager.removePlaneVisualization(planeId);
    }
    
    public removeSketchVisualization(sketchId: string): void {
        this.visualizationManager.removeSketchVisualization(sketchId);
    }
    
    public removeElementVisualization(elementId: string): void {
        this.visualizationManager.removeElementVisualization(elementId);
    }
    
    public handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    public dispose(): void {
        this.controls.dispose();
        this.meshManager.dispose();
        this.visualizationManager.dispose();
        this.renderer.dispose();
        
        this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);

        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
    
    // CAD-specific view methods
    public viewFront(): void {
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    public viewTop(): void {
        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    public viewRight(): void {
        this.camera.position.set(50, 0, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    public viewIsometric(): void {
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    // Interactive drawing methods
    public setDrawingTool(tool: DrawingTool): void {
        this.controls.setDrawingTool(tool);
    }
    
    public setArcType(arcType: 'three_points' | 'endpoints_radius'): void {
        this.controls.setArcType(arcType);
    }
    
    public setPolygonSides(sides: number): void {
        this.controls.setPolygonSides(sides);
    }
    
    public setActiveSketchPlane(sketch_id: string, data: SketchVisualizationData): void {
        this.activeSketchPlane = {
            sketch_id,
            origin: new THREE.Vector3(...data.origin),
            normal: new THREE.Vector3(...data.normal),
            u_axis: new THREE.Vector3(...data.u_axis),
            v_axis: new THREE.Vector3(...data.v_axis)
        };
        
        this.controls.setActiveSketchPlane(
            sketch_id,
            this.activeSketchPlane.origin,
            this.activeSketchPlane.normal,
            this.activeSketchPlane.u_axis,
            this.activeSketchPlane.v_axis
        );
        
        console.log(`Set active sketch plane for interactive drawing: ${sketch_id}`);
    }
    
    public getActiveSketchPlane(): string | null {
        return this.activeSketchPlane?.sketch_id || null;
    }
} 