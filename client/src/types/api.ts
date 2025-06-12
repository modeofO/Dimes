import { MeshData, BoundingBox, PrimitiveType, BooleanOperation, ExportFormat } from './geometry';

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
        type: 'primitive' | 'sketch' | 'imported';
        primitive_type?: PrimitiveType;
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

export interface DaydreamsCADRequest {
    sessionId: string;
    instruction: string;  // Natural language instruction
    parameters?: Record<string, any>;
}

export interface DaydreamsCADResponse {
    success: boolean;
    script?: string;      // For backward compatibility (can be empty)
    status: 'idle' | 'processing' | 'error';
    message: string;
    errorMessage?: string;
    // New CAD-specific fields
    model_data?: {
        mesh: MeshData;
        files: Record<string, string>;
        parameters: Record<string, number>;
    };
} 