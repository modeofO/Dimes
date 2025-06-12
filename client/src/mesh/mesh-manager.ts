import * as THREE from 'three';
import { MeshData } from '../types/geometry';

export class MeshManager {
    private scene: THREE.Scene;
    private geometryCache = new Map<string, THREE.BufferGeometry>();
    private materialCache = new Map<string, THREE.Material>();
    private activeMeshes = new Map<string, THREE.Mesh>();
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.initializeMaterials();
    }
    
    private initializeMaterials(): void {
        // Metal material
        const metalMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x888888,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.0
        });
        this.materialCache.set('metal', metalMaterial);
        
        // Plastic material
        const plasticMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4444ff,
            metalness: 0.0,
            roughness: 0.3,
            envMapIntensity: 0.5
        });
        this.materialCache.set('plastic', plasticMaterial);
        
        // Wireframe material
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true
        });
        this.materialCache.set('wireframe', wireframeMaterial);
    }
    
    public updateMesh(id: string, meshData: MeshData): void {
        // Remove existing mesh if it exists
        if (this.activeMeshes.has(id)) {
            this.removeMesh(id);
        }
        
        // Create geometry from mesh data
        const geometry = this.createGeometryFromMeshData(meshData);
        if (!geometry) {
            console.error('Failed to create geometry for mesh:', id);
            return;
        }
        
        // Create mesh with default material
        const material = this.materialCache.get('metal') || new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        
        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add to scene and cache
        this.scene.add(mesh);
        this.activeMeshes.set(id, mesh);
        this.geometryCache.set(id, geometry);
        
        console.log(`Updated mesh ${id}: ${meshData.metadata.vertex_count} vertices, ${meshData.metadata.face_count} faces`);
    }
    
    public removeMesh(id: string): void {
        const mesh = this.activeMeshes.get(id);
        if (mesh) {
            this.scene.remove(mesh);
            this.activeMeshes.delete(id);
        }
        
        const geometry = this.geometryCache.get(id);
        if (geometry) {
            geometry.dispose();
            this.geometryCache.delete(id);
        }
    }
    
    public setMeshMaterial(id: string, materialType: string): void {
        const mesh = this.activeMeshes.get(id);
        const material = this.materialCache.get(materialType);
        
        if (mesh && material) {
            mesh.material = material;
        }
    }
    
    public dispose(): void {
        // Dispose all geometries
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        // Dispose all materials
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
        
        // Remove all meshes from scene
        this.activeMeshes.forEach(mesh => this.scene.remove(mesh));
        this.activeMeshes.clear();
    }
    
    private createGeometryFromMeshData(meshData: MeshData): THREE.BufferGeometry | null {
        if (!meshData.vertices || meshData.vertices.length === 0) {
            console.error('No vertices provided in mesh data');
            return null;
        }
        
        if (meshData.vertices.length % 3 !== 0) {
            console.error('Vertex count not divisible by 3');
            return null;
        }
        
        const geometry = new THREE.BufferGeometry();
        
        // Convert arrays to typed arrays
        const vertices = new Float32Array(meshData.vertices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        // Set indices if provided
        if (meshData.faces && meshData.faces.length > 0) {
            const indices = new Uint32Array(meshData.faces);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }
        
        // Set normals if provided, otherwise compute them
        if (meshData.normals && meshData.normals.length > 0) {
            const normals = new Float32Array(meshData.normals);
            geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        } else {
            geometry.computeVertexNormals();
        }
        
        // Set colors if provided
        if (meshData.colors && meshData.colors.length > 0) {
            const colors = new Float32Array(meshData.colors);
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
        
        // Compute bounding box and sphere
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        
        return geometry;
    }
    
    private validateMeshData(meshData: MeshData): boolean {
        if (!meshData.vertices || meshData.vertices.length === 0) {
            return false;
        }
        
        if (meshData.vertices.length % 3 !== 0) {
            return false;
        }
        
        if (meshData.faces && meshData.faces.some(i => i >= meshData.vertices.length / 3)) {
            return false;
        }
        
        return true;
    }
} 