# Dimes CAD API Server

This is the Node.js API layer for the Dimes CAD application. It acts as a secure gateway between the frontend client and the C++ OpenCascade backend, providing authentication, validation, rate limiting, and protocol translation.

## Architecture Overview

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐    HTTP    ┌─────────────────┐
│                 │ ──────────────────► │                 │ ─────────► │                 │
│  Frontend       │                     │  Node.js API    │            │  C++ OpenCascade│
│  (React/Vue/JS) │                     │  Server         │            │  Backend        │
│                 │ ◄────────────────── │                 │ ◄───────── │                 │
└─────────────────┘                     └─────────────────┘            └─────────────────┘
```

### Benefits of This Architecture

1. **Security**: The Node.js layer handles authentication, rate limiting, and input validation
2. **Protocol Translation**: Converts between web protocols and C++ backend communication
3. **Scalability**: Can handle multiple frontend clients and load balance to C++ backends
4. **Monitoring**: Centralized logging, metrics, and health checks
5. **Development**: Easier to add features like caching, WebSocket support, and API versioning

## Features

- ✅ RESTful API endpoints for CAD operations
- ✅ Sketch-based CAD modeling workflow (SolidWorks-style)
- ✅ Primitive-based modeling for quick prototyping
- ✅ WebSocket support for real-time updates
- ✅ Session management and validation
- ✅ Request validation and sanitization
- ✅ Rate limiting and security headers
- ✅ Health checks and monitoring
- ✅ Error handling and logging
- ✅ C++ backend communication with retry logic
- ✅ MCP (Model Context Protocol) server for AI integration

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Running C++ OpenCascade backend (on port 8080 by default)

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd Dimes/api-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   CPP_BACKEND_HOST=localhost
   CPP_BACKEND_PORT=8080
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start the server**:
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Health & Monitoring

- `GET /api/v1/health` - Overall health check
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/cad/backend/status` - C++ backend status

### Sketch-Based CAD Operations (Professional Workflow)

The API supports a complete sketch-based CAD workflow similar to SolidWorks:

#### 1. Create Sketch Plane
```http
POST /api/v1/cad/sketch-planes
Content-Type: application/json
X-Session-ID: your-session-id

{
  "plane_type": "XY",        // "XY", "XZ", or "YZ"
  "origin": [0, 0, 0]        // Optional: [x, y, z] coordinates
}
```

#### 2. Create Sketch
```http
POST /api/v1/cad/sketches
Content-Type: application/json
X-Session-ID: your-session-id

{
  "plane_id": "plane_12345"
}
```

#### 3. Add Sketch Elements
```http
POST /api/v1/cad/sketch-elements
Content-Type: application/json
X-Session-ID: your-session-id

{
  "sketch_id": "sketch_67890",
  "element_type": "line",       // "line" or "circle"
  "parameters": {
    // For lines:
    "start_point": [0, 0],      // [x, y] in 2D
    "end_point": [10, 0]        // [x, y] in 2D
    
    // For circles:
    // "center": [5, 5],        // [x, y] in 2D
    // "radius": 3              // radius value
  }
}
```

#### 4. Extrude Sketch
```http
POST /api/v1/cad/extrude
Content-Type: application/json
X-Session-ID: your-session-id

{
  "sketch_id": "sketch_67890",
  "distance": 5.0,
  "extrude_type": "blind"      // "blind" or "symmetric"
}
```

### Primitive-Based CAD Operations (Quick Prototyping)

- `POST /api/v1/cad/models` - Create 3D models
- `PUT /api/v1/cad/parameters` - Update model parameters
- `POST /api/v1/cad/operations` - Boolean operations
- `POST /api/v1/cad/tessellate` - Generate meshes
- `GET /api/v1/cad/sessions/{sessionId}/export/{format}` - Export models

### WebSocket

- `ws://localhost:3000/ws?sessionId={sessionId}` - Real-time updates

## CAD Workflow Examples

### Example 1: Create a Simple Rectangular Block

```javascript
// 1. Create XY plane
const planeResponse = await fetch('/api/v1/cad/sketch-planes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({ plane_type: 'XY', origin: [0, 0, 0] })
});
const { plane_id } = await planeResponse.json();

// 2. Create sketch on plane
const sketchResponse = await fetch('/api/v1/cad/sketches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({ plane_id })
});
const { sketch_id } = await sketchResponse.json();

// 3. Add rectangle (4 lines)
const lines = [
  { start_point: [0, 0], end_point: [10, 0] },    // Bottom
  { start_point: [10, 0], end_point: [10, 5] },   // Right
  { start_point: [10, 5], end_point: [0, 5] },    // Top
  { start_point: [0, 5], end_point: [0, 0] }      // Left
];

for (const line of lines) {
  await fetch('/api/v1/cad/sketch-elements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify({
      sketch_id,
      element_type: 'line',
      parameters: line
    })
  });
}

// 4. Extrude to create 3D block
const extrudeResponse = await fetch('/api/v1/cad/extrude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({
    sketch_id,
    distance: 15.0,
    extrude_type: 'blind'
  })
});
const result = await extrudeResponse.json();
console.log('Created block with model ID:', result.data.model_id);
```

### Example 2: Create a Cylinder Using Circle Sketch

```javascript
// 1. Create XY plane
const planeResponse = await fetch('/api/v1/cad/sketch-planes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({ plane_type: 'XY' })
});
const { plane_id } = await planeResponse.json();

// 2. Create sketch
const sketchResponse = await fetch('/api/v1/cad/sketches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({ plane_id })
});
const { sketch_id } = await sketchResponse.json();

// 3. Add circle
await fetch('/api/v1/cad/sketch-elements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({
    sketch_id,
    element_type: 'circle',
    parameters: {
      center: [0, 0],
      radius: 5.0
    }
  })
});

// 4. Extrude to create cylinder
const extrudeResponse = await fetch('/api/v1/cad/extrude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
  body: JSON.stringify({
    sketch_id,
    distance: 10.0,
    extrude_type: 'blind'
  })
});
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `NODE_ENV` | development | Environment mode |
| `CPP_BACKEND_HOST` | localhost | C++ backend hostname |
| `CPP_BACKEND_PORT` | 8080 | C++ backend port |
| `CPP_BACKEND_TIMEOUT` | 30000 | Backend request timeout (ms) |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed CORS origin |
| `API_RATE_LIMIT_MAX_REQUESTS` | 100 | Rate limit per window |
| `API_RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (ms) |
| `LOG_LEVEL` | info | Logging level |
| `WS_HEARTBEAT_INTERVAL` | 30000 | WebSocket heartbeat interval |

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic reloading on file changes.

### Code Structure

```
src/
├── server.js              # Main server file
├── mcp-server.js          # MCP server for AI integration
├── routes/
│   ├── health.js          # Health check routes
│   └── cad.js             # CAD operation routes
├── services/
│   ├── cppBackendClient.js # C++ backend communication
│   └── websocketManager.js # WebSocket handling
├── middleware/
│   ├── errorHandler.js    # Error handling middleware
│   └── sessionValidator.js # Session validation
└── utils/
    ├── logger.js          # Logging utility
    └── errors.js          # Custom error classes
```

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## Model Context Protocol (MCP) Integration

The server includes an MCP server for AI integration with the following tools:

### Basic Tools
- `create_sketch_model` - Create complete sketch-based models (plane → sketch → elements → extrude)
- `perform_boolean` - Boolean operations (union, cut, intersect)

### Sketch-Based Tools
- `create_sketch_plane` - Create sketch planes (XY, XZ, YZ)
- `create_sketch` - Create sketch on a plane
- `add_sketch_element` - Add 2D elements (lines, circles)
- `extrude_sketch` - Extrude sketch to 3D solid
- `create_sketch_model` - Complete workflow in one operation

### Running MCP Server

```bash
node src/mcp-server.js
```

The MCP server provides AI agents with structured tools to create CAD models using natural language instructions.

## Deployment

### Production Deployment

1. **Set environment variables**:
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export CPP_BACKEND_HOST=your-cpp-backend-host
   export CPP_BACKEND_PORT=8080
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
EXPOSE 3000

CMD ["npm", "start"]
```

### Health Checks

The API provides multiple health check endpoints for monitoring:

- **Liveness**: `/api/v1/health/live` - Basic server health
- **Readiness**: `/api/v1/health/ready` - Ready to accept traffic
- **Detailed**: `/api/v1/health` - Full health with backend status

## Security

### Implemented Security Measures

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request protection
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Request sanitization
- **Session Management**: Secure session handling

### Security Headers

The API automatically sets security headers:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Monitoring & Logging

### Logging

The server uses a custom logger with configurable levels:
- `error`: Error messages
- `warn`: Warning messages
- `info`: General information
- `debug`: Debug information

### Metrics

Health endpoints provide metrics:
- Response times
- Memory usage
- Uptime
- Backend status
- Active connections

## WebSocket Communication

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?sessionId=your-session-id');
```

### Message Types

- `ping/pong`: Heartbeat
- `geometry_update`: Real-time geometry updates
- `parameter_update`: Parameter changes
- `backend_status`: Backend status changes

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details",
  "timestamp": 1640995200000
}
```

### Error Types

- `400`: Validation errors
- `401`: Authentication errors
- `429`: Rate limit exceeded
- `503`: Backend unavailable
- `500`: Internal server errors

## Integration with Frontend

Update your frontend client to connect to the Node.js API server:

```javascript
// Before (direct C++ connection)
const client = new CADClient('http://localhost:8080', sessionId);

// After (Node.js API layer)
const client = new CADClient('http://localhost:3000', sessionId);
```

The API maintains backward compatibility with existing client code while adding new sketch-based capabilities.

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check if C++ backend is running on configured port
   - Verify `CPP_BACKEND_HOST` and `CPP_BACKEND_PORT` settings
   - Check network connectivity

2. **CORS Errors**
   - Update `CORS_ORIGIN` environment variable
   - Ensure frontend URL matches CORS configuration

3. **Rate Limiting**
   - Adjust rate limit settings in environment variables
   - Implement proper error handling in frontend

4. **WebSocket Connection Issues**
   - Check session ID format
   - Verify WebSocket URL and protocol

5. **Sketch Workflow Issues**
   - Ensure proper sequence: plane → sketch → elements → extrude
   - Validate element parameters (2D coordinates for sketch elements)
   - Check that plane and sketch IDs are correctly passed between steps

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run linting before committing

## License

This project is licensed under the MIT License.