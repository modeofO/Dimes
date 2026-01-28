import * as THREE from 'three';
import { MeshManager } from '../mesh/mesh-manager';
import { CADControls, DrawingTool } from '../controls/cad-controls';
import { VisualizationManager } from './visualization-manager';
import { 
    PlaneVisualizationData, 
    SketchVisualizationData, 
    SketchElementVisualizationData,
    MeshData
} from '@/types/geometry';

export class CADRenderer {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: CADControls;
    private meshManager!: MeshManager;
    private visualizationManager!: VisualizationManager;
    private container: HTMLElement;
    private raycaster: THREE.Raycaster;
    private pointerDownPos = new THREE.Vector2();
    private selectionBox: THREE.BoxHelper | null = null;
    public onObjectSelected: ((id: string | null, type: string | null, sketchId?: string | null) => void) | null = null;
    public onDrawingComplete: ((tool: DrawingTool, points: THREE.Vector2[], arcType?: 'three_points' | 'endpoints_radius') => void) | null = null;
    public onChamferRequested: ((sketchId: string, line1Id: string, line2Id: string) => void) | null = null;
    public onFilletRequested: ((sketchId: string, line1Id: string, line2Id: string) => void) | null = null;

    // Visual feedback for selected lines
    private selectedLineHighlights: { [lineId: string]: THREE.LineSegments } = {};

    // Hover highlight state
    private hoveredObject: THREE.Object3D | null = null;
    private hoveredOriginalMaterials: Map<THREE.Object3D, THREE.Material | THREE.Material[]> = new Map();
    
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
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line!.threshold = 0.5;

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
        this.scene.background = new THREE.Color(0x0a1628);

        // Blueprint grid — XZ plane
        this.createBlueprintGrid();
    }

    private createBlueprintGrid(): void {
        const gridGroup = new THREE.Group();
        gridGroup.name = 'blueprint-grid';

        const gridSize = 200; // total extent (-100 to +100)
        const half = gridSize / 2;

        // Minor grid: every 1 unit
        const minorGeo = new THREE.BufferGeometry();
        const minorVerts: number[] = [];
        for (let i = -half; i <= half; i += 1) {
            if (i % 10 === 0) continue; // skip major lines
            // Lines along X
            minorVerts.push(-half, 0, i, half, 0, i);
            // Lines along Z
            minorVerts.push(i, 0, -half, i, 0, half);
        }
        minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorVerts, 3));
        const minorMat = new THREE.LineBasicMaterial({
            color: 0x152a4a,
            transparent: true,
            opacity: 0.5,
        });
        gridGroup.add(new THREE.LineSegments(minorGeo, minorMat));

        // Major grid: every 10 units
        const majorGeo = new THREE.BufferGeometry();
        const majorVerts: number[] = [];
        for (let i = -half; i <= half; i += 10) {
            if (i === 0) continue; // skip origin (drawn separately)
            majorVerts.push(-half, 0, i, half, 0, i);
            majorVerts.push(i, 0, -half, i, 0, half);
        }
        majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorVerts, 3));
        const majorMat = new THREE.LineBasicMaterial({
            color: 0x1e3a5f,
            transparent: true,
            opacity: 0.7,
        });
        gridGroup.add(new THREE.LineSegments(majorGeo, majorMat));

        // Origin axes — X axis (soft red) and Z axis (soft blue)
        const xAxisGeo = new THREE.BufferGeometry();
        xAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
            -half, 0, 0, half, 0, 0
        ], 3));
        const xAxisMat = new THREE.LineBasicMaterial({
            color: 0x6b3a3a,
            transparent: true,
            opacity: 0.8,
        });
        gridGroup.add(new THREE.LineSegments(xAxisGeo, xAxisMat));

        const zAxisGeo = new THREE.BufferGeometry();
        zAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
            0, 0, -half, 0, 0, half
        ], 3));
        const zAxisMat = new THREE.LineBasicMaterial({
            color: 0x3a4a6b,
            transparent: true,
            opacity: 0.8,
        });
        gridGroup.add(new THREE.LineSegments(zAxisGeo, zAxisMat));

        // Small origin marker — crosshair dot
        const originGeo = new THREE.RingGeometry(0.15, 0.3, 16);
        const originMat = new THREE.MeshBasicMaterial({
            color: 0x4a6a8a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
        });
        const originMarker = new THREE.Mesh(originGeo, originMat);
        originMarker.rotation.x = -Math.PI / 2; // lay flat on XZ
        gridGroup.add(originMarker);

        // Position grid slightly below origin to avoid z-fighting
        gridGroup.position.y = -0.01;
        this.scene.add(gridGroup);
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
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.container.appendChild(this.renderer.domElement);

        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
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
            // Clear line highlights when switching tools
            this.clearLineHighlights();
        };
        
        // Set up line selection callbacks
        this.controls.onLineSelected = (lineId: string, isFirstLine: boolean) => {
            this.highlightSelectedLine(lineId, isFirstLine);
        };
        
        this.controls.onChamferRequested = (sketchId: string, line1Id: string, line2Id: string) => {
            this.clearLineHighlights();
            if (this.onChamferRequested) {
                this.onChamferRequested(sketchId, line1Id, line2Id);
            }
        };
        
        this.controls.onFilletRequested = (sketchId: string, line1Id: string, line2Id: string) => {
            this.clearLineHighlights();
            if (this.onFilletRequested) {
                this.onFilletRequested(sketchId, line1Id, line2Id);
            }
        };
    }
    
    private setupLighting(): void {
        // Hemisphere light — primary ambient fill (sky/ground)
        const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x444466, 1.0);
        this.scene.add(hemiLight);

        // Ambient light — even base illumination to lift shadows
        const ambientLight = new THREE.AmbientLight(0x888899, 0.6);
        this.scene.add(ambientLight);

        // Main directional light — moderate to avoid harsh specular hotspots
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(50, 80, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Secondary fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0x8899bb, 0.3);
        fillLight.position.set(-30, 40, -40);
        this.scene.add(fillLight);

        // Rim light from below-behind for edge definition
        const rimLight = new THREE.DirectionalLight(0x667799, 0.2);
        rimLight.position.set(0, -20, -50);
        this.scene.add(rimLight);

        // Generate environment map for PBR material reflections
        this.generateEnvironmentMap();
    }

    private generateEnvironmentMap(): void {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);

        // Create a simple environment scene for PBR reflections
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x0e1e30);
        envScene.add(new THREE.AmbientLight(0x8888aa, 2.0));
        const envDirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        envDirLight.position.set(1, 1, 1);
        envScene.add(envDirLight);

        this.scene.environment = pmremGenerator.fromScene(envScene).texture;
        pmremGenerator.dispose();
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
            this.selectionBox = new THREE.BoxHelper(objectToHighlight, 0xd4a017);
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

    private onPointerMove = (event: PointerEvent): void => {
        // Only highlight when in select mode
        const currentTool = this.controls.getDrawingState().tool;
        if (currentTool !== 'select') {
            this.clearHoverHighlight();
            return;
        }

        const result = this.raycastNamedObject(event);
        const hitObj = result?.object ?? null;

        // Same object — no change
        if (hitObj === this.hoveredObject) return;

        // Clear previous hover
        this.clearHoverHighlight();

        if (hitObj && result && (result.parsed.type === 'element' || result.parsed.type === 'sketch')) {
            this.hoveredObject = hitObj;
            this.renderer.domElement.style.cursor = 'pointer';

            // Brighten materials
            hitObj.traverse((child) => {
                if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineLoop || child instanceof THREE.LineSegments) {
                    this.hoveredOriginalMaterials.set(child, child.material);
                    const origMat = child.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
                    const hoverMat = origMat.clone();
                    hoverMat.color.set(0xffcc44);
                    if ('opacity' in hoverMat) hoverMat.opacity = 1.0;
                    child.material = hoverMat;
                }
            });
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    private clearHoverHighlight(): void {
        if (this.hoveredObject) {
            // Restore original materials
            this.hoveredOriginalMaterials.forEach((origMat, child) => {
                (child as THREE.Mesh).material = origMat;
            });
            this.hoveredOriginalMaterials.clear();
            this.hoveredObject = null;
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    private parseObjectName(name: string): { id: string; type: string; sketchId?: string } | null {
        const parts = name.split('-');
        if (parts.length > 1) {
            const typePrefix = parts[0];
            switch (typePrefix) {
                case 'plane':
                    return { id: parts.slice(1).join('-'), type: 'plane' };
                case 'sketch':
                    return { id: parts.slice(1).join('-'), type: 'sketch' };
                case 'element':
                    // Format: element-{sketch_id}-{element_id}
                    // sketch_id is parts[1], element_id is parts[2+]
                    if (parts.length >= 3) {
                        return {
                            id: parts.slice(2).join('-'),
                            type: 'element',
                            sketchId: parts[1],
                        };
                    }
                    return { id: parts.slice(1).join('-'), type: 'element' };
                default:
                    return { id: name, type: 'feature' };
            }
        }
        if (name.toLowerCase().includes('extru')) {
            return { id: name, type: 'feature' };
        }
        return null;
    }

    private raycastNamedObject(event: PointerEvent): { object: THREE.Object3D; parsed: { id: string; type: string; sketchId?: string } } | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (const hit of intersects) {
            let obj: THREE.Object3D | null = hit.object;
            while (obj && !obj.name) {
                obj = obj.parent;
            }
            if (obj?.name && obj.name !== 'blueprint-grid') {
                const parsed = this.parseObjectName(obj.name);
                if (parsed) {
                    return { object: obj, parsed };
                }
            }
        }
        return null;
    }

    private performRaycasting(event: PointerEvent): void {
        const result = this.raycastNamedObject(event);

        const selectedId = result?.parsed.id ?? null;
        const selectedType = result?.parsed.type ?? null;
        const selectedSketchId = result?.parsed.sketchId ?? null;

        if (selectedId) {
            console.log(`Clicked object ID: ${selectedId}, Type: ${selectedType}, SketchID: ${selectedSketchId ?? 'n/a'}`);
        }

        // Handle line selection for fillet/chamfer tools
        const currentTool = this.controls.getDrawingState().tool;
        if ((currentTool === 'fillet' || currentTool === 'chamfer') &&
            selectedType === 'element' && selectedId && selectedSketchId) {
            if (this.isLineElement(selectedSketchId, selectedId)) {
                this.controls.selectLine(selectedId);
                return;
            }
        }

        if (this.onObjectSelected) {
            this.onObjectSelected(selectedId, selectedType, selectedSketchId);
        }
    }
    
    private isLineElement(sketchId: string, elementId: string): boolean {
        // Find the element and check if it's a line
        const elementName = `element-${sketchId}-${elementId}`;
        const elementObject = this.scene.getObjectByName(elementName);
        
        if (elementObject) {
            // Check userData for element type if available
            let isLine = false;
            elementObject.traverse((child) => {
                if (child.userData && child.userData.elementType === 'line') {
                    isLine = true;
                }
                // Also check if it's a THREE.Line object (most line elements should be)
                if (child instanceof THREE.Line) {
                    isLine = true;
                }
            });
            return isLine;
        }
        
        // Default assumption: if we can't determine, assume it might be a line
        // This is a fallback since element type detection is best-effort
        return true;
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
        if (this.activeSketchPlane?.sketch_id === data.sketch_id) {
            this.controls.recomputeSnapPoints(data.sketch_id);
        }
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
        this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);

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
    
    public highlightSelectedLine(lineId: string, isFirstLine: boolean): void {
        // Find the line element in the scene — name format: element-{sketchId}-{elementId}
        let lineObject: THREE.Object3D | undefined;
        this.scene.traverse((obj) => {
            if (!lineObject && obj.name.startsWith('element-') && obj.name.endsWith(`-${lineId}`)) {
                lineObject = obj;
            }
        });
        
        if (lineObject) {
            // Create highlight geometry around the line
            const highlight = this.createLineHighlight(lineObject, isFirstLine);
            if (highlight) {
                this.selectedLineHighlights[lineId] = highlight;
                this.scene.add(highlight);
                console.log(`🔶 Highlighted ${isFirstLine ? 'first' : 'second'} line: ${lineId}`);
            }
        } else {
            console.warn(`⚠️ Could not find line element: ${lineId}`);
        }
    }
    
    public clearLineHighlights(): void {
        Object.values(this.selectedLineHighlights).forEach(highlight => {
            this.scene.remove(highlight);
        });
        this.selectedLineHighlights = {};
        console.log('🧹 Cleared line highlights');
    }
    
    private createLineHighlight(lineObject: THREE.Object3D, isFirstLine: boolean): THREE.LineSegments | null {
        // Create a highlight around the line using EdgesGeometry
        let geometry: THREE.BufferGeometry | null = null;
        
        lineObject.traverse((child) => {
            if (child instanceof THREE.Line && child.geometry) {
                geometry = child.geometry;
            }
        });
        
        if (!geometry) return null;
        
        // Create highlight with different colors for first/second line
        const color = isFirstLine ? 0xff7744 : 0x66ff88; // Orange for first, green for second
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 4,
            transparent: true,
            opacity: 0.95
        });
        
        const highlight = new THREE.LineSegments(geometry, material);
        highlight.position.copy(lineObject.position);
        highlight.rotation.copy(lineObject.rotation);
        highlight.scale.copy(lineObject.scale);
        
        return highlight;
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
        
        // Highlight the active sketch plane
        this.visualizationManager.highlightActiveSketch(sketch_id);
        
        console.log(`Set active sketch plane for interactive drawing: ${sketch_id}`);
    }
    
    public clearActiveSketchHighlight(): void {
        this.visualizationManager.clearActiveSketchHighlight();
    }
    
    public getActiveSketchPlane(): string | null {
        return this.activeSketchPlane?.sketch_id || null;
    }
} 