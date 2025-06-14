# Adding New Sketch Elements - Implementation Guide

This guide shows how to add a new sketch element (Arc) to the sketch-based CAD application, following the complete data flow from C++ OCCT engine to client visualization.

## Data Flow Overview
```
Client UI → TypeScript CADClient → Node.js API Server → C++ CAD Controller → OCCT Engine → Back to Client
```

## Current Sketch-Based Architecture

The application now uses professional CAD workflow:
1. **Create Sketch Plane** (XY/XZ/YZ)
2. **Create Sketch** on plane
3. **Add Elements** (lines, circles, arcs)
4. **Extrude Sketch** to 3D solid

## Example: Adding Arc Element to Sketches

### Step 1: Add C++ OCCT Arc Function

#### File: `server/src/geometry/occt_engine.cpp`
Add this method to the OCCTEngine class:

```cpp
bool OCCTEngine::addArcToSketch(const std::string& sketch_id, double start_x, double start_y, 
                                double end_x, double end_y, double center_x, double center_y) {
    std::cout << "🌙 Adding arc to sketch " << sketch_id 
              << ": start(" << start_x << "," << start_y << ") "
              << "end(" << end_x << "," << end_y << ") "  
              << "center(" << center_x << "," << center_y << ")" << std::endl;
    std::cout.flush();

    try {
        auto it = sketches_.find(sketch_id);
        if (it == sketches_.end()) {
            std::cout << "❌ Sketch not found: " << sketch_id << std::endl;
            return false;
        }

        Sketch& sketch = it->second;
        
        // Create 2D arc using OCCT
        gp_Pnt2d start_point(start_x, start_y);
        gp_Pnt2d end_point(end_x, end_y);
        gp_Pnt2d center_point(center_x, center_y);
        
        // Create arc from 3 points
        GC_MakeArcOfCircle2d arc_maker(start_point, center_point, end_point);
        if (!arc_maker.IsDone()) {
            std::cout << "❌ Failed to create 2D arc" << std::endl;
            return false;
        }
        
        Handle(Geom2d_TrimmedCurve) arc_curve = arc_maker.Value();
        
        // Convert 2D arc to 3D edge on sketch plane
        TopoDS_Edge arc_edge = sketch.createEdgeFromCurve2d(arc_curve);
        
        // Add to sketch elements
        SketchElement element;
        element.type = SketchElementType::ARC;
        element.geometry = arc_edge;
        element.parameters["start_x"] = start_x;
        element.parameters["start_y"] = start_y;
        element.parameters["end_x"] = end_x;
        element.parameters["end_y"] = end_y;
        element.parameters["center_x"] = center_x;
        element.parameters["center_y"] = center_y;
        
        sketch.addElement(element);
        
        std::cout << "✅ Arc added successfully to sketch " << sketch_id << std::endl;
        std::cout.flush();
        
        return true;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error adding arc: " << e.GetMessageString() << std::endl;
        return false;
    }
}
```

#### File: `server/include/geometry/occt_engine.h`
Add this declaration:

```cpp
bool addArcToSketch(const std::string& sketch_id, double start_x, double start_y,
                    double end_x, double end_y, double center_x, double center_y);
```

### Step 2: Update C++ API Controller

#### File: `server/src/api/cad_controller.cpp`
In the `handleAddSketchElement` function, add this case after the circle case:

```cpp
} else if (element_type == "arc") {
    // Extract arc parameters
    Json::Value params = request.get("parameters", Json::Value());
    double start_x = params.get("start_x", 0.0).asDouble();
    double start_y = params.get("start_y", 0.0).asDouble();
    double end_x = params.get("end_x", 1.0).asDouble();
    double end_y = params.get("end_y", 1.0).asDouble();
    double center_x = params.get("center_x", 0.5).asDouble();
    double center_y = params.get("center_y", 0.5).asDouble();
    
    std::cout << "🌙 Creating ARC: start(" << start_x << "," << start_y << ") "
              << "end(" << end_x << "," << end_y << ") center(" << center_x << "," << center_y << ")" << std::endl;
    std::cout.flush();
    
    success = engine->addArcToSketch(sketch_id, start_x, start_y, end_x, end_y, center_x, center_y);
    element_id = "arc_element";
```

### Step 3: Update TypeScript Types

#### File: `client/src/types/geometry.ts`
Update the SketchElementType:

```typescript
export type SketchElementType = 'line' | 'circle' | 'arc' | 'rectangle';
```

#### File: `client/src/types/api.ts`
Update the AddSketchElementRequest interface:

```typescript
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
        
        // For arcs  
        start_x?: number;
        start_y?: number;
        end_x?: number;
        end_y?: number;
        // center_x and center_y already defined above
    };
}
```

### Step 4: Update Client UI

#### File: `client/index.html`
Add arc option to the element select:

```html
<select id="element-type">
    <option value="line">Line</option>
    <option value="circle">Circle</option>
    <option value="arc">Arc</option>
</select>
```

Add arc parameters section:

```html
<!-- Arc Parameters -->
<div id="arc-params" class="param-group" style="display: none;">
    <div class="control-row">
        <label>Start X:</label>
        <input type="number" id="arc-start-x" value="0" step="0.1">
    </div>
    <div class="control-row">
        <label>Start Y:</label>
        <input type="number" id="arc-start-y" value="0" step="0.1">
    </div>
    <div class="control-row">
        <label>End X:</label>
        <input type="number" id="arc-end-x" value="2" step="0.1">
    </div>
    <div class="control-row">
        <label>End Y:</label>
        <input type="number" id="arc-end-y" value="1" step="0.1">
    </div>
    <div class="control-row">
        <label>Center X:</label>
        <input type="number" id="arc-center-x" value="1" step="0.1">
    </div>
    <div class="control-row">
        <label>Center Y:</label>
        <input type="number" id="arc-center-y" value="0.5" step="0.1">
    </div>
</div>
```

### Step 5: Update Client JavaScript Logic

#### File: `client/src/main.ts`
In the `addSketchElement` function, add arc case:

```typescript
} else if (elementType === 'arc') {
    const startX = parseFloat((document.getElementById('arc-start-x') as HTMLInputElement).value);
    const startY = parseFloat((document.getElementById('arc-start-y') as HTMLInputElement).value);
    const endX = parseFloat((document.getElementById('arc-end-x') as HTMLInputElement).value);
    const endY = parseFloat((document.getElementById('arc-end-y') as HTMLInputElement).value);
    const centerX = parseFloat((document.getElementById('arc-center-x') as HTMLInputElement).value);
    const centerY = parseFloat((document.getElementById('arc-center-y') as HTMLInputElement).value);
    
    response = await this.client.addArcToSketch(sketchId, startX, startY, endX, endY, centerX, centerY);
```

#### File: `client/src/api/cad-client.ts`
Add the new method:

```typescript
async addArcToSketch(sketchId: string, startX: number, startY: number, 
                     endX: number, endY: number, centerX: number, centerY: number): Promise<CADResponse> {
    console.log('🌙 Adding arc to sketch:', {
        sketch_id: sketchId,
        element_type: 'arc', 
        parameters: { start_x: startX, start_y: startY, end_x: endX, end_y: endY, center_x: centerX, center_y: centerY }
    });

    const response = await this.makeRequest('/api/v1/cad/sketch-elements', {
        method: 'POST',
        body: JSON.stringify({
            sketch_id: sketchId,
            element_type: 'arc',
            parameters: {
                start_x: startX,
                start_y: startY,
                end_x: endX, 
                end_y: endY,
                center_x: centerX,
                center_y: centerY
            }
        })
    });

    console.log('📨 Received addArcToSketch response:', response);
    return response;
}
```

### Step 6: Update Node.js API Server Validation

#### File: `api-server/src/routes/cad.js`
Update the validation to include arc element type:

```javascript
body('element_type').optional().isIn(['line', 'circle', 'arc']).withMessage('Invalid element type'),
```

## Testing the New Arc Element

### 1. Build and Test C++ Server
```bash
cd server/build
cmake --build . --config Release
./Release/cad-server.exe  # Windows
```

### 2. Test Arc Creation Workflow
```bash
# 1. Create sketch plane
curl -X POST http://localhost:8080/api/v1/sketch-planes \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{"plane_type": "XY", "origin_x": 0, "origin_y": 0, "origin_z": 0}'

# 2. Create sketch  
curl -X POST http://localhost:8080/api/v1/sketches \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{"plane_id": "XY_Plane"}'

# 3. Add arc element
curl -X POST http://localhost:8080/api/v1/sketch-elements \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{
    "sketch_id": "Sketch_123",
    "element_type": "arc",
    "parameters": {
      "start_x": 0, "start_y": 0,
      "end_x": 2, "end_y": 1, 
      "center_x": 1, "center_y": 0.5
    }
  }'

# 4. Extrude sketch
curl -X POST http://localhost:8080/api/v1/extrude \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{"sketch_id": "Sketch_123", "distance": 5}'
```

### 3. Test Client Integration
```bash
cd client
npm run dev
# Open http://localhost:5173
# 1. Create XY plane
# 2. Create sketch on plane  
# 3. Select 'Arc' from element dropdown
# 4. Set arc parameters
# 5. Click 'Add Element'
# 6. Click 'Extrude Sketch'
# 7. Verify extruded arc appears in 3D viewport
```

## Expected Results

### C++ Console Output:
```
🎯 Creating sketch plane: XY at (0,0,0)
✅ Created sketch plane: XY_Plane
📐 Creating sketch on plane: XY_Plane
✅ Created sketch: Sketch_1749912478
🌙 Adding arc to sketch Sketch_1749912478: start(0,0) end(2,1) center(1,0.5)
✅ Arc added successfully to sketch Sketch_1749912478
🚀 Extruding sketch Sketch_1749912478 by distance 5
✅ Extrude feature Extrude_1749912500 executed successfully
🔍 Tessellating shape: Extrude_1749912500
📊 Tessellation result: 124 vertices, 68 faces
```

### API Response:
```json
{
  "success": true,
  "session_id": "test-session",
  "data": {
    "feature_id": "Extrude_1749912500",
    "sketch_id": "Sketch_1749912478",
    "distance": 5,
    "mesh_data": {
      "vertices": [...],
      "faces": [...],
      "metadata": {
        "vertex_count": 124,
        "face_count": 68,
        "tessellation_quality": 0.1
      }
    }
  }
}
```

### Client Status:
```
✅ Created plane: XY_Plane
✅ Created sketch: Sketch_1749912478  
✅ Added arc to sketch
✅ Extruded sketch: Extrude_1749912500
```

## Key Differences from Legacy System

### Old Primitive System:
- ❌ Created basic shapes directly
- ❌ Limited parametric control
- ❌ No professional workflow

### New Sketch-Based System:
- ✅ Professional CAD workflow (Sketch → Extrude)
- ✅ Parametric 2D elements in 3D space
- ✅ Feature-based modeling
- ✅ Industry-standard process
- ✅ Complex 3D shapes from 2D sketches

## Debugging Checklist

- [ ] C++ console shows arc creation messages
- [ ] JSON parsing succeeds (no array parsing errors)  
- [ ] API server logs show successful requests
- [ ] Browser Network tab shows 200 OK responses
- [ ] Client console shows mesh data updates
- [ ] 3D viewport renders the extruded arc shape
- [ ] Status bar shows success messages
- [ ] Element count updates in sketch dropdown

## Advanced Extensions

Once arc elements work, you can extend the system:

1. **Rectangle Elements**: 4-sided closed sketch elements
2. **Spline Elements**: Curved paths with control points  
3. **Constraints**: Dimensional and geometric constraints
4. **Sketch Patterns**: Linear and circular patterns
5. **Multi-contour Sketches**: Islands and holes
6. **Advanced Extrudes**: Draft angles, tapers, helical extrudes

The sketch-based architecture provides a solid foundation for professional CAD modeling capabilities. 