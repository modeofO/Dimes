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
    element_type: str = Field(..., description="Element type (line, circle, rectangle, arc, polygon)")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Element parameters (nested format)")
    
    # Flattened parameters (for compatibility with Node.js server)
    # Line parameters
    x1: Optional[float] = Field(None, description="Line start X (flattened format)")
    y1: Optional[float] = Field(None, description="Line start Y (flattened format)")
    x2: Optional[float] = Field(None, description="Line end X (flattened format)")
    y2: Optional[float] = Field(None, description="Line end Y (flattened format)")
    
    # Circle parameters
    center_x: Optional[float] = Field(None, description="Circle center X (flattened format)")
    center_y: Optional[float] = Field(None, description="Circle center Y (flattened format)")
    radius: Optional[float] = Field(None, description="Circle/Arc radius (flattened format)")
    
    # Rectangle parameters
    x: Optional[float] = Field(None, description="Rectangle corner X (flattened format)")
    y: Optional[float] = Field(None, description="Rectangle corner Y (flattened format)")
    width: Optional[float] = Field(None, description="Rectangle width (flattened format)")
    height: Optional[float] = Field(None, description="Rectangle height (flattened format)")
    
    # Arc parameters (flattened)
    arc_type: Optional[str] = Field(None, description="Arc type: 'three_points' or 'endpoints_radius'")
    x_mid: Optional[float] = Field(None, description="Arc middle point X for three_points type")
    y_mid: Optional[float] = Field(None, description="Arc middle point Y for three_points type")
    large_arc: Optional[bool] = Field(None, description="Large arc flag for endpoints_radius type")
    
    # Polygon parameters (flattened)
    sides: Optional[int] = Field(None, description="Number of polygon sides (flattened format)")
    
    def get_parameters(self) -> Dict[str, Any]:
        """Get parameters in unified format, handling both nested and flattened formats"""
        if self.parameters:
            # Use nested format if provided
            return self.parameters
        
        # Convert flattened format to nested format
        params = {}
        
        if self.element_type == "line":
            if all(x is not None for x in [self.x1, self.y1, self.x2, self.y2]):
                params = {
                    "x1": self.x1,
                    "y1": self.y1, 
                    "x2": self.x2,
                    "y2": self.y2
                }
        elif self.element_type == "circle":
            if all(x is not None for x in [self.center_x, self.center_y, self.radius]):
                params = {
                    "center_x": self.center_x,
                    "center_y": self.center_y,
                    "radius": self.radius
                }
        elif self.element_type == "rectangle":
            if all(x is not None for x in [self.x, self.y, self.width, self.height]):
                params = {
                    "x": self.x,
                    "y": self.y,
                    "width": self.width,
                    "height": self.height
                }
        elif self.element_type == "arc":
            arc_type = self.arc_type or "three_points"
            params = {"arc_type": arc_type}
            
            if arc_type == "three_points":
                if all(x is not None for x in [self.x1, self.y1, self.x_mid, self.y_mid, self.x2, self.y2]):
                    params = {**params, **{
                        "x1": self.x1,
                        "y1": self.y1,
                        "x_mid": self.x_mid,
                        "y_mid": self.y_mid,
                        "x2": self.x2,
                        "y2": self.y2
                    }}
            elif arc_type == "endpoints_radius":
                if all(x is not None for x in [self.x1, self.y1, self.x2, self.y2, self.radius]):
                    params = {**params, **{
                        "x1": self.x1,
                        "y1": self.y1,
                        "x2": self.x2,
                        "y2": self.y2,
                        "radius": self.radius,
                        "large_arc": self.large_arc or False
                    }}
        elif self.element_type == "polygon":
            if all(x is not None for x in [self.center_x, self.center_y, self.sides, self.radius]):
                params = {
                    "center_x": self.center_x,
                    "center_y": self.center_y,
                    "sides": self.sides,
                    "radius": self.radius
                }
        
        return params


class ExtrudeRequest(BaseModel):
    """Request model for extrude operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    distance: float = Field(..., description="Extrude distance")
    direction: str = Field(default="normal", description="Extrude direction")


class FilletRequest(BaseModel):
    """Request model for fillet operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line1_id: str = Field(..., description="First line element ID")
    line2_id: str = Field(..., description="Second line element ID")
    radius: float = Field(..., description="Fillet radius")


class ChamferRequest(BaseModel):
    """Request model for chamfer operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line1_id: str = Field(..., description="First line element ID")
    line2_id: str = Field(..., description="Second line element ID")
    distance: float = Field(..., description="Chamfer distance")


class TrimLineToLineRequest(BaseModel):
    """Request model for simple line-to-line trim operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line_to_trim_id: str = Field(..., description="ID of line to be trimmed")
    cutting_line_id: str = Field(..., description="ID of line that cuts the first line")
    keep_start: bool = Field(default=True, description="If True, keep start portion; if False, keep end portion")


class TrimLineToGeometryRequest(BaseModel):
    """Request model for complex line-to-geometry trim operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line_to_trim_id: str = Field(..., description="ID of line to be trimmed")
    cutting_geometry_id: str = Field(..., description="ID of geometry that cuts the line (rectangle, polygon, circle)")
    keep_start: bool = Field(default=True, description="If True, keep start portion; if False, keep end portion")


class ExtendLineToLineRequest(BaseModel):
    """Request model for simple line-to-line extend operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line_to_extend_id: str = Field(..., description="ID of line to be extended")
    target_line_id: str = Field(..., description="ID of line to extend toward")
    extend_start: bool = Field(default=False, description="If True, extend start; if False, extend end")


class ExtendLineToGeometryRequest(BaseModel):
    """Request model for complex line-to-geometry extend operations"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    line_to_extend_id: str = Field(..., description="ID of line to be extended")
    target_geometry_id: str = Field(..., description="ID of geometry to extend toward (rectangle, polygon, circle)")
    extend_start: bool = Field(default=False, description="If True, extend start; if False, extend end")


class MirrorElementsRequest(BaseModel):
    """Request model for mirror operations using existing line"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    element_ids: List[str] = Field(..., description="List of element IDs to mirror")
    mirror_line_id: str = Field(..., description="ID of line element to use as mirror axis")
    keep_original: bool = Field(default=True, description="If True, keep original elements; if False, replace with mirrored versions")


class MirrorElementsByTwoPointsRequest(BaseModel):
    """Request model for mirror operations using two points to define mirror line"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    element_ids: List[str] = Field(..., description="List of element IDs to mirror")
    x1: float = Field(..., description="First point X coordinate")
    y1: float = Field(..., description="First point Y coordinate")
    x2: float = Field(..., description="Second point X coordinate")
    y2: float = Field(..., description="Second point Y coordinate")
    keep_original: bool = Field(default=True, description="If True, keep original elements; if False, replace with mirrored versions")


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
        
        @self.app.post("/api/v1/fillets")
        async def add_fillet(request: FilletRequest):
            """Add fillet endpoint - handles fillet operations between two lines"""
            try:
                response_data = await self._handle_add_fillet(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in add_fillet: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/chamfers")
        async def add_chamfer(request: ChamferRequest):
            """Add chamfer endpoint - handles chamfer operations between two lines"""
            try:
                response_data = await self._handle_add_chamfer(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in add_chamfer: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/trim-line-to-line")
        async def trim_line_to_line(request: TrimLineToLineRequest):
            """Trim line to line endpoint - handles simple line-to-line trim operations"""
            try:
                response_data = await self._handle_trim_line_to_line(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in trim_line_to_line: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/trim-line-to-geometry")
        async def trim_line_to_geometry(request: TrimLineToGeometryRequest):
            """Trim line to geometry endpoint - handles complex line-to-geometry trim operations"""
            try:
                response_data = await self._handle_trim_line_to_geometry(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in trim_line_to_geometry: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/extend-line-to-line")
        async def extend_line_to_line(request: ExtendLineToLineRequest):
            """Extend line to line endpoint - handles simple line-to-line extend operations"""
            try:
                response_data = await self._handle_extend_line_to_line(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in extend_line_to_line: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/extend-line-to-geometry")
        async def extend_line_to_geometry(request: ExtendLineToGeometryRequest):
            """Extend line to geometry endpoint - handles complex line-to-geometry extend operations"""
            try:
                response_data = await self._handle_extend_line_to_geometry(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in extend_line_to_geometry: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/mirror-elements")
        async def mirror_elements(request: MirrorElementsRequest):
            """Mirror elements endpoint - handles mirroring elements across an existing line"""
            try:
                response_data = await self._handle_mirror_elements(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in mirror_elements: {e}")
                return APIResponse(
                    success=False,
                    timestamp=int(time.time()),
                    error=str(e)
                )
        
        @self.app.post("/api/v1/mirror-elements-by-two-points")
        async def mirror_elements_by_two_points(request: MirrorElementsByTwoPointsRequest):
            """Mirror elements by two points endpoint - handles mirroring elements across a line defined by two points"""
            try:
                response_data = await self._handle_mirror_elements_by_two_points(request)
                
                return APIResponse(
                    success=True,
                    timestamp=int(time.time()),
                    data=response_data
                )
                
            except Exception as e:
                print(f"❌ Error in mirror_elements_by_two_points: {e}")
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
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        element_id = ""
        
        # Handle different element types
        if request.element_type == "line":
            # Extract line parameters
            params = request.get_parameters()
            
            # Validate and extract required parameters
            try:
                x1 = float(params["x1"])
                y1 = float(params["y1"])
                x2 = float(params["x2"])
                y2 = float(params["y2"])
            except (KeyError, TypeError, ValueError) as e:
                raise Exception(f"Line requires valid numeric parameters: x1, y1, x2, y2. Error: {e}")
            
            # Create line using geometry engine
            element_id = engine.add_line_to_sketch(
                request.sketch_id, 
                x1, y1, x2, y2
            )
            
            if not element_id:
                raise Exception("Failed to create line in geometry engine")
        
        elif request.element_type == "circle":
            # Extract circle parameters
            params = request.get_parameters()
            
            # Validate and extract required parameters
            try:
                center_x = float(params["center_x"])
                center_y = float(params["center_y"])
                radius = float(params["radius"])
            except (KeyError, TypeError, ValueError) as e:
                raise Exception(f"Circle requires valid numeric parameters: center_x, center_y, radius. Error: {e}")
            
            # Create circle using geometry engine
            element_id = engine.add_circle_to_sketch(
                request.sketch_id, 
                center_x, center_y, radius
            )
            
            if not element_id:
                raise Exception("Failed to create circle in geometry engine")
        
        elif request.element_type == "rectangle":
            # Extract rectangle parameters
            params = request.get_parameters()
            
            # Validate and extract required parameters
            try:
                x = float(params["x"])
                y = float(params["y"])
                width = float(params["width"])
                height = float(params["height"])
            except (KeyError, TypeError, ValueError) as e:
                raise Exception(f"Rectangle requires valid numeric parameters: x, y, width, height. Error: {e}")
            
            # Create rectangle using geometry engine
            element_id = engine.add_rectangle_to_sketch(
                request.sketch_id, 
                x, y, width, height
            )
            
            if not element_id:
                raise Exception("Failed to create rectangle in geometry engine")
        
        elif request.element_type == "arc":
            # Extract arc parameters
            params = request.get_parameters()
            
            # Validate and extract required parameters
            try:
                arc_type = params["arc_type"]
                
                if arc_type == "three_points":
                    x1 = float(params["x1"])
                    y1 = float(params["y1"])
                    x_mid = float(params["x_mid"])
                    y_mid = float(params["y_mid"])
                    x2 = float(params["x2"])
                    y2 = float(params["y2"])
                    
                    # Create arc using geometry engine
                    element_id = engine.add_arc_to_sketch(
                        request.sketch_id, 
                        arc_type,
                        x1=x1, y1=y1, x_mid=x_mid, y_mid=y_mid, x2=x2, y2=y2
                    )
                    
                elif arc_type == "endpoints_radius":
                    x1 = float(params["x1"])
                    y1 = float(params["y1"])
                    x2 = float(params["x2"])
                    y2 = float(params["y2"])
                    radius = float(params["radius"])
                    large_arc = params.get("large_arc", False)
                    
                    # Create arc using geometry engine
                    element_id = engine.add_arc_to_sketch(
                        request.sketch_id, 
                        arc_type,
                        x1=x1, y1=y1, x2=x2, y2=y2, radius=radius, large_arc=large_arc
                    )
                else:
                    raise Exception(f"Unknown arc type: {arc_type}")
                    
            except (KeyError, TypeError, ValueError) as e:
                raise Exception(f"Arc requires valid parameters based on arc_type. Error: {e}")
            
            if not element_id:
                raise Exception("Failed to create arc in geometry engine")
        
        elif request.element_type == "polygon":
            # Extract polygon parameters
            params = request.get_parameters()
            
            # Validate and extract required parameters
            try:
                center_x = float(params["center_x"])
                center_y = float(params["center_y"])
                sides = int(params["sides"])
                radius = float(params["radius"])
            except (KeyError, TypeError, ValueError) as e:
                raise Exception(f"Polygon requires valid numeric parameters: center_x, center_y, sides, radius. Error: {e}")
            
            # Create polygon using geometry engine
            element_id = engine.add_polygon_to_sketch(
                request.sketch_id, 
                center_x, center_y, sides, radius
            )
            
            if not element_id:
                raise Exception("Failed to create polygon in geometry engine")
        
        else:
            raise Exception(f"Element type '{request.element_type}' not yet implemented")
        
        # Get visualization data for the created element
        viz_data = engine.get_sketch_element_visualization_data(request.sketch_id, element_id)
        
        response_data = {
            "element_id": element_id,
            "element_type": request.element_type,
            "sketch_id": request.sketch_id,
            "session_id": request.session_id,
            "parameters": request.get_parameters(),
            "message": f"Sketch element {element_id} added successfully"
        }
        
        # Add visualization data if available
        if viz_data:
            response_data["visualization_data"] = viz_data
        
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
    
    async def _handle_add_fillet(self, request: FilletRequest) -> Dict[str, Any]:
        """Handle fillet addition - Real implementation using geometry engine"""
        print(f"🔵 Adding fillet to sketch: {request.sketch_id} between lines {request.line1_id} & {request.line2_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Validate fillet radius
        if request.radius <= 0:
            raise Exception(f"Fillet radius must be positive, got {request.radius}")
        
        # Create fillet using geometry engine
        fillet_id = engine.add_fillet_to_sketch(
            request.sketch_id,
            request.line1_id,
            request.line2_id,
            request.radius
        )
        
        if not fillet_id:
            raise Exception("Failed to create fillet in geometry engine")
        
        # Get visualization data for the created fillet
        viz_data = engine.get_sketch_element_visualization_data(request.sketch_id, fillet_id)
        
        response_data = {
            "fillet_id": fillet_id,
            "sketch_id": request.sketch_id,
            "line1_id": request.line1_id,
            "line2_id": request.line2_id,
            "radius": request.radius,
            "session_id": request.session_id,
            "message": f"Fillet {fillet_id} created successfully between lines {request.line1_id} and {request.line2_id}"
        }
        
        # Add visualization data if available
        if viz_data:
            response_data["visualization_data"] = viz_data
        
        print(f"✅ Fillet created successfully: {fillet_id}")
        return response_data
    
    async def _handle_add_chamfer(self, request: ChamferRequest) -> Dict[str, Any]:
        """Handle chamfer addition - Real implementation using geometry engine"""
        print(f"🔵 Adding chamfer to sketch: {request.sketch_id} between lines {request.line1_id} & {request.line2_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Validate chamfer distance
        if request.distance <= 0:
            raise Exception(f"Chamfer distance must be positive, got {request.distance}")
        
        # Create chamfer using geometry engine
        chamfer_id = engine.add_chamfer_to_sketch(
            request.sketch_id,
            request.line1_id,
            request.line2_id,
            request.distance
        )
        
        if not chamfer_id:
            raise Exception("Failed to create chamfer in geometry engine")
        
        # Get visualization data for the created chamfer
        viz_data = engine.get_sketch_element_visualization_data(request.sketch_id, chamfer_id)
        
        response_data = {
            "chamfer_id": chamfer_id,
            "sketch_id": request.sketch_id,
            "line1_id": request.line1_id,
            "line2_id": request.line2_id,
            "distance": request.distance,
            "session_id": request.session_id,
            "message": f"Chamfer {chamfer_id} created successfully between lines {request.line1_id} and {request.line2_id}"
        }
        
        # Add visualization data if available
        if viz_data:
            response_data["visualization_data"] = viz_data
        
        print(f"✅ Chamfer created successfully: {chamfer_id}")
        return response_data
    
    async def _handle_trim_line_to_line(self, request: TrimLineToLineRequest) -> Dict[str, Any]:
        """Handle line-to-line trim operation - Real implementation using geometry engine"""
        print(f"✂️ Trimming line: {request.line_to_trim_id} with line: {request.cutting_line_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform line-to-line trim
        success = engine.trim_line_to_line_in_sketch(
            request.sketch_id,
            request.line_to_trim_id,
            request.cutting_line_id,
            request.keep_start
        )
        
        if not success:
            raise Exception("Failed to trim line in geometry engine")
        
        response_data = {
            "line_to_trim_id": request.line_to_trim_id,
            "cutting_line_id": request.cutting_line_id,
            "sketch_id": request.sketch_id,
            "keep_start": request.keep_start,
            "session_id": request.session_id,
            "operation": "trim_line_to_line",
            "message": f"Line {request.line_to_trim_id} trimmed successfully with line {request.cutting_line_id}"
        }
        
        print(f"✅ Line trimmed successfully")
        return response_data
    
    async def _handle_trim_line_to_geometry(self, request: TrimLineToGeometryRequest) -> Dict[str, Any]:
        """Handle line-to-geometry trim operation - Real implementation using geometry engine"""
        print(f"✂️ Trimming line: {request.line_to_trim_id} with geometry: {request.cutting_geometry_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform line-to-geometry trim
        success = engine.trim_line_to_geometry_in_sketch(
            request.sketch_id,
            request.line_to_trim_id,
            request.cutting_geometry_id,
            request.keep_start
        )
        
        if not success:
            raise Exception("Failed to trim line in geometry engine")
        
        response_data = {
            "line_to_trim_id": request.line_to_trim_id,
            "cutting_geometry_id": request.cutting_geometry_id,
            "sketch_id": request.sketch_id,
            "keep_start": request.keep_start,
            "session_id": request.session_id,
            "operation": "trim_line_to_geometry",
            "message": f"Line {request.line_to_trim_id} trimmed successfully with geometry {request.cutting_geometry_id}"
        }
        
        print(f"✅ Line trimmed successfully")
        return response_data
    
    async def _handle_extend_line_to_line(self, request: ExtendLineToLineRequest) -> Dict[str, Any]:
        """Handle line-to-line extend operation - Real implementation using geometry engine"""
        print(f"📏 Extending line: {request.line_to_extend_id} to line: {request.target_line_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform line-to-line extend
        success = engine.extend_line_to_line_in_sketch(
            request.sketch_id,
            request.line_to_extend_id,
            request.target_line_id,
            request.extend_start
        )
        
        if not success:
            raise Exception("Failed to extend line in geometry engine")
        
        response_data = {
            "line_to_extend_id": request.line_to_extend_id,
            "target_line_id": request.target_line_id,
            "sketch_id": request.sketch_id,
            "extend_start": request.extend_start,
            "session_id": request.session_id,
            "operation": "extend_line_to_line",
            "message": f"Line {request.line_to_extend_id} extended successfully to line {request.target_line_id}"
        }
        
        print(f"✅ Line extended successfully")
        return response_data
    
    async def _handle_extend_line_to_geometry(self, request: ExtendLineToGeometryRequest) -> Dict[str, Any]:
        """Handle line-to-geometry extend operation - Real implementation using geometry engine"""
        print(f"📏 Extending line: {request.line_to_extend_id} to geometry: {request.target_geometry_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform line-to-geometry extend
        success = engine.extend_line_to_geometry_in_sketch(
            request.sketch_id,
            request.line_to_extend_id,
            request.target_geometry_id,
            request.extend_start
        )
        
        if not success:
            raise Exception("Failed to extend line in geometry engine")
        
        response_data = {
            "line_to_extend_id": request.line_to_extend_id,
            "target_geometry_id": request.target_geometry_id,
            "sketch_id": request.sketch_id,
            "extend_start": request.extend_start,
            "session_id": request.session_id,
            "operation": "extend_line_to_geometry",
            "message": f"Line {request.line_to_extend_id} extended successfully to geometry {request.target_geometry_id}"
        }
        
        print(f"✅ Line extended successfully")
        return response_data
    
    async def _handle_mirror_elements(self, request: MirrorElementsRequest) -> Dict[str, Any]:
        """Handle mirror elements - Real implementation using geometry engine"""
        print(f"🪞 Mirroring elements: {request.element_ids} across line: {request.mirror_line_id}")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform mirror operation
        mirrored_element_ids = engine.mirror_elements_in_sketch(
            request.sketch_id,
            request.element_ids,
            request.mirror_line_id,
            request.keep_original
        )
        
        if not mirrored_element_ids:
            raise Exception("Failed to mirror elements in geometry engine")
        
        response_data = {
            "original_element_ids": request.element_ids,
            "mirrored_element_ids": mirrored_element_ids,
            "mirror_line_id": request.mirror_line_id,
            "sketch_id": request.sketch_id,
            "keep_original": request.keep_original,
            "session_id": request.session_id,
            "operation": "mirror_elements",
            "message": f"{len(mirrored_element_ids)} elements mirrored successfully across line {request.mirror_line_id}"
        }
        
        print(f"✅ Elements mirrored successfully")
        return response_data
    
    async def _handle_mirror_elements_by_two_points(self, request: MirrorElementsByTwoPointsRequest) -> Dict[str, Any]:
        """Handle mirror elements by two points - Real implementation using geometry engine"""
        print(f"🪞 Mirroring elements: {request.element_ids} across line defined by points: ({request.x1}, {request.y1}) and ({request.x2}, {request.y2})")
        
        session_manager = SessionManager.get_instance()
        engine = session_manager.get_or_create_session(request.session_id)
        
        if engine is None:
            raise Exception("Failed to get session")
        
        # Validate that the sketch exists
        if not engine.sketch_exists(request.sketch_id):
            raise Exception(f"Sketch '{request.sketch_id}' does not exist")
        
        # Perform mirror operation
        mirrored_element_ids = engine.mirror_elements_by_two_points_in_sketch(
            request.sketch_id,
            request.element_ids,
            request.x1,
            request.y1,
            request.x2,
            request.y2,
            request.keep_original
        )
        
        if not mirrored_element_ids:
            raise Exception("Failed to mirror elements in geometry engine")
        
        response_data = {
            "original_element_ids": request.element_ids,
            "mirrored_element_ids": mirrored_element_ids,
            "mirror_line_points": {
                "x1": request.x1,
                "y1": request.y1,
                "x2": request.x2,
                "y2": request.y2
            },
            "sketch_id": request.sketch_id,
            "keep_original": request.keep_original,
            "session_id": request.session_id,
            "operation": "mirror_elements_by_two_points",
            "message": f"{len(mirrored_element_ids)} elements mirrored successfully across line defined by two points"
        }
        
        print(f"✅ Elements mirrored successfully")
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