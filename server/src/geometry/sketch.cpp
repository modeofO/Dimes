#include "geometry/sketch.h"
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Line.hxx>
#include <Geom_TrimmedCurve.hxx>
#include <gp_Ax2.hxx>
#include <gp_Vec.hxx>
#include <sstream>
#include <iostream>

Sketch::Sketch(std::shared_ptr<SketchPlane> plane, const std::string& id) 
    : sketch_plane_(plane), is_closed_(false) {
    
    if (id.empty()) {
        std::stringstream ss;
        ss << "Sketch_" << std::time(nullptr);
        sketch_id_ = ss.str();
    } else {
        sketch_id_ = id;
    }
    
    std::cout << "Created sketch: " << sketch_id_ << " on plane: " << plane->getPlaneId() << std::endl;
}

std::string Sketch::addLine(const gp_Pnt2d& start, const gp_Pnt2d& end) {
    std::stringstream ss;
    ss << "Line_" << elements_.size() + 1;
    std::string line_id = ss.str();
    
    SketchElement line(SketchElement::LINE, line_id);
    line.start_point = start;
    line.end_point = end;
    
    elements_.push_back(line);
    
    std::cout << "Added line to sketch " << sketch_id_ << ": " << line_id << std::endl;
    return line_id;
}

std::string Sketch::addCircle(const gp_Pnt2d& center, double radius) {
    std::stringstream ss;
    ss << "Circle_" << elements_.size() + 1;
    std::string circle_id = ss.str();
    
    SketchElement circle(SketchElement::CIRCLE, circle_id);
    circle.center_point = center;
    circle.parameters.push_back(radius);
    
    elements_.push_back(circle);
    
    std::cout << "Added circle to sketch " << sketch_id_ << ": " << circle_id << std::endl;
    return circle_id;
}

std::string Sketch::addArc(const gp_Pnt2d& center, const gp_Pnt2d& start, const gp_Pnt2d& end, double radius) {
    std::stringstream ss;
    ss << "Arc_" << elements_.size() + 1;
    std::string arc_id = ss.str();
    
    SketchElement arc(SketchElement::ARC, arc_id);
    arc.center_point = center;
    arc.start_point = start;
    arc.end_point = end;
    arc.parameters.push_back(radius);
    
    elements_.push_back(arc);
    
    std::cout << "Added arc to sketch " << sketch_id_ << ": " << arc_id << std::endl;
    return arc_id;
}

TopoDS_Edge Sketch::createElement2D(const SketchElement& element) const {
    TopoDS_Edge edge;
    
    try {
        const gp_Ax2& plane_cs = sketch_plane_->getCoordinateSystem();
        
        switch (element.type) {
            case SketchElement::LINE: {
                // Convert 2D points to 3D on the sketch plane
                gp_Pnt start_3d = sketch_plane_->to3D(element.start_point);
                gp_Pnt end_3d = sketch_plane_->to3D(element.end_point);
                
                BRepBuilderAPI_MakeEdge lineBuilder(start_3d, end_3d);
                edge = lineBuilder.Edge();
                break;
            }
            
            case SketchElement::CIRCLE: {
                double radius = element.parameters[0];
                
                // Get the sketch plane's coordinate system
                const gp_Ax2& plane_cs = sketch_plane_->getCoordinateSystem();

                // Create a new coordinate system for the circle, located at the circle's center
                // but with the same orientation as the sketch plane.
                gp_Ax2 circle_cs = plane_cs; // Copy orientation
                gp_Pnt center_3d = sketch_plane_->to3D(element.center_point); // Get the 3D center point
                circle_cs.SetLocation(center_3d); // Set the location of the new coordinate system

                // Create circle on the sketch plane at the correct location
                Handle(Geom_Circle) circle = new Geom_Circle(circle_cs, radius);
                BRepBuilderAPI_MakeEdge circleBuilder(circle);
                edge = circleBuilder.Edge();
                break;
            }
            
            case SketchElement::ARC: {
                double radius = element.parameters[0];
                gp_Pnt center_3d = sketch_plane_->to3D(element.center_point);
                gp_Pnt start_3d = sketch_plane_->to3D(element.start_point);
                gp_Pnt end_3d = sketch_plane_->to3D(element.end_point);
                
                // Create full circle first
                Handle(Geom_Circle) circle = new Geom_Circle(plane_cs, radius);
                
                // Create trimmed arc
                // Note: This is simplified - proper arc creation would need parameter calculation
                Handle(Geom_TrimmedCurve) arc = new Geom_TrimmedCurve(circle, 0, M_PI);
                BRepBuilderAPI_MakeEdge arcBuilder(arc);
                edge = arcBuilder.Edge();
                break;
            }
        }
        
    } catch (const Standard_Failure& e) {
        std::cerr << "Error creating sketch element: " << e.GetMessageString() << std::endl;
    }
    
    return edge;
}

TopoDS_Wire Sketch::createWire() const {
    BRepBuilderAPI_MakeWire wireBuilder;
    
    try {
        for (const auto& element : elements_) {
            TopoDS_Edge edge = createElement2D(element);
            if (!edge.IsNull()) {
                wireBuilder.Add(edge);
            }
        }
        
        if (wireBuilder.IsDone()) {
            return wireBuilder.Wire();
        }
        
    } catch (const Standard_Failure& e) {
        std::cerr << "Error creating wire from sketch: " << e.GetMessageString() << std::endl;
    }
    
    return TopoDS_Wire();  // Return null wire on failure
}

TopoDS_Face Sketch::createFace() const {
    TopoDS_Wire wire = createWire();
    
    if (wire.IsNull()) {
        std::cerr << "Cannot create face: wire is null" << std::endl;
        return TopoDS_Face();
    }
    
    try {
        BRepBuilderAPI_MakeFace faceBuilder(wire);
        
        if (faceBuilder.IsDone()) {
            return faceBuilder.Face();
        } else {
            std::cerr << "Failed to create face from wire" << std::endl;
        }
        
    } catch (const Standard_Failure& e) {
        std::cerr << "Error creating face from sketch: " << e.GetMessageString() << std::endl;
    }
    
    return TopoDS_Face();  // Return null face on failure
}

TopoDS_Face Sketch::createFaceFromElement(const std::string& element_id) const {
    const SketchElement* target_element = nullptr;
    for (const auto& element : elements_) {
        if (element.id == element_id) {
            target_element = &element;
            break;
        }
    }

    if (!target_element) {
        std::cerr << "Element not found for face creation: " << element_id << std::endl;
        return TopoDS_Face();
    }

    TopoDS_Edge edge = createElement2D(*target_element);
    if (edge.IsNull()) {
        std::cerr << "Failed to create edge for element: " << element_id << std::endl;
        return TopoDS_Face();
    }

    BRepBuilderAPI_MakeWire wireBuilder(edge);
    if (!wireBuilder.IsDone()) {
        std::cerr << "Failed to create wire for element: " << element_id << std::endl;
        return TopoDS_Face();
    }

    BRepBuilderAPI_MakeFace faceBuilder(wireBuilder.Wire());
    if (faceBuilder.IsDone()) {
        return faceBuilder.Face();
    }

    std::cerr << "Failed to create face for element: " << element_id << std::endl;
    return TopoDS_Face();
}

bool Sketch::isClosed() const {
    if (elements_.empty()) return false;
    
    // Simple check: if we have at least one circle, it's closed
    for (const auto& element : elements_) {
        if (element.type == SketchElement::CIRCLE) {
            return true;
        }
    }
    
    // For lines and arcs, we'd need to check if they form a closed loop
    // This is simplified - proper implementation would check connectivity
    return is_closed_;
}

void Sketch::close() {
    // Simplified implementation - mark as closed
    is_closed_ = true;
}

void Sketch::removeElement(const std::string& element_id) {
    elements_.erase(
        std::remove_if(elements_.begin(), elements_.end(),
            [&element_id](const SketchElement& elem) {
                return elem.id == element_id;
            }),
        elements_.end()
    );
}

void Sketch::clearAll() {
    elements_.clear();
    is_closed_ = false;
}

bool Sketch::isValid() const {
    if (elements_.empty()) return false;
    
    // Check if we can create a valid wire
    TopoDS_Wire wire = createWire();
    if (wire.IsNull()) return false;
    
    // Check wire validity
    BRepCheck_Analyzer analyzer(wire);
    return analyzer.IsValid();
}

std::vector<std::string> Sketch::getValidationErrors() const {
    std::vector<std::string> errors;
    
    if (elements_.empty()) {
        errors.push_back("Sketch is empty");
    }
    
    if (!isValid()) {
        errors.push_back("Sketch geometry is invalid");
    }
    
    return errors;
} 