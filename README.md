# Dimes CAD

A web-based Computer-Aided Design application built with a modern three-tier architecture. Dimes CAD provides sketch-based 3D modeling capabilities similar to professional CAD software like SolidWorks, accessible through a browser interface.

## Overview

Dimes CAD enables users to create 3D models through a sketch-and-extrude workflow:

1. Create a sketch plane (XY, XZ, or YZ orientation)
2. Draw 2D geometry on the sketch plane (lines, circles, rectangles, arcs, polygons)
3. Apply sketch modifications (fillet, chamfer, trim, extend, mirror, offset, copy, move)
4. Extrude 2D profiles into 3D solid geometry
5. Export models to standard CAD formats (STEP, STL, OBJ, IGES)

The application also supports AI-driven CAD operations through the Daydreams framework, allowing natural language interaction for model creation.

## Architecture

Dimes CAD uses a three-tier architecture that separates concerns for security, scalability, and maintainability:

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐      HTTP       ┌─────────────────┐
│                 │ ─────────────────────>│                 │ ───────────────>│                 │
│  Frontend       │                       │  API Server     │                 │  CAD Backend    │
│  Next.js/Three.js│                      │  Node.js/Express│                 │  Python/pythonOCC│
│  Port 3001      │ <─────────────────────│  Port 3000      │ <───────────────│  Port 8080      │
└─────────────────┘    (viz updates)      └─────────────────┘    (response)   └─────────────────┘
```

### Frontend (Port 3001)

The client layer built with Next.js and Three.js handles:

- 3D viewport rendering and camera controls
- User input for drawing tools and sketch operations
- Real-time geometry visualization via WebSocket
- Session management and state

Key components:
- `CADApplication` - Main orchestrator for state and UI
- `CADRenderer` - Three.js scene management and raycasting
- `CADClient` - HTTP and WebSocket communication
- `CADControls` - Drawing tools and input handling

### API Server (Port 3000)

The Node.js middleware layer provides:

- Request validation and sanitization
- Session management
- Rate limiting and security headers
- Protocol translation between web and Python backend
- WebSocket management for real-time updates
- AI agent integration via Daydreams framework

### CAD Backend (Port 8080)

The Python backend powered by pythonOCC (OpenCASCADE bindings) handles:

- Geometric kernel operations (shape creation, boolean operations)
- 2D sketch management and element storage
- Tessellation for mesh generation
- Export to CAD file formats

## Data Flow

The application follows a strict request-response pattern where the client never communicates directly with the Python backend. For detailed documentation of data flow patterns, see [Docs/data-flow.md](Docs/data-flow.md).

### Typical Operation Flow

1. User performs an action in the viewport (e.g., draws a rectangle)
2. Frontend converts screen coordinates to sketch plane coordinates
3. `CADClient` sends HTTP request to API Server with session ID
4. API Server validates request and flattens parameters
5. API Server forwards request to Python backend
6. Python backend creates geometry and generates visualization data
7. API Server broadcasts visualization data via WebSocket
8. API Server returns HTTP response to client
9. Frontend renders the new geometry in Three.js scene

### WebSocket Messages

Real-time updates use these message types:

| Type | Purpose |
|------|---------|
| `visualization_data` | 2D sketch element created (plane, sketch, element) |
| `geometry_update` | 3D mesh data from extrusion or boolean operation |
| `connection_established` | Initial WebSocket connection confirmed |
| `agent_message` | AI agent response |

## Getting Started

### Prerequisites

- Python 3.9 or higher with pythonOCC
- Node.js 18 or higher
- Docker (recommended for Python backend)

### 1. Start the CAD Backend

```bash
cd serverpy/app

# Using Docker (recommended)
docker-compose up -d

# Or run locally
pip install -r requirements.txt
python src/main.py
```

### 2. Start the API Server

```bash
cd api-server
npm install
cp env.example .env
npm run dev
```

### 3. Start the Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Open the Application

Navigate to `http://localhost:3001` in your browser.

## Configuration

### Environment Variables

The API Server uses these environment variables (see `api-server/env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `CAD_BACKEND_HOST` | 127.0.0.1 | Python backend hostname |
| `CAD_BACKEND_PORT` | 8080 | Python backend port |
| `CAD_BACKEND_TIMEOUT` | 30000 | Request timeout in milliseconds |
| `CORS_ORIGIN` | http://localhost:3001 | Allowed CORS origins |
| `WS_HEARTBEAT_INTERVAL` | 30000 | WebSocket ping interval |

For Railway deployment, use internal networking:
```
CAD_BACKEND_HOST=cad-backend.railway.internal
```

## Keyboard Shortcuts

### Drawing Tools
| Key | Tool |
|-----|------|
| L | Line |
| C | Circle |
| R | Rectangle |
| A | Arc |
| P | Polygon |

### Modification Tools
| Key | Tool |
|-----|------|
| F | Fillet |
| H | Chamfer |
| T | Trim |
| W | Extend |
| M | Mirror |
| O | Offset |
| D | Duplicate/Copy |
| G | Move |

### General
| Key | Action |
|-----|--------|
| Escape | Return to select tool / Exit sketch |
| X or Delete | Delete selected element |
| E | Extrude selected element |

## Project Structure

```
dimes/
├── client/                     # Next.js frontend
│   └── src/
│       ├── components/         # React components
│       └── lib/cad/           # CAD client library
│           ├── api/           # HTTP/WebSocket client
│           ├── controls/      # Input handling
│           ├── renderer/      # Three.js rendering
│           └── mesh/          # Mesh management
├── api-server/                # Node.js API layer
│   └── src/
│       ├── routes/            # API endpoints
│       ├── services/          # Backend client, WebSocket
│       ├── middleware/        # Validation, session
│       └── agent/             # Daydreams AI integration
├── serverpy/                  # Python CAD backend
│   └── app/src/
│       ├── geometry_engine.py # Core CAD engine
│       ├── api_server.py      # FastAPI endpoints
│       └── session_manager.py # Session storage
└── Docs/                      # Documentation
    ├── data-flow.md           # Detailed data flow
    ├── openapi.yaml           # API specification
    └── known-issues.md        # Issue tracking
```

## API Documentation

See [Docs/openapi.yaml](Docs/openapi.yaml) for the complete OpenAPI specification.

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cad/sketch-planes` | POST | Create a sketch plane |
| `/api/v1/cad/sketches` | POST | Create a sketch on a plane |
| `/api/v1/cad/sketch-elements` | POST | Add element to sketch |
| `/api/v1/cad/extrude` | POST | Extrude sketch to 3D |
| `/api/v1/cad/fillets` | POST | Add fillet between lines |
| `/api/v1/cad/chamfers` | POST | Add chamfer between lines |
| `/api/v1/cad/sessions/{id}/export/{format}` | GET | Export model |
| `/api/v1/health` | GET | Health check |

## Known Issues

See [Docs/known-issues.md](Docs/known-issues.md) for current issues and their status.

Key limitations:
- No undo/redo functionality
- No parametric constraint system
- Sessions are not persisted (in-memory only)
- Sketch-on-face limited to axis-aligned planes

## Troubleshooting

### Backend Connection Failed

Verify the Python backend is running:
```bash
curl http://localhost:8080/api/v1/health
```

Check environment variables match between API server and backend.

### WebSocket Connection Issues

Ensure the session ID format is valid and the WebSocket URL uses the correct protocol (ws:// for local, wss:// for production).

### CORS Errors

Update `CORS_ORIGIN` in the API server environment to include your frontend URL.

## License

MIT License - see LICENSE file for details.
