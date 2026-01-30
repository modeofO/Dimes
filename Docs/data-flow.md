# Dimes CAD - Data Flow Architecture

## System Overview

```
+------------------+     WebSocket      +------------------+      HTTP       +------------------+
|                  | -----------------> |                  | -------------> |                  |
|   Client (Next)  |    (real-time)     |  API Server (Node)|   (request)    | Python Backend   |
|   Three.js       | <----------------- |  Express          | <------------- | FastAPI + OCC    |
|   Port 3001      |    (viz updates)   |  Port 3000        |   (response)   | Port 8080        |
+------------------+                    +------------------+                +------------------+
```

Three layers communicate in a strict pipeline: the client never talks to the Python backend directly.

---

## Layer 1: Client (Next.js + Three.js)

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| CADApplication | `client/src/components/cad-application.tsx` | Orchestrator: state, callbacks, UI |
| CADClient | `client/src/lib/cad/api/cad-client.ts` | HTTP + WebSocket communication |
| CADRenderer | `client/src/lib/cad/renderer/cad-renderer.ts` | Three.js scene, raycasting, hover |
| VisualizationManager | `client/src/lib/cad/renderer/visualization-manager.ts` | 2D sketch elements to Three.js |
| MeshManager | `client/src/lib/cad/mesh/mesh-manager.ts` | 3D mesh geometry to Three.js |
| CADControls | `client/src/lib/cad/controls/cad-controls.ts` | Drawing tools, snap points, input |
| AgentManager | `client/src/lib/cad/agent/agent-manager.ts` | AI agent WebSocket |

### CADClient API Methods

All HTTP requests go through `makeRequest<T>()` which:
- Uses `fetch()` with `Content-Type: application/json`
- Injects `X-Session-ID` header on every request
- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`)

| Method | Endpoint | Request | Callback Triggered |
|--------|----------|---------|-------------------|
| `createSketchPlane()` | POST `/api/v1/cad/sketch-planes` | `{ plane_type, origin? }` | `planeVisualizationCallback` |
| `createSketch()` | POST `/api/v1/cad/sketches` | `{ plane_id }` | `sketchVisualizationCallback` |
| `addLineToSketch()` | POST `/api/v1/cad/sketch-elements` | `{ sketch_id, element_type: 'line', parameters: {start, end} }` | `elementVisualizationCallback` |
| `addCircleToSketch()` | POST `/api/v1/cad/sketch-elements` | `{ ..., element_type: 'circle', parameters: {center_x, center_y, radius} }` | `elementVisualizationCallback` |
| `addRectangleToSketch()` | POST `/api/v1/cad/sketch-elements` | `{ ..., element_type: 'rectangle', parameters: {corner, width, height} }` | `elementVisualizationCallback` (per child) |
| `addArcToSketch()` | POST `/api/v1/cad/sketch-elements` | `{ ..., element_type: 'arc', parameters: {arc_type, ...} }` | `elementVisualizationCallback` |
| `addPolygonToSketch()` | POST `/api/v1/cad/sketch-elements` | `{ ..., element_type: 'polygon', parameters: {center_x, center_y, sides, radius} }` | `elementVisualizationCallback` (per child) |
| `addFilletToSketch()` | POST `/api/v1/cad/fillets` | `{ sketch_id, line1_id, line2_id, radius }` | `elementVisualizationCallback` (fillet + updated elements) |
| `addChamferToSketch()` | POST `/api/v1/cad/chamfers` | `{ sketch_id, line1_id, line2_id, distance }` | `elementVisualizationCallback` |
| `extrudeFeature()` | POST `/api/v1/cad/extrude` | `{ sketch_id, distance, direction, element_id? }` | `geometryUpdateCallback` |
| `exportModel()` | GET `/api/v1/cad/sessions/:id/export/:format` | (path params) | Returns binary |

### Callback Registration

```
client.onGeometryUpdate(cb)       -> cb(meshData: MeshData)
client.onPlaneVisualization(cb)   -> cb(data: PlaneVisualizationData)
client.onSketchVisualization(cb)  -> cb(data: SketchVisualizationData)
client.onElementVisualization(cb) -> cb(data: SketchElementVisualizationData)
```

### Visualization Data Router

`CADClient.handleVisualizationData(data)` dispatches incoming WebSocket payloads:
- Has `element_id` -> `elementVisualizationCallback`
- Has `sketch_id` but no `element_id` -> `sketchVisualizationCallback`
- Has `plane_id` but no `sketch_id` -> `planeVisualizationCallback`

### Composite Shape Handling (Client Side)

When `addRectangleToSketch()` or `addPolygonToSketch()` returns, the response contains:
```json
{
  "element_id": "rectangle_1_2345",
  "is_composite": true,
  "child_elements": [
    {"element_id": "rectangle_1_2345_line_bottom", "visualization_data": {...}},
    {"element_id": "rectangle_1_2345_line_right", "visualization_data": {...}},
    ...
  ]
}
```
The client loops through `child_elements` and calls `elementVisualizationCallback` for each child individually. The parent container gets stored but not rendered.

### Coordinate Systems

| Space | Description | Usage |
|-------|-------------|-------|
| 2D Sketch | Origin at sketch plane origin, X along u_axis, Y along v_axis | Drawing input, backend parameters |
| 3D World | Right-hand rule, Y-up | Three.js scene, mesh rendering |

Conversion: `world = origin + u * u_axis + v * v_axis`

---

## Layer 2: API Server (Node.js Express)

### File: `api-server/src/routes/cad.js`

The API server is a passthrough layer that:
1. Validates incoming requests
2. Flattens nested JSON for the Python backend
3. Forwards to the Python backend via HTTP
4. Broadcasts results via WebSocket
5. Returns the HTTP response to the client

### Request Flow Pattern

Every route handler follows this pattern:
```
Client HTTP Request
  -> Session ID extraction (header/body/url)
  -> Request validation
  -> Parameter flattening
  -> cadBackendClient.method(sessionId, flattenedParams)
  -> WebSocket broadcast (if visualization/geometry data present)
  -> HTTP response to client
```

### Parameter Flattening

The API server flattens nested client JSON before sending to the Python backend:

```
Client sends:                    Backend receives:
{                                {
  "parameters": {                  "session_id": "...",
    "start": [0, 0],              "sketch_id": "...",
    "end": [5, 5]                 "element_type": "line",
  }                               "x1": 0, "y1": 0,
}                                 "x2": 5, "y2": 5
                                }
```

### WebSocket Broadcasting

File: `api-server/src/services/websocketManager.js`

- Path: `/ws`
- Heartbeat: 30s interval
- Session tracking: `clients` Map (sessionId -> WebSocket)

Message types sent to client:

| Type | Payload Key | When |
|------|-------------|------|
| `visualization_data` | `payload` | Plane/sketch/element created |
| `geometry_update` | `payload` or `data` | Mesh data from extrude/boolean |
| `sketch_plane_created` | standard | Plane created |
| `sketch_created` | standard | Sketch created |
| `sketch_element_added` | standard | Element added |
| `sketch_extruded` | standard | Extrude completed |
| `operation_complete` | standard | Boolean op completed |
| `connection_established` | standard | Initial connection |

### Backend Client

File: `api-server/src/services/cadBackendClient.js`

Despite the filename, this connects to the **Python** backend (legacy naming).

- Base URL: `http://{CAD_BACKEND_HOST}:{CAD_BACKEND_PORT}` (default `localhost:8080`)
- Timeout: 30s
- Retry: 3 attempts with 1s delay
- HTTP keep-alive enabled
- All requests include `X-Session-ID` header

### Session Management

File: `api-server/src/middleware/sessionValidator.js`

Session ID extraction priority:
1. `X-Session-ID` header
2. `sessionId` body field
3. `session_id` body field
4. `:sessionId` URL parameter
5. Auto-generated: `session_{uuid}`

---

## Layer 3: Python Backend (FastAPI + pythonOCC)

### File: `serverpy/app/src/api_server.py`

All endpoints accept flattened parameters from the API server.

### Core Classes

| Class | File | Purpose |
|-------|------|---------|
| `OCCTEngine` | `geometry_engine.py` | Main geometry engine, manages shapes/sketches/planes |
| `Sketch` | `geometry_engine.py` | 2D sketch with elements |
| `SketchPlane` | `geometry_engine.py` | Plane definition (origin + coordinate system) |
| `SketchElement` | `geometry_engine.py` | Individual sketch element (line, circle, etc.) |
| `SessionManager` | `session_manager.py` | Singleton, maps session_id to OCCTEngine instance |

### Element ID Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Plane | `plane_{counter}` | `plane_1` |
| Sketch | `sketch_{counter}` | `sketch_1` |
| Element | `{type}_{count}_{timestamp_mod_10000}` | `line_2_5634` |
| Child element | `{parent_id}_line_{edge}` | `rectangle_1_2345_line_bottom` |
| Polygon child | `{parent_id}_line_{index}` | `polygon_3_7891_line_0` |

### Composite Element Structure

Rectangles and polygons are decomposed into constituent lines:

```
rectangle_1_2345                  (parent)
  is_composite_parent: True
  is_container_only: True         (don't render, metadata only)
  child_ids: [
    rectangle_1_2345_line_bottom,
    rectangle_1_2345_line_right,
    rectangle_1_2345_line_top,
    rectangle_1_2345_line_left
  ]

rectangle_1_2345_line_bottom      (child)
  parent_id: rectangle_1_2345
  element_type: LINE
```

### Visualization Data Generation

`get_sketch_element_visualization_data()` converts 2D sketch elements to 3D world coordinates:

```
For each element:
  1. Get 2D points from SketchElement
  2. Convert to 3D using plane coordinate system:
     world = origin + u * x_dir + v * y_dir
  3. Return flat array: [x1,y1,z1, x2,y2,z2, ...]
```

Element-specific handling:
- **LINE**: 2 endpoints
- **CIRCLE**: 16-segment approximation + center point
- **ARC**: 16-segment approximation with angle interpolation
- **RECTANGLE**: 4 corner points (closed loop, 5 points)
- **POLYGON**: N vertices + closing vertex

### Mesh Data (Tessellation)

`tessellate()` converts OCCT shapes to triangle meshes:

```python
BRepMesh_IncrementalMesh(shape, deflection)  # Tessellate
for face in shape.faces():
    triangulation = BRep_Tool.Triangulation(face)
    for triangle in triangulation:
        add vertices, normals, face indices
```

Output format:
```json
{
  "vertices": [x1,y1,z1, x2,y2,z2, ...],  // flat float array
  "faces": [v0,v1,v2, v3,v4,v5, ...],      // triangle indices
  "normals": [nx1,ny1,nz1, ...],            // per-vertex normals
  "metadata": {
    "vertex_count": 24,
    "face_count": 8,
    "tessellation_quality": 0.1
  }
}
```

---

## Complete Data Flow Examples

### Flow 1: Draw a Rectangle

```
User drags on canvas
  |
  v
CADControls.onPointerDown()              -- stores startPoint in 3D world coords
CADControls.onPointerMove()              -- updates preview geometry
CADControls.onPointerUp()                -- converts to 2D sketch coords
  |
  v
CADControls.onDrawingComplete('rectangle', [start2D, end2D])
  |
  v
CADApplication.handleInteractiveDrawing()
  - calculates width = |end.x - start.x|, height = |end.y - start.y|
  |
  v
CADClient.addRectangleToSketch(sketchId, corner, width, height)
  - POST /api/v1/cad/sketch-elements
  |
  v
API Server (cad.js)
  - validates request
  - flattens: {x, y, width, height}
  - calls cadBackendClient.addSketchElement(sessionId, data)
  |
  v
Python Backend (api_server.py -> geometry_engine.py)
  - Sketch.add_rectangle(x, y, width, height)
  - Creates parent: rectangle_1_2345 (container_only)
  - Creates 4 child lines: _line_bottom, _line_right, _line_top, _line_left
  - Generates visualization_data for parent + each child
  |
  v
API Server receives response
  - HTTP response to client: {element_id, is_composite, child_elements}
  - WebSocket: sends visualization_data for parent
  - WebSocket: sends visualization_data for each child element
  |
  v
CADClient receives HTTP response
  - Calls elementVisualizationCallback for parent (container metadata)
  - Loops child_elements, calls elementVisualizationCallback for each child
  |
  v
CADRenderer.addSketchElementVisualization() (for each child)
  - VisualizationManager creates:
    - THREE.Line geometry from points_3d (visible line)
    - Invisible hit-test ribbon mesh (for raycasting)
  - Named: element-{sketchId}-{elementId}
  |
  v
CADApplication updates createdSketches state
  - Stores parent element with child_ids
  - Stores each child with parent_id reference
```

### Flow 2: Extrude a Rectangle

```
User clicks rectangle edge in viewport
  |
  v
CADRenderer.onPointerUp() -> performRaycasting()
  - Raycaster hits invisible ribbon mesh
  - Walks up parent chain to find named group
  - parseObjectName("element-sketch_1-rectangle_1_2345_line_bottom")
    -> { id: "rectangle_1_2345_line_bottom", type: "element", sketchId: "sketch_1" }
  |
  v
CADRenderer.onObjectSelected("rectangle_1_2345_line_bottom", "element", "sketch_1")
  |
  v
CADApplication.handleSelection()
  - Sets selectedObject state
  - resolveExtrudableElement("rectangle_1_2345_line_bottom", "sketch_1")
    -> finds element in createdSketches
    -> element has parent_id: "rectangle_1_2345"
    -> parent type is "rectangle" -> EXTRUDABLE
    -> returns parent element info
  - setShowInlineExtrude(true)
  |
  v
User types distance "10" and presses Enter
  |
  v
CADApplication.handleInlineExtrude() -> handlePaletteExtrude(10)
  - resolveExtrudableElement() -> elementId = "rectangle_1_2345" (parent)
  - toMillimeters(10, currentUnit)
  |
  v
CADClient.extrudeFeature("sketch_1", 10, "rectangle_1_2345")
  - POST /api/v1/cad/extrude
  - Body: { sketch_id, element_id, distance: 10, direction: "normal" }
  |
  v
API Server (cad.js)
  - Flattens params
  - cadBackendClient.extrudeFeature(sessionId, data)
  |
  v
Python Backend
  - engine.extrude_feature("sketch_1", 10.0, "rectangle_1_2345")
  - get_face_from_sketch():
    - Finds rectangle_1_2345 (is_composite_parent)
    - _find_closed_boundary_for_composite() collects child lines
    - Builds closed wire from child edges
    - Creates face from wire on sketch plane
  - BRepPrimAPI_MakePrism(face, normal * distance)
  - Tessellates resulting solid -> mesh_data
  |
  v
API Server receives response
  - WebSocket: sends geometry_update with mesh_data
  - HTTP response: { feature_id, mesh_data }
  |
  v
CADClient receives response
  - Calls geometryUpdateCallback(mesh_data)
  |
  v
CADApplication callback
  - renderer.updateGeometry("model-{timestamp}", meshData)
  |
  v
MeshManager.updateMesh()
  - Creates BufferGeometry from vertices/faces
  - Applies seam normal smoothing
  - Creates mesh with MeshPhysicalMaterial (metal look)
  - Adds EdgesGeometry for shape definition
  - Adds to scene as "model-{timestamp}"
```

### Flow 3: Sketch on Face

```
User clicks face of extruded 3D geometry
  |
  v
CADRenderer.performRaycasting()
  - Hit on mesh named "model-{id}"
  - parseObjectName() -> { type: "mesh" }
  - Extracts face normal + intersection point from hit
  - Calls onFaceSelected(faceNormal, faceCenter, meshId)
  |
  v
CADApplication.handleFaceSelected()
  - Stores pendingFace = { normal, center, meshId }
  - Shows confirmation overlay: "Sketch on this face?"
  |
  v
User clicks "Yes" -> handleConfirmSketchOnFace()
  - Maps face normal to closest standard plane:
    - Y-facing -> XZ plane
    - Z-facing -> XY plane
    - X-facing -> YZ plane
  - origin = [center.x, center.y, center.z]
  |
  v
CADClient.createSketchPlane(planeType, origin)
  - POST /api/v1/cad/sketch-planes { plane_type, origin }
  |
  v
API Server -> Python Backend
  - engine.create_sketch_plane(plane_type, origin)
  - Creates gp_Ax3 coordinate system at origin with correct normal
  |
  v
CADClient.createSketch(planeId)
  - POST /api/v1/cad/sketches { plane_id }
  |
  v
Sketch visualization received
  - Camera switches to top-down view
  - Sketch becomes active for drawing
  - New elements drawn on this plane at the face position
```

---

## WebSocket Message Flow

### Client -> Server

```json
{"type": "subscribe_geometry_updates"}
{"type": "subscribe_sketch_updates"}
{"type": "ping"}
{"type": "agent_message", "data": {"content": "..."}}
```

### Server -> Client

```json
// Connection
{"type": "connection_established", "sessionId": "...", "timestamp": 123}

// After plane creation
{"type": "visualization_data", "payload": {
  "plane_id": "plane_1", "plane_type": "XZ",
  "origin": [0,0,0], "normal": [0,1,0],
  "u_axis": [1,0,0], "v_axis": [0,0,1]
}, "timestamp": 123}

// After sketch creation
{"type": "visualization_data", "payload": {
  "sketch_id": "sketch_1", "plane_id": "plane_1",
  "origin": [0,0,0], "normal": [0,1,0],
  "u_axis": [1,0,0], "v_axis": [0,0,1]
}, "timestamp": 123}

// After element creation
{"type": "visualization_data", "payload": {
  "element_id": "line_1_5634",
  "sketch_id": "sketch_1",
  "element_type": "line",
  "points_3d": [0,0,0, 5,0,5],
  "parameters_2d": {"x1": 0, "y1": 0, "x2": 5, "y2": 5}
}, "timestamp": 123}

// After extrusion (mesh data)
{"type": "geometry_update", "payload": {
  "vertices": [...], "faces": [...], "normals": [...],
  "metadata": {"vertex_count": 24, "face_count": 8}
}, "timestamp": 123}
```

---

## Environment Variables

| Variable | Default | Layer | Purpose |
|----------|---------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Client | API server URL |
| `PORT` | `3000` | API Server | Listen port |
| `HOST` | `0.0.0.0` | API Server | Bind address |
| `CAD_BACKEND_HOST` | `localhost` | API Server | Python backend host |
| `CAD_BACKEND_PORT` | `8080` | API Server | Python backend port |
| `CAD_BACKEND_TIMEOUT` | `30000` | API Server | Request timeout (ms) |
| `WS_HEARTBEAT_INTERVAL` | `30000` | API Server | WebSocket ping interval (ms) |
| `CORS_ORIGIN` | `http://localhost:3001` | API Server | Allowed CORS origin |

---

## Three.js Scene Object Naming

All named objects in the scene follow this convention:

| Prefix | Format | Example | Used For |
|--------|--------|---------|----------|
| `plane-` | `plane-{planeId}` | `plane-plane_1` | Sketch plane visualization |
| `sketch-` | `sketch-{sketchId}` | `sketch-sketch_1` | Sketch coordinate axes |
| `element-` | `element-{sketchId}-{elementId}` | `element-sketch_1-line_1_5634` | Sketch elements |
| `model-` | `model-{timestamp}` | `model-1706123456789` | Extruded 3D meshes |
| `blueprint-grid` | fixed | `blueprint-grid` | Background grid |
