# CAD Engine - Agentic CAD Design

A sophisticated CAD application built with Python and pythonOCC in the Daydreams workflow.

## 🎯 Project Overview

This CAD engine provides:

- **🔧 CAD Backend**: Python engine with pythonOCC for robust geometric modeling
- **🌐 Secure API Layer**: Node.js middleware for authentication, validation, and protocol translation
- **🎨 Modern 3D Frontend**: Next.js/Three.js TypeScript client with professional viewport controls  
- **⚡ Real-time Updates**: WebSocket communication for live geometry updates
- **🔗 REST API**: Complete CRUD operations for CAD models and parameters
- **🛡️ Security & Monitoring**: Rate limiting, input validation, health checks, and logging
- **🤖 AI Integration**: Daydreams AI compatible endpoints for natural language CAD operations
- **📤 Multi-format Export**: STEP, STL, OBJ, IGES format support

### Three-Tier Architecture

The application uses a modern three-tier architecture for better security, scalability, and maintainability:

1. **Frontend (Port 3001)**: Three.js TypeScript client
   - User interface and 3D visualization
   - Camera controls and viewport management
   - Real-time geometry updates via WebSocket

2. **Node.js API Layer (Port 3000)**: Secure gateway
   - Authentication and session management
   - Request validation and rate limiting
   - Protocol translation between web and Python
   - WebSocket management for real-time updates

3. **Python Backend (Port 8080)**: pythonOCC engine
   - Core geometric modeling operations
   - 2D sketching with lines, arcs, circles, polygons
   - 2D editing tools: fillet, chamfer, trim, extend, mirror
   - Session-based geometry storage

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** with pythonOCC
- **Node.js 18+**
- **OpenCASCADE**
- **Docker** (recommended for Python backend)

### 1. Setup Python Backend

```bash
cd serverpy/app

# Using Docker (recommended)
docker-compose up -d

# Or install locally
pip install -r requirements.txt
python src/main.py
```

### 2. Setup API Server

```bash
cd api-server
npm install
cp env.example .env
npm run dev
```

### 3. Setup Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Open Application

Navigate to `http://localhost:3000` in your browser.

## 🛠️ Development Setup

### Project Structure

```
Dimes/
├── client/                 # Next.js/Three.js frontend
├── api-server/            # Node.js API layer
├── serverpy/              # Python CAD backend
│   └── app/
│       ├── src/
│       │   ├── geometry_engine.py  # Core CAD engine
│       │   ├── api_server.py       # FastAPI server
│       │   └── main.py            # Application entry
│       ├── requirements.txt
│       └── docker-compose.yml
├── shared/                # Shared type definitions
└── docs/                  # Documentation
```

### API Endpoints

#### 2D Geometry Creation
- `POST /api/v1/lines` - Create lines
- `POST /api/v1/circles` - Create circles  
- `POST /api/v1/rectangles` - Create rectangles
- `POST /api/v1/arcs` - Create arcs
- `POST /api/v1/polygons` - Create polygons

#### 2D Editing Tools
- `POST /api/v1/fillets` - Add fillets between lines
- `POST /api/v1/chamfers` - Add chamfers between lines
- `POST /api/v1/trim-line-to-line` - Trim lines at intersections
- `POST /api/v1/extend-line-to-line` - Extend lines to intersections
- `POST /api/v1/mirror` - Mirror geometry elements

#### Session Management
- `GET /api/v1/sessions/{session_id}` - Get session geometry
- `DELETE /api/v1/sessions/{session_id}` - Clear session

## 🐛 Troubleshooting

### Common Issues

#### Python Backend Connection Failed
```
Error: Connection refused on port 8000
```
**Solution**: Ensure Python backend is running with `docker-compose up` or `python src/main.py`

#### Missing pythonOCC Dependencies
```
ImportError: No module named 'OCC'
```
**Solution**: Install pythonOCC via conda or use the Docker setup

#### Frontend Build Errors
```
Error: Module not found
```
**Solution**: Run `npm install` in both `client/` and `api-server/` directories

### Debug Mode

Enable verbose logging:
```bash
# Python backend
PYTHONPATH=. python src/main.py --log-level=DEBUG

# API server
DEBUG=* npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **pythonOCC**: Python bindings for OpenCASCADE
- **Three.js**: 3D graphics library
- **Next.js**: React framework
- **FastAPI**: Modern Python web framework