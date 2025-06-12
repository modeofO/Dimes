export interface Vector3d {
    x: number;
    y: number;
    z: number;
}

export interface MeshData {
    vertices: number[];      // Flat array: [x1,y1,z1, x2,y2,z2, ...]
    faces: number[];         // Triangle indices: [i1,i2,i3, i4,i5,i6, ...]
    normals?: number[];      // Vertex normals (optional)
    colors?: number[];       // Vertex colors (optional)
    metadata: {
        vertex_count: number;
        face_count: number;
        tessellation_quality: number;
    };
}

export interface BoundingBox {
    min: [number, number, number];
    max: [number, number, number];
}

export interface BoxParameters {
    width: number;
    height: number;
    depth: number;
    position: Vector3d;
}

export interface CylinderParameters {
    radius: number;
    height: number;
    position: Vector3d;
}

export interface SphereParameters {
    radius: number;
    position: Vector3d;
}

export type PrimitiveType = 'box' | 'cylinder' | 'sphere' | 'cone';
export type BooleanOperation = 'union' | 'cut' | 'intersect';
export type ExportFormat = 'step' | 'stl' | 'obj' | 'iges'; 