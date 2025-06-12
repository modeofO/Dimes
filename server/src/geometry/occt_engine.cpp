#include "geometry/occt_engine.h"

// OCCT includes
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <STEPCAFControl_Writer.hxx>
#include <StlAPI_Writer.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <Poly_Triangulation.hxx>
#include <TColgp_Array1OfPnt.hxx>
#include <Poly_Array1OfTriangle.hxx>

#include <iostream>
#include <sstream>
#include <random>

OCCTEngine::OCCTEngine() {
    std::cout << "OCCT Engine initialized" << std::endl;
}

OCCTEngine::~OCCTEngine() {
    clearAll();
}

std::string OCCTEngine::createBox(const BoxParameters& params) {
    try {
        gp_Pnt corner(params.position.x, params.position.y, params.position.z);
        BRepPrimAPI_MakeBox boxMaker(corner, params.width, params.height, params.depth);
        
        TopoDS_Shape box = boxMaker.Shape();
        if (!validateShape(box)) {
            return "";
        }
        
        std::string shape_id = generateShapeId();
        shapes_[shape_id] = box;
        
        return shape_id;
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error creating box: " << e.GetMessageString() << std::endl;
        return "";
    }
}

std::string OCCTEngine::createCylinder(double radius, double height, const Vector3d& position) {
    try {
        gp_Ax2 axis(gp_Pnt(position.x, position.y, position.z), gp_Dir(0, 0, 1));
        BRepPrimAPI_MakeCylinder cylinderMaker(axis, radius, height);
        
        TopoDS_Shape cylinder = cylinderMaker.Shape();
        if (!validateShape(cylinder)) {
            return "";
        }
        
        std::string shape_id = generateShapeId();
        shapes_[shape_id] = cylinder;
        
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
    
    if (!shapeExists(shape_id)) {
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
    (void)shape1_id; (void)shape2_id; (void)result_id; // Suppress unused parameter warnings
    // TODO: Implement cut operation
    return false;
}

bool OCCTEngine::intersectShapes(const std::string& shape1_id, const std::string& shape2_id, const std::string& result_id) {
    (void)shape1_id; (void)shape2_id; (void)result_id; // Suppress unused parameter warnings
    // TODO: Implement intersection operation
    return false;
}

bool OCCTEngine::exportSTEP(const std::string& shape_id, const std::string& filename) {
    (void)shape_id; (void)filename; // Suppress unused parameter warnings
    // TODO: Implement STEP export
    return false;
}

bool OCCTEngine::exportSTL(const std::string& shape_id, const std::string& filename) {
    (void)shape_id; (void)filename; // Suppress unused parameter warnings
    // TODO: Implement STL export
    return false;
} 