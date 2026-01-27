import { 
    MeshData, 
    BoundingBox, 
    BooleanOperation, 
    ExportFormat,
    PlaneType,
    SketchElementType,
    ExtrudeParameters,
    SketchPlane,
    Sketch,
    ExtrudeFeature,
    PlaneVisualizationData,
    SketchVisualizationData,
    SketchElementVisualizationData
} from '@/types/geometry';

export interface CADResponse {
    success: boolean;
    session_id: string;
    timestamp: string;
    data?: any;
    error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
    performance?: {
        processing_time_ms: number;
        geometry_complexity: number;
    };
}

export interface ModelCreateRequest {
    session_id: string;
    operation: 'create_model';
    parameters: {
        type: 'sketch' | 'imported';
        dimensions?: Record<string, number>;
        position?: [number, number, number];
        rotation?: [number, number, number];
    };
}

export interface ModelResponse extends CADResponse {
    data: {
        model_id: string;
        mesh_data?: MeshData;
        bounding_box: BoundingBox;
        file_urls?: Record<string, string>; // format -> download URL
    };
}

// Sketch-based modeling requests/responses
export interface CreateSketchPlaneRequest {
    plane_type: PlaneType;
    origin?: [number, number, number];
}

export interface CreateSketchPlaneResponse extends CADResponse {
    data: {
        plane_id: string;
        plane_type: PlaneType;
        origin_x: number;
        origin_y: number;
        origin_z: number;
        visualization_data?: PlaneVisualizationData;
    };
}

export interface CreateSketchRequest {
    plane_id: string;
}

export interface CreateSketchResponse extends CADResponse {
    data: {
        sketch_id: string;
        plane_id: string;
        visualization_data?: SketchVisualizationData;
    };
}

export interface AddSketchElementRequest {
    sketch_id: string;
    element_type: SketchElementType;
    parameters: {
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
        corner?: [number, number];
        width?: number;
        height?: number;
        
        // For arcs
        arc_type?: 'three_points' | 'endpoints_radius';
        x_mid?: number;
        y_mid?: number;
        large_arc?: boolean;
        
        // For polygons
        sides?: number;
    };
}

export interface AddSketchElementResponse extends CADResponse {
    data: {
        sketch_id: string;
        element_type: SketchElementType;
        element_id: string;
        visualization_data?: SketchElementVisualizationData;
        is_composite?: boolean;
        child_elements?: Array<{
            element_id: string;
            visualization_data: SketchElementVisualizationData;
        }>;
    };
}

export interface ExtrudeFeatureRequest {
    sketch_id: string;
    element_id?: string; // If present, extrude only this element from the sketch
    distance: number;
    direction?: 'normal' | 'custom';
}

export interface ExtrudeFeatureResponse extends CADResponse {
    data: {
        feature_id: string;
        source_sketch_id: string;
        source_element_id?: string;
        distance: number;
        direction: string;
        mesh_data?: MeshData;
    };
}

export interface AddFilletRequest {
    sketch_id: string;
    line1_id: string;
    line2_id: string;
    radius: number;
}

export interface AddFilletResponse extends CADResponse {
    data: {
        sketch_id: string;
        fillet_id: string;
        line1_id: string;
        line2_id: string;
        radius: number;
        visualization_data?: SketchElementVisualizationData;
        updated_elements?: SketchElementVisualizationData[];
    };
}

// New API types for additional 2D tools

export interface AddChamferRequest {
    sketch_id: string;
    line1_id: string;
    line2_id: string;
    distance: number;
}

export interface AddChamferResponse extends CADResponse {
    data: {
        sketch_id: string;
        chamfer_id: string;
        line1_id: string;
        line2_id: string;
        distance: number;
        visualization_data?: SketchElementVisualizationData;
        updated_elements?: SketchElementVisualizationData[];
    };
}

export interface TrimLineRequest {
    sketch_id: string;
    line_to_trim_id: string;
    cutting_line_id?: string;
    cutting_geometry_id?: string;
    keep_start: boolean;
}

export interface TrimLineResponse extends CADResponse {
    data: {
        sketch_id: string;
        trimmed_element_id: string;
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface ExtendLineRequest {
    sketch_id: string;
    line_to_extend_id: string;
    target_line_id?: string;
    target_geometry_id?: string;
    extend_start: boolean;
}

export interface ExtendLineResponse extends CADResponse {
    data: {
        sketch_id: string;
        extended_element_id: string;
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface MirrorElementRequest {
    sketch_id: string;
    element_ids: string[];
    mirror_line_id?: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    keep_original: boolean;
}

export interface MirrorElementResponse extends CADResponse {
    data: {
        sketch_id: string;
        mirrored_element_ids: string[];
        original_element_ids: string[];
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface OffsetElementRequest {
    sketch_id: string;
    element_id: string;
    offset_distance: number;
    direction?: 'left' | 'right';
}

export interface OffsetElementResponse extends CADResponse {
    data: {
        sketch_id: string;
        offset_element_id: string;
        original_element_id: string;
        offset_distance: number;
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface CopyElementRequest {
    sketch_id: string;
    element_id: string;
    num_copies: number;
    direction_x: number;
    direction_y: number;
    distance: number;
}

export interface CopyElementResponse extends CADResponse {
    data: {
        sketch_id: string;
        copied_element_ids: string[];
        original_element_id: string;
        num_copies: number;
        direction_x: number;
        direction_y: number;
        distance: number;
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface MoveElementRequest {
    sketch_id: string;
    element_id: string;
    direction_x: number;
    direction_y: number;
    distance: number;
}

export interface MoveElementResponse extends CADResponse {
    data: {
        sketch_id: string;
        moved_element_id: string;
        direction_x: number;
        direction_y: number;
        distance: number;
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface CreateLinearArrayRequest {
    sketch_id: string;
    element_id: string;
    direction: [number, number];
    count: number;
}

export interface CreateLinearArrayResponse extends CADResponse {
    data: {
        sketch_id: string;
        array_elements: string[];
        original_element_id: string;
        direction: [number, number];
        count: number;
        visualization_data?: SketchElementVisualizationData[];
    };
}

export interface CreateMirrorArrayRequest {
    sketch_id: string;
    element_id: string;
    mirror_line: {
        point1: [number, number];
        point2: [number, number];
    };
}

export interface CreateMirrorArrayResponse extends CADResponse {
    data: {
        sketch_id: string;
        mirrored_element_id: string;
        original_element_id: string;
        mirror_line: {
            point1: [number, number];
            point2: [number, number];
        };
        visualization_data?: SketchElementVisualizationData;
    };
}

export interface DaydreamsInstructionRequest {
    instruction: string;
    sessionId: string;
} 