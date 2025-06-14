# C++ Backend Code Flow Documentation

This document traces the execution flow of the C++ CAD Engine backend, starting from the main entry point.

## 🚀 Application Startup Flow

### 1. **Entry Point: `main.cpp`**
```
main() 
├── Initialize SessionManager singleton
├── Create CADController(8080) 
├── Start HTTP server (blocks)
└── Handle exceptions
```

**File:** `server/src/main.cpp`
- Initializes the `SessionManager` singleton
- Creates a `CADController` instance on port 8080
- Calls `server.start()` which blocks the main thread
- Handles any startup exceptions

### 2. **HTTP Server Setup: `CADController`**
```
CADController::CADController(8080)
├── Create httplib::Server instance
├── setupRoutes()
│   ├── Enable CORS headers
│   ├── Setup OPTIONS handler
│   ├── POST /api/v1/cad/models → handleCreateModel()
│   ├── POST /api/v1/cad/sketch-planes → handleCreateSketchPlane()
│   ├── POST /api/v1/cad/sketches → handleCreateSketch()
│   ├── POST /api/v1/cad/sketch-elements → handleAddSketchElement()
│   ├── POST /api/v1/cad/extrude → handleExtrudeSketch()
│   ├── POST /api/v1/cad/operations → handleBooleanOperation()
│   ├── POST /api/v1/tessellate → handleTessellate()
│   ├── GET /api/v1/health → health check
│   └── GET /api/v1/sessions/{id}/export/{format} → handleExport()
└── Ready to accept HTTP requests
```

**File:** `server/src/api/cad_controller.cpp`
- Sets up HTTP routes using cpp-httplib
- Configures CORS for browser access
- Maps HTTP endpoints to handler functions
- **Primary focus: Sketch-based modeling workflow**

### 3. **Sketch-Based CAD Workflow**

The modern professional CAD workflow (SolidWorks-style):

```
Sketch-Based Modeling Flow:
1. Create Sketch Plane (XY/XZ/YZ)
2. Create Sketch on Plane
3. Add 2D Elements (lines, circles, arcs)
4. Extrude Sketch to 3D Solid
5. Boolean Operations (optional)
```

**Complete Request Flow Example:**

```
HTTP POST /api/v1/cad/sketch-planes
├── CADController::handleCreateSketchPlane()
│   ├── Parse JSON: {"plane_type": "XY", "origin_x": 0, "origin_y": 0, "origin_z": 0}
│   ├── Extract session_id from headers
│   ├── Get/Create session via SessionManager
│   ├── Call engine->createSketchPlane("XY", [0,0,0])
│   ├── Generate plane_id: "XY_Plane"
│   └── Return plane_id in JSON response

HTTP POST /api/v1/cad/sketches  
├── CADController::handleCreateSketch()
│   ├── Parse JSON: {"plane_id": "XY_Plane"}
│   ├── Call engine->createSketch("XY_Plane")
│   ├── Generate sketch_id: "Sketch_1749912478"
│   └── Return sketch_id in JSON response

HTTP POST /api/v1/cad/sketch-elements
├── CADController::handleAddSketchElement()
│   ├── Parse JSON: {"sketch_id": "Sketch_1749912478", "element_type": "circle", "parameters": {...}}
│   ├── Call engine->addCircleToSketch(sketch_id, x, y, radius)
│   ├── Add circle to 2D sketch geometry
│   └── Return element_id in JSON response

HTTP POST /api/v1/cad/extrude
├── CADController::handleExtrudeSketch()
│   ├── Parse JSON: {"sketch_id": "Sketch_1749912478", "distance": 10}
│   ├── Call engine->extrudeSketch(sketch_id, distance)
│   ├── Create 3D solid from 2D sketch
│   ├── Generate mesh via engine->tessellate()
│   ├── Build JSON response with mesh data
│   └── Return feature_id and mesh_data
```

## 🏗️ Core Components Architecture

### **SessionManager (Singleton)**
```
SessionManager::getInstance()
├── getOrCreateSession(session_id)
│   ├── Check if session exists
│   ├── Create new OCCTEngine if needed
│   └── Return OCCTEngine instance
└── Manage session lifecycle
```

**File:** `server/src/session/session_manager.cpp`
- Singleton pattern for managing user sessions
- Each session has its own `OCCTEngine` instance
- Handles session creation, retrieval, and cleanup

### **OCCTEngine (Geometry Engine)**
```
OCCTEngine instance per session
├── SKETCH-BASED MODELING:
│   ├── createSketchPlane(type, origin) → plane_id
│   ├── createSketch(plane_id) → sketch_id
│   ├── addLineToSketch(sketch_id, x1, y1, x2, y2) → bool
│   ├── addCircleToSketch(sketch_id, x, y, radius) → bool
│   └── extrudeSketch(sketch_id, distance, direction) → feature_id
├── PRIMITIVE MODELING (Legacy):
│   ├── createBox(dimensions, position) → shape_id
│   ├── createCylinder(radius, height, position) → shape_id
│   └── createSphere(radius, position) → shape_id
├── BOOLEAN OPERATIONS:
│   ├── unionShapes(shape1, shape2, result) → bool
│   ├── cutShapes(shape1, shape2, result) → bool
│   └── intersectShapes(shape1, shape2, result) → bool
├── VISUALIZATION:
│   └── tessellate(shape_id, quality) → MeshData
└── EXPORT:
    ├── exportSTEP(shape_id, filename) → bool
    └── exportSTL(shape_id, filename) → bool
```

**File:** `server/src/geometry/occt_engine.cpp`
- Wraps OpenCASCADE Technology (OCCT) operations
- Stores sketch planes, sketches, and 3D shapes with generated IDs
- Provides tessellation for 3D visualization
- **Focus: Professional sketch-based CAD modeling**

### **New Sketch System Classes**
```
SketchPlane Class
├── plane_type: XY | XZ | YZ
├── origin: Vector3d
├── coordinate_system: gp_Ax3
└── to2D/to3D coordinate conversion

Sketch Class  
├── plane_id: string
├── elements: vector<SketchElement>
├── createWire() → TopoDS_Wire
└── createFace() → TopoDS_Face

ExtrudeFeature Class
├── sketch_id: string
├── distance: double
├── direction: string
└── solid_shape: TopoDS_Solid
```

**Files:** `server/src/geometry/sketch_plane.cpp`, `sketch.cpp`, `extrude_feature.cpp`

## 🔄 Complete Workflow Example

**Creating an Extruded Circle (Professional CAD Workflow):**

```
1. Create Sketch Plane
   Client: POST /api/v1/cad/sketch-planes
   Body: {"plane_type": "XY", "origin_x": 0, "origin_y": 0, "origin_z": 0}
   
   Backend: 
   ├── Create gp_Ax3 coordinate system
   ├── Store as SketchPlane object
   └── Response: {"plane_id": "XY_Plane"}

2. Create Sketch  
   Client: POST /api/v1/cad/sketches
   Body: {"plane_id": "XY_Plane"}
   
   Backend:
   ├── Find SketchPlane by ID
   ├── Create empty Sketch object
   └── Response: {"sketch_id": "Sketch_1749912478"}

3. Add Circle to Sketch
   Client: POST /api/v1/cad/sketch-elements  
   Body: {"sketch_id": "Sketch_1749912478", "element_type": "circle", 
          "parameters": {"center_x": 0, "center_y": 0, "radius": 5}}
   
   Backend:
   ├── Create gp_Circ2d circle in 2D plane
   ├── Convert to TopoDS_Edge
   ├── Add to Sketch elements
   └── Response: {"element_id": "Circle_1"}

4. Extrude Sketch to 3D
   Client: POST /api/v1/cad/extrude
   Body: {"sketch_id": "Sketch_1749912478", "distance": 10}
   
   Backend:
   ├── Get Sketch object by ID
   ├── Create TopoDS_Face from sketch elements  
   ├── Use BRepPrimAPI_MakePrism for extrusion
   ├── Generate TopoDS_Solid cylinder
   ├── Tessellate for visualization
   └── Response: {"feature_id": "Extrude_1749912491", "mesh_data": {...}}

5. Client Visualization
   ├── Receive mesh_data (106 vertices, 100 faces)
   ├── Create Three.js BufferGeometry
   ├── Render 3D cylinder in viewport
   └── Display: Professional-quality extruded cylinder
```

## 📊 Updated Data Structures

### **MeshData Structure** (Unchanged)
```cpp
struct MeshData {
    std::vector<float> vertices;     // [x1,y1,z1, x2,y2,z2, ...]
    std::vector<int> faces;          // [v1,v2,v3, v4,v5,v6, ...]
    MeshMetadata metadata;           // vertex_count, face_count, quality
};
```

### **Enhanced Shape Storage**
```cpp
class OCCTEngine {
    // Legacy primitive storage
    std::map<std::string, TopoDS_Shape> shapes_;
    
    // Professional sketch-based storage  
    std::map<std::string, SketchPlane> sketch_planes_;
    std::map<std::string, Sketch> sketches_;
    std::map<std::string, ExtrudeFeature> extrude_features_;
    
    // Parameters and metadata
    std::map<std::string, double> parameters_;
};
```

### **JSON Response Formats**
```cpp
// Sketch Plane Response
{
  "success": true,
  "session_id": "session_87agh3hr4ea", 
  "data": {
    "plane_id": "XY_Plane",
    "plane_type": "XY",
    "origin_x": 0, "origin_y": 0, "origin_z": 0
  }
}

// Extrude Response (with mesh data)
{
  "success": true,
  "data": {
    "feature_id": "Extrude_1749912491",
    "sketch_id": "Sketch_1749912478", 
    "distance": 10,
    "mesh_data": {
      "vertices": [...],
      "faces": [...],
      "metadata": {"vertex_count": 106, "face_count": 100}
    }
  }
}
```

## 🛠️ Key Design Patterns

### **Singleton Pattern**
- `SessionManager` ensures single instance
- Manages global session state

### **Factory Pattern**  
- `OCCTEngine` creates different sketch elements and features
- Centralized geometry creation logic

### **Strategy Pattern**
- Different sketch element types (line, circle, arc)
- Multiple extrude directions and types
- Various tessellation qualities

### **Session Pattern**
- Each user gets isolated geometry workspace
- Prevents interference between users

### **Feature-Based Modeling Pattern**
- Parametric design workflow
- History tree of operations
- Modify-and-update capability

## 🔍 Error Handling Flow

```
Any Exception in Request Processing
├── JSON Parsing Errors (fixed array parsing issue)
├── OCCT Geometry Errors (invalid shapes)
├── Session Management Errors  
├── Caught in HTTP handler
├── Log error details with debug output
├── Create JSON error response
├── Set HTTP 500 status
└── Return error to client
```

## 🚀 Performance Considerations

- **Session Isolation**: Each user has separate OCCT engine
- **Memory Management**: RAII patterns for OCCT objects
- **Sketch Storage**: Efficient 2D→3D conversion
- **Tessellation Caching**: Mesh data cached per feature
- **Lazy Loading**: Sessions created only when needed
- **Professional Workflow**: Feature-based parametric modeling

## 🎯 Professional CAD Features

This architecture now provides:

- ✅ **SolidWorks-style workflow**: Sketch → Extrude → 3D Model
- ✅ **Parametric modeling**: Modify sketches, features update
- ✅ **Professional UI**: Step-by-step guided process
- ✅ **Real 3D geometry**: Not just primitives, but feature-based solids
- ✅ **Industry-standard workflow**: Plane → Sketch → Extrude → Boolean operations

The system successfully bridges web technology with professional CAD capabilities using OpenCASCADE Technology (OCCT), providing a foundation for advanced CAD applications. 