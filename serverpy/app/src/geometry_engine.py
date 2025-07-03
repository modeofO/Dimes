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

    def add_fillet(self, line1_id: str, line2_id: str, radius: float) -> str:
        """Add fillet between two lines - modifies existing lines and creates arc"""
        try:
            print(f"🔵 Adding fillet between lines {line1_id} and {line2_id} with radius {radius}")
            
            # Find the two line elements
            line1 = self.get_element_by_id(line1_id)
            line2 = self.get_element_by_id(line2_id)
            
            if not line1 or line1.element_type != SketchElementType.LINE:
                print(f"❌ Line {line1_id} not found or not a line")
                return ""
            
            if not line2 or line2.element_type != SketchElementType.LINE:
                print(f"❌ Line {line2_id} not found or not a line")
                return ""
            
            # Calculate fillet geometry
            fillet_result = self._calculate_fillet_geometry(line1, line2, radius)
            
            if not fillet_result:
                print(f"❌ Failed to calculate fillet geometry")
                return ""
            
            # Unpack fillet calculation results
            new_line1_end, new_line2_start, arc_start, arc_end, arc_center = fillet_result
            
            # Generate unique fillet ID
            fillet_id = f"fillet_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create fillet arc element
            start_angle = math.atan2(arc_start.Y() - arc_center.Y(), arc_start.X() - arc_center.X())
            end_angle = math.atan2(arc_end.Y() - arc_center.Y(), arc_end.X() - arc_center.X())
            
            fillet_element = SketchElement(
                id=fillet_id,
                element_type=SketchElementType.ARC,
                start_point=arc_start,
                end_point=arc_end,
                center_point=arc_center,
                parameters=[radius, start_angle, end_angle],  # Store radius and angles
                referenced_elements=[line1_id, line2_id]  # Track which lines this fillet connects
            )
            
            # Properly trim the lines to remove segments extending past the fillet
            # For each line, determine which endpoint is closer to the intersection and trim that endpoint
            
            # Get intersection point for distance calculations
            l1_start = line1.start_point
            l1_end = line1.end_point
            l2_start = line2.start_point  
            l2_end = line2.end_point
            
            # Find intersection point (we know it exists since fillet_result succeeded)
            intersection = self._find_line_intersection(
                l1_start.X(), l1_start.Y(), l1_end.X(), l1_end.Y(),
                l2_start.X(), l2_start.Y(), l2_end.X(), l2_end.Y()
            )
            
            if intersection:
                int_x, int_y = intersection
                
                # Line 1: determine which endpoint is closer to intersection and trim it
                dist1_to_start = math.sqrt((int_x - l1_start.X())**2 + (int_y - l1_start.Y())**2)
                dist1_to_end = math.sqrt((int_x - l1_end.X())**2 + (int_y - l1_end.Y())**2)
                
                if dist1_to_start < dist1_to_end:
                    # Start point is closer to intersection, so trim the start
                    line1.start_point = new_line1_end  # new_line1_end is actually the tangent point
                    print(f"🔧 Trimmed line1 start point to tangent point")
                else:
                    # End point is closer to intersection, so trim the end
                    line1.end_point = new_line1_end
                    print(f"🔧 Trimmed line1 end point to tangent point")
                
                # Line 2: determine which endpoint is closer to intersection and trim it
                dist2_to_start = math.sqrt((int_x - l2_start.X())**2 + (int_y - l2_start.Y())**2)
                dist2_to_end = math.sqrt((int_x - l2_end.X())**2 + (int_y - l2_end.Y())**2)
                
                if dist2_to_start < dist2_to_end:
                    # Start point is closer to intersection, so trim the start
                    line2.start_point = new_line2_start
                    print(f"🔧 Trimmed line2 start point to tangent point")
                else:
                    # End point is closer to intersection, so trim the end  
                    line2.end_point = new_line2_start  # new_line2_start is actually the tangent point
                    print(f"🔧 Trimmed line2 end point to tangent point")
            
            # Add fillet to sketch
            if self.add_element(fillet_element):
                print(f"✅ Added fillet {fillet_id} between lines {line1_id} and {line2_id}")
                return fillet_id
            else:
                print(f"❌ Failed to add fillet element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding fillet to sketch: {e}")
            return ""
    
    def add_chamfer(self, line1_id: str, line2_id: str, distance: float) -> str:
        """Add chamfer between two lines - modifies existing lines and creates connecting line"""
        try:
            print(f"🔸 Adding chamfer between lines {line1_id} and {line2_id} with distance {distance}")
            
            # Find the two line elements
            line1 = self.get_element_by_id(line1_id)
            line2 = self.get_element_by_id(line2_id)
            
            if not line1 or line1.element_type != SketchElementType.LINE:
                print(f"❌ Line {line1_id} not found or not a line")
                return ""
            
            if not line2 or line2.element_type != SketchElementType.LINE:
                print(f"❌ Line {line2_id} not found or not a line")
                return ""
            
            # Calculate chamfer geometry
            chamfer_result = self._calculate_chamfer_geometry(line1, line2, distance)
            
            if not chamfer_result:
                print(f"❌ Failed to calculate chamfer geometry")
                return ""
            
            # Unpack chamfer calculation results
            new_line1_end, new_line2_start, chamfer_start, chamfer_end = chamfer_result
            
            # Generate unique chamfer ID
            chamfer_id = f"chamfer_{len(self.elements) + 1}_{int(time.time() * 1000) % 10000}"
            
            # Create chamfer line element
            chamfer_element = SketchElement(
                id=chamfer_id,
                element_type=SketchElementType.LINE,
                start_point=chamfer_start,
                end_point=chamfer_end,
                referenced_elements=[line1_id, line2_id]  # Track which lines this chamfer connects
            )
            
            # Modify the existing lines to connect to chamfer
            line1.end_point = new_line1_end
            line2.start_point = new_line2_start
            
            # Add chamfer to sketch
            if self.add_element(chamfer_element):
                print(f"✅ Added chamfer {chamfer_id} between lines {line1_id} and {line2_id}")
                return chamfer_id
            else:
                print(f"❌ Failed to add chamfer element to sketch")
                return ""
                
        except Exception as e:
            print(f"❌ Error adding chamfer to sketch: {e}")
            return ""
    
    def _calculate_fillet_geometry(self, line1: SketchElement, line2: SketchElement, radius: float) -> Optional[Tuple[gp_Pnt2d, gp_Pnt2d, gp_Pnt2d, gp_Pnt2d, gp_Pnt2d]]:
        """Calculate fillet geometry between two lines"""
        try:
            # Get line endpoints
            l1_start = line1.start_point
            l1_end = line1.end_point
            l2_start = line2.start_point
            l2_end = line2.end_point
            
            if not all([l1_start, l1_end, l2_start, l2_end]):
                return None
            
            # Convert to regular coordinates for calculation
            l1_x1, l1_y1 = l1_start.X(), l1_start.Y()
            l1_x2, l1_y2 = l1_end.X(), l1_end.Y()
            l2_x1, l2_y1 = l2_start.X(), l2_start.Y()
            l2_x2, l2_y2 = l2_end.X(), l2_end.Y()
            
            # Calculate line directions (unit vectors)
            l1_dx = l1_x2 - l1_x1
            l1_dy = l1_y2 - l1_y1
            l1_len = math.sqrt(l1_dx**2 + l1_dy**2)
            if l1_len < 1e-10:
                return None
            l1_dx /= l1_len
            l1_dy /= l1_len
            
            l2_dx = l2_x2 - l2_x1
            l2_dy = l2_y2 - l2_y1
            l2_len = math.sqrt(l2_dx**2 + l2_dy**2)
            if l2_len < 1e-10:
                return None
            l2_dx /= l2_len
            l2_dy /= l2_len
            
            # Find intersection point of the two lines (extended if necessary)
            intersection = self._find_line_intersection(
                l1_x1, l1_y1, l1_x2, l1_y2,
                l2_x1, l2_y1, l2_x2, l2_y2
            )
            
            if not intersection:
                print("❌ Lines are parallel - cannot create fillet")
                return None
            
            int_x, int_y = intersection
            
            # Calculate angle between lines
            dot_product = l1_dx * l2_dx + l1_dy * l2_dy
            cross_product = l1_dx * l2_dy - l1_dy * l2_dx
            angle = math.atan2(abs(cross_product), dot_product)
            
            if angle < 1e-6:  # Lines are parallel
                return None
            
            # Calculate distance from intersection to tangent points
            tan_dist = radius / math.tan(angle / 2)
            
            # For each line, determine which direction to move from intersection to get inward tangent point
            # We want to move towards the endpoint that is farther from the intersection
            
            # Line 1: determine direction to move from intersection
            dist1_to_start = math.sqrt((int_x - l1_x1)**2 + (int_y - l1_y1)**2)
            dist1_to_end = math.sqrt((int_x - l1_x2)**2 + (int_y - l1_y2)**2)
            
            if dist1_to_start > dist1_to_end:
                # Move towards start point (opposite to line direction)
                l1_dir_x, l1_dir_y = -l1_dx, -l1_dy
            else:
                # Move towards end point (same as line direction)
                l1_dir_x, l1_dir_y = l1_dx, l1_dy
            
            # Line 2: determine direction to move from intersection  
            dist2_to_start = math.sqrt((int_x - l2_x1)**2 + (int_y - l2_y1)**2)
            dist2_to_end = math.sqrt((int_x - l2_x2)**2 + (int_y - l2_y2)**2)
            
            if dist2_to_start > dist2_to_end:
                # Move towards start point (opposite to line direction)
                l2_dir_x, l2_dir_y = -l2_dx, -l2_dy
            else:
                # Move towards end point (same as line direction)
                l2_dir_x, l2_dir_y = l2_dx, l2_dy
            
            # Calculate tangent points by moving inward along each line
            t1_x = int_x + tan_dist * l1_dir_x
            t1_y = int_y + tan_dist * l1_dir_y
            t2_x = int_x + tan_dist * l2_dir_x
            t2_y = int_y + tan_dist * l2_dir_y
            
            # Calculate fillet center using the traditional method:
            # The center is at the intersection of two lines perpendicular to the original lines
            # and passing through the respective tangent points
            
            # Line perpendicular to line1 passing through t1
            # If line1 direction is (dx1, dy1), perpendicular is (-dy1, dx1)
            perp1_dx = -l1_dy
            perp1_dy = l1_dx
            
            # Line perpendicular to line2 passing through t2
            # If line2 direction is (dx2, dy2), perpendicular is (-dy2, dx2)
            perp2_dx = -l2_dy
            perp2_dy = l2_dx
            
            # Find intersection of the two perpendicular lines
            # Line 1: t1 + s * perp1_direction
            # Line 2: t2 + t * perp2_direction
            # t1_x + s * perp1_dx = t2_x + t * perp2_dx
            # t1_y + s * perp1_dy = t2_y + t * perp2_dy
            
            # Solve the system:
            # s * perp1_dx - t * perp2_dx = t2_x - t1_x
            # s * perp1_dy - t * perp2_dy = t2_y - t1_y
            
            det = perp1_dx * (-perp2_dy) - perp1_dy * (-perp2_dx)
            if abs(det) < 1e-10:
                print("❌ Perpendicular lines are parallel - cannot find center")
                return None
            
            # Solve for s using Cramer's rule
            rhs_x = t2_x - t1_x
            rhs_y = t2_y - t1_y
            s = (rhs_x * (-perp2_dy) - rhs_y * (-perp2_dx)) / det
            
            # Calculate center
            center_x = t1_x + s * perp1_dx
            center_y = t1_y + s * perp1_dy
            
            # Create result points
            new_line1_end = gp_Pnt2d(t1_x, t1_y)
            new_line2_start = gp_Pnt2d(t2_x, t2_y)
            arc_start = gp_Pnt2d(t1_x, t1_y)
            arc_end = gp_Pnt2d(t2_x, t2_y)
            arc_center = gp_Pnt2d(center_x, center_y)
            
            return (new_line1_end, new_line2_start, arc_start, arc_end, arc_center)
            
        except Exception as e:
            print(f"❌ Error calculating fillet geometry: {e}")
            return None
    
    def _find_line_intersection(self, x1: float, y1: float, x2: float, y2: float, 
                               x3: float, y3: float, x4: float, y4: float) -> Optional[Tuple[float, float]]:
        """Find intersection point of two lines defined by two points each"""
        try:
            # Line 1: (x1,y1) to (x2,y2)
            # Line 2: (x3,y3) to (x4,y4)
            
            denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
            
            if abs(denom) < 1e-10:  # Lines are parallel
                return None
            
            t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
            
            # Calculate intersection point
            int_x = x1 + t * (x2 - x1)
            int_y = y1 + t * (y2 - y1)
            
            return (int_x, int_y)
            
        except Exception as e:
            print(f"❌ Error finding line intersection: {e}")
            return None
    
    def _calculate_chamfer_geometry(self, line1: SketchElement, line2: SketchElement, distance: float) -> Optional[Tuple[gp_Pnt2d, gp_Pnt2d, gp_Pnt2d, gp_Pnt2d]]:
        """Calculate chamfer geometry between two lines"""
        try:
            # Get line endpoints
            l1_start = line1.start_point
            l1_end = line1.end_point
            l2_start = line2.start_point
            l2_end = line2.end_point
            
            if not all([l1_start, l1_end, l2_start, l2_end]):
                return None
            
            # Convert to regular coordinates for calculation
            l1_x1, l1_y1 = l1_start.X(), l1_start.Y()
            l1_x2, l1_y2 = l1_end.X(), l1_end.Y()
            l2_x1, l2_y1 = l2_start.X(), l2_start.Y()
            l2_x2, l2_y2 = l2_end.X(), l2_end.Y()
            
            # Calculate line directions (unit vectors)
            l1_dx = l1_x2 - l1_x1
            l1_dy = l1_y2 - l1_y1
            l1_len = math.sqrt(l1_dx**2 + l1_dy**2)
            if l1_len < 1e-10:
                return None
            l1_dx /= l1_len
            l1_dy /= l1_len
            
            l2_dx = l2_x2 - l2_x1
            l2_dy = l2_y2 - l2_y1
            l2_len = math.sqrt(l2_dx**2 + l2_dy**2)
            if l2_len < 1e-10:
                return None
            l2_dx /= l2_len
            l2_dy /= l2_len
            
            # Find intersection point of the two lines (extended if necessary)
            intersection = self._find_line_intersection(
                l1_x1, l1_y1, l1_x2, l1_y2,
                l2_x1, l2_y1, l2_x2, l2_y2
            )
            
            if not intersection:
                print("❌ Lines are parallel - cannot create chamfer")
                return None
            
            int_x, int_y = intersection
            
            # Calculate chamfer points at specified distance from intersection
            # Move back along each line by the chamfer distance
            c1_x = int_x - distance * l1_dx
            c1_y = int_y - distance * l1_dy
            c2_x = int_x - distance * l2_dx
            c2_y = int_y - distance * l2_dy
            
            # Create result points
            new_line1_end = gp_Pnt2d(c1_x, c1_y)
            new_line2_start = gp_Pnt2d(c2_x, c2_y)
            chamfer_start = gp_Pnt2d(c1_x, c1_y)
            chamfer_end = gp_Pnt2d(c2_x, c2_y)
            
            return (new_line1_end, new_line2_start, chamfer_start, chamfer_end)
            
        except Exception as e:
            print(f"❌ Error calculating chamfer geometry: {e}")
            return None
    
    def trim_line_to_line(self, line_to_trim_id: str, cutting_line_id: str, keep_start: bool = True) -> bool:
        """Trim a line at its intersection with another line - simple implementation"""
        try:
            print(f"✂️ Trimming line {line_to_trim_id} at intersection with line {cutting_line_id}")
            
            # Find the two line elements
            line_to_trim = self.get_element_by_id(line_to_trim_id)
            cutting_line = self.get_element_by_id(cutting_line_id)
            
            if not line_to_trim or line_to_trim.element_type != SketchElementType.LINE:
                print(f"❌ Line to trim {line_to_trim_id} not found or not a line")
                return False
            
            if not cutting_line or cutting_line.element_type != SketchElementType.LINE:
                print(f"❌ Cutting line {cutting_line_id} not found or not a line")
                return False
            
            # Calculate intersection point
            intersection = self._calculate_line_line_intersection(line_to_trim, cutting_line)
            
            if not intersection:
                print(f"❌ Lines do not intersect - cannot trim")
                return False
            
            # Apply trim based on keep_start flag
            if keep_start:
                # Keep start portion, trim end at intersection
                line_to_trim.end_point = intersection
                print(f"✅ Trimmed line {line_to_trim_id} - kept start portion")
            else:
                # Keep end portion, trim start at intersection
                line_to_trim.start_point = intersection
                print(f"✅ Trimmed line {line_to_trim_id} - kept end portion")
            
            return True
            
        except Exception as e:
            print(f"❌ Error trimming line: {e}")
            return False
    
    def trim_line_to_geometry(self, line_to_trim_id: str, cutting_geometry_id: str, keep_start: bool = True) -> bool:
        """Trim a line at its intersection with complex geometry (rectangle, polygon, etc.)"""
        try:
            print(f"✂️ Trimming line {line_to_trim_id} at intersection with geometry {cutting_geometry_id}")
            
            # Find the line to trim
            line_to_trim = self.get_element_by_id(line_to_trim_id)
            cutting_geometry = self.get_element_by_id(cutting_geometry_id)
            
            if not line_to_trim or line_to_trim.element_type != SketchElementType.LINE:
                print(f"❌ Line to trim {line_to_trim_id} not found or not a line")
                return False
            
            if not cutting_geometry:
                print(f"❌ Cutting geometry {cutting_geometry_id} not found")
                return False
            
            # Find intersection points based on geometry type
            intersection_points = []
            
            if cutting_geometry.element_type == SketchElementType.RECTANGLE:
                intersection_points = self._find_line_rectangle_intersections(line_to_trim, cutting_geometry)
            elif cutting_geometry.element_type == SketchElementType.POLYGON:
                intersection_points = self._find_line_polygon_intersections(line_to_trim, cutting_geometry)
            elif cutting_geometry.element_type == SketchElementType.CIRCLE:
                intersection_points = self._find_line_circle_intersections(line_to_trim, cutting_geometry)
            else:
                print(f"❌ Unsupported cutting geometry type: {cutting_geometry.element_type}")
                return False
            
            if not intersection_points:
                print(f"❌ No intersections found - cannot trim")
                return False
            
            # Determine which intersection point to use for trimming
            trim_point = self._select_trim_point(line_to_trim, intersection_points, keep_start)
            
            if not trim_point:
                print(f"❌ Could not determine trim point")
                return False
            
            # Apply trim
            if keep_start:
                line_to_trim.end_point = trim_point
                print(f"✅ Trimmed line {line_to_trim_id} - kept start portion")
            else:
                line_to_trim.start_point = trim_point
                print(f"✅ Trimmed line {line_to_trim_id} - kept end portion")
            
            return True
            
        except Exception as e:
            print(f"❌ Error trimming line to geometry: {e}")
            return False
    
    def _calculate_line_line_intersection(self, line1: SketchElement, line2: SketchElement) -> Optional[gp_Pnt2d]:
        """Calculate intersection point between two lines"""
        try:
            # Get line endpoints
            l1_start, l1_end = line1.start_point, line1.end_point
            l2_start, l2_end = line2.start_point, line2.end_point
            
            if not all([l1_start, l1_end, l2_start, l2_end]):
                return None
            
            # Use existing intersection function
            intersection = self._find_line_intersection(
                l1_start.X(), l1_start.Y(), l1_end.X(), l1_end.Y(),
                l2_start.X(), l2_start.Y(), l2_end.X(), l2_end.Y()
            )
            
            if intersection:
                return gp_Pnt2d(intersection[0], intersection[1])
            return None
            
        except Exception as e:
            print(f"❌ Error calculating line-line intersection: {e}")
            return None
    
    def _find_line_rectangle_intersections(self, line: SketchElement, rectangle: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between a line and rectangle edges"""
        try:
            intersections = []
            
            if not rectangle.start_point or not rectangle.parameters or len(rectangle.parameters) < 2:
                return intersections
            
            # Get rectangle parameters
            corner = rectangle.start_point
            width = rectangle.parameters[0]
            height = rectangle.parameters[1]
            
            # Create rectangle edges as lines
            edges = [
                # Bottom edge
                (corner.X(), corner.Y(), corner.X() + width, corner.Y()),
                # Right edge  
                (corner.X() + width, corner.Y(), corner.X() + width, corner.Y() + height),
                # Top edge
                (corner.X() + width, corner.Y() + height, corner.X(), corner.Y() + height),
                # Left edge
                (corner.X(), corner.Y() + height, corner.X(), corner.Y())
            ]
            
            # Check intersection with each edge
            for edge in edges:
                intersection = self._find_line_intersection(
                    line.start_point.X(), line.start_point.Y(),
                    line.end_point.X(), line.end_point.Y(),
                    edge[0], edge[1], edge[2], edge[3]
                )
                
                if intersection:
                    # Verify intersection is actually on the rectangle edge (not extended)
                    if self._point_on_line_segment(intersection, edge):
                        intersections.append(gp_Pnt2d(intersection[0], intersection[1]))
            
            return intersections
            
        except Exception as e:
            print(f"❌ Error finding line-rectangle intersections: {e}")
            return []
    
    def _find_line_polygon_intersections(self, line: SketchElement, polygon: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between a line and polygon edges"""
        try:
            intersections = []
            
            if not polygon.center_point or not polygon.parameters or len(polygon.parameters) < 2:
                return intersections
            
            # Get polygon parameters
            center = polygon.center_point
            radius = polygon.parameters[0]
            sides = int(polygon.parameters[1])
            
            # Generate polygon vertices
            vertices = []
            for i in range(sides):
                angle = 2.0 * math.pi * i / sides
                vertex_x = center.X() + radius * math.cos(angle)
                vertex_y = center.Y() + radius * math.sin(angle)
                vertices.append((vertex_x, vertex_y))
            
            # Check intersection with each polygon edge
            for i in range(sides):
                current_vertex = vertices[i]
                next_vertex = vertices[(i + 1) % sides]  # Wrap around to first vertex
                
                intersection = self._find_line_intersection(
                    line.start_point.X(), line.start_point.Y(),
                    line.end_point.X(), line.end_point.Y(),
                    current_vertex[0], current_vertex[1],
                    next_vertex[0], next_vertex[1]
                )
                
                if intersection:
                    # Verify intersection is on the polygon edge
                    edge = (current_vertex[0], current_vertex[1], next_vertex[0], next_vertex[1])
                    if self._point_on_line_segment(intersection, edge):
                        intersections.append(gp_Pnt2d(intersection[0], intersection[1]))
            
            return intersections
            
        except Exception as e:
            print(f"❌ Error finding line-polygon intersections: {e}")
            return []
    
    def _find_line_circle_intersections(self, line: SketchElement, circle: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between a line and circle"""
        try:
            intersections = []
            
            if not circle.center_point or not circle.parameters or len(circle.parameters) < 1:
                return intersections
            
            # Get circle parameters
            center = circle.center_point
            radius = circle.parameters[0]
            
            # Line parameters
            if not line.start_point or not line.end_point:
                return intersections
            
            # Calculate line-circle intersection using quadratic formula
            # Line: P = start + t * (end - start)
            # Circle: (x - cx)² + (y - cy)² = r²
            
            start_x, start_y = line.start_point.X(), line.start_point.Y()
            end_x, end_y = line.end_point.X(), line.end_point.Y()
            center_x, center_y = center.X(), center.Y()
            
            # Direction vector
            dx = end_x - start_x
            dy = end_y - start_y
            
            # Vector from start to center
            fx = start_x - center_x
            fy = start_y - center_y
            
            # Quadratic equation: a*t² + b*t + c = 0
            a = dx * dx + dy * dy
            b = 2 * (fx * dx + fy * dy)
            c = fx * fx + fy * fy - radius * radius
            
            discriminant = b * b - 4 * a * c
            
            if discriminant >= 0:
                sqrt_discriminant = math.sqrt(discriminant)
                
                # Two potential intersection points
                t1 = (-b - sqrt_discriminant) / (2 * a)
                t2 = (-b + sqrt_discriminant) / (2 * a)
                
                # Check if intersections are within line segment (0 <= t <= 1)
                for t in [t1, t2]:
                    if 0 <= t <= 1:
                        int_x = start_x + t * dx
                        int_y = start_y + t * dy
                        intersections.append(gp_Pnt2d(int_x, int_y))
            
            return intersections
            
        except Exception as e:
            print(f"❌ Error finding line-circle intersections: {e}")
            return []
    
    def _point_on_line_segment(self, point: Tuple[float, float], line_segment: Tuple[float, float, float, float]) -> bool:
        """Check if a point lies on a line segment (not just the extended line)"""
        try:
            px, py = point
            x1, y1, x2, y2 = line_segment
            
            # Check if point is within bounding box of line segment
            min_x, max_x = min(x1, x2), max(x1, x2)
            min_y, max_y = min(y1, y2), max(y1, y2)
            
            return (min_x - 1e-10 <= px <= max_x + 1e-10 and 
                    min_y - 1e-10 <= py <= max_y + 1e-10)
            
        except Exception as e:
            print(f"❌ Error checking point on line segment: {e}")
            return False
    
    def _select_trim_point(self, line: SketchElement, intersection_points: List[gp_Pnt2d], keep_start: bool) -> Optional[gp_Pnt2d]:
        """Select which intersection point to use for trimming based on keep_start flag"""
        try:
            if not intersection_points:
                return None
            
            if len(intersection_points) == 1:
                return intersection_points[0]
            
            # For multiple intersections, choose based on distance from start/end
            if keep_start:
                # Find intersection closest to end point (furthest from start)
                end_point = line.end_point
                closest_point = None
                min_distance = float('inf')
                
                for point in intersection_points:
                    distance = math.sqrt((point.X() - end_point.X())**2 + (point.Y() - end_point.Y())**2)
                    if distance < min_distance:
                        min_distance = distance
                        closest_point = point
                
                return closest_point
            else:
                # Find intersection closest to start point (furthest from end)
                start_point = line.start_point
                closest_point = None
                min_distance = float('inf')
                
                for point in intersection_points:
                    distance = math.sqrt((point.X() - start_point.X())**2 + (point.Y() - start_point.Y())**2)
                    if distance < min_distance:
                        min_distance = distance
                        closest_point = point
                
                return closest_point
            
        except Exception as e:
            print(f"❌ Error selecting trim point: {e}")
            return None
    
    def extend_line_to_line(self, line_to_extend_id: str, target_line_id: str, extend_start: bool = False) -> bool:
        """Extend a line to reach intersection with another line"""
        try:
            print(f"📏 Extending line {line_to_extend_id} to reach line {target_line_id}")
            
            # Find the two line elements
            line_to_extend = self.get_element_by_id(line_to_extend_id)
            target_line = self.get_element_by_id(target_line_id)
            
            if not line_to_extend or line_to_extend.element_type != SketchElementType.LINE:
                print(f"❌ Line to extend {line_to_extend_id} not found or not a line")
                return False
            
            if not target_line or target_line.element_type != SketchElementType.LINE:
                print(f"❌ Target line {target_line_id} not found or not a line")
                return False
            
            # Calculate intersection point (lines extended infinitely)
            intersection = self._calculate_line_line_intersection(line_to_extend, target_line)
            
            if not intersection:
                print(f"❌ Lines are parallel - cannot extend")
                return False
            
            # Check if we need to extend (intersection should be beyond current line)
            if not self._point_beyond_line(intersection, line_to_extend, extend_start):
                print(f"❌ Intersection point is not beyond the line - no extension needed")
                return False
            
            # Apply extension
            if extend_start:
                # Extend start of line to reach intersection
                line_to_extend.start_point = intersection
                print(f"✅ Extended start of line {line_to_extend_id}")
            else:
                # Extend end of line to reach intersection
                line_to_extend.end_point = intersection
                print(f"✅ Extended end of line {line_to_extend_id}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error extending line: {e}")
            return False
    
    def extend_line_to_geometry(self, line_to_extend_id: str, target_geometry_id: str, extend_start: bool = False) -> bool:
        """Extend a line to reach intersection with complex geometry"""
        try:
            print(f"📏 Extending line {line_to_extend_id} to reach geometry {target_geometry_id}")
            
            # Find the line and target geometry
            line_to_extend = self.get_element_by_id(line_to_extend_id)
            target_geometry = self.get_element_by_id(target_geometry_id)
            
            if not line_to_extend or line_to_extend.element_type != SketchElementType.LINE:
                print(f"❌ Line to extend {line_to_extend_id} not found or not a line")
                return False
            
            if not target_geometry:
                print(f"❌ Target geometry {target_geometry_id} not found")
                return False
            
            # Find intersection points with infinite line extension
            intersection_points = []
            
            if target_geometry.element_type == SketchElementType.RECTANGLE:
                intersection_points = self._find_infinite_line_rectangle_intersections(line_to_extend, target_geometry)
            elif target_geometry.element_type == SketchElementType.POLYGON:
                intersection_points = self._find_infinite_line_polygon_intersections(line_to_extend, target_geometry)
            elif target_geometry.element_type == SketchElementType.CIRCLE:
                intersection_points = self._find_infinite_line_circle_intersections(line_to_extend, target_geometry)
            else:
                print(f"❌ Unsupported target geometry type: {target_geometry.element_type}")
                return False
            
            if not intersection_points:
                print(f"❌ No intersections found - cannot extend")
                return False
            
            # Select appropriate intersection point for extension
            extend_point = self._select_extend_point(line_to_extend, intersection_points, extend_start)
            
            if not extend_point:
                print(f"❌ Could not determine extend point")
                return False
            
            # Apply extension
            if extend_start:
                line_to_extend.start_point = extend_point
                print(f"✅ Extended start of line {line_to_extend_id}")
            else:
                line_to_extend.end_point = extend_point
                print(f"✅ Extended end of line {line_to_extend_id}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error extending line to geometry: {e}")
            return False
    
    def _point_beyond_line(self, point: gp_Pnt2d, line: SketchElement, check_start: bool) -> bool:
        """Check if a point is beyond the start or end of a line (i.e., extension is needed)"""
        try:
            if not line.start_point or not line.end_point:
                return False
            
            # Calculate line direction vector
            dx = line.end_point.X() - line.start_point.X()
            dy = line.end_point.Y() - line.start_point.Y()
            
            if check_start:
                # Check if point is beyond start (in opposite direction of line)
                # Vector from start to point
                px = point.X() - line.start_point.X()
                py = point.Y() - line.start_point.Y()
                
                # Dot product should be negative if point is beyond start
                dot_product = px * dx + py * dy
                return dot_product < 0
            else:
                # Check if point is beyond end (in same direction as line)
                # Vector from end to point
                px = point.X() - line.end_point.X()
                py = point.Y() - line.end_point.Y()
                
                # Dot product should be positive if point is beyond end
                dot_product = px * dx + py * dy
                return dot_product > 0
            
        except Exception as e:
            print(f"❌ Error checking if point is beyond line: {e}")
            return False
    
    def _select_extend_point(self, line: SketchElement, intersection_points: List[gp_Pnt2d], extend_start: bool) -> Optional[gp_Pnt2d]:
        """Select which intersection point to use for extending"""
        try:
            if not intersection_points:
                return None
            
            # Filter points that are actually beyond the line (require extension)
            valid_points = []
            for point in intersection_points:
                if self._point_beyond_line(point, line, extend_start):
                    valid_points.append(point)
            
            if not valid_points:
                return None
            
            if len(valid_points) == 1:
                return valid_points[0]
            
            # For multiple valid points, choose the closest one
            if extend_start:
                reference_point = line.start_point
            else:
                reference_point = line.end_point
            
            closest_point = None
            min_distance = float('inf')
            
            for point in valid_points:
                distance = math.sqrt((point.X() - reference_point.X())**2 + (point.Y() - reference_point.Y())**2)
                if distance < min_distance:
                    min_distance = distance
                    closest_point = point
            
            return closest_point
            
        except Exception as e:
            print(f"❌ Error selecting extend point: {e}")
            return None
    
    def _find_infinite_line_rectangle_intersections(self, line: SketchElement, rectangle: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between an infinite line and rectangle edges"""
        try:
            intersections = []
            
            if not rectangle.start_point or not rectangle.parameters or len(rectangle.parameters) < 2:
                return intersections
            
            # Get rectangle parameters
            corner = rectangle.start_point
            width = rectangle.parameters[0]
            height = rectangle.parameters[1]
            
            # Create rectangle edges as lines
            edges = [
                # Bottom edge
                (corner.X(), corner.Y(), corner.X() + width, corner.Y()),
                # Right edge  
                (corner.X() + width, corner.Y(), corner.X() + width, corner.Y() + height),
                # Top edge
                (corner.X() + width, corner.Y() + height, corner.X(), corner.Y() + height),
                # Left edge
                (corner.X(), corner.Y() + height, corner.X(), corner.Y())
            ]
            
            # Check intersection with each edge (infinite line vs edge segment)
            for edge in edges:
                intersection = self._find_line_intersection(
                    line.start_point.X(), line.start_point.Y(),
                    line.end_point.X(), line.end_point.Y(),
                    edge[0], edge[1], edge[2], edge[3]
                )
                
                if intersection:
                    # Verify intersection is actually on the rectangle edge (not extended)
                    if self._point_on_line_segment(intersection, edge):
                        intersections.append(gp_Pnt2d(intersection[0], intersection[1]))
            
            return intersections
            
        except Exception as e:
            print(f"❌ Error finding infinite line-rectangle intersections: {e}")
            return []
    
    def _find_infinite_line_polygon_intersections(self, line: SketchElement, polygon: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between an infinite line and polygon edges"""
        try:
            # This is the same as the finite version since we check infinite line vs finite polygon edges
            return self._find_line_polygon_intersections(line, polygon)
            
        except Exception as e:
            print(f"❌ Error finding infinite line-polygon intersections: {e}")
            return []
    
    def _find_infinite_line_circle_intersections(self, line: SketchElement, circle: SketchElement) -> List[gp_Pnt2d]:
        """Find intersection points between an infinite line and circle"""
        try:
            intersections = []
            
            if not circle.center_point or not circle.parameters or len(circle.parameters) < 1:
                return intersections
            
            # Get circle parameters
            center = circle.center_point
            radius = circle.parameters[0]
            
            # Line parameters
            if not line.start_point or not line.end_point:
                return intersections
            
            # Calculate infinite line-circle intersection using quadratic formula
            # Line: P = start + t * (end - start) where t can be any real number
            # Circle: (x - cx)² + (y - cy)² = r²
            
            start_x, start_y = line.start_point.X(), line.start_point.Y()
            end_x, end_y = line.end_point.X(), line.end_point.Y()
            center_x, center_y = center.X(), center.Y()
            
            # Direction vector
            dx = end_x - start_x
            dy = end_y - start_y
            
            # Vector from start to center
            fx = start_x - center_x
            fy = start_y - center_y
            
            # Quadratic equation: a*t² + b*t + c = 0
            a = dx * dx + dy * dy
            b = 2 * (fx * dx + fy * dy)
            c = fx * fx + fy * fy - radius * radius
            
            discriminant = b * b - 4 * a * c
            
            if discriminant >= 0:
                sqrt_discriminant = math.sqrt(discriminant)
                
                # Two potential intersection points (no restriction on t)
                t1 = (-b - sqrt_discriminant) / (2 * a)
                t2 = (-b + sqrt_discriminant) / (2 * a)
                
                # Add both intersection points (infinite line)
                for t in [t1, t2]:
                    int_x = start_x + t * dx
                    int_y = start_y + t * dy
                    intersections.append(gp_Pnt2d(int_x, int_y))
            
            return intersections
            
        except Exception as e:
            print(f"❌ Error finding infinite line-circle intersections: {e}")
            return []
    
    def mirror_elements(self, element_ids: List[str], mirror_line_id: str, keep_original: bool = True) -> List[str]:
        """
        Mirror geometry elements across an existing line element
        
        Args:
            element_ids: List of element IDs to mirror
            mirror_line_id: ID of line element to use as mirror axis
            keep_original: If True, keep original elements; if False, replace with mirrored versions
            
        Returns:
            List of new mirrored element IDs
        """
        try:
            print(f"🪞 Mirroring {len(element_ids)} elements across line {mirror_line_id}")
            
            # Find the mirror line
            mirror_line = self.get_element_by_id(mirror_line_id)
            if not mirror_line or mirror_line.element_type != SketchElementType.LINE:
                print(f"❌ Mirror line {mirror_line_id} not found or not a line")
                return []
            
            if not mirror_line.start_point or not mirror_line.end_point:
                print(f"❌ Mirror line {mirror_line_id} missing start or end point")
                return []
            
            # Calculate mirror line equation: ax + by + c = 0
            mirror_eq = self._calculate_line_equation(mirror_line)
            if not mirror_eq:
                print(f"❌ Could not calculate mirror line equation")
                return []
            
            mirrored_element_ids = []
            
            # Process each element to be mirrored
            for element_id in element_ids:
                element = self.get_element_by_id(element_id)
                if not element:
                    print(f"⚠️ Element {element_id} not found, skipping")
                    continue
                
                # Create mirrored version of the element
                mirrored_element = self._create_mirrored_element(element, mirror_eq)
                
                if mirrored_element:
                    # Add mirrored element to sketch
                    if self.add_element(mirrored_element):
                        mirrored_element_ids.append(mirrored_element.id)
                        print(f"✅ Mirrored {element.element_type.value} {element_id} -> {mirrored_element.id}")
                    else:
                        print(f"❌ Failed to add mirrored element for {element_id}")
                else:
                    print(f"❌ Failed to create mirrored element for {element_id}")
            
            # Remove original elements if requested
            if not keep_original:
                for element_id in element_ids:
                    self.elements = [e for e in self.elements if e.id != element_id]
                print(f"🗑️ Removed {len(element_ids)} original elements")
            
            print(f"✅ Mirror operation completed: {len(mirrored_element_ids)} elements created")
            return mirrored_element_ids
            
        except Exception as e:
            print(f"❌ Error mirroring elements: {e}")
            return []
    
    def mirror_elements_by_two_points(self, element_ids: List[str], point1: gp_Pnt2d, point2: gp_Pnt2d, keep_original: bool = True) -> List[str]:
        """
        Mirror geometry elements across a line defined by two points
        
        Args:
            element_ids: List of element IDs to mirror
            point1: First point defining the mirror line
            point2: Second point defining the mirror line
            keep_original: If True, keep original elements; if False, replace with mirrored versions
            
        Returns:
            List of new mirrored element IDs
        """
        try:
            print(f"🪞 Mirroring {len(element_ids)} elements across line defined by two points")
            
            # Create temporary line equation from two points
            mirror_eq = self._calculate_line_equation_from_points(point1, point2)
            if not mirror_eq:
                print(f"❌ Could not calculate mirror line equation from points")
                return []
            
            mirrored_element_ids = []
            
            # Process each element to be mirrored
            for element_id in element_ids:
                element = self.get_element_by_id(element_id)
                if not element:
                    print(f"⚠️ Element {element_id} not found, skipping")
                    continue
                
                # Create mirrored version of the element
                mirrored_element = self._create_mirrored_element(element, mirror_eq)
                
                if mirrored_element:
                    # Add mirrored element to sketch
                    if self.add_element(mirrored_element):
                        mirrored_element_ids.append(mirrored_element.id)
                        print(f"✅ Mirrored {element.element_type.value} {element_id} -> {mirrored_element.id}")
                    else:
                        print(f"❌ Failed to add mirrored element for {element_id}")
                else:
                    print(f"❌ Failed to create mirrored element for {element_id}")
            
            # Remove original elements if requested
            if not keep_original:
                for element_id in element_ids:
                    self.elements = [e for e in self.elements if e.id != element_id]
                print(f"🗑️ Removed {len(element_ids)} original elements")
            
            print(f"✅ Mirror operation completed: {len(mirrored_element_ids)} elements created")
            return mirrored_element_ids
            
        except Exception as e:
            print(f"❌ Error mirroring elements by two points: {e}")
            return []
    
    def _calculate_line_equation(self, line: SketchElement) -> Optional[Tuple[float, float, float]]:
        """Calculate line equation coefficients ax + by + c = 0 from line element"""
        try:
            if not line.start_point or not line.end_point:
                return None
            
            x1, y1 = line.start_point.X(), line.start_point.Y()
            x2, y2 = line.end_point.X(), line.end_point.Y()
            
            return self._calculate_line_equation_from_coordinates(x1, y1, x2, y2)
            
        except Exception as e:
            print(f"❌ Error calculating line equation: {e}")
            return None
    
    def _calculate_line_equation_from_points(self, point1: gp_Pnt2d, point2: gp_Pnt2d) -> Optional[Tuple[float, float, float]]:
        """Calculate line equation coefficients ax + by + c = 0 from two points"""
        try:
            x1, y1 = point1.X(), point1.Y()
            x2, y2 = point2.X(), point2.Y()
            
            return self._calculate_line_equation_from_coordinates(x1, y1, x2, y2)
            
        except Exception as e:
            print(f"❌ Error calculating line equation from points: {e}")
            return None
    
    def _calculate_line_equation_from_coordinates(self, x1: float, y1: float, x2: float, y2: float) -> Optional[Tuple[float, float, float]]:
        """Calculate line equation coefficients ax + by + c = 0 from coordinates"""
        try:
            # For line through points (x1,y1) and (x2,y2):
            # Direction vector: (dx, dy) = (x2-x1, y2-y1)
            # Normal vector: (a, b) = (dy, -dx) = (y2-y1, x1-x2)
            # Equation: a(x-x1) + b(y-y1) = 0
            # Expanded: ax - ax1 + by - by1 = 0
            # Standard form: ax + by + c = 0 where c = -ax1 - by1
            
            dx = x2 - x1
            dy = y2 - y1
            
            # Check for degenerate line (same points)
            if abs(dx) < 1e-10 and abs(dy) < 1e-10:
                return None
            
            a = dy  # y2 - y1
            b = -dx  # -(x2 - x1) = x1 - x2
            c = -a * x1 - b * y1  # -ax1 - by1
            
            return (a, b, c)
            
        except Exception as e:
            print(f"❌ Error calculating line equation from coordinates: {e}")
            return None
    
    def _create_mirrored_element(self, element: SketchElement, mirror_eq: Tuple[float, float, float]) -> Optional[SketchElement]:
        """Create a mirrored copy of an element across the mirror line"""
        try:
            a, b, c = mirror_eq
            element_type = element.element_type
            
            # Generate unique ID for mirrored element
            mirrored_id = f"mirror_{element.id}_{int(time.time() * 1000) % 10000}"
            
            if element_type == SketchElementType.LINE:
                # Mirror both endpoints
                if not element.start_point or not element.end_point:
                    return None
                
                mirrored_start = self._mirror_point(element.start_point, mirror_eq)
                mirrored_end = self._mirror_point(element.end_point, mirror_eq)
                
                return SketchElement(
                    id=mirrored_id,
                    element_type=SketchElementType.LINE,
                    start_point=mirrored_start,
                    end_point=mirrored_end
                )
            
            elif element_type == SketchElementType.CIRCLE:
                # Mirror center point, radius stays the same
                if not element.center_point or not element.parameters:
                    return None
                
                mirrored_center = self._mirror_point(element.center_point, mirror_eq)
                radius = element.parameters[0]
                
                return SketchElement(
                    id=mirrored_id,
                    element_type=SketchElementType.CIRCLE,
                    center_point=mirrored_center,
                    parameters=[radius]
                )
            
            elif element_type == SketchElementType.RECTANGLE:
                # Mirror corner point, keep dimensions
                if not element.start_point or not element.parameters or len(element.parameters) < 2:
                    return None
                
                mirrored_corner = self._mirror_point(element.start_point, mirror_eq)
                width = element.parameters[0]
                height = element.parameters[1]
                
                return SketchElement(
                    id=mirrored_id,
                    element_type=SketchElementType.RECTANGLE,
                    start_point=mirrored_corner,
                    parameters=[width, height]
                )
            
            elif element_type == SketchElementType.ARC:
                # Mirror start point, end point, and center point
                if (not element.start_point or not element.end_point or 
                    not element.center_point or not element.parameters):
                    return None
                
                mirrored_start = self._mirror_point(element.start_point, mirror_eq)
                mirrored_end = self._mirror_point(element.end_point, mirror_eq)
                mirrored_center = self._mirror_point(element.center_point, mirror_eq)
                
                # For arc, we need to recalculate angles after mirroring
                radius = element.parameters[0]
                
                # Calculate new start and end angles
                start_angle = math.atan2(mirrored_start.Y() - mirrored_center.Y(), 
                                       mirrored_start.X() - mirrored_center.X())
                end_angle = math.atan2(mirrored_end.Y() - mirrored_center.Y(), 
                                     mirrored_end.X() - mirrored_center.X())
                
                return SketchElement(
                    id=mirrored_id,
                    element_type=SketchElementType.ARC,
                    start_point=mirrored_start,
                    end_point=mirrored_end,
                    center_point=mirrored_center,
                    parameters=[radius, start_angle, end_angle]
                )
            
            elif element_type == SketchElementType.POLYGON:
                # Mirror center point, keep other parameters
                if not element.center_point or not element.parameters:
                    return None
                
                mirrored_center = self._mirror_point(element.center_point, mirror_eq)
                radius = element.parameters[0]
                sides = element.parameters[1]
                
                return SketchElement(
                    id=mirrored_id,
                    element_type=SketchElementType.POLYGON,
                    center_point=mirrored_center,
                    parameters=[radius, sides]
                )
            
            else:
                print(f"❌ Unsupported element type for mirroring: {element_type}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating mirrored element: {e}")
            return None
    
    def _mirror_point(self, point: gp_Pnt2d, mirror_eq: Tuple[float, float, float]) -> gp_Pnt2d:
        """Mirror a point across a line defined by ax + by + c = 0"""
        try:
            a, b, c = mirror_eq
            x0, y0 = point.X(), point.Y()
            
            # Formula for reflecting point (x0,y0) across line ax + by + c = 0:
            # x' = x0 - 2a(ax0 + by0 + c)/(a² + b²)
            # y' = y0 - 2b(ax0 + by0 + c)/(a² + b²)
            
            denominator = a * a + b * b
            if denominator < 1e-10:
                # Degenerate line, return original point
                return point
            
            numerator = a * x0 + b * y0 + c
            factor = 2 * numerator / denominator
            
            x_mirrored = x0 - a * factor
            y_mirrored = y0 - b * factor
            
            return gp_Pnt2d(x_mirrored, y_mirrored)
            
        except Exception as e:
            print(f"❌ Error mirroring point: {e}")
            return point

    def offset_element(self, element_id: str, offset_distance: float) -> str:
        """
        Offset a geometry element - shifts open geometry parallel, scales closed geometry
        
        Args:
            element_id: ID of element to offset
            offset_distance: Offset distance (positive = outward/right, negative = inward/left)
            
        Returns:
            New offset element ID if successful, empty string if failed
        """
        try:
            print(f"📐 Offsetting element {element_id} by distance {offset_distance}")
            
            # Find the element
            element = self.get_element_by_id(element_id)
            if not element:
                print(f"❌ Element {element_id} not found")
                return ""
            
            # Create offset element based on type
            offset_element = None
            
            if element.element_type == SketchElementType.LINE:
                offset_element = self._offset_line(element, offset_distance)
            elif element.element_type == SketchElementType.CIRCLE:
                offset_element = self._offset_circle(element, offset_distance)
            elif element.element_type == SketchElementType.RECTANGLE:
                offset_element = self._offset_rectangle(element, offset_distance)
            elif element.element_type == SketchElementType.ARC:
                offset_element = self._offset_arc(element, offset_distance)
            elif element.element_type == SketchElementType.POLYGON:
                offset_element = self._offset_polygon(element, offset_distance)
            else:
                print(f"❌ Offset not supported for element type: {element.element_type}")
                return ""
            
            if offset_element:
                # Add offset element to sketch
                if self.add_element(offset_element):
                    print(f"✅ Offset element created: {offset_element.id}")
                    return offset_element.id
                else:
                    print(f"❌ Failed to add offset element to sketch")
                    return ""
            else:
                print(f"❌ Failed to create offset element")
                return ""
                
        except Exception as e:
            print(f"❌ Error offsetting element: {e}")
            return ""
    
    def offset_element_directional(self, element_id: str, offset_distance: float, direction: str) -> str:
        """
        Offset a line element in a specific direction (left/right relative to line direction)
        
        Args:
            element_id: ID of line element to offset
            offset_distance: Offset distance (always positive)
            direction: Direction to offset ("left" or "right" relative to line direction)
            
        Returns:
            New offset element ID if successful, empty string if failed
        """
        try:
            print(f"📐 Offsetting element {element_id} by distance {offset_distance} to the {direction}")
            
            # Find the element
            element = self.get_element_by_id(element_id)
            if not element:
                print(f"❌ Element {element_id} not found")
                return ""
            
            # Only lines and arcs support directional offset
            if element.element_type not in [SketchElementType.LINE, SketchElementType.ARC]:
                print(f"❌ Directional offset only supported for lines and arcs")
                return ""
            
            # Determine actual offset distance based on direction
            if direction.lower() == "left":
                actual_offset = offset_distance
            elif direction.lower() == "right":
                actual_offset = -offset_distance
            else:
                print(f"❌ Invalid direction: {direction}. Use 'left' or 'right'")
                return ""
            
            # Use regular offset with adjusted distance
            return self.offset_element(element_id, actual_offset)
            
        except Exception as e:
            print(f"❌ Error offsetting element directionally: {e}")
            return ""
    
    def _offset_line(self, line: SketchElement, offset_distance: float) -> Optional[SketchElement]:
        """Offset a line by moving it parallel to itself"""
        try:
            if not line.start_point or not line.end_point:
                return None
            
            # Calculate line direction vector
            start_x, start_y = line.start_point.X(), line.start_point.Y()
            end_x, end_y = line.end_point.X(), line.end_point.Y()
            
            dx = end_x - start_x
            dy = end_y - start_y
            
            # Calculate line length
            length = math.sqrt(dx * dx + dy * dy)
            if length < 1e-10:
                return None
            
            # Calculate perpendicular unit vector (rotate 90 degrees counterclockwise)
            perp_x = -dy / length
            perp_y = dx / length
            
            # Calculate offset points
            offset_start_x = start_x + perp_x * offset_distance
            offset_start_y = start_y + perp_y * offset_distance
            offset_end_x = end_x + perp_x * offset_distance
            offset_end_y = end_y + perp_y * offset_distance
            
            # Generate unique ID for offset element
            offset_id = f"offset_{line.id}_{int(time.time() * 1000) % 10000}"
            
            return SketchElement(
                id=offset_id,
                element_type=SketchElementType.LINE,
                start_point=gp_Pnt2d(offset_start_x, offset_start_y),
                end_point=gp_Pnt2d(offset_end_x, offset_end_y)
            )
            
        except Exception as e:
            print(f"❌ Error offsetting line: {e}")
            return None
    
    def _offset_circle(self, circle: SketchElement, offset_distance: float) -> Optional[SketchElement]:
        """Offset a circle by changing its radius"""
        try:
            if not circle.center_point or not circle.parameters or len(circle.parameters) < 1:
                return None
            
            original_radius = circle.parameters[0]
            new_radius = original_radius + offset_distance
            
            # Check for invalid radius
            if new_radius <= 0:
                print(f"❌ Offset would create invalid radius: {new_radius}")
                return None
            
            # Generate unique ID for offset element
            offset_id = f"offset_{circle.id}_{int(time.time() * 1000) % 10000}"
            
            return SketchElement(
                id=offset_id,
                element_type=SketchElementType.CIRCLE,
                center_point=circle.center_point,
                parameters=[new_radius]
            )
            
        except Exception as e:
            print(f"❌ Error offsetting circle: {e}")
            return None
    
    def _offset_rectangle(self, rectangle: SketchElement, offset_distance: float) -> Optional[SketchElement]:
        """Offset a rectangle by scaling it inward/outward"""
        try:
            if not rectangle.start_point or not rectangle.parameters or len(rectangle.parameters) < 2:
                return None
            
            original_width = rectangle.parameters[0]
            original_height = rectangle.parameters[1]
            
            # Calculate new dimensions (offset affects all sides)
            new_width = original_width + 2 * offset_distance
            new_height = original_height + 2 * offset_distance
            
            # Check for invalid dimensions
            if new_width <= 0 or new_height <= 0:
                print(f"❌ Offset would create invalid dimensions: {new_width}x{new_height}")
                return None
            
            # Calculate new corner position (move corner inward/outward)
            corner_x = rectangle.start_point.X() - offset_distance
            corner_y = rectangle.start_point.Y() - offset_distance
            
            # Generate unique ID for offset element
            offset_id = f"offset_{rectangle.id}_{int(time.time() * 1000) % 10000}"
            
            return SketchElement(
                id=offset_id,
                element_type=SketchElementType.RECTANGLE,
                start_point=gp_Pnt2d(corner_x, corner_y),
                parameters=[new_width, new_height]
            )
            
        except Exception as e:
            print(f"❌ Error offsetting rectangle: {e}")
            return None
    
    def _offset_arc(self, arc: SketchElement, offset_distance: float) -> Optional[SketchElement]:
        """Offset an arc by changing its radius while keeping center and angles"""
        try:
            if (not arc.start_point or not arc.end_point or 
                not arc.center_point or not arc.parameters or len(arc.parameters) < 3):
                return None
            
            original_radius = arc.parameters[0]
            start_angle = arc.parameters[1]
            end_angle = arc.parameters[2]
            
            new_radius = original_radius + offset_distance
            
            # Check for invalid radius
            if new_radius <= 0:
                print(f"❌ Offset would create invalid arc radius: {new_radius}")
                return None
            
            # Calculate new start and end points based on new radius
            center_x, center_y = arc.center_point.X(), arc.center_point.Y()
            
            new_start_x = center_x + new_radius * math.cos(start_angle)
            new_start_y = center_y + new_radius * math.sin(start_angle)
            new_end_x = center_x + new_radius * math.cos(end_angle)
            new_end_y = center_y + new_radius * math.sin(end_angle)
            
            # Generate unique ID for offset element
            offset_id = f"offset_{arc.id}_{int(time.time() * 1000) % 10000}"
            
            return SketchElement(
                id=offset_id,
                element_type=SketchElementType.ARC,
                start_point=gp_Pnt2d(new_start_x, new_start_y),
                end_point=gp_Pnt2d(new_end_x, new_end_y),
                center_point=arc.center_point,
                parameters=[new_radius, start_angle, end_angle]
            )
            
        except Exception as e:
            print(f"❌ Error offsetting arc: {e}")
            return None
    
    def _offset_polygon(self, polygon: SketchElement, offset_distance: float) -> Optional[SketchElement]:
        """Offset a polygon by scaling it inward/outward from center"""
        try:
            if not polygon.center_point or not polygon.parameters or len(polygon.parameters) < 2:
                return None
            
            original_radius = polygon.parameters[0]
            sides = polygon.parameters[1]
            
            new_radius = original_radius + offset_distance
            
            # Check for invalid radius
            if new_radius <= 0:
                print(f"❌ Offset would create invalid polygon radius: {new_radius}")
                return None
            
            # Generate unique ID for offset element
            offset_id = f"offset_{polygon.id}_{int(time.time() * 1000) % 10000}"
            
            return SketchElement(
                id=offset_id,
                element_type=SketchElementType.POLYGON,
                center_point=polygon.center_point,
                parameters=[new_radius, sides]
            )
            
        except Exception as e:
            print(f"❌ Error offsetting polygon: {e}")
            return None

    def copy_element(self, element_id: str, num_copies: int, direction_x: float, direction_y: float, distance: float) -> List[str]:
        """
        Copy a geometry element multiple times with linear spacing
        
        Args:
            element_id: ID of element to copy
            num_copies: Number of copies to create (excluding original)
            direction_x: X component of direction vector (normalized automatically)
            direction_y: Y component of direction vector (normalized automatically)
            distance: Distance between copies
            
        Returns:
            List of new copied element IDs
        """
        try:
            print(f"📄 Copying element {element_id} {num_copies} times with direction ({direction_x}, {direction_y}) and distance {distance}")
            
            # Find the element
            element = self.get_element_by_id(element_id)
            if not element:
                print(f"❌ Element {element_id} not found")
                return []
            
            if num_copies <= 0:
                print(f"❌ Number of copies must be positive, got {num_copies}")
                return []
            
            # Normalize direction vector
            direction_length = math.sqrt(direction_x**2 + direction_y**2)
            if direction_length < 1e-10:
                print(f"❌ Direction vector too small: ({direction_x}, {direction_y})")
                return []
            
            dir_x = direction_x / direction_length
            dir_y = direction_y / direction_length
            
            copied_element_ids = []
            
            # Create copies
            for copy_index in range(1, num_copies + 1):
                # Calculate offset for this copy
                offset_x = dir_x * distance * copy_index
                offset_y = dir_y * distance * copy_index
                
                # Create copied element
                copied_element = self._create_copied_element(element, offset_x, offset_y, copy_index)
                
                if copied_element:
                    # Add copied element to sketch
                    if self.add_element(copied_element):
                        copied_element_ids.append(copied_element.id)
                        print(f"✅ Created copy {copy_index}: {copied_element.id}")
                    else:
                        print(f"❌ Failed to add copied element {copy_index}")
                else:
                    print(f"❌ Failed to create copied element {copy_index}")
            
            print(f"✅ Copy operation completed: {len(copied_element_ids)} copies created")
            return copied_element_ids
            
        except Exception as e:
            print(f"❌ Error copying element: {e}")
            return []
    
    def _create_copied_element(self, element: SketchElement, offset_x: float, offset_y: float, copy_index: int) -> Optional[SketchElement]:
        """Create a copied element with offset applied"""
        try:
            element_type = element.element_type
            
            # Generate unique ID for copied element
            copied_id = f"copy_{copy_index}_{element.id}_{int(time.time() * 1000) % 10000}"
            
            if element_type == SketchElementType.LINE:
                # Copy line with offset applied to both endpoints
                if not element.start_point or not element.end_point:
                    return None
                
                copied_start = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                copied_end = gp_Pnt2d(
                    element.end_point.X() + offset_x,
                    element.end_point.Y() + offset_y
                )
                
                return SketchElement(
                    id=copied_id,
                    element_type=SketchElementType.LINE,
                    start_point=copied_start,
                    end_point=copied_end
                )
            
            elif element_type == SketchElementType.CIRCLE:
                # Copy circle with offset applied to center
                if not element.center_point or not element.parameters:
                    return None
                
                copied_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                radius = element.parameters[0]
                
                return SketchElement(
                    id=copied_id,
                    element_type=SketchElementType.CIRCLE,
                    center_point=copied_center,
                    parameters=[radius]
                )
            
            elif element_type == SketchElementType.RECTANGLE:
                # Copy rectangle with offset applied to corner
                if not element.start_point or not element.parameters or len(element.parameters) < 2:
                    return None
                
                copied_corner = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                width = element.parameters[0]
                height = element.parameters[1]
                
                return SketchElement(
                    id=copied_id,
                    element_type=SketchElementType.RECTANGLE,
                    start_point=copied_corner,
                    parameters=[width, height]
                )
            
            elif element_type == SketchElementType.ARC:
                # Copy arc with offset applied to all points
                if (not element.start_point or not element.end_point or 
                    not element.center_point or not element.parameters or len(element.parameters) < 3):
                    return None
                
                copied_start = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                copied_end = gp_Pnt2d(
                    element.end_point.X() + offset_x,
                    element.end_point.Y() + offset_y
                )
                copied_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                
                # Copy arc parameters (radius and angles remain the same)
                radius = element.parameters[0]
                start_angle = element.parameters[1]
                end_angle = element.parameters[2]
                
                return SketchElement(
                    id=copied_id,
                    element_type=SketchElementType.ARC,
                    start_point=copied_start,
                    end_point=copied_end,
                    center_point=copied_center,
                    parameters=[radius, start_angle, end_angle]
                )
            
            elif element_type == SketchElementType.POLYGON:
                # Copy polygon with offset applied to center
                if not element.center_point or not element.parameters:
                    return None
                
                copied_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                radius = element.parameters[0]
                sides = element.parameters[1]
                
                return SketchElement(
                    id=copied_id,
                    element_type=SketchElementType.POLYGON,
                    center_point=copied_center,
                    parameters=[radius, sides]
                )
            
            else:
                print(f"❌ Unsupported element type for copying: {element_type}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating copied element: {e}")
            return None

    def move_element(self, element_id: str, direction_x: float, direction_y: float, distance: float) -> bool:
        """
        Move a geometry element to a new position
        
        Args:
            element_id: ID of element to move
            direction_x: X component of direction vector (normalized automatically)
            direction_y: Y component of direction vector (normalized automatically)
            distance: Distance to move
            
        Returns:
            True if successful, False if failed
        """
        try:
            print(f"➡️ Moving element {element_id} with direction ({direction_x}, {direction_y}) and distance {distance}")
            
            # Find the element
            element = self.get_element_by_id(element_id)
            if not element:
                print(f"❌ Element {element_id} not found")
                return False
            
            # Normalize direction vector
            direction_length = math.sqrt(direction_x**2 + direction_y**2)
            if direction_length < 1e-10:
                print(f"❌ Direction vector too small: ({direction_x}, {direction_y})")
                return False
            
            dir_x = direction_x / direction_length
            dir_y = direction_y / direction_length
            
            # Calculate offset
            offset_x = dir_x * distance
            offset_y = dir_y * distance
            
            # Move element based on type
            success = self._apply_move_to_element(element, offset_x, offset_y)
            
            if success:
                print(f"✅ Successfully moved element {element_id}")
            else:
                print(f"❌ Failed to move element {element_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error moving element: {e}")
            return False
    
    def _apply_move_to_element(self, element: SketchElement, offset_x: float, offset_y: float) -> bool:
        """Apply move offset to an element (modifies the element in place)"""
        try:
            element_type = element.element_type
            
            if element_type == SketchElementType.LINE:
                # Move both endpoints
                if not element.start_point or not element.end_point:
                    return False
                
                new_start = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                new_end = gp_Pnt2d(
                    element.end_point.X() + offset_x,
                    element.end_point.Y() + offset_y
                )
                
                element.start_point = new_start
                element.end_point = new_end
                return True
            
            elif element_type == SketchElementType.CIRCLE:
                # Move center point
                if not element.center_point:
                    return False
                
                new_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                
                element.center_point = new_center
                return True
            
            elif element_type == SketchElementType.RECTANGLE:
                # Move corner point
                if not element.start_point:
                    return False
                
                new_corner = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                
                element.start_point = new_corner
                return True
            
            elif element_type == SketchElementType.ARC:
                # Move all points (start, end, center)
                if (not element.start_point or not element.end_point or not element.center_point):
                    return False
                
                new_start = gp_Pnt2d(
                    element.start_point.X() + offset_x,
                    element.start_point.Y() + offset_y
                )
                new_end = gp_Pnt2d(
                    element.end_point.X() + offset_x,
                    element.end_point.Y() + offset_y
                )
                new_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                
                element.start_point = new_start
                element.end_point = new_end
                element.center_point = new_center
                return True
            
            elif element_type == SketchElementType.POLYGON:
                # Move center point
                if not element.center_point:
                    return False
                
                new_center = gp_Pnt2d(
                    element.center_point.X() + offset_x,
                    element.center_point.Y() + offset_y
                )
                
                element.center_point = new_center
                return True
            
            else:
                print(f"❌ Unsupported element type for moving: {element_type}")
                return False
                
        except Exception as e:
            print(f"❌ Error applying move to element: {e}")
            return False


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
    
    def element_exists(self, element_id: str) -> bool:
        """Check if element exists in any sketch"""
        try:
            for sketch in self.sketches.values():
                if sketch.get_element_by_id(element_id) is not None:
                    return True
            return False
        except Exception:
            return False
    
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
    
    def add_fillet_to_sketch(self, sketch_id: str, line1_id: str, line2_id: str, radius: float) -> str:
        """
        Add fillet between two lines in sketch - equivalent to C++ addFilletToSketch
        
        Args:
            sketch_id: Sketch identifier
            line1_id: First line element ID
            line2_id: Second line element ID
            radius: Fillet radius
            
        Returns:
            Fillet element ID if successful, empty string if failed
        """
        print(f"🔵 Adding fillet to sketch {sketch_id}: lines {line1_id} & {line2_id} radius={radius}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        if radius <= 0:
            print(f"❌ Fillet radius must be positive, got {radius}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Add fillet to sketch
            fillet_id = sketch.add_fillet(line1_id, line2_id, radius)
            
            if fillet_id:
                print(f"✅ Added fillet {fillet_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add fillet to sketch {sketch_id}")
            
            return fillet_id
            
        except Exception as e:
            print(f"❌ Error adding fillet to sketch: {e}")
            return ""
    
    def add_chamfer_to_sketch(self, sketch_id: str, line1_id: str, line2_id: str, distance: float) -> str:
        """
        Add chamfer between two lines in sketch - equivalent to C++ addChamferToSketch
        
        Args:
            sketch_id: Sketch identifier
            line1_id: First line element ID
            line2_id: Second line element ID
            distance: Chamfer distance (how far back from intersection)
            
        Returns:
            Chamfer element ID if successful, empty string if failed
        """
        print(f"🔸 Adding chamfer to sketch {sketch_id}: lines {line1_id} & {line2_id} distance={distance}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        if distance <= 0:
            print(f"❌ Chamfer distance must be positive, got {distance}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Add chamfer to sketch
            chamfer_id = sketch.add_chamfer(line1_id, line2_id, distance)
            
            if chamfer_id:
                print(f"✅ Added chamfer {chamfer_id} to sketch {sketch_id}")
            else:
                print(f"❌ Failed to add chamfer to sketch {sketch_id}")
            
            return chamfer_id
            
        except Exception as e:
            print(f"❌ Error adding chamfer to sketch: {e}")
            return ""
    
    def trim_line_to_line_in_sketch(self, sketch_id: str, line_to_trim_id: str, cutting_line_id: str, keep_start: bool = True) -> bool:
        """
        Trim a line at its intersection with another line - equivalent to C++ trimLineToLine
        
        Args:
            sketch_id: Sketch identifier
            line_to_trim_id: ID of line to be trimmed
            cutting_line_id: ID of line that cuts the first line
            keep_start: If True, keep start portion; if False, keep end portion
            
        Returns:
            True if successful, False if failed
        """
        print(f"✂️ Trimming line {line_to_trim_id} to line {cutting_line_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return False
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform trim operation
            success = sketch.trim_line_to_line(line_to_trim_id, cutting_line_id, keep_start)
            
            if success:
                print(f"✅ Successfully trimmed line {line_to_trim_id} in sketch {sketch_id}")
            else:
                print(f"❌ Failed to trim line {line_to_trim_id} in sketch {sketch_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error trimming line in sketch: {e}")
            return False
    
    def trim_line_to_geometry_in_sketch(self, sketch_id: str, line_to_trim_id: str, cutting_geometry_id: str, keep_start: bool = True) -> bool:
        """
        Trim a line at its intersection with complex geometry - equivalent to C++ trimLineToGeometry
        
        Args:
            sketch_id: Sketch identifier
            line_to_trim_id: ID of line to be trimmed
            cutting_geometry_id: ID of geometry that cuts the line (rectangle, polygon, circle)
            keep_start: If True, keep start portion; if False, keep end portion
            
        Returns:
            True if successful, False if failed
        """
        print(f"✂️ Trimming line {line_to_trim_id} to geometry {cutting_geometry_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return False
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform trim operation
            success = sketch.trim_line_to_geometry(line_to_trim_id, cutting_geometry_id, keep_start)
            
            if success:
                print(f"✅ Successfully trimmed line {line_to_trim_id} to geometry in sketch {sketch_id}")
            else:
                print(f"❌ Failed to trim line {line_to_trim_id} to geometry in sketch {sketch_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error trimming line to geometry in sketch: {e}")
            return False
    
    def extend_line_to_line_in_sketch(self, sketch_id: str, line_to_extend_id: str, target_line_id: str, extend_start: bool = False) -> bool:
        """
        Extend a line to reach intersection with another line - equivalent to C++ extendLineToLine
        
        Args:
            sketch_id: Sketch identifier
            line_to_extend_id: ID of line to be extended
            target_line_id: ID of line to extend toward
            extend_start: If True, extend start; if False, extend end
            
        Returns:
            True if successful, False if failed
        """
        print(f"📏 Extending line {line_to_extend_id} to line {target_line_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return False
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform extend operation
            success = sketch.extend_line_to_line(line_to_extend_id, target_line_id, extend_start)
            
            if success:
                print(f"✅ Successfully extended line {line_to_extend_id} in sketch {sketch_id}")
            else:
                print(f"❌ Failed to extend line {line_to_extend_id} in sketch {sketch_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error extending line in sketch: {e}")
            return False
    
    def extend_line_to_geometry_in_sketch(self, sketch_id: str, line_to_extend_id: str, target_geometry_id: str, extend_start: bool = False) -> bool:
        """
        Extend a line to reach intersection with complex geometry - equivalent to C++ extendLineToGeometry
        
        Args:
            sketch_id: Sketch identifier
            line_to_extend_id: ID of line to be extended
            target_geometry_id: ID of geometry to extend toward (rectangle, polygon, circle)
            extend_start: If True, extend start; if False, extend end
            
        Returns:
            True if successful, False if failed
        """
        print(f"📏 Extending line {line_to_extend_id} to geometry {target_geometry_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return False
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform extend operation
            success = sketch.extend_line_to_geometry(line_to_extend_id, target_geometry_id, extend_start)
            
            if success:
                print(f"✅ Successfully extended line {line_to_extend_id} to geometry in sketch {sketch_id}")
            else:
                print(f"❌ Failed to extend line {line_to_extend_id} to geometry in sketch {sketch_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error extending line to geometry in sketch: {e}")
            return False
    
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
    
    def mirror_elements_in_sketch(self, sketch_id: str, element_ids: List[str], mirror_line_id: str, keep_original: bool = True) -> List[str]:
        """
        Mirror geometry elements across an existing line element - equivalent to C++ mirrorElements
        
        Args:
            sketch_id: Sketch identifier
            element_ids: List of element IDs to mirror
            mirror_line_id: ID of line element to use as mirror axis
            keep_original: If True, keep original elements; if False, replace with mirrored versions
            
        Returns:
            List of new mirrored element IDs
        """
        print(f"🪞 Mirroring {len(element_ids)} elements across line {mirror_line_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return []
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform mirror operation
            mirrored_ids = sketch.mirror_elements(element_ids, mirror_line_id, keep_original)
            
            if mirrored_ids:
                print(f"✅ Successfully mirrored {len(mirrored_ids)} elements in sketch {sketch_id}")
            else:
                print(f"❌ Failed to mirror elements in sketch {sketch_id}")
            
            return mirrored_ids
            
        except Exception as e:
            print(f"❌ Error mirroring elements in sketch: {e}")
            return []
    
    def mirror_elements_by_two_points_in_sketch(self, sketch_id: str, element_ids: List[str], 
                                               x1: float, y1: float, x2: float, y2: float, 
                                               keep_original: bool = True) -> List[str]:
        """
        Mirror geometry elements across a line defined by two points - equivalent to C++ mirrorElementsByTwoPoints
        
        Args:
            sketch_id: Sketch identifier
            element_ids: List of element IDs to mirror
            x1, y1: First point defining the mirror line
            x2, y2: Second point defining the mirror line
            keep_original: If True, keep original elements; if False, replace with mirrored versions
            
        Returns:
            List of new mirrored element IDs
        """
        print(f"🪞 Mirroring {len(element_ids)} elements across line defined by two points in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return []
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Create 2D points
            point1 = gp_Pnt2d(x1, y1)
            point2 = gp_Pnt2d(x2, y2)
            
            # Perform mirror operation
            mirrored_ids = sketch.mirror_elements_by_two_points(element_ids, point1, point2, keep_original)
            
            if mirrored_ids:
                print(f"✅ Successfully mirrored {len(mirrored_ids)} elements in sketch {sketch_id}")
            else:
                print(f"❌ Failed to mirror elements in sketch {sketch_id}")
            
            return mirrored_ids
            
        except Exception as e:
            print(f"❌ Error mirroring elements by two points in sketch: {e}")
            return []
    
    def offset_element_in_sketch(self, sketch_id: str, element_id: str, offset_distance: float) -> str:
        """
        Offset a geometry element in sketch - equivalent to C++ offsetElement
        
        Args:
            sketch_id: Sketch identifier
            element_id: ID of element to offset
            offset_distance: Offset distance (positive = outward/right, negative = inward/left)
            
        Returns:
            New offset element ID if successful, empty string if failed
        """
        print(f"📐 Offsetting element {element_id} by distance {offset_distance} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform offset operation
            offset_element_id = sketch.offset_element(element_id, offset_distance)
            
            if offset_element_id:
                print(f"✅ Successfully offset element {element_id} in sketch {sketch_id}")
            else:
                print(f"❌ Failed to offset element {element_id} in sketch {sketch_id}")
            
            return offset_element_id
            
        except Exception as e:
            print(f"❌ Error offsetting element in sketch: {e}")
            return ""
    
    def offset_element_directional_in_sketch(self, sketch_id: str, element_id: str, offset_distance: float, direction: str) -> str:
        """
        Offset a line element in a specific direction - equivalent to C++ offsetElementDirectional
        
        Args:
            sketch_id: Sketch identifier
            element_id: ID of line element to offset
            offset_distance: Offset distance (always positive)
            direction: Direction to offset ("left" or "right" relative to line direction)
            
        Returns:
            New offset element ID if successful, empty string if failed
        """
        print(f"📐 Offsetting element {element_id} directionally ({direction}) by distance {offset_distance} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return ""
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform directional offset operation
            offset_element_id = sketch.offset_element_directional(element_id, offset_distance, direction)
            
            if offset_element_id:
                print(f"✅ Successfully offset element {element_id} directionally in sketch {sketch_id}")
            else:
                print(f"❌ Failed to offset element {element_id} directionally in sketch {sketch_id}")
            
            return offset_element_id
            
        except Exception as e:
            print(f"❌ Error offsetting element directionally in sketch: {e}")
            return ""
    
    def copy_element_in_sketch(self, sketch_id: str, element_id: str, num_copies: int, direction_x: float, direction_y: float, distance: float) -> List[str]:
        """
        Copy a geometry element multiple times with linear spacing - equivalent to C++ copyElement
        
        Args:
            sketch_id: Sketch identifier
            element_id: ID of element to copy
            num_copies: Number of copies to create (excluding original)
            direction_x: X component of direction vector
            direction_y: Y component of direction vector
            distance: Distance between copies
            
        Returns:
            List of new copied element IDs
        """
        print(f"📄 Copying element {element_id} {num_copies} times in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return []
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform copy operation
            copied_element_ids = sketch.copy_element(element_id, num_copies, direction_x, direction_y, distance)
            
            if copied_element_ids:
                print(f"✅ Successfully copied element {element_id} {len(copied_element_ids)} times in sketch {sketch_id}")
            else:
                print(f"❌ Failed to copy element {element_id} in sketch {sketch_id}")
            
            return copied_element_ids
            
        except Exception as e:
            print(f"❌ Error copying element in sketch: {e}")
            return []
    
    def move_element_in_sketch(self, sketch_id: str, element_id: str, direction_x: float, direction_y: float, distance: float) -> bool:
        """
        Move a geometry element to a new position - equivalent to C++ moveElement
        
        Args:
            sketch_id: Sketch identifier
            element_id: ID of element to move
            direction_x: X component of direction vector
            direction_y: Y component of direction vector
            distance: Distance to move
            
        Returns:
            True if successful, False if failed
        """
        print(f"➡️ Moving element {element_id} in sketch {sketch_id}")
        
        if not self.sketch_exists(sketch_id):
            print(f"❌ Sketch not found: {sketch_id}")
            return False
        
        try:
            sketch = self.sketches[sketch_id]
            
            # Perform move operation
            success = sketch.move_element(element_id, direction_x, direction_y, distance)
            
            if success:
                print(f"✅ Successfully moved element {element_id} in sketch {sketch_id}")
            else:
                print(f"❌ Failed to move element {element_id} in sketch {sketch_id}")
            
            return success
            
        except Exception as e:
            print(f"❌ Error moving element in sketch: {e}")
            return False