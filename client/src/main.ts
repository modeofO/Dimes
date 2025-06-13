import { CADRenderer } from './renderer/cad-renderer';
import { CADClient } from './api/cad-client';
import { MeshData } from './types/geometry';

console.log('CAD Engine starting...');

interface CreatedShape {
    id: string;
    type: string;
    dimensions: Record<string, number>;
    visible: boolean;
}

class CADApplication {
    private renderer!: CADRenderer;
    private client!: CADClient;
    private sessionId: string;
    private statusElement: HTMLElement | null;
    private createdShapes: CreatedShape[] = [];

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
            this.setupUIHandlers();
            
            // Test server connection
            await this.testServerConnection();
            
            this.updateStatus('CAD Engine ready! 🎉', 'success');
            
        } catch (error) {
            console.error('Failed to initialize CAD application:', error);
            this.updateStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private async initializeRenderer(): Promise<void> {
        const viewport = document.getElementById('viewport-3d');
        if (!viewport) {
            throw new Error('3D viewport container not found');
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

    private setupUIHandlers(): void {
        // Primitive type dropdown handler
        const primitiveType = document.getElementById('primitive-type') as HTMLSelectElement;
        if (primitiveType) {
            primitiveType.addEventListener('change', () => {
                this.updatePrimitiveParams(primitiveType.value);
            });
        }

        // Create primitive button handler
        const createBtn = document.getElementById('create-primitive') as HTMLButtonElement;
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createPrimitive();
            });
        }

        // Clear all button handler
        const clearBtn = document.getElementById('clear-all') as HTMLButtonElement;
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllShapes();
            });
        }

        // Boolean operation button handler
        const booleanBtn = document.getElementById('perform-boolean') as HTMLButtonElement;
        if (booleanBtn) {
            booleanBtn.addEventListener('click', () => {
                this.performBooleanOperation();
            });
        }

        // Shape selection handlers for boolean operations
        const targetSelect = document.getElementById('target-shape') as HTMLSelectElement;
        const toolSelect = document.getElementById('tool-shape') as HTMLSelectElement;
        if (targetSelect && toolSelect) {
            const updateBooleanButton = () => {
                const canPerform = targetSelect.value && toolSelect.value && targetSelect.value !== toolSelect.value;
                if (booleanBtn) {
                    booleanBtn.disabled = !canPerform;
                }
            };
            
            targetSelect.addEventListener('change', updateBooleanButton);
            toolSelect.addEventListener('change', updateBooleanButton);
        }

        console.log('✅ UI handlers set up');
    }

    private updatePrimitiveParams(type: string): void {
        // Hide all parameter groups
        document.querySelectorAll('.param-group').forEach(group => {
            (group as HTMLElement).style.display = 'none';
        });

        // Show the selected parameter group
        const paramGroup = document.getElementById(`${type}-params`);
        if (paramGroup) {
            paramGroup.style.display = 'block';
        }
    }

    private async createPrimitive(): Promise<void> {
        try {
            const primitiveType = (document.getElementById('primitive-type') as HTMLSelectElement).value;
            let dimensions: Record<string, number> = {};

            // Get dimensions based on primitive type
            if (primitiveType === 'box') {
                dimensions = {
                    width: parseFloat((document.getElementById('box-width') as HTMLInputElement).value),
                    height: parseFloat((document.getElementById('box-height') as HTMLInputElement).value),
                    depth: parseFloat((document.getElementById('box-depth') as HTMLInputElement).value)
                };
            } else if (primitiveType === 'cylinder') {
                dimensions = {
                    radius: parseFloat((document.getElementById('cylinder-radius') as HTMLInputElement).value),
                    height: parseFloat((document.getElementById('cylinder-height') as HTMLInputElement).value)
                };
            } else if (primitiveType === 'sphere') {
                dimensions = {
                    radius: parseFloat((document.getElementById('sphere-radius') as HTMLInputElement).value)
                };
            }

            // Get position
            const position = [
                parseFloat((document.getElementById('pos-x') as HTMLInputElement).value),
                parseFloat((document.getElementById('pos-y') as HTMLInputElement).value),
                parseFloat((document.getElementById('pos-z') as HTMLInputElement).value)
            ] as [number, number, number];

            this.updateStatus(`Creating ${primitiveType}...`, 'info');

            // Create the primitive via server
            const response = await this.client.createModel({
                type: 'primitive',
                primitive_type: primitiveType as any,
                dimensions: dimensions,
                position: position
            });

            if (response.success && response.data) {
                // Add to shapes list
                const shape: CreatedShape = {
                    id: response.data.model_id,
                    type: primitiveType,
                    dimensions: dimensions,
                    visible: true
                };
                this.createdShapes.push(shape);

                // Update geometry in viewport
                if (response.data.mesh_data) {
                    this.renderer.updateGeometry(shape.id, response.data.mesh_data);
                }

                this.updateShapesList();
                this.updateShapeSelectors();
                this.updateStatus(`✅ Created ${primitiveType}: ${shape.id}`, 'success');
            } else {
                this.updateStatus(`❌ Failed to create ${primitiveType}`, 'error');
            }

        } catch (error) {
            console.error('Failed to create primitive:', error);
            this.updateStatus(`❌ Error creating primitive: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private async performBooleanOperation(): Promise<void> {
        try {
            const operation = (document.getElementById('boolean-op') as HTMLSelectElement).value;
            const targetId = (document.getElementById('target-shape') as HTMLSelectElement).value;
            const toolId = (document.getElementById('tool-shape') as HTMLSelectElement).value;

            if (!targetId || !toolId) {
                this.updateStatus('❌ Please select both target and tool shapes', 'error');
                return;
            }

            this.updateStatus(`Performing ${operation} operation...`, 'info');

            const response = await this.client.performBoolean({
                operation_type: operation as any,
                target_id: targetId,
                tool_id: toolId
            });

            if (response.success && response.data) {
                // Add result to shapes list
                const resultShape: CreatedShape = {
                    id: response.data.result_id,
                    type: `${operation}(${targetId}, ${toolId})`,
                    dimensions: {},
                    visible: true
                };
                this.createdShapes.push(resultShape);

                // Update geometry in viewport
                if (response.data.mesh_data) {
                    this.renderer.updateGeometry(resultShape.id, response.data.mesh_data);
                }

                this.updateShapesList();
                this.updateShapeSelectors();
                this.updateStatus(`✅ ${operation} operation successful: ${resultShape.id}`, 'success');
            } else {
                this.updateStatus(`❌ Boolean operation failed`, 'error');
            }

        } catch (error) {
            console.error('Failed to perform boolean operation:', error);
            this.updateStatus(`❌ Boolean operation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private updateShapesList(): void {
        const shapesList = document.getElementById('shape-list');
        if (!shapesList) return;

        if (this.createdShapes.length === 0) {
            shapesList.innerHTML = '<div style="text-align: center; color: #888; font-size: 11px; padding: 10px;">No shapes created yet</div>';
            return;
        }

        shapesList.innerHTML = this.createdShapes.map(shape => `
            <div class="shape-item" data-shape-id="${shape.id}">
                <span><strong>${shape.id}</strong> - ${shape.type}</span>
                <button onclick="window.cadApp.deleteShape('${shape.id}')">×</button>
            </div>
        `).join('');
    }

    private updateShapeSelectors(): void {
        const targetSelect = document.getElementById('target-shape') as HTMLSelectElement;
        const toolSelect = document.getElementById('tool-shape') as HTMLSelectElement;
        
        if (!targetSelect || !toolSelect) return;

        const options = this.createdShapes.map(shape => 
            `<option value="${shape.id}">${shape.id} (${shape.type})</option>`
        ).join('');
        
        targetSelect.innerHTML = '<option value="">Select shape</option>' + options;
        toolSelect.innerHTML = '<option value="">Select shape</option>' + options;
    }

    public deleteShape(shapeId: string): void {
        // Remove from shapes list
        this.createdShapes = this.createdShapes.filter(shape => shape.id !== shapeId);
        
        // Remove from viewport
        this.renderer.removeGeometry(shapeId);
        
        // Update UI
        this.updateShapesList();
        this.updateShapeSelectors();
        
        this.updateStatus(`Deleted shape: ${shapeId}`, 'info');
    }

    private clearAllShapes(): void {
        // Clear all shapes from viewport
        this.createdShapes.forEach(shape => {
            this.renderer.removeGeometry(shape.id);
        });
        
        // Clear shapes list
        this.createdShapes = [];
        
        // Update UI
        this.updateShapesList();
        this.updateShapeSelectors();
        
        this.updateStatus('Cleared all shapes', 'info');
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
            // Create fallback geometry for demo
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
        
        // Store reference for cleanup and UI callbacks
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