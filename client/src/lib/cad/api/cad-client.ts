import { 
    CADResponse, 
    ModelCreateRequest, 
    ModelResponse,
    CreateSketchPlaneRequest,
    CreateSketchPlaneResponse,
    CreateSketchRequest,
    CreateSketchResponse,
    AddSketchElementRequest,
    AddSketchElementResponse,
    ExtrudeFeatureRequest,
    ExtrudeFeatureResponse
} from '../types/api';
import { 
    MeshData, 
    ExportFormat, 
    PlaneType, 
    SketchElementType,
    PlaneVisualizationData, 
    SketchVisualizationData, 
    SketchElementVisualizationData 
} from '../../../../../shared/types/geometry';

export class CADClient {
    private baseUrl: string;
    private sessionId: string;
    public geometryUpdateCallback?: (meshData: MeshData) => void;
    private planeVisualizationCallback?: (data: PlaneVisualizationData) => void;
    private sketchVisualizationCallback?: (data: SketchVisualizationData) => void;
    private elementVisualizationCallback?: (data: SketchElementVisualizationData) => void;
    
    constructor(baseUrl: string, sessionId: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.sessionId = sessionId;
        
        console.log(`CAD Client initialized for session: ${sessionId}`);
        console.log(`Connecting to Node.js API server at: ${this.baseUrl}`);
    }
    
    // Model operations
    public async createModel(parameters: {
        type: 'sketch' | 'imported';
        dimensions?: Record<string, number>;
        position?: [number, number, number];
        rotation?: [number, number, number];
    }): Promise<ModelResponse> {
        const request = {
            parameters
        };
        
        const response = await this.makeRequest<ModelResponse>('/api/v1/cad/models', 'POST', request);
        
        // Debug: Log what we received
        console.log('📨 Received createModel response:', JSON.stringify(response, null, 2));
        
        // If mesh data is included, trigger geometry update
        if (response.data?.mesh_data && this.geometryUpdateCallback) {
            console.log('🎯 Updating geometry with mesh data:', response.data.mesh_data.metadata);
            this.geometryUpdateCallback(response.data.mesh_data);
        }
        
        return response;
    }
    
    public async updateParameter(name: string, value: number): Promise<CADResponse> {
        const request = {
            [name]: value
        };
        
        return this.makeRequest<CADResponse>('/api/v1/cad/parameters', 'PUT', request);
    }
    
    public async performBoolean(operation: {
        operation_type: 'union' | 'cut' | 'intersect';
        target_id: string;
        tool_id: string;
    }): Promise<CADResponse> {
        return this.makeRequest<CADResponse>('/api/v1/cad/operations', 'POST', operation);
    }
    
    // ==================== SKETCH-BASED MODELING METHODS ====================
    
    public async createSketchPlane(planeType: PlaneType, origin?: [number, number, number]): Promise<CreateSketchPlaneResponse> {
        const request: CreateSketchPlaneRequest = {
            plane_type: planeType,
            origin: origin
        };
        
        console.log('🎯 Creating sketch plane:', request);
        
        const response = await this.makeRequest<CreateSketchPlaneResponse>('/api/v1/cad/sketch-planes', 'POST', request);
        
        console.log('📨 Received createSketchPlane response:', JSON.stringify(response, null, 2));
        
        // If visualization data is included, trigger visualization callback
        if (response.data?.visualization_data && this.planeVisualizationCallback) {
            console.log('🎯 Updating plane visualization with data:', response.data.visualization_data);
            this.planeVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async createSketch(planeId: string): Promise<CreateSketchResponse> {
        const request: CreateSketchRequest = {
            plane_id: planeId
        };
        
        console.log('📐 Creating sketch:', request);
        
        const response = await this.makeRequest<CreateSketchResponse>('/api/v1/cad/sketches', 'POST', request);
        
        console.log('📨 Received createSketch response:', JSON.stringify(response, null, 2));
        
        // If visualization data is included, trigger visualization callback
        if (response.data?.visualization_data && this.sketchVisualizationCallback) {
            console.log('🎯 Updating sketch visualization with data:', response.data.visualization_data);
            this.sketchVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async addLineToSketch(sketchId: string, x1: number, y1: number, x2: number, y2: number): Promise<AddSketchElementResponse> {
        const request: AddSketchElementRequest = {
            sketch_id: sketchId,
            element_type: 'line',
            parameters: {
                x1, y1, x2, y2
            }
        };
        
        console.log('📏 Adding line to sketch:', request);
        
        const response = await this.makeRequest<AddSketchElementResponse>('/api/v1/cad/sketch-elements', 'POST', request);
        
        console.log('📨 Received addLineToSketch response:', response);
        
        // If visualization data is included, trigger visualization callback
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            console.log('🎯 Updating element visualization with data:', response.data.visualization_data);
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async addCircleToSketch(sketchId: string, centerX: number, centerY: number, radius: number): Promise<AddSketchElementResponse> {
        const request: AddSketchElementRequest = {
            sketch_id: sketchId,
            element_type: 'circle',
            parameters: {
                center_x: centerX,
                center_y: centerY,
                radius: radius
            }
        };
        
        console.log('⭕ Adding circle to sketch:', request);
        
        const response = await this.makeRequest<AddSketchElementResponse>('/api/v1/cad/sketch-elements', 'POST', request);
        
        console.log('📨 Received addCircleToSketch response:', response);
        
        // If visualization data is included, trigger visualization callback
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            console.log('🎯 Updating element visualization with data:', response.data.visualization_data);
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async extrudeFeature(sketchId: string, distance: number, elementId?: string): Promise<ExtrudeFeatureResponse> {
        const request: ExtrudeFeatureRequest = {
            sketch_id: sketchId,
            distance: distance,
            direction: 'normal',
        };

        if (elementId) {
            request.element_id = elementId;
        }
        
        console.log('🚀 Extruding feature:', request);
        
        const response = await this.makeRequest<ExtrudeFeatureResponse>('/api/v1/cad/extrude', 'POST', request);
        
        console.log('📨 Received extrudeFeature response:', response);
        
        // If mesh data is included, trigger geometry update
        if (response.data?.mesh_data && this.geometryUpdateCallback) {
            console.log('🎯 Updating geometry with extruded mesh data:', response.data.mesh_data.metadata);
            this.geometryUpdateCallback(response.data.mesh_data);
        }
        
        return response;
    }
    
    public async tessellate(modelId: string, quality: number = 0.1): Promise<MeshData> {
        const request = {
            model_id: modelId,
            tessellation_quality: quality
        };
        
        const response = await this.makeRequest<{ mesh_data: MeshData }>('/api/v1/cad/tessellate', 'POST', request);
        return response.mesh_data;
    }
    
    public async exportModel(format: ExportFormat): Promise<Blob> {
        const url = `${this.baseUrl}/api/v1/cad/sessions/${this.sessionId}/export/${format}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': this.getAcceptHeader(format),
                'X-Session-ID': this.sessionId
            }
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }
        
        return response.blob();
    }
    
    public getModelUrl(format: string): string {
        return `${this.baseUrl}/api/v1/cad/sessions/${this.sessionId}/export/${format}`;
    }
    
    // Real-time updates (handled by AgentManager to avoid duplicate WebSocket connections)
    public onGeometryUpdate(callback: (meshData: MeshData) => void): void {
        this.geometryUpdateCallback = callback;
        // Note: WebSocket connection is handled by AgentManager to avoid duplicate connections
        // The AgentManager will forward geometry_update messages to this callback
    }
    
    // Visualization callbacks
    public onPlaneVisualization(callback: (data: PlaneVisualizationData) => void): void {
        this.planeVisualizationCallback = callback;
    }
    
    public onSketchVisualization(callback: (data: SketchVisualizationData) => void): void {
        this.sketchVisualizationCallback = callback;
    }
    
    public onElementVisualization(callback: (data: SketchElementVisualizationData) => void): void {
        this.elementVisualizationCallback = callback;
    }
    
    public handleVisualizationData(data: any): void {
        console.log('🎨 Received visualization data from agent:', data);
        
        // Handle different types of visualization data
        if (data.plane_id && this.planeVisualizationCallback) {
            this.planeVisualizationCallback(data);
        } else if (data.sketch_id && !data.element_id && this.sketchVisualizationCallback) {
            this.sketchVisualizationCallback(data);
        } else if (data.element_id && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(data);
        }
    }
    
    // Utility methods
    private async makeRequest<T>(endpoint: string, method: string, body?: any): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': this.sessionId
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json() as Promise<T>;
    }
    
    private getAcceptHeader(format: ExportFormat): string {
        switch (format) {
            case 'step':
                return 'application/step';
            case 'stl':
                return 'application/vnd.ms-pki.stl';
            case 'obj':
                return 'application/wavefront-obj';
            case 'iges':
                return 'application/iges';
            default:
                return 'application/octet-stream';
        }
    }
    
    public dispose(): void {
        // Clean up callbacks
        this.geometryUpdateCallback = undefined;
        this.planeVisualizationCallback = undefined;
        this.sketchVisualizationCallback = undefined;
        this.elementVisualizationCallback = undefined;
    }
} 