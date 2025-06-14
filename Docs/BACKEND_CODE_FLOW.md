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
│   ├── POST /api/v1/models → handleCreateModel()
│   ├── POST /api/v1/operations → handleBooleanOperation()
│   ├── POST /api/v1/tessellate → handleTessellate()
│   ├── GET /api/v1/health → health check
│   └── GET /api/v1/sessions/{id}/export/{format} → handleExport()
└── Ready to accept HTTP requests
```

**File:** `server/src/api/cad_controller.cpp`
- Sets up HTTP routes using cpp-httplib
- Configures CORS for browser access
- Maps HTTP endpoints to handler functions

### 3. **HTTP Request Processing Flow**

When a client sends a request (e.g., create a cylinder):

```
HTTP POST /api/v1/models
├── CADController::handleCreateModel()
│   ├── Parse JSON request body
│   ├── Extract session_id from headers
│   ├── Get/Create session via SessionManager
│   ├── Route to appropriate OCCT operation
│   │   ├── primitive_type == "cylinder" 
│   │   └── Call engine->createCylinder()
│   ├── Generate mesh via engine->tessellate()
│   ├── Build JSON response with mesh data
│   └── Return HTTP response
└── Send response back to client
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
├── createBox(BoxParameters) → shape_id
├── createCylinder(radius, height, position) → shape_id
├── createSphere(radius, position) → shape_id
├── unionShapes(shape1, shape2, result) → bool
├── cutShapes(shape1, shape2, result) → bool
├── tessellate(shape_id, quality) → MeshData
└── exportSTEP/STL(shape_id, filename) → bool
```

**File:** `server/src/geometry/occt_engine.cpp`
- Wraps OpenCASCADE Technology (OCCT) operations
- Stores shapes in memory with generated IDs
- Provides tessellation for 3D visualization
- Handles CAD operations (create, boolean, export)

## 🔄 Request Processing Example

**Creating a Cylinder:**

```
1. Client sends POST /api/v1/models
   {
     "type": "primitive",
     "primitive_type": "cylinder", 
     "dimensions": {"radius": 5, "height": 10},
     "position": [0, 0, 0]
   }

2. CADController::handleCreateModel()
   ├── Parse JSON → extract cylinder parameters
   ├── Get session "session_123" 
   ├── SessionManager returns OCCTEngine instance
   └── Call engine->createCylinder(5, 10, [0,0,0])

3. OCCTEngine::createCylinder()
   ├── Create OCCT cylinder shape
   ├── Validate shape geometry
   ├── Generate unique shape_id: "shape_4567"
   ├── Store in shapes_ map
   └── Return shape_id

4. Back in handleCreateModel()
   ├── Call engine->tessellate("shape_4567", 0.1)
   ├── Generate triangle mesh for visualization
   ├── Build JSON response with mesh data
   └── Return HTTP 200 with mesh data

5. Client receives response
   ├── Extract mesh_data (vertices, faces)
   ├── Create Three.js geometry
   └── Render cylinder in 3D viewport
```

## 📊 Data Structures

### **MeshData Structure**
```cpp
struct MeshData {
    std::vector<float> vertices;     // [x1,y1,z1, x2,y2,z2, ...]
    std::vector<int> faces;          // [v1,v2,v3, v4,v5,v6, ...]
    MeshMetadata metadata;           // vertex_count, face_count, quality
};
```

### **Shape Storage**
```cpp
class OCCTEngine {
    std::map<std::string, TopoDS_Shape> shapes_;  // shape_id → OCCT shape
    std::map<std::string, double> parameters_;    // parameter storage
};
```

## 🛠️ Key Design Patterns

### **Singleton Pattern**
- `SessionManager` ensures single instance
- Manages global session state

### **Factory Pattern**
- `OCCTEngine` creates different primitive types
- Centralized shape creation logic

### **Strategy Pattern**
- Different tessellation qualities
- Multiple export formats (STEP, STL)

### **Session Pattern**
- Each user gets isolated geometry workspace
- Prevents interference between users

## 🔍 Error Handling Flow

```
Any Exception in Request Processing
├── Caught in HTTP handler
├── Log error details
├── Create JSON error response
├── Set HTTP 500 status
└── Return error to client
```

## 🚀 Performance Considerations

- **Session Isolation**: Each user has separate OCCT engine
- **Memory Management**: RAII patterns for OCCT objects  
- **Tessellation Caching**: Mesh data cached per shape
- **Lazy Loading**: Sessions created only when needed

This architecture provides a clean separation between HTTP handling, session management, and geometry operations, making the backend maintainable and scalable. 