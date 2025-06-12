#pragma once

#include <map>
#include <string>
#include <memory>
#include <vector>

// OCCT includes
#include <TopoDS_Shape.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>

struct Vector3d {
    double x, y, z;
    Vector3d(double x = 0, double y = 0, double z = 0) : x(x), y(y), z(z) {}
};

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
    
    // Export functions
    MeshData tessellate(const std::string& shape_id, double deflection = 0.1);
    bool exportSTEP(const std::string& shape_id, const std::string& filename);
    bool exportSTL(const std::string& shape_id, const std::string& filename);
    
    // Utility functions
    bool shapeExists(const std::string& shape_id) const;
    void removeShape(const std::string& shape_id);
    void clearAll();
    
private:
    bool validateShape(const TopoDS_Shape& shape) const;
    std::string generateShapeId();
}; 