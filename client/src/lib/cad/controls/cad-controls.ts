import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

export type DrawingTool = 
    | 'select' 
    | 'line' 
    | 'circle' 
    | 'rectangle' 
    | 'arc' 
    | 'polygon'
    | 'fillet'
    | 'chamfer'
    | 'trim'
    | 'extend'
    | 'mirror'
    | 'offset'
    | 'copy'
    | 'move';

export type ArcType = 'three_points' | 'endpoints_radius';

export interface DrawingState {
    tool: DrawingTool;
    isDrawing: boolean;
    startPoint?: THREE.Vector3;
    currentPoint?: THREE.Vector3;
    points?: THREE.Vector3[]; // For multi-point tools like three-point arc
    previewGeometry?: THREE.Object3D;
    arcType?: ArcType; // Selected arc type when tool is 'arc'
    polygonSides?: number; // Selected number of sides for polygon
    activeSketchPlane?: {
        sketch_id: string;
        origin: THREE.Vector3;
        normal: THREE.Vector3;
        u_axis: THREE.Vector3;
        v_axis: THREE.Vector3;
    };
}

export class CADControls extends OrbitControls {
    private drawingState: DrawingState;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private camera: THREE.Camera;
    private scene: THREE.Scene;
    private snapPoints: THREE.Vector3[] = [];
    private snapThreshold: number = 0.5; // Adjust as needed
    private snapHighlight?: THREE.Mesh;
    
    // Callbacks
    public onDrawingComplete?: (tool: DrawingTool, points: THREE.Vector2[], arcType?: ArcType) => void;
    public onDrawingPreview?: (tool: DrawingTool, points: THREE.Vector2[], previewGeometry: THREE.Object3D) => void;
    public onToolChanged?: (tool: DrawingTool) => void;
    public onArcTypeChanged?: (arcType: ArcType) => void;

    constructor(camera: THREE.Camera, domElement: HTMLElement, scene: THREE.Scene) {
        super(camera, domElement);
        
        this.camera = camera;
        this.scene = scene;
        this.drawingState = {
            tool: 'select',
            isDrawing: false
        };
        
        // Disable orbit controls when drawing
        this.enablePan = true;
        this.enableRotate = true;
        this.enableZoom = true;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        if (!this.domElement) {
            console.error('CADControls: domElement is null, cannot setup event listeners');
            return;
        }
        
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
    }
    
    public setDrawingTool(tool: DrawingTool): void {
        // Clear any existing drawing state
        this.cancelDrawing();
        
        this.drawingState.tool = tool;
        
        // Set default arc type for arc tool
        if (tool === 'arc' && !this.drawingState.arcType) {
            this.drawingState.arcType = 'endpoints_radius';
        }
        
        // Set default polygon sides for polygon tool
        if (tool === 'polygon' && !this.drawingState.polygonSides) {
            this.drawingState.polygonSides = 6;
        }
        
        // Disable/enable orbit controls based on tool
        const isInteractiveTool = tool !== 'select';
        this.enablePan = !isInteractiveTool;
        this.enableRotate = !isInteractiveTool;
        this.enableZoom = !isInteractiveTool;
        
        if (this.onToolChanged) {
            this.onToolChanged(tool);
        }
        
        console.log(`Selected drawing tool: ${tool}`);
    }
    
    public setArcType(arcType: ArcType): void {
        this.drawingState.arcType = arcType;
        
        // Clear any existing drawing state when changing arc type
        this.cancelDrawing();
        
        if (this.onArcTypeChanged) {
            this.onArcTypeChanged(arcType);
        }
        
        console.log(`Set arc type: ${arcType}`);
    }
    
    public setPolygonSides(sides: number): void {
        this.drawingState.polygonSides = sides;
        
        console.log(`Set polygon sides: ${sides}`);
    }
    
    public setActiveSketchPlane(sketch_id: string, origin: THREE.Vector3, normal: THREE.Vector3, u_axis: THREE.Vector3, v_axis: THREE.Vector3): void {
        if (!origin || !normal || !u_axis || !v_axis) {
            console.error('Invalid sketch plane parameters');
            return;
        }
        
        this.drawingState.activeSketchPlane = {
            sketch_id,
            origin: origin.clone(),
            normal: normal.clone(),
            u_axis: u_axis.clone(),
            v_axis: v_axis.clone()
        };
        console.log(`Set active sketch plane: ${sketch_id}`);
        this.computeSnapPoints(sketch_id);
    }
    
    private computeSnapPoints(sketch_id: string): void {
        this.snapPoints = [];
        const addedPoints = new Set<string>();
    
        const addPoint = (p: THREE.Vector3) => {
            const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
            if (!addedPoints.has(key)) {
                this.snapPoints.push(p);
                addedPoints.add(key);
            }
        };
    
        this.scene.traverse((object) => {
            if (object instanceof THREE.Group && object.name.startsWith(`element-${sketch_id}-`)) {
                object.traverse((child) => {
                    if (child instanceof THREE.Line && child.geometry?.attributes.position) {
                        const positions = child.geometry.attributes.position;
                        const vertices: THREE.Vector3[] = [];
                        for (let i = 0; i < positions.count; i++) {
                            vertices.push(new THREE.Vector3().fromBufferAttribute(positions, i));
                        }
    
                        if (vertices.length === 0) return;
    
                        // Add vertices
                        vertices.forEach(v => addPoint(v));
    
                        // Add midpoints
                        for (let i = 0; i < vertices.length - 1; i++) {
                            const start = vertices[i];
                            const end = vertices[i+1];
                            if (!start.equals(end)) {
                                 addPoint(start.clone().add(end).multiplyScalar(0.5));
                            }
                        }
                    }
                });
            }
        });
        console.log(`Computed ${this.snapPoints.length} snap points for sketch ${sketch_id}`);
    }
    
    public recomputeSnapPoints(sketch_id: string): void {
        this.computeSnapPoints(sketch_id);
    }

    private onPointerDown(event: PointerEvent): void {
        if (this.drawingState.tool === 'select' || !this.drawingState.activeSketchPlane) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const worldPoint = this.getWorldPointOnSketchPlane(event);
        if (!worldPoint) return;
        
        // Handle multi-point tools (three-point arc and endpoints+radius arc)
        if (this.drawingState.tool === 'arc' && (this.drawingState.arcType === 'three_points' || this.drawingState.arcType === 'endpoints_radius')) {
            if (!this.drawingState.points) {
                this.drawingState.points = [];
            }
            
            this.drawingState.points.push(worldPoint.clone());
            this.drawingState.currentPoint = worldPoint;
            
            if (this.drawingState.arcType === 'three_points') {
                if (this.drawingState.points.length === 1) {
                    this.drawingState.isDrawing = true;
                    console.log(`Started three-point arc at point 1:`, worldPoint);
                } else if (this.drawingState.points.length === 2) {
                    console.log(`Added point 2 for three-point arc:`, worldPoint);
                } else if (this.drawingState.points.length === 3) {
                    console.log(`Completed three-point arc with point 3:`, worldPoint);
                    this.completeThreePointArc();
                    return;
                }
            } else if (this.drawingState.arcType === 'endpoints_radius') {
                if (this.drawingState.points.length === 1) {
                    this.drawingState.isDrawing = true;
                    console.log(`Started endpoints+radius arc at point 1:`, worldPoint);
                } else if (this.drawingState.points.length === 2) {
                    console.log(`Completed endpoints+radius arc with point 2:`, worldPoint);
                    this.completeEndpointsRadiusArc();
                    return;
                }
            }
        } else {
            // Standard two-point drawing
            this.drawingState.isDrawing = true;
            this.drawingState.startPoint = worldPoint;
            this.drawingState.currentPoint = worldPoint;
            console.log(`Started drawing ${this.drawingState.tool} at:`, worldPoint);
        }
    }
    
    private onPointerMove(event: PointerEvent): void {
        if (!this.drawingState.activeSketchPlane) {
            this.removeSnapHighlight();
            return;
        }

    // Always get the world point on move to check for snapping.
    const worldPoint = this.getWorldPointOnSketchPlane(event);

        if (!worldPoint) {
            return;
            }

        // If we are actively drawing, update the current point and preview geometry.
        if (this.drawingState.isDrawing && this.drawingState.startPoint) {
            this.drawingState.currentPoint = worldPoint;
            this.updatePreviewGeometry();
        }
    }
    
    private onPointerUp(event: PointerEvent): void {
        // Skip for multi-point arcs (handled in onPointerDown)
        if (this.drawingState.tool === 'arc' && (this.drawingState.arcType === 'three_points' || this.drawingState.arcType === 'endpoints_radius')) {
            return;
        }
        
        if (!this.drawingState.isDrawing || !this.drawingState.startPoint || !this.drawingState.currentPoint || !this.drawingState.activeSketchPlane) {
            console.log('❌ onPointerUp: Missing required drawing state');
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Standard two-point completion
        const start2D = this.worldToSketch2D(this.drawingState.startPoint);
        const end2D = this.worldToSketch2D(this.drawingState.currentPoint);
        
        console.log('🔧 Drawing completion:', {
            tool: this.drawingState.tool,
            startPoint: this.drawingState.startPoint,
            currentPoint: this.drawingState.currentPoint,
            start2D,
            end2D,
            hasCallback: !!this.onDrawingComplete
        });
        
        if (start2D && end2D) {
            const points = [start2D, end2D];
            
            if (this.onDrawingComplete) {
                console.log('🎯 Calling onDrawingComplete with points:', points);
                this.onDrawingComplete(this.drawingState.tool, points);
            } else {
                console.log('❌ No onDrawingComplete callback set');
            }
        } else {
            console.log('❌ Failed to convert world coordinates to 2D sketch coordinates');
        }
        
        this.finishDrawing();
    }
    
    private completeThreePointArc(): void {
        console.log('🔧 completeThreePointArc called:', {
            pointsLength: this.drawingState.points?.length,
            arcType: this.drawingState.arcType,
            hasCallback: !!this.onDrawingComplete
        });
        
        if (!this.drawingState.points || this.drawingState.points.length !== 3) {
            console.log('❌ Invalid three-point arc state');
            return;
        }
        
        // Convert all three points to 2D
        const points2D: THREE.Vector2[] = [];
        for (const worldPoint of this.drawingState.points) {
            const point2D = this.worldToSketch2D(worldPoint);
            if (point2D) {
                points2D.push(point2D);
            }
        }
        
        if (points2D.length === 3 && this.onDrawingComplete) {
            console.log('🎯 Completing three-point arc with points:', points2D, 'arcType:', this.drawingState.arcType);
            this.onDrawingComplete(this.drawingState.tool, points2D, this.drawingState.arcType);
        }
        
        this.finishDrawing();
    }
    
    private completeEndpointsRadiusArc(): void {
        console.log('🔧 completeEndpointsRadiusArc called:', {
            pointsLength: this.drawingState.points?.length,
            arcType: this.drawingState.arcType,
            hasCallback: !!this.onDrawingComplete
        });
        
        if (!this.drawingState.points || this.drawingState.points.length !== 2) {
            console.log('❌ Invalid endpoints-radius arc state - need exactly 2 points');
            return;
        }
        
        // Convert both points to 2D
        const points2D: THREE.Vector2[] = [];
        for (const worldPoint of this.drawingState.points) {
            const point2D = this.worldToSketch2D(worldPoint);
            if (point2D) {
                points2D.push(point2D);
            }
        }
        
        if (points2D.length === 2 && this.onDrawingComplete) {
            console.log('🎯 Completing endpoints-radius arc with points:', points2D, 'arcType:', this.drawingState.arcType);
            this.onDrawingComplete(this.drawingState.tool, points2D, this.drawingState.arcType);
        }
        
        this.finishDrawing();
    }
    
    private onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.cancelDrawing();
        }
    }
    
    private getWorldPointOnSketchPlane(event: PointerEvent): THREE.Vector3 | null {
        if (!this.drawingState.activeSketchPlane || !this.domElement) return null;
        
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Create a plane for the active sketch
        const plane = new THREE.Plane(
            this.drawingState.activeSketchPlane.normal,
            -this.drawingState.activeSketchPlane.normal.dot(this.drawingState.activeSketchPlane.origin)
        );
        
        let intersection = new THREE.Vector3();
        const intersected = this.raycaster.ray.intersectPlane(plane, intersection);
        if (!intersected) return null;

        // Now snap if close to a snap point
        let closestSnap: THREE.Vector3 | null = null;
        let minDist = Infinity;
        for (const snap of this.snapPoints) {
            const dist = intersection.distanceTo(snap);
            if (dist < minDist && dist < this.snapThreshold) {
                minDist = dist;
                closestSnap = snap;
            }
        }
        if (closestSnap) {
            this.highlightSnapPoint(closestSnap);
            return closestSnap.clone();
        }

        this.removeSnapHighlight();
        return intersection;
    }
    
    private worldToSketch2D(worldPoint: THREE.Vector3): THREE.Vector2 | null {
        if (!this.drawingState.activeSketchPlane) {
            console.log('❌ worldToSketch2D: No active sketch plane');
            return null;
        }
        
        const { origin, u_axis, v_axis } = this.drawingState.activeSketchPlane;
        
        // Transform world point to sketch local coordinates
        const localPoint = worldPoint.clone().sub(origin);
        const x = localPoint.dot(u_axis);
        const y = localPoint.dot(v_axis);
        
        console.log('🔧 worldToSketch2D:', {
            worldPoint: { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
            origin: { x: origin.x, y: origin.y, z: origin.z },
            u_axis: { x: u_axis.x, y: u_axis.y, z: u_axis.z },
            v_axis: { x: v_axis.x, y: v_axis.y, z: v_axis.z },
            localPoint: { x: localPoint.x, y: localPoint.y, z: localPoint.z },
            result2D: { x, y }
        });
        
        return new THREE.Vector2(x, y);
    }
    
    private updatePreviewGeometry(): void {
        if (!this.drawingState.startPoint || !this.drawingState.currentPoint) return;
        
        // Remove existing preview
        if (this.drawingState.previewGeometry) {
            this.scene.remove(this.drawingState.previewGeometry);
            this.drawingState.previewGeometry = undefined;
        }
        
        const preview = this.createPreviewGeometry();
        if (preview) {
            this.drawingState.previewGeometry = preview;
            this.scene.add(preview);
            
            if (this.onDrawingPreview) {
                const start2D = this.worldToSketch2D(this.drawingState.startPoint);
                const end2D = this.worldToSketch2D(this.drawingState.currentPoint);
                if (start2D && end2D) {
                    this.onDrawingPreview(this.drawingState.tool, [start2D, end2D], preview);
                }
            }
        }
    }
    
    private createPreviewGeometry(): THREE.Object3D | null {
        if (!this.drawingState.startPoint || !this.drawingState.currentPoint) return null;
        
        const start = this.drawingState.startPoint;
        const end = this.drawingState.currentPoint;
        
        switch (this.drawingState.tool) {
            case 'line':
                return this.createLinePreview(start, end);
            case 'rectangle':
                return this.createRectanglePreview(start, end);
            case 'circle':
                return this.createCirclePreview(start, end);
            case 'arc':
                return this.createArcPreview(start, end);
            case 'polygon':
                return this.createPolygonPreview(start, end);
            default:
                return this.createLinePreview(start, end); // Default to line preview
        }
    }
    
    private createLinePreview(start: THREE.Vector3, end: THREE.Vector3): THREE.Object3D {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7,
            linewidth: 2
        });
        return new THREE.Line(geometry, material);
    }
    
    private createRectanglePreview(start: THREE.Vector3, end: THREE.Vector3): THREE.Object3D {
        if (!this.drawingState.activeSketchPlane) return this.createLinePreview(start, end);
        
        const { origin, u_axis, v_axis } = this.drawingState.activeSketchPlane;
        
        // Convert to sketch 2D coordinates
        const start2D = this.worldToSketch2D(start);
        const end2D = this.worldToSketch2D(end);
        
        if (!start2D || !end2D) return this.createLinePreview(start, end);
        
        // Create rectangle corners in world space
        const corner1 = start;
        const corner2 = origin.clone()
            .add(u_axis.clone().multiplyScalar(end2D.x))
            .add(v_axis.clone().multiplyScalar(start2D.y));
        const corner3 = end;
        const corner4 = origin.clone()
            .add(u_axis.clone().multiplyScalar(start2D.x))
            .add(v_axis.clone().multiplyScalar(end2D.y));
        
        const points = [corner1, corner2, corner3, corner4, corner1]; // Close the rectangle
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x0066ff, 
            transparent: true, 
            opacity: 0.7,
            linewidth: 2
        });
        return new THREE.LineLoop(geometry, material);
    }
    
    private createCirclePreview(start: THREE.Vector3, end: THREE.Vector3): THREE.Object3D {
        const radius = start.distanceTo(end);
        const segments = 32;
        
        if (!this.drawingState.activeSketchPlane) return this.createLinePreview(start, end);
        
        const { u_axis, v_axis } = this.drawingState.activeSketchPlane;
        const points: THREE.Vector3[] = [];
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const point = start.clone()
                .add(u_axis.clone().multiplyScalar(x))
                .add(v_axis.clone().multiplyScalar(y));
            points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.7,
            linewidth: 2
        });
        return new THREE.LineLoop(geometry, material);
    }
    
    private createArcPreview(start: THREE.Vector3, end: THREE.Vector3): THREE.Object3D {
        const radius = start.distanceTo(end);
        const segments = 16;
        
        if (!this.drawingState.activeSketchPlane) return this.createLinePreview(start, end);
        
        const { u_axis, v_axis } = this.drawingState.activeSketchPlane;
        
        // Convert end point to 2D to determine angle
        const start2D = this.worldToSketch2D(start);
        const end2D = this.worldToSketch2D(end);
        
        if (!start2D || !end2D) return this.createLinePreview(start, end);
        
        // Calculate angle from start to end point
        const angle = Math.atan2(end2D.y - start2D.y, end2D.x - start2D.x);
        const arcAngle = Math.PI / 2; // 90 degree arc for preview
        
        const points: THREE.Vector3[] = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const currentAngle = angle - arcAngle/2 + t * arcAngle;
            const x = Math.cos(currentAngle) * radius;
            const y = Math.sin(currentAngle) * radius;
            
            const point = start.clone()
                .add(u_axis.clone().multiplyScalar(x))
                .add(v_axis.clone().multiplyScalar(y));
            points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffa500, 
            transparent: true, 
            opacity: 0.7,
            linewidth: 2
        });
        return new THREE.Line(geometry, material);
    }
    
    private createPolygonPreview(start: THREE.Vector3, end: THREE.Vector3): THREE.Object3D {
        const radius = start.distanceTo(end);
        const sides = this.drawingState.polygonSides || 6; // Use current polygon sides setting
        
        if (!this.drawingState.activeSketchPlane) return this.createLinePreview(start, end);
        
        const { u_axis, v_axis } = this.drawingState.activeSketchPlane;
        const points: THREE.Vector3[] = [];
        
        for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const point = start.clone()
                .add(u_axis.clone().multiplyScalar(x))
                .add(v_axis.clone().multiplyScalar(y));
            points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x800080, 
            transparent: true, 
            opacity: 0.7,
            linewidth: 2
        });
        return new THREE.LineLoop(geometry, material);
    }
    
    private finishDrawing(): void {
        // Clean up preview geometry
        if (this.drawingState.previewGeometry) {
            this.scene.remove(this.drawingState.previewGeometry);
            this.drawingState.previewGeometry = undefined;
        }
    
        this.drawingState.isDrawing = false;
        this.drawingState.startPoint = undefined;
        this.drawingState.currentPoint = undefined;
        this.drawingState.points = undefined;
        
        console.log(`Finished drawing ${this.drawingState.tool}`);
    }
    
    private cancelDrawing(): void {
        this.finishDrawing();
        console.log('Drawing cancelled');
    }
    
    public getDrawingState(): DrawingState {
        return { ...this.drawingState };
    }
    
    private highlightSnapPoint(point: THREE.Vector3): void {
        this.removeSnapHighlight();
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.snapHighlight = new THREE.Mesh(geometry, material);
        this.snapHighlight.position.copy(point);
        this.scene.add(this.snapHighlight);
    }
    
    private removeSnapHighlight(): void {
        if (this.snapHighlight) {
            this.scene.remove(this.snapHighlight);
            this.snapHighlight = undefined;
        }
    }
    
    public dispose(): void {
        this.removeSnapHighlight();
        if (this.domElement) {
            this.domElement.removeEventListener('pointerdown', this.onPointerDown);
            this.domElement.removeEventListener('pointermove', this.onPointerMove);
            this.domElement.removeEventListener('pointerup', this.onPointerUp);
            this.domElement.removeEventListener('keydown', this.onKeyDown);
        }
        
        this.cancelDrawing();
        super.dispose();
    }
} 