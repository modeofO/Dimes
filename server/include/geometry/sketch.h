#pragma once

#include "geometry/sketch_plane.h"
#include <TopoDS_Wire.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Circ2d.hxx>
#include <gp_Lin2d.hxx>
#include <vector>
#include <memory>
#include <string>

struct SketchElement {
    enum Type { LINE, CIRCLE, ARC } type;
    std::string id;
    
    // For LINE: start_point, end_point
    // For CIRCLE: center_point, radius (stored in parameters[0])
    // For ARC: center_point, start_point, end_point, radius (stored in parameters[0])
    gp_Pnt2d start_point;
    gp_Pnt2d end_point;
    gp_Pnt2d center_point;  // For circles and arcs
    std::vector<double> parameters;  // radius, angles, etc.
    
    SketchElement(Type t, const std::string& element_id) : type(t), id(element_id) {}
};

class Sketch {
private:
    std::shared_ptr<SketchPlane> sketch_plane_;
    std::vector<SketchElement> elements_;
    std::string sketch_id_;
    bool is_closed_;
    
    // Internal methods
    TopoDS_Edge createElement2D(const SketchElement& element) const;
    TopoDS_Edge convertTo3D(const TopoDS_Edge& edge2d) const;

public:
    explicit Sketch(std::shared_ptr<SketchPlane> plane, const std::string& id = "");
    
    // Sketch element creation
    std::string addLine(const gp_Pnt2d& start, const gp_Pnt2d& end);
    std::string addCircle(const gp_Pnt2d& center, double radius);
    std::string addArc(const gp_Pnt2d& center, const gp_Pnt2d& start, const gp_Pnt2d& end, double radius);
    
    // Sketch operations
    TopoDS_Wire createWire() const;          // Create 3D wire from sketch elements
    TopoDS_Face createFace() const;          // Create face from closed wire
    bool isClosed() const;                   // Check if sketch forms closed profile
    void close();                            // Attempt to close the sketch
    
    // Getters
    const std::string& getId() const { return sketch_id_; }
    const std::shared_ptr<SketchPlane>& getPlane() const { return sketch_plane_; }
    const std::vector<SketchElement>& getElements() const { return elements_; }
    size_t getElementCount() const { return elements_.size(); }
    
    // Element management
    void removeElement(const std::string& element_id);
    void clearAll();
    
    // Validation
    bool isValid() const;
    std::vector<std::string> getValidationErrors() const;
}; 