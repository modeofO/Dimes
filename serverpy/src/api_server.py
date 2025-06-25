"""
CAD API Server using FastAPI - Python version of CADController
"""
import json
import time
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from session_manager import SessionManager
from geometry_engine import Vector3d, MeshData


# ==================== REQUEST/RESPONSE MODELS ====================

class CreateModelRequest(BaseModel):
    """Request model for creating CAD models"""
    type: str = Field(..., description="Type of model to create (box, sphere, etc.)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Model parameters")
    session_id: Optional[str] = Field(None, description="Session ID")


class BooleanOperationRequest(BaseModel):
    """Request model for boolean operations"""
    operation: str = Field(..., description="Boolean operation (union, cut, intersect)")
    parameters: Dict[str, Any] = Field(..., description="Operation parameters")
    session_id: Optional[str] = Field(None, description="Session ID")


class TessellateRequest(BaseModel):
    """Request model for tessellation"""
    shape_id: str = Field(..., description="Shape ID to tessellate")
    deflection: float = Field(default=0.1, description="Tessellation quality")
    session_id: Optional[str] = Field(None, description="Session ID")


class CreateSketchPlaneRequest(BaseModel):
    """Request model for creating sketch planes"""
    session_id: str = Field(..., description="Session ID")
    plane_type: str = Field(..., description="Plane type (XY, XZ, YZ)")
    origin_x: float = Field(default=0.0, description="Origin X coordinate")
    origin_y: float = Field(default=0.0, description="Origin Y coordinate") 
    origin_z: float = Field(default=0.0, description="Origin Z coordinate")


class CreateSketchRequest(BaseModel):
    """Request model for creating sketches"""
    session_id: str = Field(..., description="Session ID")
    plane_id: str = Field(..., description="Sketch plane ID")


class AddSketchElementRequest(BaseModel):
    """Request model for adding sketch elements"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    element_type: str = Field(..., description="Element type (line, circle, rectangle)")
    parameters: Dict[str, Any] = Field(..., description="Element parameters")


class ExtrudeRequest(BaseModel):
    """Request model for extrude operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    distance: float = Field(..., description="Extrude distance")
    direction: str = Field(default="normal", description="Extrude direction")


class APIResponse(BaseModel):
    """Standard API response format"""
    success: bool
    timestamp: int
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== FASTAPI APPLICATION ====================

class CADAPIServer:
    """
    Python version of the C++ CADController using FastAPI
    Provides the same HTTP endpoints as the original C++ implementation
    """
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8080):
        self.host = host
        self.port = port
        self.app = FastAPI(
            title="CAD Engine Server",
            description="Python CAD API Server using pythonOCC",
            version="1.0.0"
        )
        
        # Setup CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup routes
        self._setup_routes()
        
        print("CAD API Server initialized (Python)")
    
    def _setup_routes(self):
        """Setup HTTP routes - equivalent to C++ setupRoutes"""
        
        @self.app.get("/api/v1/health")
        async def health_check():
            """Health check endpoint"""
            return APIResponse(
                success=True,
                timestamp=int(time.time()),
                data={
                    "status": "healthy",
                    "service": "CAD Engine Server (Python)",
                    "version": "1.0.0"
                }
            )
        
        @self.app.post("/api/v1/models")
        async def create_model(
            request: CreateModelRequest,
            x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
        ):
            """Create model endpoint - equivalent to C++ handleCreateModel"""
            try:
                session_id = self._get_session_id(request.session_id, x_session_id)
                response_data = await self._handle_create_model(session_id, request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in create_model: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/operations")
        async def boolean_operation(
            request: BooleanOperationRequest,
            x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
        ):
            """Boolean operations endpoint - equivalent to C++ handleBooleanOperation"""
            try:
                session_id = self._get_session_id(request.session_id, x_session_id)
                response_data = await self._handle_boolean_operation(session_id, request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in boolean_operation: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/tessellate")
        async def tessellate(
            request: TessellateRequest,
            x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
        ):
            """Tessellation endpoint - equivalent to C++ handleTessellate"""
            try:
                session_id = self._get_session_id(request.session_id, x_session_id)
                response_data = await self._handle_tessellate(session_id, request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in tessellate: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        # ==================== SKETCH-BASED MODELING ENDPOINTS ====================
        
        @self.app.post("/api/v1/sketch-planes")
        async def create_sketch_plane(request: CreateSketchPlaneRequest):
            """Create sketch plane endpoint - equivalent to C++ handleCreateSketchPlane"""
            try:
                response_data = await self._handle_create_sketch_plane(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in create_sketch_plane: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/sketches")
        async def create_sketch(request: CreateSketchRequest):
            """Create sketch endpoint - equivalent to C++ handleCreateSketch"""
            try:
                response_data = await self._handle_create_sketch(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in create_sketch: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/sketch-elements")
        async def add_sketch_element(request: AddSketchElementRequest):
            """Add sketch element endpoint - equivalent to C++ handleAddSketchElement"""
            try:
                response_data = await self._handle_add_sketch_element(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in add_sketch_element: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/extrude")
        async def extrude_feature(request: ExtrudeRequest):
            """Extrude feature endpoint - equivalent to C++ handleExtrudeFeature"""
            try:
                response_data = await self._handle_extrude_feature(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in extrude_feature: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        # ==================== SESSION MANAGEMENT ENDPOINTS ====================
        
        @self.app.get("/api/v1/sessions/{session_id}")
        async def get_session_info(session_id: str):
            """Get session information"""
            try:
                session_manager = SessionManager.get_instance()
                info = session_manager.get_session_info(session_id)
                
                if info is None:
                    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=info
                )
                
            except HTTPException:
                raise
            except Exception as e:
                print(f"❌ Error getting session info: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.delete("/api/v1/sessions/{session_id}")
        async def delete_session(session_id: str):
            """Delete session"""
            try:
                session_manager = SessionManager.get_instance()
                removed = session_manager.remove_session(session_id)
                
                if not removed:
                    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data={"message": f"Session {session_id} removed"}
                )
                
            except HTTPException:
                raise
            except Exception as e:
                print(f"❌ Error deleting session: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        print("HTTP routes configured")
    
    # ==================== REQUEST HANDLERS ====================
    
    async def _handle_create_model(self, session_id: str, request: CreateModelRequest) -> Dict[str, Any]:
        """Handle model creation - equivalent to C++ handleCreateModel"""
        print(f"🔧 Creating model: {request.type} for session {session_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        shape_id = ""
        
        # Handle different model types
        if request.type == "box":
            params = request.parameters
            width = params.get("width", 10.0)
            height = params.get("height", 10.0)
            depth = params.get("depth", 10.0)
            
            shape_id = engine.create_box(width, height, depth)
            
        elif request.type == "sphere":
            params = request.parameters
            radius = params.get("radius", 5.0)
            center_data = params.get("center", {"x": 0, "y": 0, "z": 0})
            center = Vector3d(center_data.get("x", 0), center_data.get("y", 0), center_data.get("z", 0))
            
            shape_id = engine.create_sphere(radius, center)
            
        else:
            raise Exception(f"Unknown model type: {request.type}")
        
        if not shape_id:
            raise Exception("Failed to create model")
        
        # Generate mesh data
        print(f"🔍 Tessellating shape: {shape_id}")
        mesh_data = engine.tessellate(shape_id)
        
        # Prepare response
        response_data = {
            "model_id": shape_id,
            "session_id": session_id,
            "mesh_data": {
                "vertices": mesh_data.vertices,
                "faces": mesh_data.faces,
                "normals": mesh_data.normals,
                "metadata": {
                    "vertex_count": mesh_data.vertex_count,
                    "face_count": mesh_data.face_count,
                    "tessellation_quality": mesh_data.tessellation_quality
                }
            },
            "bounding_box": {
                "min": [0.0, 0.0, 0.0],  # TODO: Calculate actual bounding box
                "max": [10.0, 10.0, 10.0]
            }
        }
        
        print(f"✅ Model created successfully: {shape_id}")
        return response_data
    
    async def _handle_boolean_operation(self, session_id: str, request: BooleanOperationRequest) -> Dict[str, Any]:
        """Handle boolean operations - equivalent to C++ handleBooleanOperation"""
        print(f"🔧 Boolean operation: {request.operation} for session {session_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        params = request.parameters
        shape1_id = params.get("shape1_id")
        shape2_id = params.get("shape2_id")
        result_id = params.get("result_id", f"result_{int(time.time())}")
        
        if not shape1_id or not shape2_id:
            raise Exception("Missing shape1_id or shape2_id in parameters")
        
        # Perform boolean operation
        success = False
        if request.operation == "union":
            success = engine.union_shapes(shape1_id, shape2_id, result_id)
        elif request.operation == "cut":
            success = engine.cut_shapes(shape1_id, shape2_id, result_id)
        elif request.operation == "intersect":
            success = engine.intersect_shapes(shape1_id, shape2_id, result_id)
        else:
            raise Exception(f"Unknown boolean operation: {request.operation}")
        
        if not success:
            raise Exception(f"Boolean operation {request.operation} failed")
        
        # Generate mesh data for result
        mesh_data = engine.tessellate(result_id)
        
        response_data = {
            "result_id": result_id,
            "operation": request.operation,
            "shape1_id": shape1_id,
            "shape2_id": shape2_id,
            "session_id": session_id,
            "mesh_data": {
                "vertices": mesh_data.vertices,
                "faces": mesh_data.faces,
                "normals": mesh_data.normals,
                "metadata": {
                    "vertex_count": mesh_data.vertex_count,
                    "face_count": mesh_data.face_count,
                    "tessellation_quality": mesh_data.tessellation_quality
                }
            }
        }
        
        print(f"✅ Boolean operation completed: {result_id}")
        return response_data
    
    async def _handle_tessellate(self, session_id: str, request: TessellateRequest) -> Dict[str, Any]:
        """Handle tessellation - equivalent to C++ handleTessellate"""
        print(f"🔧 Tessellating shape: {request.shape_id} for session {session_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        if not engine.shape_exists(request.shape_id):
            raise Exception(f"Shape {request.shape_id} does not exist")
        
        # Perform tessellation
        mesh_data = engine.tessellate(request.shape_id, request.deflection)
        
        response_data = {
            "shape_id": request.shape_id,
            "session_id": session_id,
            "mesh_data": {
                "vertices": mesh_data.vertices,
                "faces": mesh_data.faces,
                "normals": mesh_data.normals,
                "metadata": {
                    "vertex_count": mesh_data.vertex_count,
                    "face_count": mesh_data.face_count,
                    "tessellation_quality": mesh_data.tessellation_quality
                }
            }
        }
        
        print(f"✅ Tessellation completed: {request.shape_id}")
        return response_data
    
    # ==================== SKETCH-BASED MODELING HANDLERS ====================
    
    async def _handle_create_sketch_plane(self, request: CreateSketchPlaneRequest) -> Dict[str, Any]:
        """Handle sketch plane creation - Real implementation using geometry engine"""
        print(f"🎯 Creating sketch plane: {request.plane_type} for session {request.session_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate plane type
        valid_plane_types = ["XY", "XZ", "YZ"]
        if request.plane_type not in valid_plane_types:
            raise Exception(f"Invalid plane type '{request.plane_type}'. Must be one of: {valid_plane_types}")
        
        # Create Vector3d from origin coordinates
        origin = Vector3d(
            x=float(request.origin_x),
            y=float(request.origin_y),
            z=float(request.origin_z)
        )
        
        # Create sketch plane using geometry engine
        plane_id = engine.create_sketch_plane(request.plane_type, origin)
        
        if not plane_id:
            raise Exception("Failed to create sketch plane in geometry engine")
        
        # Get visualization data for the created plane
        viz_data = engine.get_plane_visualization_data(plane_id)
        
        response_data = {
            "plane_id": plane_id,
            "plane_type": request.plane_type,
            "origin": {
                "x": origin.x,
                "y": origin.y,
                "z": origin.z
            },
            "session_id": request.session_id,
            "message": f"Sketch plane {plane_id} created successfully"
        }
        
        # Add visualization data if available
        if viz_data:
            response_data["visualization_data"] = viz_data
        
        print(f"✅ Sketch plane created successfully: {plane_id}")
        return response_data
    
    async def _handle_create_sketch(self, request: CreateSketchRequest) -> Dict[str, Any]:
        """Handle sketch creation - Real implementation using geometry engine"""
        print(f"📐 Creating sketch on plane: {request.plane_id} for session {request.session_id}")

        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the plane exists
        if not engine.plane_exists(request.plane_id):
            raise Exception(f"Sketch plane '{request.plane_id}' does not exist")
        
        # Create sketch using geometry engine
        sketch_id = engine.create_sketch(request.plane_id)
        
        if not sketch_id:
            raise Exception("Failed to create sketch in geometry engine")
        
        # Get visualization data for the created sketch
        viz_data = engine.get_sketch_visualization_data(sketch_id)
        
        # Get sketch info
        sketch_info = engine.get_sketch_info(sketch_id)
        
        response_data: Dict[str, Any] = {
            "sketch_id": sketch_id,
            "plane_id": request.plane_id,
            "session_id": request.session_id,
            "message": f"Sketch {sketch_id} created successfully on plane {request.plane_id}"
        }
        
        # Add visualization data if available
        if viz_data:
            response_data["visualization_data"] = viz_data
        
        # Add sketch info if available
        if sketch_info:
            response_data["sketch_info"] = sketch_info
        
        print(f"✅ Sketch created successfully: {sketch_id}")
        return response_data
    
    async def _handle_add_sketch_element(self, request: AddSketchElementRequest) -> Dict[str, Any]:
        """Handle adding sketch element - equivalent to C++ handleAddSketchElement"""
        print(f"📏 Adding {request.element_type} to sketch: {request.sketch_id}")
        
        # Placeholder implementation
        element_id = f"element_{int(time.time())}"
        
        response_data = {
            "element_id": element_id,
            "element_type": request.element_type,
            "sketch_id": request.sketch_id,
            "session_id": request.session_id,
            "parameters": request.parameters,
            "message": "Sketch element added (placeholder implementation)"
        }
        
        print(f"✅ Sketch element added: {element_id}")
        return response_data
    
    async def _handle_extrude_feature(self, request: ExtrudeRequest) -> Dict[str, Any]:
        """Handle extrude feature - equivalent to C++ handleExtrudeFeature"""
        print(f"🚀 Extruding sketch: {request.sketch_id} distance: {request.distance}")
        
        # Placeholder implementation
        feature_id = f"extrude_{int(time.time())}"
        
        response_data = {
            "feature_id": feature_id,
            "sketch_id": request.sketch_id,
            "distance": request.distance,
            "direction": request.direction,
            "session_id": request.session_id,
            "message": "Extrude feature created (placeholder implementation)"
        }
        
        print(f"✅ Extrude feature created: {feature_id}")
        return response_data
    
    # ==================== UTILITY METHODS ====================
    
    def _get_session_id(self, body_session_id: Optional[str], header_session_id: Optional[str]) -> str:
        """Get session ID from request - equivalent to C++ getSessionId"""
        session_id = header_session_id or body_session_id or "default-session"
        return session_id
    
    def start(self):
        """Start the server - equivalent to C++ start"""
        print(f"🚀 Starting CAD API Server on {self.host}:{self.port}")
        uvicorn.run(self.app, host=self.host, port=self.port)
    
    def stop(self):
        """Stop the server - equivalent to C++ stop"""
        print("🛑 Stopping CAD API Server...")
        # FastAPI/uvicorn handles this automatically


# ==================== SERVER INSTANCE ====================

def create_app() -> FastAPI:
    """Create FastAPI application instance"""
    server = CADAPIServer()
    return server.app


if __name__ == "__main__":
    # Run the server directly
    server = CADAPIServer()
    server.start() 