"""
Core geometry engine using pythonOCC - Python version of OCCTEngine
"""
import json
import random
import string
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import time

# pythonOCC core imports
from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse, BRepAlgoAPI_Cut, BRepAlgoAPI_Common
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.BRepCheck import BRepCheck_Analyzer
from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeSphere, BRepPrimAPI_MakeCylinder
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_FACE, TopAbs_REVERSED
from OCC.Core.BRep import BRep_Tool
from OCC.Core.TopoDS import TopoDS_Shape, TopoDS_Face, topods
from OCC.Core.Poly import Poly_Triangulation
from OCC.Core.TopLoc import TopLoc_Location
from OCC.Core.gp import gp_Pnt, gp_Vec, gp_Dir, gp_Ax3, gp_Pln, gp_Pnt2d, gp_Lin2d
from OCC.Core.Standard import Standard_Failure

# For sketch-based modeling
from OCC.Core.Geom import Geom_Plane
from OCC.Core.gce import gce_MakePln


class SketchElementType(Enum):
    """Sketch element types - matching C++ version"""
    LINE = "line"
    CIRCLE = "circle"
    ARC = "arc"
    RECTANGLE = "rectangle"
    POLYGON = "polygon"


@dataclass
class SketchElement:
    """
    Sketch element data structure - matching C++ SketchElement
    """
    id: str
    element_type: SketchElementType
    start_point: Optional[gp_Pnt2d] = None
    end_point: Optional[gp_Pnt2d] = None
    center_point: Optional[gp_Pnt2d] = None
    parameters: Optional[List[float]] = None
    referenced_elements: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = []
        if self.referenced_elements is None:
            self.referenced_elements = []


@dataclass
class Vector3d:
    """3D vector structure matching the C++ version"""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    def __add__(self, other: 'Vector3d') -> 'Vector3d':
        return Vector3d(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other: 'Vector3d') -> 'Vector3d':
        return Vector3d(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar: float) -> 'Vector3d':
        return Vector3d(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def magnitude(self) -> float:
        return (self.x**2 + self.y**2 + self.z**2)**0.5
    
    def to_gp_pnt(self) -> gp_Pnt:
        """Convert to OpenCascade point"""
        return gp_Pnt(self.x, self.y, self.z)
    
    def to_gp_vec(self) -> gp_Vec:
        """Convert to OpenCascade vector"""
        return gp_Vec(self.x, self.y, self.z)


@dataclass
class MeshData:
    """Mesh data structure matching the C++ version"""
    vertices: List[float]
    faces: List[int]
    normals: List[float]
    vertex_count: int = 0
    face_count: int = 0
    tessellation_quality: float = 0.1
    
    def __post_init__(self):
        self.vertex_count = len(self.vertices) // 3
        self.face_count = len(self.faces) // 3


class Sketch:
    """
    Sketch class for sketch-based modeling
    """
    
    def __init__(self, sketch_id: str, plane_id: str, sketch_plane: 'SketchPlane'):
        self.sketch_id = sketch_id
        self.plane_id = plane_id
        self.sketch_plane = sketch_plane
        self.elements: List[SketchElement] = []  # List of sketch elements
        self.is_closed = False
        
        print(f"✅ Created sketch: {sketch_id} on plane: {plane_id}")
    
    def get_sketch_id(self) -> str:
        """Get sketch ID"""
        return self.sketch_id
    
    def get_plane_id(self) -> str:
        """Get associated plane ID"""
        return self.plane_id
    
    def get_element_count(self) -> int:
        """Get number of elements in sketch"""
        return len(self.elements)
    
    def add_element(self, element: SketchElement) -> bool:
        """Add element to sketch"""
        try:
            self.elements.append(element)
            print(f"✅ Added element to sketch {self.sketch_id}: {len(self.elements)} elements")
            return True
        except Exception as e:
            print(f"❌ Error adding element to sketch: {e}")
            return False
    
    def add_line(self, start_point: gp_Pnt2d, end_point: gp_Pnt2d) -> str:
        """Add line to sketch - matching C++ version"""
        try:
            # Generate unique element ID
            element_id = f"line_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create line element
            line_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.LINE,
                start_point=start_point,
                end_point=end_point
            )
            
            # Add to sketch
            if self.add_element(line_element):
                print(f"✅ Added line {element_id}: ({start_point.X():.2f},{start_point.Y():.2f}) to ({end_point.X():.2f},{end_point.Y():.2f})")
                return element_id
            else:
                print(f"❌ Failed to add line element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding line to sketch: {e}")
            return ""
    
    def add_circle(self, center_point: gp_Pnt2d, radius: float) -> str:
        """Add circle to sketch - matching C++ version"""
        try:
            # Generate unique element ID
            element_id = f"circle_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create circle element
            circle_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.CIRCLE,
                center_point=center_point,
                parameters=[radius]  # Store radius as parameter
            )
            
            # Add to sketch
            if self.add_element(circle_element):
                print(f"✅ Added circle {element_id}: center({center_point.X():.2f},{center_point.Y():.2f}) radius={radius:.2f}")
                return element_id
            else:
                print(f"❌ Failed to add circle element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding circle to sketch: {e}")
            return ""
    
    def add_rectangle(self, corner_point: gp_Pnt2d, width: float, height: float) -> str:
        """Add rectangle to sketch - matching C++ version"""
        try:
            # Generate unique element ID
            element_id = f"rectangle_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create rectangle element
            rectangle_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.RECTANGLE,
                start_point=corner_point,  # Use start_point for corner
                parameters=[width, height]  # Store dimensions as parameters
            )
            
            # Add to sketch
            if self.add_element(rectangle_element):
                print(f"✅ Added rectangle {element_id}: corner({corner_point.X():.2f},{corner_point.Y():.2f}) size={width:.2f}x{height:.2f}")
                return element_id
            else:
                print(f"❌ Failed to add rectangle element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding rectangle to sketch: {e}")
            return ""
    
    def add_arc_three_points(self, start_point: gp_Pnt2d, mid_point: gp_Pnt2d, end_point: gp_Pnt2d) -> str:
        """Add arc to sketch using three points (start, middle, end) - matching C++ version"""
        try:
            # Generate unique element ID
            element_id = f"arc_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Calculate center and radius from three points
            center, radius = self._calculate_arc_center_radius(start_point, mid_point, end_point)
            
            if center is None or radius <= 0:
                print(f"❌ Invalid arc points - cannot calculate center and radius")
                return ""
            
            # Calculate start and end angles
            start_angle = math.atan2(start_point.Y() - center.Y(), start_point.X() - center.X())
            end_angle = math.atan2(end_point.Y() - center.Y(), end_point.X() - center.X())
            
            # Create arc element
            arc_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.ARC,
                start_point=start_point,
                end_point=end_point,
                center_point=center,
                parameters=[radius, start_angle, end_angle]  # Store radius and angles
            )
            
            # Add to sketch
            if self.add_element(arc_element):
                print(f"✅ Added arc {element_id}: center({center.X():.2f},{center.Y():.2f}) radius={radius:.2f}")
                return element_id
            else:
                print(f"❌ Failed to add arc element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding arc to sketch: {e}")
            return ""
    
    def add_arc_endpoints_radius(self, start_point: gp_Pnt2d, end_point: gp_Pnt2d, radius: float, large_arc: bool = False) -> str:
        """Add arc to sketch using two endpoints and radius"""
        try:
            # Generate unique element ID
            element_id = f"arc_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Calculate center from endpoints and radius
            center = self._calculate_arc_center_from_endpoints(start_point, end_point, radius, large_arc)
            
            if center is None:
                print(f"❌ Invalid arc parameters - cannot calculate center")
                return ""
            
            # Calculate start and end angles
            start_angle = math.atan2(start_point.Y() - center.Y(), start_point.X() - center.X())
            end_angle = math.atan2(end_point.Y() - center.Y(), end_point.X() - center.X())
            
            # Create arc element
            arc_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.ARC,
                start_point=start_point,
                end_point=end_point,
                center_point=center,
                parameters=[radius, start_angle, end_angle]  # Store radius and angles
            )
            
            # Add to sketch
            if self.add_element(arc_element):
                print(f"✅ Added arc {element_id}: center({center.X():.2f},{center.Y():.2f}) radius={radius:.2f}")
                return element_id
            else:
                print(f"❌ Failed to add arc element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding arc to sketch: {e}")
            return ""
    
    def add_polygon(self, center_point: gp_Pnt2d, sides: int, radius: float) -> str:
        """Add regular polygon to sketch - matching C++ version"""
        try:
            if sides < 3:
                print(f"❌ Polygon must have at least 3 sides, got {sides}")
                return ""
            
            # Generate unique element ID
            element_id = f"polygon_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create polygon element
            polygon_element = SketchElement(
                id=element_id,
                element_type=SketchElementType.POLYGON,
                center_point=center_point,
                parameters=[radius, float(sides)]  # Store radius and number of sides
            )
            
            # Add to sketch
            if self.add_element(polygon_element):
                print(f"✅ Added polygon {element_id}: center({center_point.X():.2f},{center_point.Y():.2f}) {sides} sides, radius={radius:.2f}")
                return element_id
            else:
                print(f"❌ Failed to add polygon element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding polygon to sketch: {e}")
            return ""
    
    def _calculate_arc_center_radius(self, p1: gp_Pnt2d, p2: gp_Pnt2d, p3: gp_Pnt2d) -> Tuple[Optional[gp_Pnt2d], float]:
        """Calculate center and radius of arc from three points"""
        try:
            # Convert to regular coordinates for calculation
            x1, y1 = p1.X(), p1.Y()
            x2, y2 = p2.X(), p2.Y()
            x3, y3 = p3.X(), p3.Y()
            
            # Check if points are collinear
            area = 0.5 * abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1))
            if area < 1e-10:  # Points are collinear
                return None, 0.0
            
            # Calculate center using circumcenter formula
            d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
            if abs(d) < 1e-10:  # Avoid division by zero
                return None, 0.0
            
            ux = ((x1*x1 + y1*y1) * (y2 - y3) + (x2*x2 + y2*y2) * (y3 - y1) + (x3*x3 + y3*y3) * (y1 - y2)) / d
            uy = ((x1*x1 + y1*y1) * (x3 - x2) + (x2*x2 + y2*y2) * (x1 - x3) + (x3*x3 + y3*y3) * (x2 - x1)) / d
            
            center = gp_Pnt2d(ux, uy)
            radius = math.sqrt((ux - x1)**2 + (uy - y1)**2)
            
            return center, radius
            
        except Exception as e:
            print(f"❌ Error calculating arc center: {e}")
            return None, 0.0
    
    def _calculate_arc_center_from_endpoints(self, start: gp_Pnt2d, end: gp_Pnt2d, radius: float, large_arc: bool) -> Optional[gp_Pnt2d]:
        """Calculate center of arc from two endpoints and radius"""
        try:
            x1, y1 = start.X(), start.Y()
            x2, y2 = end.X(), end.Y()
            
            # Distance between endpoints
            d = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            
            # Check if radius is large enough
            if d > 2 * radius:
                print(f"❌ Radius {radius} too small for distance {d}")
                return None
            
            # Midpoint between endpoints
            mx = (x1 + x2) / 2
            my = (y1 + y2) / 2
            
            # Distance from midpoint to center
            h = math.sqrt(radius**2 - (d/2)**2)
            
            # Unit vector perpendicular to the line between endpoints
            ux = -(y2 - y1) / d
            uy = (x2 - x1) / d
            
            # Two possible centers
            if large_arc:
                cx = mx + h * ux
                cy = my + h * uy
            else:
                cx = mx - h * ux
                cy = my - h * uy
            
            return gp_Pnt2d(cx, cy)
            
        except Exception as e:
            print(f"❌ Error calculating arc center from endpoints: {e}")
            return None
    
    def get_element_by_id(self, element_id: str) -> Optional[SketchElement]:
        """Get sketch element by ID"""
        for element in self.elements:
            if element.id == element_id:
                return element
        return None
    
    def get_elements(self) -> List[SketchElement]:
        """Get all sketch elements"""
        return self.elements.copy()
    
    def get_visualization_data(self) -> Dict[str, Any]:
        """Get visualization data for the sketch - matches SketchVisualizationData interface"""
        # Get coordinate system from the associated plane
        origin = self.sketch_plane.get_origin()
        normal = self.sketch_plane.get_normal()
        
        # Get local axes from plane's coordinate system
        if self.sketch_plane.coordinate_system:
            x_direction = self.sketch_plane.coordinate_system.XDirection()
            y_direction = self.sketch_plane.coordinate_system.YDirection()
            u_axis = [x_direction.X(), x_direction.Y(), x_direction.Z()]
            v_axis = [y_direction.X(), y_direction.Y(), y_direction.Z()]
        else:
            # Fallback axes based on plane type
            plane_type = self.sketch_plane.get_plane_type()
            if plane_type == "XY":
                u_axis = [1.0, 0.0, 0.0]  # X axis
                v_axis = [0.0, 1.0, 0.0]  # Y axis
            elif plane_type == "XZ":
                u_axis = [1.0, 0.0, 0.0]  # X axis
                v_axis = [0.0, 0.0, 1.0]  # Z axis
            elif plane_type == "YZ":
                u_axis = [0.0, 1.0, 0.0]  # Y axis
                v_axis = [0.0, 0.0, 1.0]  # Z axis
            else:
                u_axis = [1.0, 0.0, 0.0]
                v_axis = [0.0, 1.0, 0.0]
        
        return {
            "sketch_id": self.sketch_id,
            "plane_id": self.plane_id,
            "origin": [origin.x, origin.y, origin.z],          # Array format
            "u_axis": u_axis,                                   # Local X axis
            "v_axis": v_axis,                                   # Local Y axis
            "normal": [normal.x, normal.y, normal.z]           # Array format
        }


class SketchPlane:
    """
    Sketch plane class for sketch-based modeling
    """
    
    def __init__(self, plane_id: str, plane_type: str, origin: Vector3d = Vector3d()):
        self.plane_id = plane_id
        self.plane_type = plane_type
        self.origin = origin
        self.plane_geometry = None
        self.coordinate_system = None
        
        # Create the geometric plane
        self._create_plane_geometry()
    
    def _create_plane_geometry(self):
        """Create the actual OpenCascade plane geometry"""
        try:
            origin_pnt = self.origin.to_gp_pnt()
            
            if self.plane_type == "XY":
                # XY plane - normal along Z axis
                normal = gp_Dir(0, 0, 1)
                x_axis = gp_Dir(1, 0, 0)
            elif self.plane_type == "XZ":
                # XZ plane - normal along Y axis  
                normal = gp_Dir(0, 1, 0)
                x_axis = gp_Dir(1, 0, 0)
            elif self.plane_type == "YZ":
                # YZ plane - normal along X axis
                normal = gp_Dir(1, 0, 0)
                x_axis = gp_Dir(0, 1, 0)
            else:
                raise Exception(f"Unknown plane type: {self.plane_type}")
            
            # Create coordinate system for reference
            self.coordinate_system = gp_Ax3(origin_pnt, normal, x_axis)
            
            # Create plane using point and normal direction (simpler constructor)
            plane_maker = gce_MakePln(origin_pnt, normal)
            if plane_maker.IsDone():
                gp_plane = plane_maker.Value()
                self.plane_geometry = Geom_Plane(gp_plane)
            else:
                raise Exception("Failed to create plane geometry")
                
        except Exception as e:
            print(f"❌ Error creating plane geometry: {e}")
            raise
    
    def get_plane_id(self) -> str:
        """Get plane ID"""
        return self.plane_id
    
    def get_plane_type(self) -> str:
        """Get plane type"""
        return self.plane_type
    
    def get_origin(self) -> Vector3d:
        """Get plane origin"""
        return self.origin
    
    def get_normal(self) -> Vector3d:
        """Get plane normal vector"""
        if self.coordinate_system:
            direction = self.coordinate_system.Direction()
            return Vector3d(direction.X(), direction.Y(), direction.Z())
        return Vector3d(0, 0, 1)
    
    def get_visualization_data(self) -> Dict[str, Any]:
        """Get visualization data for the plane - matches PlaneVisualizationData interface"""
        normal = self.get_normal()
        
        # Calculate local coordinate axes (u_axis and v_axis)
        if self.coordinate_system:
            x_direction = self.coordinate_system.XDirection()
            y_direction = self.coordinate_system.YDirection()
            u_axis = [x_direction.X(), x_direction.Y(), x_direction.Z()]
            v_axis = [y_direction.X(), y_direction.Y(), y_direction.Z()]
        else:
            # Fallback axes based on plane type
            if self.plane_type == "XY":
                u_axis = [1.0, 0.0, 0.0]  # X axis
                v_axis = [0.0, 1.0, 0.0]  # Y axis
            elif self.plane_type == "XZ":
                u_axis = [1.0, 0.0, 0.0]  # X axis
                v_axis = [0.0, 0.0, 1.0]  # Z axis
            elif self.plane_type == "YZ":
                u_axis = [0.0, 1.0, 0.0]  # Y axis
                v_axis = [0.0, 0.0, 1.0]  # Z axis
            else:
                u_axis = [1.0, 0.0, 0.0]
                v_axis = [0.0, 1.0, 0.0]
        
        return {
            "plane_id": self.plane_id,
            "plane_type": self.plane_type,
            "origin": [self.origin.x, self.origin.y, self.origin.z],          # Array format
            "normal": [normal.x, normal.y, normal.z],                         # Array format
            "u_axis": u_axis,                                                  # Local X axis
            "v_axis": v_axis,                                                  # Local Y axis
            "size": 100.0                                                     # Grid size for visualization
        }


class OCCTEngine:
    """
    Python version of the C++ OCCTEngine class using pythonOCC
    Provides the same interface as the original C++ implementation
    """
    
    def __init__(self):
        """Initialize the geometry engine"""
        self.shapes: Dict[str, TopoDS_Shape] = {}
        self.parameters: Dict[str, float] = {}
        
        # Sketch-based modeling support
        self.sketch_planes: Dict[str, SketchPlane] = {}
        self.sketches: Dict[str, Sketch] = {}
        self.extrude_features: Dict[str, Any] = {}
        
        print("OCCT Engine initialized (Python)")
    
    def __del__(self):
        """Cleanup - equivalent to C++ destructor"""
        self.clear_all()
    
    # ==================== BOOLEAN OPERATIONS ====================
    
    def union_shapes(self, shape1_id: str, shape2_id: str, result_id: str) -> bool:
        """
        Boolean union operation - equivalent to C++ unionShapes
        """
        if not self.shape_exists(shape1_id) or not self.shape_exists(shape2_id):
            return False
        
        try:
            shape1 = self.shapes[shape1_id]
            shape2 = self.shapes[shape2_id]
            
            fuse_maker = BRepAlgoAPI_Fuse(shape1, shape2)
            result = fuse_maker.Shape()
            
            if not self._validate_shape(result):
                return False
            
            self.shapes[result_id] = result
            return True
            
        except Standard_Failure as e:
            print(f"OCCT Error in union operation: {e}")
            return False
        except Exception as e:
            print(f"Python error in union operation: {e}")
            return False
    
    def cut_shapes(self, shape1_id: str, shape2_id: str, result_id: str) -> bool:
        """
        Boolean cut operation - equivalent to C++ cutShapes
        """
        if not self.shape_exists(shape1_id) or not self.shape_exists(shape2_id):
            return False
        
        try:
            shape1 = self.shapes[shape1_id]
            shape2 = self.shapes[shape2_id]
            
            cut_maker = BRepAlgoAPI_Cut(shape1, shape2)
            result = cut_maker.Shape()
            
            if not self._validate_shape(result):
                return False
            
            self.shapes[result_id] = result
            return True
            
        except Standard_Failure as e:
            print(f"OCCT Error in cut operation: {e}")
            return False
        except Exception as e:
            print(f"Python error in cut operation: {e}")
            return False
    
    def intersect_shapes(self, shape1_id: str, shape2_id: str, result_id: str) -> bool:
        """
        Boolean intersection operation - equivalent to C++ intersectShapes
        """
        if not self.shape_exists(shape1_id) or not self.shape_exists(shape2_id):
            return False
        
        try:
            shape1 = self.shapes[shape1_id]
            shape2 = self.shapes[shape2_id]
            
            common_maker = BRepAlgoAPI_Common(shape1, shape2)
            result = common_maker.Shape()
            
            if not self._validate_shape(result):
                return False
            
            self.shapes[result_id] = result
            return True
            
        except Standard_Failure as e:
            print(f"OCCT Error in intersect operation: {e}")
            return False
        except Exception as e:
            print(f"Python error in intersect operation: {e}")
            return False
    
    # ==================== TESSELLATION ====================
    
    def tessellate(self, shape_id: str, deflection: float = 0.1) -> MeshData:
        """
        Tessellate shape to mesh - equivalent to C++ tessellate method
        """
        mesh_data = MeshData(vertices=[], faces=[], normals=[])
        
        if not self.shape_exists(shape_id):
            print(f"❌ Shape {shape_id} does not exist!")
            return mesh_data
        
        try:
            shape = self.shapes[shape_id]
            
            # Perform tessellation
            mesh = BRepMesh_IncrementalMesh(shape, deflection)
            mesh.Perform()
            
            # Extract triangulation data
            explorer = TopExp_Explorer(shape, TopAbs_FACE)
            
            while explorer.More():
                face = topods.Face(explorer.Current())
                location = TopLoc_Location()
                triangulation = BRep_Tool.Triangulation(face, location)
                
                if triangulation is not None:
                    # Get transformation from location
                    transformation = location.Transformation()
                    
                    # Base vertex index for this face
                    base_vertex_index = len(mesh_data.vertices) // 3
                    
                    # Add vertices
                    for i in range(1, triangulation.NbNodes() + 1):
                        vertex = triangulation.Node(i)
                        # Apply transformation
                        vertex.Transform(transformation)
                        
                        mesh_data.vertices.extend([vertex.X(), vertex.Y(), vertex.Z()])
                    
                    # Add normals if available
                    if triangulation.HasNormals():
                        for i in range(1, triangulation.NbNodes() + 1):
                            normal = triangulation.Normal(i)
                            mesh_data.normals.extend([normal.X(), normal.Y(), normal.Z()])
                    
                    # Add faces
                    for i in range(1, triangulation.NbTriangles() + 1):
                        triangle = triangulation.Triangle(i)
                        n1, n2, n3 = triangle.Get()
                        
                        # Check face orientation
                        if face.Orientation() == TopAbs_REVERSED:
                            mesh_data.faces.extend([
                                base_vertex_index + n1 - 1,
                                base_vertex_index + n3 - 1,
                                base_vertex_index + n2 - 1
                            ])
                        else:
                            mesh_data.faces.extend([
                                base_vertex_index + n1 - 1,
                                base_vertex_index + n2 - 1,
                                base_vertex_index + n3 - 1
                            ])
                
                explorer.Next()
            
            # Update metadata
            mesh_data.vertex_count = len(mesh_data.vertices) // 3
            mesh_data.face_count = len(mesh_data.faces) // 3
            mesh_data.tessellation_quality = deflection
            
            print(f"✅ Tessellation complete: {mesh_data.vertex_count} vertices, {mesh_data.face_count} faces")
            
        except Standard_Failure as e:
            print(f"OCCT Error in tessellation: {e}")
        except Exception as e:
            print(f"Python error in tessellation: {e}")
        
        return mesh_data
    
    # ==================== PRIMITIVE CREATION ====================
    
    def create_box(self, width: float, height: float, depth: float, shape_id: Optional[str] = None) -> str:
        """Create a box primitive"""
        if shape_id is None:
            shape_id = self._generate_shape_id()
        
        try:
            box_maker = BRepPrimAPI_MakeBox(width, height, depth)
            shape = box_maker.Shape()
            
            if self._validate_shape(shape):
                self.shapes[shape_id] = shape
                print(f"✅ Created box {shape_id}: {width}x{height}x{depth}")
                return shape_id
            else:
                print(f"❌ Failed to create valid box")
                return ""
                
        except Exception as e:
            print(f"❌ Error creating box: {e}")
            return ""
    
    def create_sphere(self, radius: float, center: Vector3d = Vector3d(), shape_id: Optional[str] = None) -> str:
        """Create a sphere primitive"""
        if shape_id is None:
            shape_id = self._generate_shape_id()
        
        try:
            center_pnt = center.to_gp_pnt()
            sphere_maker = BRepPrimAPI_MakeSphere(center_pnt, radius)
            shape = sphere_maker.Shape()
            
            if self._validate_shape(shape):
                self.shapes[shape_id] = shape
                print(f"✅ Created sphere {shape_id}: radius={radius} at ({center.x},{center.y},{center.z})")
                return shape_id
            else:
                print(f"❌ Failed to create valid sphere")
                return ""
                
        except Exception as e:
            print(f"❌ Error creating sphere: {e}")
            return ""
    
    # ==================== SKETCH-BASED MODELING ====================
    
    def create_sketch_plane(self, plane_type: str, origin: Vector3d = Vector3d()) -> str:
        """
        Create sketch plane - equivalent to C++ createSketchPlane
        
        Args:
            plane_type: Type of plane ("XY", "XZ", "YZ")
            origin: Origin point of the plane
            
        Returns:
            Plane ID if successful, empty string if failed
        """
        print(f"🎯 Creating sketch plane: {plane_type} at ({origin.x},{origin.y},{origin.z})")
        
        try:
            # Generate unique plane ID using sequential numbering
            plane_id = self._generate_unique_plane_id()
            
            # Create sketch plane
            sketch_plane = SketchPlane(plane_id, plane_type, origin)
            
            # Store the plane
            self.sketch_planes[plane_id] = sketch_plane
            
            print(f"✅ Created sketch plane: {plane_id}")
            return plane_id
            
        except Exception as e:
            print(f"❌ Error creating sketch plane: {e}")
            return ""
    
    def plane_exists(self, plane_id: str) -> bool:
        """Check if sketch plane exists - equivalent to C++ planeExists"""
        return plane_id in self.sketch_planes
    
    def get_plane_visualization_data(self, plane_id: str) -> Optional[Dict[str, Any]]:
        """
        Get plane visualization data - equivalent to C++ getPlaneVisualizationData
        
        Args:
            plane_id: Plane identifier
            
        Returns:
            Visualization data dictionary or None if plane doesn't exist
        """
        if not self.plane_exists(plane_id):
            print(f"❌ Sketch plane not found: {plane_id}")
            return None
        
        try:
            plane = self.sketch_planes[plane_id]
            return plane.get_visualization_data()
            
        except Exception as e:
            print(f"❌ Error getting plane visualization data: {e}")
            return None
    
    def get_available_plane_ids(self) -> List[str]:
        """Get list of available plane IDs - equivalent to C++ getAvailablePlaneIds"""
        return list(self.sketch_planes.keys())
    
    def create_sketch(self, plane_id: str) -> str:
        """
        Create sketch on plane - equivalent to C++ createSketch
        
        Args:
            plane_id: ID of the plane to create sketch on
            
        Returns:
            Sketch ID if successful, empty string if failed
        """
        print(f"📐 Creating sketch on plane: {plane_id}")
        
        try:
            # Check if plane exists
            if not self.plane_exists(plane_id):
                print(f"❌ Sketch plane not found: {plane_id}")
                return ""
            
            # Generate unique sketch ID using sequential numbering
            sketch_id = self._generate_unique_sketch_id()
            
            # Get the sketch plane
            sketch_plane = self.sketch_planes[plane_id]
            
            # Create sketch
            sketch = Sketch(sketch_id, plane_id, sketch_plane)
            
            # Store the sketch
            self.sketches[sketch_id] = sketch
            
            print(f"✅ Created sketch: {sketch_id} on plane: {plane_id}")
            return sketch_id
            
        except Exception as e:
            print(f"❌ Error creating sketch: {e}")
            return ""
    
    def sketch_exists(self, sketch_id: str) -> bool:
        """Check if sketch exists - equivalent to C++ sketchExists"""
        return sketch_id in self.sketches
    
    def get_sketch_visualization_data(self, sketch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get sketch visualization data - equivalent to C++ getSketchVisualizationData
        
        Args:
            sketch_id: Sketch identifier
            
        Returns:
            Visualization data dictionary or None if sketch doesn't exist
        """
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return None
        
        try:
            sketch = self.sketches[sketch_id]
            return sketch.get_visualization_data()
            
        except Exception as e:
            print(f"❌ Error getting sketch visualization data: {e}")
            return None
    
    def get_available_sketch_ids(self) -> List[str]:
        """Get list of available sketch IDs - equivalent to C++ getAvailableSketchIds"""
        return list(self.sketches.keys())
    
    def get_sketch_info(self, sketch_id: str) -> Optional[Dict[str, Any]]:
        """Get sketch information - equivalent to C++ getSketchInfo"""
        if not self.sketch_exists(sketch_id):
            return None
        
        try:
            sketch = self.sketches[sketch_id]
            
            return {
                "sketch_id": sketch.get_sketch_id(),
                "plane_id": sketch.get_plane_id(),
                "element_count": sketch.get_element_count(),
                "is_closed": sketch.is_closed
            }
            
        except Exception as e:
            print(f"❌ Error getting sketch info: {e}")
            return None
    
    # ==================== SKETCH ELEMENT CREATION METHODS ====================
    
    def add_line_to_sketch(self, sketch_id: str, x1: float, y1: float, x2: float, y2: float) -> str:
        """
        Add line to sketch - equivalent to C++ addLineToSketch
        
        Args:
            sketch_id: Sketch identifier
            x1, y1: Start point coordinates in 2D sketch space
            x2, y2: End point coordinates in 2D sketch space
            
        Returns:
            Line element ID if successful, empty string if failed
        """
        print(f"📏 Adding line to sketch {sketch_id}: ({x1},{y1}) to ({x2},{y2})")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Create 2D points
            start_point = gp_Pnt2d(x1, y1)
            end_point = gp_Pnt2d(x2, y2)
            
            # Add line to sketch
            line_id = sketch.add_line(start_point, end_point)
            
            if line_id:
                print(f"✅ Added line {line_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add line to sketch {sketch_id}")
            
            return line_id
            
        except Exception as e:
            print(f"❌ Error adding line to sketch: {e}")
            return ""
    
    def add_circle_to_sketch(self, sketch_id: str, center_x: float, center_y: float, radius: float) -> str:
        """
        Add circle to sketch - equivalent to C++ addCircleToSketch
        
        Args:
            sketch_id: Sketch identifier
            center_x, center_y: Center point coordinates in 2D sketch space
            radius: Circle radius
            
        Returns:
            Circle element ID if successful, empty string if failed
        """
        print(f"⭕ Adding circle to sketch {sketch_id}: center({center_x},{center_y}) radius={radius}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Create 2D center point
            center_point = gp_Pnt2d(center_x, center_y)
            
            # Add circle to sketch
            circle_id = sketch.add_circle(center_point, radius)
            
            if circle_id:
                print(f"✅ Added circle {circle_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add circle to sketch {sketch_id}")
            
            return circle_id
            
        except Exception as e:
            print(f"❌ Error adding circle to sketch: {e}")
            return ""
    
    def add_rectangle_to_sketch(self, sketch_id: str, x: float, y: float, width: float, height: float) -> str:
        """
        Add rectangle to sketch - equivalent to C++ addRectangleToSketch
        
        Args:
            sketch_id: Sketch identifier
            x, y: Bottom-left corner coordinates in 2D sketch space
            width, height: Rectangle dimensions
            
        Returns:
            Rectangle element ID if successful, empty string if failed
        """
        print(f"▭ Adding rectangle to sketch {sketch_id}: ({x},{y}) size {width}x{height}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Create 2D corner point
            corner_point = gp_Pnt2d(x, y)
            
            # Add rectangle to sketch
            rectangle_id = sketch.add_rectangle(corner_point, width, height)
            
            if rectangle_id:
                print(f"✅ Added rectangle {rectangle_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add rectangle to sketch {sketch_id}")
            
            return rectangle_id
            
        except Exception as e:
            print(f"❌ Error adding rectangle to sketch: {e}")
            return ""
    
    def add_arc_to_sketch(self, sketch_id: str, arc_type: str, **kwargs) -> str:
        """
        Add arc to sketch - equivalent to C++ addArcToSketch
        
        Args:
            sketch_id: Sketch identifier
            arc_type: "three_points" or "endpoints_radius"
            **kwargs: Arc parameters based on type
                For three_points: x1, y1, x_mid, y_mid, x2, y2
                For endpoints_radius: x1, y1, x2, y2, radius, large_arc=False
                
        Returns:
            Arc element ID if successful, empty string if failed
        """
        print(f"🌙 Adding arc to sketch {sketch_id}: type={arc_type}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            if arc_type == "three_points":
                # Arc from three points (start, middle, end)
                x1 = kwargs.get("x1")
                y1 = kwargs.get("y1")
                x_mid = kwargs.get("x_mid")
                y_mid = kwargs.get("y_mid")
                x2 = kwargs.get("x2")
                y2 = kwargs.get("y2")
                
                if None in [x1, y1, x_mid, y_mid, x2, y2]:
                    print(f"❌ Missing parameters for three-point arc")
                    return ""
                
                start_point = gp_Pnt2d(x1, y1)
                mid_point = gp_Pnt2d(x_mid, y_mid)
                end_point = gp_Pnt2d(x2, y2)
                
                arc_id = sketch.add_arc_three_points(start_point, mid_point, end_point)
                
            elif arc_type == "endpoints_radius":
                # Arc from two endpoints and radius
                x1 = kwargs.get("x1")
                y1 = kwargs.get("y1")
                x2 = kwargs.get("x2")
                y2 = kwargs.get("y2")
                radius = kwargs.get("radius")
                large_arc = kwargs.get("large_arc", False)
                
                if None in [x1, y1, x2, y2, radius]:
                    print(f"❌ Missing parameters for endpoints-radius arc")
                    return ""
                
                start_point = gp_Pnt2d(x1, y1)
                end_point = gp_Pnt2d(x2, y2)
                
                arc_id = sketch.add_arc_endpoints_radius(start_point, end_point, radius, large_arc)
                
            else:
                print(f"❌ Unknown arc type: {arc_type}")
                return ""
            
            if arc_id:
                print(f"✅ Added arc {arc_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add arc to sketch {sketch_id}")
            
            return arc_id
            
        except Exception as e:
            print(f"❌ Error adding arc to sketch: {e}")
            return ""
    
    def add_polygon_to_sketch(self, sketch_id: str, center_x: float, center_y: float, sides: int, radius: float) -> str:
        """
        Add regular polygon to sketch - equivalent to C++ addPolygonToSketch
        
        Args:
            sketch_id: Sketch identifier
            center_x, center_y: Center point coordinates in 2D sketch space
            sides: Number of sides (must be >= 3)
            radius: Circumradius (distance from center to vertex)
            
        Returns:
            Polygon element ID if successful, empty string if failed
        """
        print(f"⬢ Adding {sides}-sided polygon to sketch {sketch_id}: center({center_x},{center_y}) radius={radius}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        if sides < 3:
            print(f"❌ Polygon must have at least 3 sides, got {sides}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Create 2D center point
            center_point = gp_Pnt2d(center_x, center_y)
            
            # Add polygon to sketch
            polygon_id = sketch.add_polygon(center_point, sides, radius)
            
            if polygon_id:
                print(f"✅ Added polygon {polygon_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add polygon to sketch {sketch_id}")
            
            return polygon_id
            
        except Exception as e:
            print(f"❌ Error adding polygon to sketch: {e}")
            return ""
    
    def get_sketch_element_visualization_data(self, sketch_id: str, element_id: str) -> Optional[Dict[str, Any]]:
        """
        Get sketch element visualization data - equivalent to C++ getSketchElementVisualizationData
        
        Args:
            sketch_id: Sketch identifier
            element_id: Element identifier
            
        Returns:
            Visualization data dictionary or None if not found
        """
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found for element visualization: {sketch_id}")
            return None
        
        try:
            sketch = self.sketches[sketch_id]
            element = sketch.get_element_by_id(element_id)
            
            if not element:
                print(f"❌ Element not found: {element_id}")
                return None
            
            # Get sketch plane for coordinate conversion
            plane = sketch.sketch_plane
            
            viz_data: Dict[str, Any] = {
                "element_id": element_id,
                "sketch_id": sketch_id,
                "element_type": element.element_type.value
            }
            
            # Convert 2D points to 3D world coordinates
            points_3d: List[float] = []
            parameters_2d: Dict[str, float] = {}
            
            if element.element_type == SketchElementType.LINE:
                # Validate that we have start and end points for line
                if element.start_point is None or element.end_point is None:
                    print(f"❌ Line element {element_id} missing start or end point")
                    return None
                
                # Convert start and end points to 3D using plane coordinate system
                start_3d = self._convert_2d_to_3d(element.start_point, plane)
                end_3d = self._convert_2d_to_3d(element.end_point, plane)
                
                # Add 3D points (start and end for line)
                points_3d.extend([start_3d.x, start_3d.y, start_3d.z])
                points_3d.extend([end_3d.x, end_3d.y, end_3d.z])
                
                # Store 2D parameters
                parameters_2d = {
                    "x1": element.start_point.X(),
                    "y1": element.start_point.Y(),
                    "x2": element.end_point.X(),
                    "y2": element.end_point.Y()
                }
            
            elif element.element_type == SketchElementType.CIRCLE:
                # Validate that we have center point and radius for circle
                if element.center_point is None or not element.parameters or len(element.parameters) < 1:
                    print(f"❌ Circle element {element_id} missing center point or radius")
                    return None
                
                # Generate circle points (16 segments for smooth visualization)
                center_3d = self._convert_2d_to_3d(element.center_point, plane)
                radius = element.parameters[0]
                
                segments = 16
                for i in range(segments + 1):  # +1 to close the circle
                    angle = 2.0 * math.pi * i / segments
                    circle_pt_2d = gp_Pnt2d(
                        element.center_point.X() + radius * math.cos(angle),
                        element.center_point.Y() + radius * math.sin(angle)
                    )
                    circle_3d = self._convert_2d_to_3d(circle_pt_2d, plane)
                    points_3d.extend([circle_3d.x, circle_3d.y, circle_3d.z])
                
                # Store 2D parameters
                parameters_2d = {
                    "center_x": element.center_point.X(),
                    "center_y": element.center_point.Y(),
                    "radius": radius
                }
            
            elif element.element_type == SketchElementType.RECTANGLE:
                # Validate that we have corner point and dimensions for rectangle
                if element.start_point is None or not element.parameters or len(element.parameters) < 2:
                    print(f"❌ Rectangle element {element_id} missing corner point or dimensions")
                    return None
                
                # Generate rectangle corner points
                corner = element.start_point
                width = element.parameters[0]
                height = element.parameters[1]
                
                # Calculate 4 corners in 2D
                p1_2d = corner  # bottom-left
                p2_2d = gp_Pnt2d(corner.X() + width, corner.Y())  # bottom-right
                p3_2d = gp_Pnt2d(corner.X() + width, corner.Y() + height)  # top-right
                p4_2d = gp_Pnt2d(corner.X(), corner.Y() + height)  # top-left
                
                # Convert to 3D and add points for rectangle outline (closed loop)
                for pt_2d in [p1_2d, p2_2d, p3_2d, p4_2d, p1_2d]:  # Close the loop
                    pt_3d = self._convert_2d_to_3d(pt_2d, plane)
                    points_3d.extend([pt_3d.x, pt_3d.y, pt_3d.z])
                
                # Store 2D parameters
                parameters_2d = {
                    "x": corner.X(),
                    "y": corner.Y(),
                    "width": width,
                    "height": height
                }
            
            elif element.element_type == SketchElementType.ARC:
                # Validate that we have all arc parameters
                if (element.start_point is None or element.end_point is None or 
                    element.center_point is None or not element.parameters or len(element.parameters) < 3):
                    print(f"❌ Arc element {element_id} missing required parameters")
                    return None
                
                # Generate arc points
                center = element.center_point
                radius = element.parameters[0]
                start_angle = element.parameters[1]
                end_angle = element.parameters[2]
                
                # Determine arc direction and generate points
                segments = 16
                
                # Normalize angles to [0, 2π)
                while start_angle < 0:
                    start_angle += 2 * math.pi
                while end_angle < 0:
                    end_angle += 2 * math.pi
                while start_angle >= 2 * math.pi:
                    start_angle -= 2 * math.pi
                while end_angle >= 2 * math.pi:
                    end_angle -= 2 * math.pi
                
                # Calculate angle span (always positive, going counterclockwise)
                if end_angle <= start_angle:
                    angle_span = end_angle + 2 * math.pi - start_angle
                else:
                    angle_span = end_angle - start_angle
                
                # Generate arc points
                for i in range(segments + 1):
                    t = i / segments
                    angle = start_angle + t * angle_span
                    
                    arc_pt_2d = gp_Pnt2d(
                        center.X() + radius * math.cos(angle),
                        center.Y() + radius * math.sin(angle)
                    )
                    arc_3d = self._convert_2d_to_3d(arc_pt_2d, plane)
                    points_3d.extend([arc_3d.x, arc_3d.y, arc_3d.z])
                
                # Store 2D parameters
                parameters_2d = {
                    "center_x": center.X(),
                    "center_y": center.Y(),
                    "radius": radius,
                    "start_angle": start_angle,
                    "end_angle": end_angle,
                    "start_x": element.start_point.X(),
                    "start_y": element.start_point.Y(),
                    "end_x": element.end_point.X(),
                    "end_y": element.end_point.Y()
                }
            
            elif element.element_type == SketchElementType.POLYGON:
                # Validate that we have center point and polygon parameters
                if element.center_point is None or not element.parameters or len(element.parameters) < 2:
                    print(f"❌ Polygon element {element_id} missing center point or parameters")
                    return None
                
                # Generate polygon corner points
                center = element.center_point
                radius = element.parameters[0]
                sides = int(element.parameters[1])
                
                # Generate polygon vertices
                for i in range(sides + 1):  # +1 to close the polygon
                    angle = 2.0 * math.pi * i / sides
                    vertex_2d = gp_Pnt2d(
                        center.X() + radius * math.cos(angle),
                        center.Y() + radius * math.sin(angle)
                    )
                    vertex_3d = self._convert_2d_to_3d(vertex_2d, plane)
                    points_3d.extend([vertex_3d.x, vertex_3d.y, vertex_3d.z])
                
                # Store 2D parameters
                parameters_2d = {
                    "center_x": center.X(),
                    "center_y": center.Y(),
                    "radius": radius,
                    "sides": sides
                }
            
            else:
                print(f"❌ Unsupported element type for visualization: {element.element_type}")
                return None
            
            viz_data["points_3d"] = points_3d
            viz_data["parameters_2d"] = parameters_2d
            
            print(f"✅ Generated element visualization data for: {element_id}")
            return viz_data
            
        except Exception as e:
            print(f"❌ Error generating element visualization data: {e}")
            return None
    
    def _convert_2d_to_3d(self, point_2d: gp_Pnt2d, plane: 'SketchPlane') -> Vector3d:
        """Convert 2D sketch point to 3D world coordinates"""
        try:
            # Get plane coordinate system
            if plane.coordinate_system:
                # Use the coordinate system to transform from 2D to 3D
                origin = plane.get_origin()
                
                # Get local axes
                x_dir = plane.coordinate_system.XDirection()
                y_dir = plane.coordinate_system.YDirection()
                
                # Calculate 3D position: origin + u*x_axis + v*y_axis
                u = point_2d.X()
                v = point_2d.Y()
                
                world_x = origin.x + u * x_dir.X() + v * y_dir.X()
                world_y = origin.y + u * x_dir.Y() + v * y_dir.Y()
                world_z = origin.z + u * x_dir.Z() + v * y_dir.Z()
                
                return Vector3d(world_x, world_y, world_z)
            else:
                # Fallback: assume simple plane mapping
                origin = plane.get_origin()
                plane_type = plane.get_plane_type()
                
                if plane_type == "XY":
                    return Vector3d(origin.x + point_2d.X(), origin.y + point_2d.Y(), origin.z)
                elif plane_type == "XZ":
                    return Vector3d(origin.x + point_2d.X(), origin.y, origin.z + point_2d.Y())
                elif plane_type == "YZ":
                    return Vector3d(origin.x, origin.y + point_2d.X(), origin.z + point_2d.Y())
                else:
                    return Vector3d(origin.x + point_2d.X(), origin.y + point_2d.Y(), origin.z)
                    
        except Exception as e:
            print(f"❌ Error converting 2D to 3D point: {e}")
            return Vector3d()
    
    # ==================== UTILITY METHODS ====================
    
    def shape_exists(self, shape_id: str) -> bool:
        """Check if shape exists - equivalent to C++ shapeExists"""
        return shape_id in self.shapes
    
    def remove_shape(self, shape_id: str) -> None:
        """Remove shape - equivalent to C++ removeShape"""
        if shape_id in self.shapes:
            del self.shapes[shape_id]
    
    def clear_all(self) -> None:
        """Clear all data - equivalent to C++ clearAll"""
        self.shapes.clear()
        self.parameters.clear()
        self.sketch_planes.clear()
        self.sketches.clear()
        self.extrude_features.clear()
    
    def get_available_shape_ids(self) -> List[str]:
        """Get list of shape IDs - equivalent to C++ getAvailableShapeIds"""
        return list(self.shapes.keys())
    
    def update_parameter(self, param_name: str, value: float) -> bool:
        """Update parameter - equivalent to C++ updateParameter"""
        self.parameters[param_name] = value
        # TODO: Implement parameter-driven rebuilding
        return True
    
    def rebuild_model(self) -> None:
        """Rebuild model - equivalent to C++ rebuildModel"""
        # TODO: Implement model rebuilding based on parameters
        pass
    
    # ==================== PRIVATE METHODS ====================
    
    def _validate_shape(self, shape: TopoDS_Shape) -> bool:
        """Validate shape - equivalent to C++ validateShape"""
        if shape.IsNull():
            return False
        
        try:
            analyzer = BRepCheck_Analyzer(shape)
            return analyzer.IsValid()
        except:
            return False
    
    def _generate_shape_id(self) -> str:
        """Generate unique shape ID - equivalent to C++ generateShapeId"""
        return f"shape_{''.join(random.choices(string.digits, k=4))}"
    
    def _generate_unique_plane_id(self) -> str:
        """Generate unique plane ID using sequential numbering"""
        # Extract existing plane numbers
        existing_numbers = set()
        for plane_id in self.sketch_planes.keys():
            if plane_id.startswith("plane_"):
                try:
                    number = int(plane_id.split("_")[1])
                    existing_numbers.add(number)
                except (IndexError, ValueError):
                    continue
        
        # Find the first available number starting from 1
        counter = 1
        while counter in existing_numbers:
            counter += 1
        
        return f"plane_{counter}"
    
    def _generate_unique_sketch_id(self) -> str:
        """Generate unique sketch ID using sequential numbering"""
        # Extract existing sketch numbers
        existing_numbers = set()
        for sketch_id in self.sketches.keys():
            if sketch_id.startswith("sketch_"):
                try:
                    number = int(sketch_id.split("_")[1])
                    existing_numbers.add(number)
                except (IndexError, ValueError):
                    continue
        
        # Find the first available number starting from 1
        counter = 1
        while counter in existing_numbers:
            counter += 1
        
        return f"sketch_{counter}" 