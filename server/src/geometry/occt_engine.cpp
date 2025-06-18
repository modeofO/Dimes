#include "geometry/occt_engine.h"
#include "geometry/sketch_plane.h"
#include "geometry/sketch.h"
#include "geometry/extrude_feature.h"

// OCCT includes
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepCheck_Analyzer.hxx>
// #include <STEPControl_Writer.hxx>  // Temporarily disabled
#include <StlAPI_Writer.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <Poly_Triangulation.hxx>
#include <TColgp_Array1OfPnt.hxx>
#include <Poly_Array1OfTriangle.hxx>
// Additional OCCT includes for STEP export - temporarily disabled
// #include <Interface_Static.hxx>
// #include <IFSelect_ReturnStatus.hxx>
// #include <STEPControl_StepModelType.hxx>

#include <iostream>
#include <sstream>
#include <random>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

OCCTEngine::OCCTEngine() {
    std::cout << "OCCT Engine initialized" << std::endl;
}

OCCTEngine::~OCCTEngine() {
    clearAll();
}

std::string OCCTEngine::createBox(const BoxParameters& params) {
    std::cout << "📦 OCCT createBox called: " << params.width << "x" << params.height << "x" << params.depth << std::endl;
    std::cout.flush();
    
    try {
        gp_Pnt corner(params.position.x, params.position.y, params.position.z);
        BRepPrimAPI_MakeBox boxMaker(corner, params.width, params.height, params.depth);
        
        TopoDS_Shape box = boxMaker.Shape();
        if (!validateShape(box)) {
            std::cout << "❌ Box shape validation failed!" << std::endl;
            std::cout.flush();
            return "";
        }
        
        std::string shape_id = generateShapeId();
        shapes_[shape_id] = box;
        
        std::cout << "✅ Box created successfully with ID: " << shape_id << std::endl;
        std::cout.flush();
        
        return shape_id;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating box: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::createCylinder(double radius, double height, const Vector3d& position) {
    std::cout << "🛢️ OCCT createCylinder called: radius=" << radius << ", height=" << height << std::endl;
    std::cout.flush();
    
    try {
        gp_Ax2 axis(gp_Pnt(position.x, position.y, position.z), gp_Dir(0, 0, 1));
        BRepPrimAPI_MakeCylinder cylinderMaker(axis, radius, height);
        
        TopoDS_Shape cylinder = cylinderMaker.Shape();
        if (!validateShape(cylinder)) {
            std::cout << "❌ Cylinder shape validation failed!" << std::endl;
            std::cout.flush();
            return "";
        }
        
        std::string shape_id = generateShapeId();
        shapes_[shape_id] = cylinder;
        
        std::cout << "✅ Cylinder created successfully with ID: " << shape_id << std::endl;
        std::cout.flush();
        
        return shape_id;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating cylinder: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::createSphere(double radius, const Vector3d& position) {
    try {
        gp_Pnt center(position.x, position.y, position.z);
        BRepPrimAPI_MakeSphere sphereMaker(center, radius);
        
        TopoDS_Shape sphere = sphereMaker.Shape();
        if (!validateShape(sphere)) {
            return "";
        }
        
        std::string shape_id = generateShapeId();
        shapes_[shape_id] = sphere;
        
        return shape_id;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating sphere: " << e.GetMessageString() << std::endl;
        return "";
    }
}

bool OCCTEngine::unionShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id) {
    if (!shapeExists(shape1_id) || !shapeExists(shape2_id)) {
        return false;
    }
    
    try {
        BRepAlgoAPI_Fuse fuseMaker(shapes_[shape1_id], shapes_[shape2_id]);
        TopoDS_Shape result = fuseMaker.Shape();
        
        if (!validateShape(result)) {
            return false;
        }
        
        shapes_[result_id] = result;
        return true;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in union operation: " << e.GetMessageString() << std::endl;
        return false;
    }
}

MeshData OCCTEngine::tessellate(const std::string& shape_id, double deflection) {
    MeshData meshData;
    
    std::cout << "🔍 OCCT tessellate called for shape: " << shape_id << std::endl;
    std::cout.flush();
    
    if (!shapeExists(shape_id)) {
        std::cout << "❌ Shape " << shape_id << " does not exist!" << std::endl;
        std::cout.flush();
        return meshData;
    }
    
    try {
        TopoDS_Shape& shape = shapes_[shape_id];
        
        // Perform tessellation
        BRepMesh_IncrementalMesh mesh(shape, deflection);
        
        // Extract triangulation data
        TopExp_Explorer exp(shape, TopAbs_FACE);
        for (; exp.More(); exp.Next()) {
            TopoDS_Face face = TopoDS::Face(exp.Current());
            TopLoc_Location loc;
            Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, loc);
            
            if (!triangulation.IsNull()) {
                int base_vertex_index = static_cast<int>(meshData.vertices.size() / 3);
                
                // Add vertices using newer API
                for (int i = 1; i <= triangulation->NbNodes(); i++) {
                    gp_Pnt pnt = triangulation->Node(i).Transformed(loc);
                    meshData.vertices.push_back(pnt.X());
                    meshData.vertices.push_back(pnt.Y());
                    meshData.vertices.push_back(pnt.Z());
                }
                
                // Add faces using newer API
                for (int i = 1; i <= triangulation->NbTriangles(); i++) {
                    int n1, n2, n3;
                    triangulation->Triangle(i).Get(n1, n2, n3);
                    
                    meshData.faces.push_back(base_vertex_index + n1 - 1);
                    meshData.faces.push_back(base_vertex_index + n2 - 1);
                    meshData.faces.push_back(base_vertex_index + n3 - 1);
                }
            }
        }
        
        // Set metadata
        meshData.metadata.vertex_count = static_cast<int>(meshData.vertices.size() / 3);
        meshData.metadata.face_count = static_cast<int>(meshData.faces.size() / 3);
        meshData.metadata.tessellation_quality = deflection;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in tessellation: " << e.GetMessageString() << std::endl;
    }
    
    return meshData;
}

bool OCCTEngine::validateShape(const TopoDS_Shape& shape) const {
    if (shape.IsNull()) {
        return false;
    }
    
    BRepCheck_Analyzer analyzer(shape);
    return analyzer.IsValid();
}

std::string OCCTEngine::generateShapeId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(1000, 9999);
    
    std::stringstream ss;
    ss << "shape_" << dis(gen);
    return ss.str();
}

bool OCCTEngine::shapeExists(const std::string& shape_id) const {
    return shapes_.find(shape_id) != shapes_.end();
}

void OCCTEngine::removeShape(const std::string& shape_id) {
    shapes_.erase(shape_id);
}

void OCCTEngine::clearAll() {
    shapes_.clear();
    parameters_.clear();
    
    // Clear sketch-based objects
    extrude_features_.clear();
    sketches_.clear();
    sketch_planes_.clear();
}

std::vector<std::string> OCCTEngine::getAvailableShapeIds() const {
    std::vector<std::string> ids;
    for (const auto& pair : shapes_) {
        ids.push_back(pair.first);
    }
    return ids;
}

bool OCCTEngine::updateParameter(const std::string& param_name, double value) {
    parameters_[param_name] = value;
    // TODO: Implement parameter-driven rebuilding
    return true;
}

void OCCTEngine::rebuildModel() {
    // TODO: Implement model rebuilding based on parameters
}

bool OCCTEngine::cutShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id) {
    if (!shapeExists(shape1_id) || !shapeExists(shape2_id)) {
        return false;
    }
    
    try {
        BRepAlgoAPI_Cut cutMaker(shapes_[shape1_id], shapes_[shape2_id]);
        TopoDS_Shape result = cutMaker.Shape();
        
        if (!validateShape(result)) {
            return false;
        }
        
        shapes_[result_id] = result;
        return true;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in cut operation: " << e.GetMessageString() << std::endl;
        return false;
    }
}

bool OCCTEngine::intersectShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id) {
    if (!shapeExists(shape1_id) || !shapeExists(shape2_id)) {
        return false;
    }
    
    try {
        BRepAlgoAPI_Common commonMaker(shapes_[shape1_id], shapes_[shape2_id]);
        TopoDS_Shape result = commonMaker.Shape();
        
        if (!validateShape(result)) {
            return false;
        }
        
        shapes_[result_id] = result;
        return true;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in intersect operation: " << e.GetMessageString() << std::endl;
        return false;
    }
}

bool OCCTEngine::exportSTEP(const std::string& shape_id, const std::string& filename) {
    if (!shapeExists(shape_id)) {
        std::cerr << "Shape not found: " << shape_id << std::endl;
        return false;
    }

    // Temporarily disabled - linker can't find STEP libraries
    std::cerr << "STEP export temporarily disabled - missing STEP libraries" << std::endl;
    std::cerr << "Would export shape " << shape_id << " to " << filename << std::endl;
    return false;

    /*
    try {
        // Create STEP writer (use STEPControl_Writer for simple shape export)
        STEPControl_Writer writer;
        
        // Set precision and units
        Interface_Static::SetCVal("write.step.unit", "MM");
        Interface_Static::SetRVal("write.precision.val", 0.01);
        
        // Transfer the shape to the writer
        const TopoDS_Shape& shape = shapes_[shape_id];
        IFSelect_ReturnStatus status = writer.Transfer(shape, STEPControl_AsIs);
        
        if (status != IFSelect_RetDone) {
            std::cerr << "Failed to transfer shape to STEP writer" << std::endl;
            return false;
        }
        
        // Write the file
        status = writer.Write(filename.c_str());
        
        if (status != IFSelect_RetDone) {
            std::cerr << "Failed to write STEP file: " << filename << std::endl;
            return false;
        }
        
        std::cout << "Successfully exported STEP file: " << filename << std::endl;
        return true;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in STEP export: " << e.GetMessageString() << std::endl;
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Standard error in STEP export: " << e.what() << std::endl;
        return false;
    }
    */
}

bool OCCTEngine::exportSTL(const std::string& shape_id, const std::string& filename) {
    (void)shape_id; (void)filename; // Suppress unused parameter warnings
    // TODO: Implement STL export
    return false;
}

// ==================== SKETCH-BASED MODELING METHODS ====================

std::string OCCTEngine::createSketchPlane(const std::string& plane_type, const Vector3d& origin) {
    std::cout << "🎯 Creating sketch plane: " << plane_type << " at (" << origin.x << "," << origin.y << "," << origin.z << ")" << std::endl;
    std::cout.flush();
    
    try {
        std::shared_ptr<SketchPlane> plane;
        
        if (plane_type == "XY") {
            plane = SketchPlane::createXYPlane(origin);
        } else if (plane_type == "XZ") {
            plane = SketchPlane::createXZPlane(origin);
        } else if (plane_type == "YZ") {
            plane = SketchPlane::createYZPlane(origin);
        } else {
            std::cerr << "❌ Unknown plane type: " << plane_type << std::endl;
            return "";
        }
        
        std::string plane_id = plane->getPlaneId();
        sketch_planes_[plane_id] = plane;
        
        std::cout << "✅ Created sketch plane: " << plane_id << std::endl;
        std::cout.flush();
        
        return plane_id;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating sketch plane: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::createSketch(const std::string& plane_id) {
    std::cout << "📐 Creating sketch on plane: " << plane_id << std::endl;
    std::cout.flush();
    
    if (!planeExists(plane_id)) {
        std::cerr << "❌ Sketch plane not found: " << plane_id << std::endl;
        return "";
    }
    
    try {
        auto plane = sketch_planes_[plane_id];
        auto sketch = std::make_shared<Sketch>(plane);
        
        std::string sketch_id = sketch->getId();
        sketches_[sketch_id] = sketch;
        
        std::cout << "✅ Created sketch: " << sketch_id << std::endl;
        std::cout.flush();
        
        return sketch_id;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating sketch: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::addLineToSketch(const std::string& sketch_id, double x1, double y1, double x2, double y2) {
    std::cout << "📏 Adding line to sketch " << sketch_id << ": (" << x1 << "," << y1 << ") to (" << x2 << "," << y2 << ")" << std::endl;
    std::cout.flush();
    
    if (!sketchExists(sketch_id)) {
        std::cerr << "❌ Sketch not found: " << sketch_id << std::endl;
        return "";
    }
    
    try {
        auto sketch = sketches_[sketch_id];
        gp_Pnt2d start(x1, y1);
        gp_Pnt2d end(x2, y2);
        
        std::string line_id = sketch->addLine(start, end);
        std::cout << "✅ Added line " << line_id << " to sketch " << sketch_id << std::endl;
        std::cout.flush();
        
        return line_id;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error adding line to sketch: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::addCircleToSketch(const std::string& sketch_id, double center_x, double center_y, double radius) {
    std::cout << "⭕ Adding circle to sketch " << sketch_id << ": center(" << center_x << "," << center_y << ") radius=" << radius << std::endl;
    std::cout.flush();
    
    if (!sketchExists(sketch_id)) {
        std::cerr << "❌ Sketch not found: " << sketch_id << std::endl;
        return "";
    }
    
    try {
        auto sketch = sketches_[sketch_id];
        gp_Pnt2d center(center_x, center_y);
        
        std::string circle_id = sketch->addCircle(center, radius);
        std::cout << "✅ Added circle " << circle_id << " to sketch " << sketch_id << std::endl;
        std::cout.flush();
        
        return circle_id;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error adding circle to sketch: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::extrudeSketch(const std::string& sketch_id, double distance, const std::string& direction) {
    std::cout << "🚀 Extruding sketch " << sketch_id << " by distance " << distance << std::endl;
    std::cout.flush();
    
    if (!sketchExists(sketch_id)) {
        std::cerr << "❌ Sketch not found: " << sketch_id << std::endl;
        return "";
    }
    
    try {
        auto sketch = sketches_[sketch_id];
        
        // Create extrude parameters
        ExtrudeParameters params(distance);
        
        // Create extrude feature
        auto extrude_feature = std::make_shared<ExtrudeFeature>(sketch, params);
        
        // Execute the extrude
        if (!extrude_feature->execute()) {
            std::cerr << "❌ Failed to execute extrude operation" << std::endl;
            return "";
        }
        
        // Store the feature and resulting shape
        std::string feature_id = extrude_feature->getId();
        extrude_features_[feature_id] = extrude_feature;
        shapes_[feature_id] = extrude_feature->getShape();
        
        std::cout << "✅ Extruded sketch successfully: " << feature_id << std::endl;
        std::cout.flush();
        
        return feature_id;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in extrude operation: " << e.GetMessageString() << std::endl;
        return "";
    }
}

// ==================== SKETCH UTILITY METHODS ====================

bool OCCTEngine::sketchExists(const std::string& sketch_id) const {
    return sketches_.find(sketch_id) != sketches_.end();
}

bool OCCTEngine::planeExists(const std::string& plane_id) const {
    return sketch_planes_.find(plane_id) != sketch_planes_.end();
}

std::vector<std::string> OCCTEngine::getAvailableSketchIds() const {
    std::vector<std::string> ids;
    for (const auto& pair : sketches_) {
        ids.push_back(pair.first);
    }
    return ids;
}

std::vector<std::string> OCCTEngine::getAvailablePlaneIds() const {
    std::vector<std::string> ids;
    for (const auto& pair : sketch_planes_) {
        ids.push_back(pair.first);
    }
    return ids;
}

// ==================== VISUALIZATION DATA METHODS ====================

Json::Value OCCTEngine::getPlaneVisualizationData(const std::string& plane_id) {
    Json::Value viz_data;
    
    if (!planeExists(plane_id)) {
        std::cerr << "❌ Plane not found for visualization: " << plane_id << std::endl;
        return viz_data;
    }
    
    try {
        auto plane = sketch_planes_[plane_id];
        Vector3d origin = plane->getOrigin();
        Vector3d normal = plane->getNormal();
        
        // Get coordinate system for U and V axes
        const gp_Ax2& coord_system = plane->getCoordinateSystem();
        gp_Dir u_dir = coord_system.XDirection();
        gp_Dir v_dir = coord_system.YDirection();
        
        viz_data = Json::Value::createObject();
        viz_data["plane_id"] = plane_id;
        viz_data["plane_type"] = (plane->getPlaneType() == Geometry::PlaneType::XY) ? "XY" : 
                                 (plane->getPlaneType() == Geometry::PlaneType::XZ) ? "XZ" : "YZ";
        
        // Origin
        Json::Value origin_array = Json::Value::createArray();
        origin_array.append(origin.x);
        origin_array.append(origin.y);
        origin_array.append(origin.z);
        viz_data["origin"] = origin_array;
        
        // Normal vector
        Json::Value normal_array = Json::Value::createArray();
        normal_array.append(normal.x);
        normal_array.append(normal.y);
        normal_array.append(normal.z);
        viz_data["normal"] = normal_array;
        
        // U axis (local X)
        Json::Value u_axis_array = Json::Value::createArray();
        u_axis_array.append(u_dir.X());
        u_axis_array.append(u_dir.Y());
        u_axis_array.append(u_dir.Z());
        viz_data["u_axis"] = u_axis_array;
        
        // V axis (local Y)
        Json::Value v_axis_array = Json::Value::createArray();
        v_axis_array.append(v_dir.X());
        v_axis_array.append(v_dir.Y());
        v_axis_array.append(v_dir.Z());
        viz_data["v_axis"] = v_axis_array;
        
        // Grid size for visualization
        viz_data["size"] = 50.0; // Default grid size
        
        std::cout << "✅ Generated plane visualization data for: " << plane_id << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error generating plane visualization data: " << e.what() << std::endl;
        return Json::Value();
    }
    
    return viz_data;
}

Json::Value OCCTEngine::getSketchVisualizationData(const std::string& sketch_id) {
    Json::Value viz_data;
    
    if (!sketchExists(sketch_id)) {
        std::cerr << "❌ Sketch not found for visualization: " << sketch_id << std::endl;
        return viz_data;
    }
    
    try {
        auto sketch = sketches_[sketch_id];
        auto plane = sketch->getPlane();
        Vector3d origin = plane->getOrigin();
        Vector3d normal = plane->getNormal();
        
        // Get coordinate system for U and V axes
        const gp_Ax2& coord_system = plane->getCoordinateSystem();
        gp_Dir u_dir = coord_system.XDirection();
        gp_Dir v_dir = coord_system.YDirection();
        
        viz_data = Json::Value::createObject();
        viz_data["sketch_id"] = sketch_id;
        viz_data["plane_id"] = plane->getPlaneId();
        
        // Origin
        Json::Value origin_array = Json::Value::createArray();
        origin_array.append(origin.x);
        origin_array.append(origin.y);
        origin_array.append(origin.z);
        viz_data["origin"] = origin_array;
        
        // Normal vector
        Json::Value normal_array = Json::Value::createArray();
        normal_array.append(normal.x);
        normal_array.append(normal.y);
        normal_array.append(normal.z);
        viz_data["normal"] = normal_array;
        
        // U axis (local X)
        Json::Value u_axis_array = Json::Value::createArray();
        u_axis_array.append(u_dir.X());
        u_axis_array.append(u_dir.Y());
        u_axis_array.append(u_dir.Z());
        viz_data["u_axis"] = u_axis_array;
        
        // V axis (local Y)
        Json::Value v_axis_array = Json::Value::createArray();
        v_axis_array.append(v_dir.X());
        v_axis_array.append(v_dir.Y());
        v_axis_array.append(v_dir.Z());
        viz_data["v_axis"] = v_axis_array;
        
        std::cout << "✅ Generated sketch visualization data for: " << sketch_id << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error generating sketch visualization data: " << e.what() << std::endl;
        return Json::Value();
    }
    
    return viz_data;
}

Json::Value OCCTEngine::getSketchElementVisualizationData(const std::string& sketch_id, const std::string& element_id) {
    Json::Value viz_data;
    
    if (!sketchExists(sketch_id)) {
        std::cerr << "❌ Sketch not found for element visualization: " << sketch_id << std::endl;
        return viz_data;
    }
    
    try {
        auto sketch = sketches_[sketch_id];
        auto plane = sketch->getPlane();
        const auto& elements = sketch->getElements();
        
        // Find the specific element
        const SketchElement* target_element = nullptr;
        for (const auto& element : elements) {
            if (element.id == element_id) {
                target_element = &element;
                break;
            }
        }
        
        if (!target_element) {
            std::cerr << "❌ Element not found: " << element_id << std::endl;
            return viz_data;
        }
        
        viz_data = Json::Value::createObject();
        viz_data["element_id"] = element_id;
        viz_data["sketch_id"] = sketch_id;
        
        // Determine element type
        std::string element_type;
        switch (target_element->type) {
            case SketchElement::LINE: element_type = "line"; break;
            case SketchElement::CIRCLE: element_type = "circle"; break;
            case SketchElement::ARC: element_type = "arc"; break;
            default: element_type = "unknown"; break;
        }
        viz_data["element_type"] = element_type;
        
        // Convert 2D points to 3D world coordinates
        Json::Value points_3d_array = Json::Value::createArray();
        Json::Value parameters_2d = Json::Value::createObject();
        
        if (target_element->type == SketchElement::LINE) {
            // Convert start and end points to 3D
            gp_Pnt start_3d = plane->to3D(target_element->start_point);
            gp_Pnt end_3d = plane->to3D(target_element->end_point);
            
            // Add 3D points (start and end for line)
            points_3d_array.append(start_3d.X());
            points_3d_array.append(start_3d.Y());
            points_3d_array.append(start_3d.Z());
            points_3d_array.append(end_3d.X());
            points_3d_array.append(end_3d.Y());
            points_3d_array.append(end_3d.Z());
            
            // Store 2D parameters
            parameters_2d["x1"] = target_element->start_point.X();
            parameters_2d["y1"] = target_element->start_point.Y();
            parameters_2d["x2"] = target_element->end_point.X();
            parameters_2d["y2"] = target_element->end_point.Y();
            
        } else if (target_element->type == SketchElement::CIRCLE) {
            // For circles, generate points around the circumference
            gp_Pnt center_3d = plane->to3D(target_element->center_point);
            double radius = target_element->parameters[0];
            
            // Generate circle points (16 segments for smooth visualization)
            const int segments = 16;
            for (int i = 0; i <= segments; ++i) {
                double angle = 2.0 * M_PI * i / segments;
                gp_Pnt2d circle_pt(
                    target_element->center_point.X() + radius * cos(angle),
                    target_element->center_point.Y() + radius * sin(angle)
                );
                gp_Pnt circle_3d = plane->to3D(circle_pt);
                
                points_3d_array.append(circle_3d.X());
                points_3d_array.append(circle_3d.Y());
                points_3d_array.append(circle_3d.Z());
            }
            
            // Store 2D parameters
            parameters_2d["center_x"] = target_element->center_point.X();
            parameters_2d["center_y"] = target_element->center_point.Y();
            parameters_2d["radius"] = radius;
        }
        
        viz_data["points_3d"] = points_3d_array;
        viz_data["parameters_2d"] = parameters_2d;
        
        std::cout << "✅ Generated element visualization data for: " << element_id << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error generating element visualization data: " << e.what() << std::endl;
        return Json::Value();
    }
    
    return viz_data;
} 