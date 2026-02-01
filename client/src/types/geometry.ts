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
export type PlaneType = 'XZ' | 'XY' | 'YZ';
export type SketchElementType = 'line' | 'circle' | 'arc' | 'rectangle' | 'polygon' | 'fillet' | 'chamfer';
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
    
    // Container flag for composite shapes (rectangles, polygons)
    is_container_only?: boolean; // If true, this element is a logical container and should not be rendered
    
    // Composite element properties
    is_composite?: boolean; // If true, this element has child elements
    child_elements?: Array<{
        element_id: string;
        visualization_data: SketchElementVisualizationData;
    }>; // Child elements for composite shapes
    
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
        
        // For rectangles
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        
        // For arcs
        center?: [number, number];
        start_angle?: number;
        end_angle?: number;
        start_point?: [number, number];
        end_point?: [number, number];
        point1?: [number, number];
        point2?: [number, number];
        point3?: [number, number];
        
        // For polygons
        sides?: number;
        
        // For fillets and chamfers
        start_x?: number;
        start_y?: number;
        end_x?: number;
        end_y?: number;
        distance?: number;
        referenced_elements?: string[];
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
    
    // For arcs
    start_angle?: number;
    end_angle?: number;
    start_point?: [number, number];
    end_point?: [number, number];
    point1?: [number, number];
    point2?: [number, number];
    point3?: [number, number];
    
    // For rectangles
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    
    // For polygons
    sides?: number;
    
    // For fillets and chamfers
    distance?: number;
    referenced_elements?: string[];
}

export interface Sketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElement[];
}

// Dimension types
export type DimensionType = 'linear';

export interface LinearDimension {
    id: string;
    type: 'linear';
    element_id: string;        // The line being dimensioned
    sketch_id: string;         // Parent sketch
    value: number;             // Current length value (in mm)
    offset: number;            // Perpendicular distance from line
    offset_direction: 1 | -1;  // Which side of the line
    constraint_id?: string;    // Link to backend constraint
}

export interface DimensionVisualizationData {
    dimension_id: string;
    dimension_type: DimensionType;
    sketch_id: string;
    element_id: string;
    value: number;
    offset: number;
    offset_direction: 1 | -1;
    // 3D coordinates for rendering
    line_start_3d: [number, number, number];
    line_end_3d: [number, number, number];
    text_position_3d: [number, number, number];
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

// Constraint types
export type ConstraintType =
  | 'length'
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'perpendicular'
  | 'parallel';

export interface Constraint {
  id: string;
  type: ConstraintType;
  sketch_id: string;
  element_ids: string[];
  point_indices?: number[];
  value?: number;
  satisfied: boolean;
  inferred?: boolean;
  confirmed?: boolean;
} 