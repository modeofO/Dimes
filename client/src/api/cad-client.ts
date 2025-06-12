import { CADResponse, ModelCreateRequest, ModelResponse, DaydreamsCADRequest, DaydreamsCADResponse } from '../types/api';
import { MeshData, ExportFormat, PrimitiveType } from '../types/geometry';

export class CADClient {
    private baseUrl: string;
    private sessionId: string;
    private ws: WebSocket | null = null;
    private geometryUpdateCallback?: (meshData: MeshData) => void;
    
    constructor(baseUrl: string, sessionId: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.sessionId = sessionId;
        
        console.log(`CAD Client initialized for session: ${sessionId}`);
    }
    
    // Model operations
    public async createModel(parameters: {
        type: 'primitive' | 'sketch' | 'imported';
        primitive_type?: PrimitiveType;
        dimensions?: Record<string, number>;
        position?: [number, number, number];
        rotation?: [number, number, number];
    }): Promise<ModelResponse> {
        const request: ModelCreateRequest = {
            session_id: this.sessionId,
            operation: 'create_model',
            parameters
        };
        
        const response = await this.makeRequest<ModelResponse>('/api/v1/models', 'POST', request);
        
        // If mesh data is included, trigger geometry update
        if (response.data?.mesh_data && this.geometryUpdateCallback) {
            this.geometryUpdateCallback(response.data.mesh_data);
        }
        
        return response;
    }
    
    public async updateParameter(name: string, value: number): Promise<CADResponse> {
        const request = {
            session_id: this.sessionId,
            operation: 'update_parameters',
            parameters: { [name]: value }
        };
        
        return this.makeRequest<CADResponse>('/api/v1/parameters', 'PUT', request);
    }
    
    public async performBoolean(operation: {
        operation_type: 'union' | 'cut' | 'intersect';
        target_id: string;
        tool_id: string;
    }): Promise<CADResponse> {
        const request = {
            session_id: this.sessionId,
            operation: 'boolean_operation',
            parameters: operation
        };
        
        return this.makeRequest<CADResponse>('/api/v1/operations', 'POST', request);
    }
    
    public async tessellate(modelId: string, quality: number = 0.1): Promise<MeshData> {
        const request = {
            session_id: this.sessionId,
            model_id: modelId,
            tessellation_quality: quality
        };
        
        const response = await this.makeRequest<{ mesh_data: MeshData }>('/api/v1/tessellate', 'POST', request);
        return response.mesh_data;
    }
    
    public async exportModel(format: ExportFormat): Promise<Blob> {
        const url = `${this.baseUrl}/api/v1/sessions/${this.sessionId}/export/${format}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': this.getAcceptHeader(format)
            }
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }
        
        return response.blob();
    }
    
    public getModelUrl(format: string): string {
        return `${this.baseUrl}/api/v1/sessions/${this.sessionId}/export/${format}`;
    }
    
    // Daydreams compatibility
    public async sendDaydreamsCADRequest(instruction: string, parameters?: Record<string, any>): Promise<DaydreamsCADResponse> {
        const request: DaydreamsCADRequest = {
            sessionId: this.sessionId,
            instruction,
            parameters
        };
        
        const response = await this.makeRequest<DaydreamsCADResponse>('/api/v1/daydreams/cad', 'POST', request);
        
        // If model data is included, trigger geometry update
        if (response.model_data?.mesh && this.geometryUpdateCallback) {
            this.geometryUpdateCallback(response.model_data.mesh);
        }
        
        return response;
    }
    
    // Real-time updates
    public onGeometryUpdate(callback: (meshData: MeshData) => void): void {
        this.geometryUpdateCallback = callback;
        // Make WebSocket connection optional - don't block if it fails
        try {
            this.setupWebSocket();
        } catch (error) {
            console.log('WebSocket not available, using REST API only:', error);
        }
    }
    
    private setupWebSocket(): void {
        if (this.ws) {
            return; // Already connected
        }
        
        const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws/${this.sessionId}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.ws = null;
                
                // Don't attempt to reconnect - just log it
                console.log('WebSocket disconnected, continuing with REST API only');
            };
            
            this.ws.onerror = (error) => {
                console.log('WebSocket not available, using REST API only');
                this.ws = null;
            };
        } catch (error) {
            console.log('WebSocket connection failed, continuing with REST API only');
            this.ws = null;
        }
    }
    
    private handleWebSocketMessage(message: any): void {
        switch (message.type) {
            case 'geometry_update':
                if (message.data && this.geometryUpdateCallback) {
                    this.geometryUpdateCallback(message.data);
                }
                break;
            case 'parameter_update':
                console.log('Parameter updated:', message.data);
                break;
            case 'error':
                console.error('Server error:', message.data);
                break;
            default:
                console.log('Unknown message type:', message.type);
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
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.geometryUpdateCallback = undefined;
    }
} 