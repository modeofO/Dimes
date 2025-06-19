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

// Sketch-based modeling types
export type PlaneType = 'XY' | 'XZ' | 'YZ';
export type SketchElementType = 'line' | 'circle' | 'arc';
export type ExtrudeType = 'blind' | 'symmetric' | 'through_all' | 'to_surface';

// New visualization data structures for non-mesh geometry
export interface PlaneVisualizationData {
    plane_id: string;
    plane_type: PlaneType;
    origin: [number, number, number];
    normal: [number, number, number];
    u_axis: [number, number, number];  // Local X axis
    v_axis: [number, number, number];  // Local Y axis
    size: number; // Grid size for visualization
}

export interface SketchVisualizationData {
    sketch_id: string;
    plane_id: string;
    origin: [number, number, number];
    u_axis: [number, number, number];
    v_axis: [number, number, number];
    normal: [number, number, number];
}

export interface SketchElementVisualizationData {
    element_id: string;
    element_type: SketchElementType;
    sketch_id: string;
    
    // 3D coordinates for visualization (converted from 2D sketch space)
    points_3d: number[]; // Flat array of 3D points for lines/curves
    
    // Original 2D parameters (for reference)
    parameters_2d: {
        // For lines
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
        
        // For circles
        center_x?: number;
        center_y?: number;
        radius?: number;
    };
}

export interface SketchPlane {
    plane_id: string;
    plane_type: PlaneType;
    origin: [number, number, number];
}

export interface SketchElement {
    element_id: string;
    element_type: SketchElementType;
    
    // For lines
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    
    // For circles and arcs
    center_x?: number;
    center_y?: number;
    radius?: number;
}

export interface Sketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElement[];
}

export interface ExtrudeParameters {
    distance: number;
    direction?: 'normal' | 'custom';
    extrude_type?: ExtrudeType;
}

export interface ExtrudeFeature {
    feature_id: string;
    sketch_id: string;
    parameters: ExtrudeParameters;
    mesh_data?: MeshData;
}

export type BooleanOperation = 'union' | 'cut' | 'intersect';
export type ExportFormat = 'step' | 'stl' | 'obj' | 'iges'; 