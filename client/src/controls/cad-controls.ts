import * as THREE from 'three';

// Simplified OrbitControls implementation
export class CADControls {
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private enabled = true;
    
    // Mouse state
    private mouseButtons = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
    };
    
    // Control settings
    public enableRotate = true;
    public enableZoom = true;
    public enablePan = true;
    
    public rotateSpeed = 1.0;
    public zoomSpeed = 1.0;
    public panSpeed = 1.0;
    
    public minDistance = 1;
    public maxDistance = 1000;
    public maxPolarAngle = Math.PI;
    
    // Internal state
    private target = new THREE.Vector3(0, 0, 0);
    private spherical = new THREE.Spherical();
    private panOffset = new THREE.Vector3();
    private scale = 1;
    
    private isDragging = false;
    private dragMode: 'rotate' | 'pan' | 'zoom' | null = null;
    private lastPointer = { x: 0, y: 0 };
    
    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.setupEventListeners();
        this.updateFromCamera();
        
        console.log('CAD Controls initialized');
    }
    
    private setupEventListeners(): void {
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this));
        this.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // Prevent default behaviors
        this.domElement.style.touchAction = 'none';
    }
    
    private onMouseDown(event: MouseEvent): void {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        this.isDragging = true;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        
        // Determine drag mode based on button
        switch (event.button) {
            case this.mouseButtons.LEFT:
                this.dragMode = this.enableRotate ? 'rotate' : null;
                break;
            case this.mouseButtons.MIDDLE:
                this.dragMode = this.enableZoom ? 'zoom' : null;
                break;
            case this.mouseButtons.RIGHT:
                this.dragMode = this.enablePan ? 'pan' : null;
                break;
        }
    }
    
    private onMouseMove(event: MouseEvent): void {
        if (!this.enabled || !this.isDragging || !this.dragMode) return;
        
        event.preventDefault();
        
        const deltaX = event.clientX - this.lastPointer.x;
        const deltaY = event.clientY - this.lastPointer.y;
        
        switch (this.dragMode) {
            case 'rotate':
                this.rotateCamera(deltaX, deltaY);
                break;
            case 'pan':
                this.panCamera(deltaX, deltaY);
                break;
        }
        
        this.lastPointer = { x: event.clientX, y: event.clientY };
        this.update();
    }
    
    private onMouseUp(event: MouseEvent): void {
        if (!this.enabled) return;
        
        this.isDragging = false;
        this.dragMode = null;
    }
    
    private onWheel(event: WheelEvent): void {
        if (!this.enabled || !this.enableZoom) return;
        
        event.preventDefault();
        
        if (event.deltaY < 0) {
            this.scale /= Math.pow(0.95, this.zoomSpeed);
        } else if (event.deltaY > 0) {
            this.scale *= Math.pow(0.95, this.zoomSpeed);
        }
        
        this.update();
    }
    
    private onContextMenu(event: Event): void {
        event.preventDefault();
    }
    
    private rotateCamera(deltaX: number, deltaY: number): void {
        const rotateAngle = 2 * Math.PI * this.rotateSpeed / this.domElement.clientHeight;
        
        this.spherical.theta -= deltaX * rotateAngle;
        this.spherical.phi -= deltaY * rotateAngle;
        
        // Clamp phi to prevent flipping
        this.spherical.phi = Math.max(0.01, Math.min(this.maxPolarAngle - 0.01, this.spherical.phi));
    }
    
    private panCamera(deltaX: number, deltaY: number): void {
        const element = this.domElement;
        const position = this.camera.position;
        
        // Calculate pan vector in camera space
        const panVector = new THREE.Vector3();
        panVector.copy(position).sub(this.target);
        
        let targetDistance = panVector.length();
        targetDistance *= Math.tan((this.camera as THREE.PerspectiveCamera).fov / 2 * Math.PI / 180);
        
        const panX = (2 * deltaX * targetDistance) / element.clientHeight;
        const panY = (2 * deltaY * targetDistance) / element.clientHeight;
        
        // Pan relative to camera orientation
        const cameraMatrix = new THREE.Matrix4();
        cameraMatrix.extractRotation(this.camera.matrix);
        
        const panOffset = new THREE.Vector3(-panX, panY, 0);
        panOffset.applyMatrix4(cameraMatrix);
        
        this.target.add(panOffset);
    }
    
    private updateFromCamera(): void {
        const position = this.camera.position;
        const offset = new THREE.Vector3().copy(position).sub(this.target);
        
        this.spherical.setFromVector3(offset);
    }
    
    public update(): void {
        const position = this.camera.position;
        
        // Apply scale (zoom)
        this.spherical.radius = Math.max(this.minDistance, 
            Math.min(this.maxDistance, this.spherical.radius * this.scale));
        this.scale = 1;
        
        // Convert spherical to cartesian
        const offset = new THREE.Vector3();
        offset.setFromSpherical(this.spherical);
        
        // Update camera position
        position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }
    
    public dispose(): void {
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.domElement.removeEventListener('mousemove', this.onMouseMove);
        this.domElement.removeEventListener('mouseup', this.onMouseUp);
        this.domElement.removeEventListener('wheel', this.onWheel);
        this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    }
    
    // CAD-specific view methods
    public setTarget(target: THREE.Vector3): void {
        this.target.copy(target);
        this.update();
    }
    
    public getTarget(): THREE.Vector3 {
        return this.target.clone();
    }
    
    public reset(): void {
        this.target.set(0, 0, 0);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(this.target);
        this.updateFromCamera();
    }
} 