"""
Core geometry engine using pythonOCC - Python version of OCCTEngine
"""
import json
import random
import string
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import time

# pythonOCC core imports
from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse, BRepAlgoAPI_Cut, BRepAlgoAPI_Common
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.BRepCheck import BRepCheck_Analyzer
from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeSphere, BRepPrimAPI_MakeCylinder
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_FACE
from OCC.Core.BRep import BRep_Tool
from OCC.Core.TopoDS import TopoDS_Shape, TopoDS_Face, topods
from OCC.Core.Poly import Poly_Triangulation
from OCC.Core.TopLoc import TopLoc_Location
from OCC.Core.gp import gp_Pnt, gp_Vec, gp_Dir, gp_Ax3, gp_Pln
from OCC.Core.Standard import Standard_Failure

# For sketch-based modeling
from OCC.Core.Geom import Geom_Plane
from OCC.Core.gce import gce_MakePln


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
        self.elements = []  # List of sketch elements
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
    
    def add_element(self, element: Any) -> bool:
        """Add element to sketch"""
        try:
            self.elements.append(element)
            print(f"✅ Added element to sketch {self.sketch_id}: {len(self.elements)} elements")
            return True
        except Exception as e:
            print(f"❌ Error adding element to sketch: {e}")
            return False
    
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