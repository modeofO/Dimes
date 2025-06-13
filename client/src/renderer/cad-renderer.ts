import * as THREE from 'three';
import { MeshManager } from '../mesh/mesh-manager';
import { CADControls } from '../controls/cad-controls';
import { MeshData } from '../types/geometry';

export class CADRenderer {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: CADControls;
    private meshManager!: MeshManager;
    private container: HTMLElement;
    
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
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
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
    }
    
    private setupControls(): void {
        this.controls = new CADControls(this.camera, this.renderer.domElement);
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
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
    
    public updateGeometry(modelId: string, meshData: MeshData): void {
        this.meshManager.updateMesh(modelId, meshData);
    }

    public clearAllGeometry(): void {
        this.meshManager.clearAllMeshes();
    }
    
    public removeGeometry(modelId: string): void {
        this.meshManager.removeMesh(modelId);
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
        this.renderer.dispose();
        
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
} 