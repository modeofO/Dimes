import { CADRenderer } from './renderer/cad-renderer';
import { CADClient } from './api/cad-client';
import { MeshData } from '../../shared/types/geometry';
import { UIManager } from './ui/ui-manager';

console.log('CAD Engine starting...');

interface CreatedShape {
    id: string;
    type: string;
    dimensions: Record<string, number>;
    visible: boolean;
}

interface CreatedPlane {
    plane_id: string;
    plane_type: string;
    origin: [number, number, number];
}

interface SketchElementInfo {
    id: string;
    type: string;
}

interface CreatedSketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElementInfo[];
}

class CADApplication {
    private renderer!: CADRenderer;
    private client!: CADClient;
    private uiManager!: UIManager;
    private sessionId: string;
    private statusElement: HTMLElement | null;
    private createdShapes: CreatedShape[] = [];
    private createdPlanes: CreatedPlane[] = [];
    private createdSketches: CreatedSketch[] = [];

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
            
            // Initialize UI Manager
            this.updateStatus('Initializing UI...', 'info');
            this.uiManager = new UIManager('scene-tree');
            
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
        
        // Clear any existing geometry (including fallback cubes)
        this.renderer.clearAllGeometry();
        
        console.log('✅ Three.js renderer initialized');
    }

    private async initializeClient(): Promise<void> {
        // Connect to Node.js API server running on port 3000
        this.client = new CADClient('http://localhost:3000', this.sessionId);
        
        // Set up geometry update callback
        this.client.onGeometryUpdate((meshData: MeshData) => {
            console.log('Received geometry update:', meshData);
            this.renderer.updateGeometry('current-model', meshData);
        });
        
        // Set up visualization callbacks
        this.client.onPlaneVisualization((data) => {
            console.log('Received plane visualization:', data);
            this.renderer.addPlaneVisualization(data);
            this.uiManager.addPlane(data.plane_id, data.plane_type);
        });
        
        this.client.onSketchVisualization((data) => {
            console.log('Received sketch visualization:', data);
            this.renderer.addSketchVisualization(data);
            this.uiManager.addSketch(data.sketch_id, data.plane_id);
        });
        
        this.client.onElementVisualization((data) => {
            console.log('Received element visualization:', data);
            this.renderer.addSketchElementVisualization(data);
            this.uiManager.addSketchElement(data.element_id, data.sketch_id, data.element_type);
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
        // ==================== SKETCH-BASED WORKFLOW HANDLERS ====================
        
        // Create plane button handler
        const createPlaneBtn = document.getElementById('create-plane') as HTMLButtonElement;
        if (createPlaneBtn) {
            createPlaneBtn.addEventListener('click', () => {
                this.createSketchPlane();
            });
        }

        // Create sketch button handler
        const createSketchBtn = document.getElementById('create-sketch') as HTMLButtonElement;
        if (createSketchBtn) {
            createSketchBtn.addEventListener('click', () => {
                this.createSketch();
            });
        }

        // Element type dropdown handler
        const elementType = document.getElementById('element-type') as HTMLSelectElement;
        if (elementType) {
            elementType.addEventListener('change', () => {
                this.updateElementParams(elementType.value);
            });
        }

        // Add element button handler
        const addElementBtn = document.getElementById('add-element') as HTMLButtonElement;
        if (addElementBtn) {
            addElementBtn.addEventListener('click', () => {
                this.addSketchElement();
            });
        }

        // Extrude sketch button handler
        const extrudeBtn = document.getElementById('extrude-sketch') as HTMLButtonElement;
        if (extrudeBtn) {
            extrudeBtn.addEventListener('click', () => {
                this.extrudeSketch();
            });
        }

        // Dropdown change handlers to enable/disable buttons
        const sketchPlaneSelect = document.getElementById('sketch-plane-select') as HTMLSelectElement;
        if (sketchPlaneSelect) {
            sketchPlaneSelect.addEventListener('change', () => {
                const createSketchBtn = document.getElementById('create-sketch') as HTMLButtonElement;
                if (createSketchBtn) {
                    createSketchBtn.disabled = !sketchPlaneSelect.value;
                }
            });
        }

        const sketchSelect = document.getElementById('sketch-select') as HTMLSelectElement;
        if (sketchSelect) {
            sketchSelect.addEventListener('change', () => {
                console.log('🎯 Sketch selection changed:', {
                    selectedValue: sketchSelect.value,
                    selectedIndex: sketchSelect.selectedIndex,
                    availableSketches: this.createdSketches.map(s => s.sketch_id)
                });
                
                const addElementBtn = document.getElementById('add-element') as HTMLButtonElement;
                if (addElementBtn) {
                    const wasDisabled = addElementBtn.disabled;
                    addElementBtn.disabled = !sketchSelect.value;
                    console.log('🔘 Add Element button:', { wasDisabled, nowDisabled: addElementBtn.disabled, sketchValue: sketchSelect.value });
                }
                // Removed this.updateExtrudeSketchSelect() - copying extrude section's simpler approach
            });
        }

        const extrudeSketchSelect = document.getElementById('extrude-sketch-select') as HTMLSelectElement;
        if (extrudeSketchSelect) {
            extrudeSketchSelect.addEventListener('change', () => {
                const extrudeBtn = document.getElementById('extrude-sketch') as HTMLButtonElement;
                if (extrudeBtn) {
                    extrudeBtn.disabled = !extrudeSketchSelect.value;
                }
            });
        }

        // Clear all button handler
        const clearBtn = document.getElementById('clear-all') as HTMLButtonElement;
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllShapes();
            });
        }

        // Test sketches button handler (temporary for debugging)
        const testSketchesBtn = document.getElementById('create-test-sketches') as HTMLButtonElement;
        if (testSketchesBtn) {
            testSketchesBtn.addEventListener('click', () => {
                this.createTestSketches();
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

        // Daydreams AI instruction handler
        const sendAiBtn = document.getElementById('send-ai-instruction') as HTMLButtonElement;
        if (sendAiBtn) {
            sendAiBtn.addEventListener('click', () => {
                this.sendAiInstruction();
            });
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

            // Debug: Log what we're sending
            const requestData = {
                type: 'primitive' as const,
                primitive_type: primitiveType as any,
                dimensions: dimensions,
                position: position
            };
            console.log('🔧 Sending createModel request:', JSON.stringify(requestData, null, 2));

            // Create the primitive via server
            const response = await this.client.createModel(requestData);

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
        
        // Clear all visualizations (planes, sketches, elements)
        this.renderer.clearAllGeometry();
        this.uiManager.clear();
        
        // Clear internal data structures
        this.createdPlanes = [];
        this.createdSketches = [];
        
        // Update UI
        this.updateShapesList();
        this.updateShapeSelectors();
        this.updatePlaneSelectors();
        this.updateSketchSelectors();
        
        this.updateStatus('Cleared all shapes and visualizations', 'info');
    }

    private async testServerConnection(): Promise<void> {
        try {
            // Test server connection without creating visible geometry
            console.log('Testing server connection...');
            
            // Just check the health endpoint instead of creating geometry
            const healthResponse = await fetch('http://localhost:3000/api/v1/health');
            
            if (healthResponse.ok) {
                console.log('✅ Server connection successful');
            } else {
                throw new Error(`Server health check failed: ${healthResponse.status}`);
            }
            
        } catch (error) {
            console.warn('⚠️  Server connection test failed:', error);
            this.updateStatus('Server offline - running in demo mode', 'warning');
            // Don't create fallback geometry - keep viewport clean
        }
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

    private async sendAiInstruction(): Promise<void> {
        const instructionInput = document.getElementById('ai-instruction') as HTMLInputElement;
        const instruction = instructionInput.value;

        if (!instruction.trim()) {
            this.updateStatus('❌ Please enter an instruction', 'error');
            return;
        }

        try {
            this.updateStatus(`AI instruction feature not implemented yet`, 'warning');
            // TODO: Implement sendInstruction method in CADClient
            console.log('AI instruction received:', instruction);
        } catch (error) {
            console.error('Failed to send AI instruction:', error);
            this.updateStatus(`❌ AI instruction error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    // ==================== SKETCH-BASED MODELING METHODS ====================

    private async createSketchPlane(): Promise<void> {
        try {
            const planeType = (document.getElementById('plane-type') as HTMLSelectElement).value as any;
            const originX = parseFloat((document.getElementById('plane-origin-x') as HTMLInputElement).value);
            const originY = parseFloat((document.getElementById('plane-origin-y') as HTMLInputElement).value);
            const originZ = parseFloat((document.getElementById('plane-origin-z') as HTMLInputElement).value);
            
            const origin: [number, number, number] = [originX, originY, originZ];
            
            this.updateStatus(`Creating ${planeType} plane...`, 'info');
            this.updateLocalStatus('plane-status', 'Creating plane...', 'info');
            
            const response = await this.client.createSketchPlane(planeType, origin);
            
            if (response.success && response.data) {
                console.log('🔍 Processing plane response data:', JSON.stringify(response.data, null, 2));
                
                const plane: CreatedPlane = {
                    plane_id: response.data.plane_id,
                    plane_type: response.data.plane_type,
                    origin: [response.data.origin_x || 0, response.data.origin_y || 0, response.data.origin_z || 0]
                };
                
                console.log('✨ Created plane object:', JSON.stringify(plane, null, 2));
                
                this.createdPlanes.push(plane);
                
                this.updatePlaneSelectors();
                this.updateStatus(`✅ Created plane: ${plane.plane_id}`, 'success');
                this.updateLocalStatus('plane-status', `✅ Created: ${plane.plane_id}`, 'success');
            } else {
                this.updateStatus(`❌ Failed to create plane`, 'error');
                this.updateLocalStatus('plane-status', '❌ Failed to create plane', 'error');
            }
            
        } catch (error) {
            console.error('Failed to create sketch plane:', error);
            this.updateStatus(`❌ Error creating plane: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            this.updateLocalStatus('plane-status', '❌ Error creating plane', 'error');
        }
    }

    private async createSketch(): Promise<void> {
        try {
            const planeId = (document.getElementById('sketch-plane-select') as HTMLSelectElement).value;
            
            if (!planeId) {
                this.updateLocalStatus('sketch-status', '❌ Please select a plane', 'error');
                return;
            }
            
            this.updateStatus(`Creating sketch on plane ${planeId}...`, 'info');
            this.updateLocalStatus('sketch-status', 'Creating sketch...', 'info');
            
            const response = await this.client.createSketch(planeId);
            
            if (response.success && response.data) {
                console.log('🔍 Processing sketch response data:', JSON.stringify(response.data, null, 2));
                
                const sketch: CreatedSketch = {
                    sketch_id: response.data.sketch_id,
                    plane_id: response.data.plane_id,
                    elements: []
                };
                
                console.log('✨ Created sketch object:', JSON.stringify(sketch, null, 2));
                
                this.createdSketches.push(sketch);
                
                console.log('✅ Created sketch successfully:', {
                    sketchId: sketch.sketch_id,
                    totalSketches: this.createdSketches.length,
                    allSketches: this.createdSketches.map(s => s.sketch_id)
                });
                
                this.updateSketchSelectors();
                this.updateStatus(`✅ Created sketch: ${sketch.sketch_id}`, 'success');
                this.updateLocalStatus('sketch-status', `✅ Created: ${sketch.sketch_id}`, 'success');
            } else {
                this.updateStatus(`❌ Failed to create sketch`, 'error');
                this.updateLocalStatus('sketch-status', '❌ Failed to create sketch', 'error');
            }
            
        } catch (error) {
            console.error('Failed to create sketch:', error);
            this.updateStatus(`❌ Error creating sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            this.updateLocalStatus('sketch-status', '❌ Error creating sketch', 'error');
        }
    }

    private updateElementParams(type: string): void {
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

    private async addSketchElement(): Promise<void> {
        try {
            const sketchSelectElement = document.getElementById('sketch-select') as HTMLSelectElement;
            const sketchId = sketchSelectElement.value;
            const elementType = (document.getElementById('element-type') as HTMLSelectElement).value;
            
            console.log('🔧 Adding sketch element:', {
                sketchId,
                elementType,
                sketchSelectElement: sketchSelectElement,
                selectedIndex: sketchSelectElement.selectedIndex,
                selectedOption: sketchSelectElement.options[sketchSelectElement.selectedIndex]?.text
            });
            
            if (!sketchId) {
                console.log('❌ No sketch selected - showing error');
                this.updateLocalStatus('element-status', '❌ Please select a sketch', 'error');
                return;
            }
            
            this.updateLocalStatus('element-status', `Adding ${elementType}...`, 'info');
            
            let response;
            
            if (elementType === 'line') {
                const x1 = parseFloat((document.getElementById('line-x1') as HTMLInputElement).value);
                const y1 = parseFloat((document.getElementById('line-y1') as HTMLInputElement).value);
                const x2 = parseFloat((document.getElementById('line-x2') as HTMLInputElement).value);
                const y2 = parseFloat((document.getElementById('line-y2') as HTMLInputElement).value);
                
                response = await this.client.addLineToSketch(sketchId, x1, y1, x2, y2);
                
            } else if (elementType === 'circle') {
                const centerX = parseFloat((document.getElementById('circle-x') as HTMLInputElement).value);
                const centerY = parseFloat((document.getElementById('circle-y') as HTMLInputElement).value);
                const radius = parseFloat((document.getElementById('circle-radius') as HTMLInputElement).value);
                
                response = await this.client.addCircleToSketch(sketchId, centerX, centerY, radius);
            } else {
                this.updateLocalStatus('element-status', '❌ Unknown element type', 'error');
                return;
            }
            
            if (response.success && response.data) {
                // Update element count
                const sketch = this.createdSketches.find(s => s.sketch_id === sketchId);
                if (sketch) {
                    sketch.elements.push({ id: response.data.element_id, type: elementType });
                }
                
                this.updateStatus(`✅ Added ${elementType} to sketch`, 'success');
                this.updateLocalStatus('element-status', `✅ Added ${elementType}`, 'success');
            } else {
                this.updateStatus(`❌ Failed to add ${elementType}`, 'error');
                this.updateLocalStatus('element-status', `❌ Failed to add ${elementType}`, 'error');
            }
            
        } catch (error) {
            console.error('Failed to add sketch element:', error);
            this.updateStatus(`❌ Error adding element: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            this.updateLocalStatus('element-status', '❌ Error adding element', 'error');
        }
    }

    private async extrudeSketch(): Promise<void> {
        try {
            const sketchId = (document.getElementById('extrude-sketch-select') as HTMLSelectElement).value;
            const distance = parseFloat((document.getElementById('extrude-distance') as HTMLInputElement).value);
            
            if (!sketchId) {
                this.updateLocalStatus('extrude-status', '❌ Please select a sketch', 'error');
                return;
            }
            
            this.updateStatus(`Extruding sketch ${sketchId}...`, 'info');
            this.updateLocalStatus('extrude-status', 'Extruding...', 'info');
            
            const response = await this.client.extrudeSketch(sketchId, distance);
            
            if (response.success && response.data) {
                // Add to shapes list
                const shape: CreatedShape = {
                    id: response.data.feature_id,
                    type: `Extruded Sketch (${sketchId})`,
                    dimensions: { distance: distance },
                    visible: true
                };
                this.createdShapes.push(shape);
                
                // Update geometry in viewport if mesh data is provided
                if (response.data.mesh_data) {
                    this.renderer.updateGeometry(shape.id, response.data.mesh_data);
                }
                
                // Add to tree view
                const sketch = this.createdSketches.find(s => s.sketch_id === sketchId);
                let featureType = 'Extrusion'; // Default
                if (sketch && sketch.elements.length === 1 && sketch.elements[0].type === 'circle') {
                    featureType = 'Cylinder';
                }
                this.uiManager.addExtrudedFeature(response.data.feature_id, sketchId, featureType);

                this.updateShapesList();
                this.updateShapeSelectors();
                this.updateStatus(`✅ Extruded sketch: ${response.data.feature_id}`, 'success');
                this.updateLocalStatus('extrude-status', `✅ Created: ${response.data.feature_id}`, 'success');
            } else {
                this.updateStatus(`❌ Failed to extrude sketch`, 'error');
                this.updateLocalStatus('extrude-status', '❌ Failed to extrude', 'error');
            }
            
        } catch (error) {
            console.error('Failed to extrude sketch:', error);
            this.updateStatus(`❌ Error extruding sketch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            this.updateLocalStatus('extrude-status', '❌ Error extruding', 'error');
        }
    }

    private updatePlaneSelectors(): void {
        const sketchPlaneSelect = document.getElementById('sketch-plane-select') as HTMLSelectElement;
        
        if (sketchPlaneSelect) {
            const options = this.createdPlanes.map(plane => 
                `<option value="${plane.plane_id}">${plane.plane_id} (${plane.plane_type})</option>`
            ).join('');
            
            sketchPlaneSelect.innerHTML = '<option value="">Select a plane</option>' + options;
        }
    }

    private updateSketchSelectors(): void {
        const sketchSelect = document.getElementById('sketch-select') as HTMLSelectElement;
        const extrudeSketchSelect = document.getElementById('extrude-sketch-select') as HTMLSelectElement;
        
        const options = this.createdSketches.map(sketch => 
            `<option value="${sketch.sketch_id}">${sketch.sketch_id} (${sketch.elements.length} elements)</option>`
        ).join('');
        
        console.log('🔄 Updating sketch selectors:', {
            sketchCount: this.createdSketches.length,
            sketches: this.createdSketches.map(s => s.sketch_id),
            generatedOptions: options
        });
        
        if (sketchSelect) {
            const newHTML = '<option value="">Select a sketch</option>' + options;
            sketchSelect.innerHTML = newHTML;
            console.log('📝 Updated sketch-select dropdown with:', newHTML);
        }
        
        if (extrudeSketchSelect) {
            extrudeSketchSelect.innerHTML = '<option value="">Select a sketch</option>' + options;
        }
    }

    // Removed updateExtrudeSketchSelect - it was causing circular updates
    // Now both dropdowns are updated directly by updateSketchSelectors()
    
    // Temporary method to create test sketches for UI debugging
    private createTestSketches(): void {
        console.log('🧪 Creating test sketches for UI debugging...');
        
        // Create test plane
        const testPlane: CreatedPlane = {
            plane_id: 'test_plane_1',
            plane_type: 'XY',
            origin: [0, 0, 0]
        };
        this.createdPlanes.push(testPlane);
        
        // Create test sketches
        const testSketch1: CreatedSketch = {
            sketch_id: 'test_sketch_1',
            plane_id: 'test_plane_1',
            elements: [{id: 'el1', type: 'circle'}, {id: 'el2', type: 'line'}]
        };
        
        const testSketch2: CreatedSketch = {
            sketch_id: 'test_sketch_2', 
            plane_id: 'test_plane_1',
            elements: [{id: 'el3', type: 'circle'}]
        };
        
        this.createdSketches.push(testSketch1, testSketch2);
        
        // Update UI
        this.updatePlaneSelectors();
        this.updateSketchSelectors();
        
        console.log('🧪 Test sketches created:', {
            planes: this.createdPlanes.length,
            sketches: this.createdSketches.length
        });
        
        this.updateStatus('🧪 Test sketches created for UI debugging', 'info');
    }

    private updateLocalStatus(elementId: string, message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.textContent = message;
        
        // Remove existing status classes
        element.classList.remove('success', 'error', 'info', 'warning');
        
        // Add new status class
        element.classList.add(type);
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