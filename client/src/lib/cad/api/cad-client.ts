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
    AddFilletRequest,
    AddFilletResponse,
    AddChamferRequest,
    AddChamferResponse,
    TrimLineRequest,
    TrimLineResponse,
    ExtendLineRequest,
    ExtendLineResponse,
    MirrorElementRequest,
    MirrorElementResponse,
    OffsetElementRequest,
    OffsetElementResponse,
    CopyElementRequest,
    CopyElementResponse,
    MoveElementRequest,
    MoveElementResponse,
    CreateLinearArrayRequest,
    CreateLinearArrayResponse,
    CreateMirrorArrayRequest,
    CreateMirrorArrayResponse,
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
    
    // ==================== BASIC SKETCH ELEMENTS ====================
    
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
    
    public async addRectangleToSketch(sketchId: string, corner: [number, number], width: number, height: number): Promise<AddSketchElementResponse> {
        const request: AddSketchElementRequest = {
            sketch_id: sketchId,
            element_type: 'rectangle',
            parameters: {
                corner,
                width,
                height
            }
        };
        
        console.log('📐 Adding rectangle to sketch:', request);
        
        const response = await this.makeRequest<AddSketchElementResponse>('/api/v1/cad/sketch-elements', 'POST', request);
        
        console.log('📨 Received addRectangleToSketch response:', response);
        
        // If visualization data is included, trigger visualization callback
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            console.log('🎯 Updating element visualization with data:', response.data.visualization_data);
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    // ==================== NEW 2D TOOLS ====================
    
    public async addArcToSketch(sketchId: string, arcParams: {
        arc_type: 'three_points' | 'endpoints_radius';
        // For three_points
        x1?: number;
        y1?: number;
        x_mid?: number;
        y_mid?: number;
        x2?: number;
        y2?: number;
        // For endpoints_radius
        radius?: number;
        large_arc?: boolean;
    }): Promise<AddSketchElementResponse> {
        const request: AddSketchElementRequest = {
            sketch_id: sketchId,
            element_type: 'arc',
            parameters: arcParams
        };
        
        console.log('🌙 Adding arc to sketch:', request);
        
        const response = await this.makeRequest<AddSketchElementResponse>('/api/v1/cad/sketch-elements', 'POST', request);
        
        console.log('📨 Received addArcToSketch response:', response);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async addPolygonToSketch(sketchId: string, center_x: number, center_y: number, sides: number, radius: number): Promise<AddSketchElementResponse> {
        const request: AddSketchElementRequest = {
            sketch_id: sketchId,
            element_type: 'polygon',
            parameters: {
                center_x,
                center_y,
                sides,
                radius
            }
        };
        
        console.log('⬡ Adding polygon to sketch:', request);
        
        const response = await this.makeRequest<AddSketchElementResponse>('/api/v1/cad/sketch-elements', 'POST', request);
        
        console.log('📨 Received addPolygonToSketch response:', response);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    // ==================== MODIFICATION TOOLS ====================
    
    public async addFilletToSketch(sketchId: string, line1Id: string, line2Id: string, radius: number): Promise<AddFilletResponse> {
        const request = {
            sketch_id: sketchId,
            line1_id: line1Id,
            line2_id: line2Id,
            radius: radius
        };
        
        console.log('🔵 Adding fillet to sketch:', request);
        
        const response = await this.makeRequest<AddFilletResponse>('/api/v1/cad/fillets', 'POST', request);
        
        console.log('📨 Received addFilletToSketch response:', response);
        
        // If visualization data is included, trigger visualization callback for the fillet
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            console.log('🎯 Updating fillet visualization with data:', response.data.visualization_data);
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        // Handle updated elements (the modified lines)
        if (response.data?.updated_elements && this.elementVisualizationCallback) {
            console.log('🔄 Processing updated elements after fillet:', response.data.updated_elements);
            response.data.updated_elements.forEach(elementData => {
                console.log(`🔄 Updating visualization for modified element: ${elementData.element_id}`);
                this.elementVisualizationCallback!(elementData);
            });
        }
        
        return response;
    }
    
    public async addChamferToSketch(sketchId: string, line1Id: string, line2Id: string, distance: number): Promise<AddChamferResponse> {
        const request = {
            sketch_id: sketchId,
            line1_id: line1Id,
            line2_id: line2Id,
            distance: distance
        };
        
        console.log('🔶 Adding chamfer to sketch:', request);
        
        const response = await this.makeRequest<AddChamferResponse>('/api/v1/cad/chamfers', 'POST', request);
        
        console.log('📨 Received addChamferToSketch response:', response);
        
        // If visualization data is included, trigger visualization callback for the chamfer
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        // Handle updated elements (the modified lines)
        if (response.data?.updated_elements && this.elementVisualizationCallback) {
            console.log('🔄 Processing updated elements after chamfer:', response.data.updated_elements);
            response.data.updated_elements.forEach(elementData => {
                console.log(`🔄 Updating visualization for modified element: ${elementData.element_id}`);
                this.elementVisualizationCallback!(elementData);
            });
        }
        
        return response;
    }
    
    // ==================== POSITIONING TOOLS ====================
    
    public async trimLineToLine(sketchId: string, lineToTrimId: string, cuttingLineId: string, keepStart: boolean = false): Promise<TrimLineResponse> {
        const request = {
            sketch_id: sketchId,
            line_to_trim_id: lineToTrimId,
            cutting_line_id: cuttingLineId,
            keep_start: keepStart
        };
        
        console.log('✂️ Trimming line to line:', request);
        
        const response = await this.makeRequest<TrimLineResponse>('/api/v1/cad/trim-line-to-line', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async trimLineToGeometry(sketchId: string, lineToTrimId: string, cuttingGeometryId: string, keepStart: boolean = false): Promise<TrimLineResponse> {
        const request = {
            sketch_id: sketchId,
            line_to_trim_id: lineToTrimId,
            cutting_geometry_id: cuttingGeometryId,
            keep_start: keepStart
        };
        
        console.log('✂️ Trimming line to geometry:', request);
        
        const response = await this.makeRequest<TrimLineResponse>('/api/v1/cad/trim-line-to-geometry', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async extendLineToLine(sketchId: string, lineToExtendId: string, targetLineId: string, extendStart: boolean = false): Promise<ExtendLineResponse> {
        const request = {
            sketch_id: sketchId,
            line_to_extend_id: lineToExtendId,
            target_line_id: targetLineId,
            extend_start: extendStart
        };
        
        console.log('🔗 Extending line to line:', request);
        
        const response = await this.makeRequest<ExtendLineResponse>('/api/v1/cad/extend-line-to-line', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async extendLineToGeometry(sketchId: string, lineToExtendId: string, targetGeometryId: string, extendStart: boolean = false): Promise<ExtendLineResponse> {
        const request = {
            sketch_id: sketchId,
            line_to_extend_id: lineToExtendId,
            target_geometry_id: targetGeometryId,
            extend_start: extendStart
        };
        
        console.log('🔗 Extending line to geometry:', request);
        
        const response = await this.makeRequest<ExtendLineResponse>('/api/v1/cad/extend-line-to-geometry', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async mirrorElements(sketchId: string, elementIds: string[], mirrorLineId: string, keepOriginal: boolean = true): Promise<MirrorElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_ids: elementIds,
            mirror_line_id: mirrorLineId,
            keep_original: keepOriginal
        };
        
        console.log('🪞 Mirroring elements:', request);
        
        const response = await this.makeRequest<MirrorElementResponse>('/api/v1/cad/mirror-elements', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async mirrorElementsByTwoPoints(sketchId: string, elementIds: string[], x1: number, y1: number, x2: number, y2: number, keepOriginal: boolean = true): Promise<MirrorElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_ids: elementIds,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            keep_original: keepOriginal
        };
        
        console.log('🪞 Mirroring elements by two points:', request);
        
        const response = await this.makeRequest<MirrorElementResponse>('/api/v1/cad/mirror-elements-by-two-points', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async offsetElement(sketchId: string, elementId: string, offsetDistance: number): Promise<OffsetElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_id: elementId,
            offset_distance: offsetDistance
        };
        
        console.log('↔️ Offsetting element:', request);
        
        const response = await this.makeRequest<OffsetElementResponse>('/api/v1/cad/offset-element', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async offsetElementDirectional(sketchId: string, elementId: string, offsetDistance: number, direction: 'left' | 'right'): Promise<OffsetElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_id: elementId,
            offset_distance: offsetDistance,
            direction: direction
        };
        
        console.log('↔️ Offsetting element directionally:', request);
        
        const response = await this.makeRequest<OffsetElementResponse>('/api/v1/cad/offset-element-directional', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async copyElement(sketchId: string, elementId: string, numCopies: number, directionX: number, directionY: number, distance: number): Promise<CopyElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_id: elementId,
            num_copies: numCopies,
            direction_x: directionX,
            direction_y: directionY,
            distance: distance
        };
        
        console.log('📄 Copying element:', request);
        
        const response = await this.makeRequest<CopyElementResponse>('/api/v1/cad/copy-element', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    public async moveElement(sketchId: string, elementId: string, directionX: number, directionY: number, distance: number): Promise<MoveElementResponse> {
        const request = {
            sketch_id: sketchId,
            element_id: elementId,
            direction_x: directionX,
            direction_y: directionY,
            distance: distance
        };
        
        console.log('🚚 Moving element:', request);
        
        const response = await this.makeRequest<MoveElementResponse>('/api/v1/cad/move-element', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    // ==================== PATTERN TOOLS ====================
    
    public async createLinearArray(sketchId: string, elementId: string, direction: [number, number], count: number): Promise<CreateLinearArrayResponse> {
        const request: CreateLinearArrayRequest = {
            sketch_id: sketchId,
            element_id: elementId,
            direction: direction,
            count: count
        };
        
        console.log('📊 Creating linear array:', request);
        
        const response = await this.makeRequest<CreateLinearArrayResponse>('/api/v1/cad/linear-arrays', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            // Handle multiple visualization data items for array elements
            if (Array.isArray(response.data.visualization_data)) {
                response.data.visualization_data.forEach(data => {
                    this.elementVisualizationCallback!(data);
                });
            } else {
                this.elementVisualizationCallback(response.data.visualization_data);
            }
        }
        
        return response;
    }
    
    public async createMirrorArray(sketchId: string, elementId: string, mirrorLine: { point1: [number, number]; point2: [number, number] }): Promise<CreateMirrorArrayResponse> {
        const request: CreateMirrorArrayRequest = {
            sketch_id: sketchId,
            element_id: elementId,
            mirror_line: mirrorLine
        };
        
        console.log('🔄 Creating mirror array:', request);
        
        const response = await this.makeRequest<CreateMirrorArrayResponse>('/api/v1/cad/mirror-arrays', 'POST', request);
        
        if (response.data?.visualization_data && this.elementVisualizationCallback) {
            this.elementVisualizationCallback(response.data.visualization_data);
        }
        
        return response;
    }
    
    // ==================== 3D OPERATIONS ====================
    
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
        console.log('🔍 Data structure:', {
            hasPlaneId: !!data.plane_id,
            hasSketchId: !!data.sketch_id,
            hasElementId: !!data.element_id,
            dataKeys: Object.keys(data)
        });
        
        // Handle different types of visualization data
        // IMPORTANT: Check for sketch data first since it may also contain plane_id
        if (data.element_id && this.elementVisualizationCallback) {
            console.log('🔷 Triggering element visualization callback');
            this.elementVisualizationCallback(data);
        } else if (data.sketch_id && !data.element_id && this.sketchVisualizationCallback) {
            // Validate that the data has the expected structure for sketch visualization
            if (data.origin && data.normal && data.u_axis && data.v_axis) {
                console.log('📐 Triggering sketch visualization callback for agent-created sketch');
                this.sketchVisualizationCallback(data);
            } else {
                console.log('⚠️ Sketch data missing required properties (origin, normal, u_axis, v_axis):', data);
            }
        } else if (data.plane_id && !data.sketch_id && this.planeVisualizationCallback) {
            // Validate that the data has the expected structure for plane visualization
            if (data.origin && data.normal && data.u_axis && data.v_axis) {
                console.log('✈️ Triggering plane visualization callback');
                this.planeVisualizationCallback(data);
            } else {
                console.log('⚠️ Plane data missing required properties (origin, normal, u_axis, v_axis):', data);
            }
        } else {
            console.log('⚠️ No matching visualization callback found for data:', data);
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