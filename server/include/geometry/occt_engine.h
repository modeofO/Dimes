#pragma once

#include "types.h"
#include "json/json.h"
#include <map>
#include <string>
#include <memory>
#include <vector>

// OCCT includes
#include <TopoDS_Shape.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>

// Forward declarations for new sketch-based classes
class SketchPlane;
class Sketch;
class ExtrudeFeature;

// Using types from Geometry namespace
using Geometry::Vector3d;

struct BoxParameters {
    double width = 10.0;
    double height = 10.0;
    double depth = 10.0;
    Vector3d position = {0, 0, 0};
};

struct MeshData {
    std::vector<double> vertices;
    std::vector<int> faces;
    std::vector<double> normals;
    struct {
        int vertex_count;
        int face_count;
        double tessellation_quality;
    } metadata;
};

struct OperationResult {
    bool success;
    std::string message;
    TopoDS_Shape shape;
};

class OCCTEngine {
private:
    std::map<std::string, TopoDS_Shape> shapes_;
    std::map<std::string, double> parameters_;
    
    // Sketch-based modeling support
    std::map<std::string, std::shared_ptr<SketchPlane>> sketch_planes_;
    std::map<std::string, std::shared_ptr<Sketch>> sketches_;
    std::map<std::string, std::shared_ptr<ExtrudeFeature>> extrude_features_;
    
public:
    OCCTEngine();
    ~OCCTEngine();
    
    // Core operations
    std::string createBox(const BoxParameters& params);
    std::string createCylinder(double radius, double height, const Vector3d& position = {0,0,0});
    std::string createSphere(double radius, const Vector3d& position = {0,0,0});
    
    // Boolean operations
    bool unionShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id);
    bool cutShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id);
    bool intersectShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id);
    
    // Parametric updates
    bool updateParameter(const std::string& param_name, double value);
    void rebuildModel();
    
    // Sketch-based modeling operations
    std::string createSketchPlane(const std::string& plane_type, const Vector3d& origin = {0,0,0});
    std::string createSketch(const std::string& plane_id);
    std::string addLineToSketch(const std::string& sketch_id, double x1, double y1, double x2, double y2);
    std::string addCircleToSketch(const std::string& sketch_id, double center_x, double center_y, double radius);
    std::string extrudeSketch(const std::string& sketch_id, double distance, const std::string& direction = "normal");
    
    // Export functions
    MeshData tessellate(const std::string& shape_id, double deflection = 0.1);
    bool exportSTEP(const std::string& shape_id, const std::string& filename);
    bool exportSTL(const std::string& shape_id, const std::string& filename);
    
    // Utility functions
    bool shapeExists(const std::string& shape_id) const;
    void removeShape(const std::string& shape_id);
    void clearAll();
    std::vector<std::string> getAvailableShapeIds() const;
    
    // Sketch utility functions
    bool sketchExists(const std::string& sketch_id) const;
    bool planeExists(const std::string& plane_id) const;
    std::vector<std::string> getAvailableSketchIds() const;
    std::vector<std::string> getAvailablePlaneIds() const;
    
    // Visualization data generation
    Json::Value getPlaneVisualizationData(const std::string& plane_id);
    Json::Value getSketchVisualizationData(const std::string& sketch_id);
    Json::Value getSketchElementVisualizationData(const std::string& sketch_id, const std::string& element_id);
    
private:
    bool validateShape(const TopoDS_Shape& shape) const;
    std::string generateShapeId();
}; 