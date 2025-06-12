import { CADRenderer } from './renderer/cad-renderer';
import { CADClient } from './api/cad-client';
import { MeshData } from './types/geometry';

console.log('CAD Engine starting...');

class CADApplication {
    private renderer!: CADRenderer;
    private client!: CADClient;
    private sessionId: string;
    private statusElement: HTMLElement | null;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.statusElement = document.getElementById('status');
        
        this.updateStatus('Initializing CAD Engine...', 'info');
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Initialize Three.js renderer
            this.updateStatus('Setting up 3D viewport...', 'info');
            await this.initializeRenderer();
            
            // Initialize CAD client (OCCT server connection)
            this.updateStatus('Connecting to CAD server...', 'info');
            await this.initializeClient();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Test server connection
            await this.testServerConnection();
            
            // Create initial demo geometry
            await this.createDemoGeometry();
            
            this.updateStatus('CAD Engine ready! 🎉', 'success');
            
        } catch (error) {
            console.error('Failed to initialize CAD application:', error);
            this.updateStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private async initializeRenderer(): Promise<void> {
        const viewport = document.getElementById('cad-viewport');
        if (!viewport) {
            throw new Error('Viewport container not found');
        }

        // Clear placeholder content
        viewport.innerHTML = '';
        
        // Create renderer
        this.renderer = new CADRenderer(viewport);
        
        console.log('✅ Three.js renderer initialized');
    }

    private async initializeClient(): Promise<void> {
        // Connect to OCCT server running on port 8080
        this.client = new CADClient('http://localhost:8080', this.sessionId);
        
        // Set up geometry update callback
        this.client.onGeometryUpdate((meshData: MeshData) => {
            console.log('Received geometry update:', meshData);
            this.renderer.updateGeometry('current-model', meshData);
        });
        
        console.log('✅ CAD client initialized');
    }

    private setupEventHandlers(): void {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.renderer.handleResize();
        });

        // Add keyboard shortcuts for views
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey) {
                switch (event.key.toLowerCase()) {
                    case '1':
                        event.preventDefault();
                        this.renderer.viewFront();
                        this.updateStatus('Front view', 'info');
                        break;
                    case '2':
                        event.preventDefault();
                        this.renderer.viewTop();
                        this.updateStatus('Top view', 'info');
                        break;
                    case '3':
                        event.preventDefault();
                        this.renderer.viewRight();
                        this.updateStatus('Right view', 'info');
                        break;
                    case '0':
                        event.preventDefault();
                        this.renderer.viewIsometric();
                        this.updateStatus('Isometric view', 'info');
                        break;
                }
            }
        });

        console.log('✅ Event handlers set up');
    }

    private async testServerConnection(): Promise<void> {
        try {
            // Try to create a simple test primitive to verify server connection
            console.log('Testing server connection...');
            
            // This will test the full pipeline: API → OCCT → Tessellation
            const response = await this.client.createModel({
                type: 'primitive',
                primitive_type: 'box',
                dimensions: { width: 0.1, height: 0.1, depth: 0.1 },
                position: [100, 100, 100] // Position off-screen for now
            });
            
            console.log('✅ Server connection successful:', response);
            
        } catch (error) {
            console.warn('⚠️  Server connection test failed:', error);
            this.updateStatus('Server offline - running in demo mode', 'warning');
        }
    }

    private async createDemoGeometry(): Promise<void> {
        try {
            // Create a demo box to show the 3D capabilities
            const response = await this.client.createModel({
                type: 'primitive',
                primitive_type: 'box',
                dimensions: { width: 10, height: 10, depth: 10 },
                position: [0, 0, 0]
            });
            
            console.log('✅ Demo geometry created:', response);
            
        } catch (error) {
            console.warn('⚠️  Could not create demo geometry:', error);
            // Fallback: Show a Three.js cube directly
            this.createFallbackGeometry();
        }
    }

    private createFallbackGeometry(): void {
        // Create a simple Three.js cube as fallback when server is unavailable
        const fallbackMesh: MeshData = {
            vertices: [
                // Front face
                -5, -5,  5,   5, -5,  5,   5,  5,  5,  -5,  5,  5,
                // Back face
                -5, -5, -5,  -5,  5, -5,   5,  5, -5,   5, -5, -5,
                // Top face
                -5,  5, -5,  -5,  5,  5,   5,  5,  5,   5,  5, -5,
                // Bottom face
                -5, -5, -5,   5, -5, -5,   5, -5,  5,  -5, -5,  5,
                // Right face
                 5, -5, -5,   5,  5, -5,   5,  5,  5,   5, -5,  5,
                // Left face
                -5, -5, -5,  -5, -5,  5,  -5,  5,  5,  -5,  5, -5
            ],
            faces: [
                0,  1,  2,    0,  2,  3,    // front
                4,  5,  6,    4,  6,  7,    // back
                8,  9,  10,   8,  10, 11,   // top
                12, 13, 14,   12, 14, 15,   // bottom
                16, 17, 18,   16, 18, 19,   // right
                20, 21, 22,   20, 22, 23    // left
            ],
            normals: [
                // Front face
                0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
                // Back face
                0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
                // Top face
                0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
                // Bottom face
                0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
                // Right face
                1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
                // Left face
                -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
            ],
            metadata: {
                vertex_count: 24,
                face_count: 12,
                tessellation_quality: 1.0
            }
        };
        
        this.renderer.updateGeometry('fallback-cube', fallbackMesh);
        console.log('✅ Fallback cube created');
    }

    private updateStatus(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
        if (!this.statusElement) return;
        
        this.statusElement.textContent = message;
        
        // Update status bar color based on type
        switch (type) {
            case 'success':
                this.statusElement.style.backgroundColor = '#4CAF50';
                this.statusElement.style.color = 'white';
                break;
            case 'warning':
                this.statusElement.style.backgroundColor = '#FF9800';
                this.statusElement.style.color = 'white';
                break;
            case 'error':
                this.statusElement.style.backgroundColor = '#F44336';
                this.statusElement.style.color = 'white';
                break;
            default: // info
                this.statusElement.style.backgroundColor = '#2196F3';
                this.statusElement.style.color = 'white';
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    private generateSessionId(): string {
        return 'session_' + Math.random().toString(36).substring(2, 15);
    }

    public dispose(): void {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.client) {
            this.client.dispose();
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting CAD application...');
    
    try {
        const app = new CADApplication();
        
        // Store reference for cleanup
        (window as any).cadApp = app;
        
        console.log('✅ CAD Application started successfully');
        
    } catch (error) {
        console.error('❌ Failed to start CAD application:', error);
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`;
            statusElement.style.backgroundColor = '#F44336';
            statusElement.style.color = 'white';
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    const app = (window as any).cadApp;
    if (app && app.dispose) {
        app.dispose();
    }
}); 