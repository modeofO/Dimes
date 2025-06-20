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
#include <set>

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

std::string Sketch::addRectangle(const gp_Pnt2d& corner, double width, double height) {
    std::stringstream ss;
    ss << "Rectangle_" << elements_.size() + 1;
    std::string rectangle_id = ss.str();
    
    SketchElement rectangle(SketchElement::RECTANGLE, rectangle_id);
    rectangle.start_point = corner;  // Bottom-left corner
    rectangle.parameters.push_back(width);   // parameters[0] = width
    rectangle.parameters.push_back(height);  // parameters[1] = height
    
    elements_.push_back(rectangle);
    
    std::cout << "Added rectangle to sketch " << sketch_id_ << ": " << rectangle_id << std::endl;
    return rectangle_id;
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
            
            case SketchElement::RECTANGLE: {
                // For rectangles in createElement2D, we need to return just one edge
                // The actual rectangle wire creation is handled by createWire() method
                double width = element.parameters[0];
                double height = element.parameters[1];
                
                gp_Pnt2d corner = element.start_point;
                gp_Pnt2d p1 = corner; // bottom-left
                gp_Pnt2d p2(corner.X() + width, corner.Y()); // bottom-right
                
                // Convert 2D points to 3D
                gp_Pnt p1_3d = sketch_plane_->to3D(p1);
                gp_Pnt p2_3d = sketch_plane_->to3D(p2);
                
                // Return just the bottom edge - the wire building logic handles the complete rectangle
                BRepBuilderAPI_MakeEdge edgeBuilder(p1_3d, p2_3d);
                edge = edgeBuilder.Edge();
                break;
            }
            
            case SketchElement::FILLET: {
                double radius = element.parameters[0];
                
                // Create a fillet arc at the specified center point
                gp_Ax2 fillet_cs = plane_cs; // Copy orientation
                gp_Pnt center_3d = sketch_plane_->to3D(element.center_point);
                fillet_cs.SetLocation(center_3d);
                
                // Create arc from start to end point
                gp_Pnt start_3d = sketch_plane_->to3D(element.start_point);
                gp_Pnt end_3d = sketch_plane_->to3D(element.end_point);
                
                std::cout << "Creating fillet arc: center(" << center_3d.X() << "," << center_3d.Y() << "," << center_3d.Z() 
                          << ") start(" << start_3d.X() << "," << start_3d.Y() << "," << start_3d.Z()
                          << ") end(" << end_3d.X() << "," << end_3d.Y() << "," << end_3d.Z() << ")" << std::endl;
                
                try {
                    // Create a circle in the sketch plane centered at the fillet center
                    Handle(Geom_Circle) circle = new Geom_Circle(fillet_cs, radius);
                    
                    // Calculate start and end parameters on the circle
                    gp_Vec2d start_vec(element.start_point.X() - element.center_point.X(),
                                       element.start_point.Y() - element.center_point.Y());
                    gp_Vec2d end_vec(element.end_point.X() - element.center_point.X(),
                                     element.end_point.Y() - element.center_point.Y());
                    
                    double start_angle = atan2(start_vec.Y(), start_vec.X());
                    double end_angle = atan2(end_vec.Y(), end_vec.X());
                    
                    // Ensure we create a proper arc (not more than 2π)
                    if (end_angle < start_angle) {
                        end_angle += 2.0 * M_PI;
                    }
                    
                    // Create trimmed curve (arc) from the circle
                    Handle(Geom_TrimmedCurve) arc = new Geom_TrimmedCurve(circle, start_angle, end_angle);
                    
                    BRepBuilderAPI_MakeEdge arcBuilder(arc);
                    if (arcBuilder.IsDone()) {
                        edge = arcBuilder.Edge();
                        std::cout << "Successfully created fillet arc edge using trimmed curve" << std::endl;
                    } else {
                        std::cout << "Failed to create fillet arc edge - falling back to line" << std::endl;
                        // Fallback: create a straight line if arc fails
                        BRepBuilderAPI_MakeEdge lineBuilder(start_3d, end_3d);
                        edge = lineBuilder.Edge();
                    }
                } catch (const Standard_Failure& e) {
                    std::cout << "Exception creating fillet arc: " << e.GetMessageString() << " - falling back to line" << std::endl;
                    // Fallback: create a straight line if arc fails
                    BRepBuilderAPI_MakeEdge lineBuilder(start_3d, end_3d);
                    edge = lineBuilder.Edge();
                }
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
        // Check if we have any fillets in the sketch
        bool hasFillets = false;
        for (const auto& element : elements_) {
            if (element.type == SketchElement::FILLET) {
                hasFillets = true;
                break;
            }
        }
        
        if (!hasFillets) {
            // Simple case: no fillets, use original logic
            for (const auto& element : elements_) {
                // Special handling for rectangles - create complete closed wire
                if (element.type == SketchElement::RECTANGLE) {
                    double width = element.parameters[0];
                    double height = element.parameters[1];
                    
                    // Create rectangle as a closed wire with 4 lines
                    gp_Pnt2d corner = element.start_point;
                    gp_Pnt2d p1 = corner; // bottom-left
                    gp_Pnt2d p2(corner.X() + width, corner.Y()); // bottom-right
                    gp_Pnt2d p3(corner.X() + width, corner.Y() + height); // top-right
                    gp_Pnt2d p4(corner.X(), corner.Y() + height); // top-left
                    
                    // Convert 2D points to 3D
                    gp_Pnt p1_3d = sketch_plane_->to3D(p1);
                    gp_Pnt p2_3d = sketch_plane_->to3D(p2);
                    gp_Pnt p3_3d = sketch_plane_->to3D(p3);
                    gp_Pnt p4_3d = sketch_plane_->to3D(p4);
                    
                    // Create 4 edges for the rectangle
                    BRepBuilderAPI_MakeEdge edge1(p1_3d, p2_3d); // bottom
                    BRepBuilderAPI_MakeEdge edge2(p2_3d, p3_3d); // right
                    BRepBuilderAPI_MakeEdge edge3(p3_3d, p4_3d); // top
                    BRepBuilderAPI_MakeEdge edge4(p4_3d, p1_3d); // left
                    
                    // Add all 4 edges to build the complete rectangle wire
                    wireBuilder.Add(edge1.Edge());
                    wireBuilder.Add(edge2.Edge());
                    wireBuilder.Add(edge3.Edge());
                    wireBuilder.Add(edge4.Edge());
                } else {
                    // For other element types, use the standard edge creation
                    TopoDS_Edge edge = createElement2D(element);
                    if (!edge.IsNull()) {
                        wireBuilder.Add(edge);
                    }
                }
            }
        } else {
            // Complex case: sketch has fillets, need smarter wire building
            std::cout << "Creating wire with fillets - using smart wire builder" << std::endl;
            
            // Create a list to track which elements are filleted
            std::set<std::string> filleted_elements;
            for (const auto& element : elements_) {
                if (element.type == SketchElement::FILLET) {
                    for (const auto& ref_id : element.referenced_elements) {
                        filleted_elements.insert(ref_id);
                    }
                }
            }
            
            // Process elements in order: non-filleted elements first, then filleted elements with their arcs
            std::vector<TopoDS_Edge> ordered_edges;
            
            // Add non-filleted elements as-is
            for (const auto& element : elements_) {
                if (element.type != SketchElement::FILLET && 
                    filleted_elements.find(element.id) == filleted_elements.end()) {
                    TopoDS_Edge edge = createElement2D(element);
                    if (!edge.IsNull()) {
                        ordered_edges.push_back(edge);
                    }
                }
            }
            
            // For filleted elements, we should ideally create trimmed lines + fillet arcs
            // For now, just add the fillet arcs to approximate the filleted geometry
            for (const auto& element : elements_) {
                if (element.type == SketchElement::FILLET) {
                    TopoDS_Edge edge = createElement2D(element);
                    if (!edge.IsNull()) {
                        ordered_edges.push_back(edge);
                    }
                }
            }
            
            // Try to add edges in order
            for (const auto& edge : ordered_edges) {
                try {
                    wireBuilder.Add(edge);
                } catch (const Standard_Failure& e) {
                    std::cout << "Warning: Failed to add edge to wire: " << e.GetMessageString() << std::endl;
                }
            }
            
            std::cout << "Added " << ordered_edges.size() << " edges to wire builder" << std::endl;
        }
        
        if (wireBuilder.IsDone()) {
            std::cout << "Wire creation successful" << std::endl;
            return wireBuilder.Wire();
        } else {
            std::cout << "Wire creation failed - wireBuilder not done" << std::endl;
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
            TopoDS_Face face = faceBuilder.Face();
            face.Orientation(TopAbs_FORWARD);
            return face;
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

    // Special handling for rectangles - create complete closed wire
    if (target_element->type == SketchElement::RECTANGLE) {
        double width = target_element->parameters[0];
        double height = target_element->parameters[1];
        
        // Create rectangle as a closed wire with 4 lines
        gp_Pnt2d corner = target_element->start_point;
        gp_Pnt2d p1 = corner; // bottom-left
        gp_Pnt2d p2(corner.X() + width, corner.Y()); // bottom-right
        gp_Pnt2d p3(corner.X() + width, corner.Y() + height); // top-right
        gp_Pnt2d p4(corner.X(), corner.Y() + height); // top-left
        
        // Convert 2D points to 3D
        gp_Pnt p1_3d = sketch_plane_->to3D(p1);
        gp_Pnt p2_3d = sketch_plane_->to3D(p2);
        gp_Pnt p3_3d = sketch_plane_->to3D(p3);
        gp_Pnt p4_3d = sketch_plane_->to3D(p4);
        
        // Create 4 edges for the rectangle
        BRepBuilderAPI_MakeEdge edge1(p1_3d, p2_3d); // bottom
        BRepBuilderAPI_MakeEdge edge2(p2_3d, p3_3d); // right
        BRepBuilderAPI_MakeEdge edge3(p3_3d, p4_3d); // top
        BRepBuilderAPI_MakeEdge edge4(p4_3d, p1_3d); // left
        
        // Create closed wire from edges
        BRepBuilderAPI_MakeWire wireBuilder;
        wireBuilder.Add(edge1.Edge());
        wireBuilder.Add(edge2.Edge());
        wireBuilder.Add(edge3.Edge());
        wireBuilder.Add(edge4.Edge());
        
        if (!wireBuilder.IsDone()) {
            std::cerr << "Failed to create closed wire for rectangle: " << element_id << std::endl;
            return TopoDS_Face();
        }
        
        // Create face from the closed wire
        BRepBuilderAPI_MakeFace faceBuilder(wireBuilder.Wire());
        if (faceBuilder.IsDone()) {
            TopoDS_Face face = faceBuilder.Face();
            face.Orientation(TopAbs_FORWARD);
            return face;
        }
        
        std::cerr << "Failed to create face from rectangle wire: " << element_id << std::endl;
        return TopoDS_Face();
    }

    // For other element types (lines, circles, arcs)
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
        TopoDS_Face face = faceBuilder.Face();
        face.Orientation(TopAbs_FORWARD);
        return face;
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

std::string Sketch::addFillet(const std::string& element1_id, const std::string& element2_id, double radius) {
    std::stringstream ss;
    ss << "Fillet_" << elements_.size() + 1;
    std::string fillet_id = ss.str();
    
    // Find the two elements to fillet
    const SketchElement* element1 = nullptr;
    const SketchElement* element2 = nullptr;
    
    for (const auto& element : elements_) {
        if (element.id == element1_id) element1 = &element;
        if (element.id == element2_id) element2 = &element;
    }
    
    if (!element1 || !element2) {
        std::cerr << "One or both elements not found for fillet: " << element1_id << ", " << element2_id << std::endl;
        return "";
    }
    
    // Calculate intersection point between elements
    gp_Pnt2d intersection;
    if (!getElementIntersection(element1_id, element2_id, intersection)) {
        std::cerr << "Could not find intersection between elements for fillet" << std::endl;
        return "";
    }
    
    // For line-line fillets, calculate fillet center and tangent points
    if (element1->type == SketchElement::LINE && element2->type == SketchElement::LINE) {
        // Calculate fillet center point offset from intersection
        gp_Vec2d dir1(element1->end_point.X() - element1->start_point.X(), 
                      element1->end_point.Y() - element1->start_point.Y());
        gp_Vec2d dir2(element2->end_point.X() - element2->start_point.X(), 
                      element2->end_point.Y() - element2->start_point.Y());
        
        dir1.Normalize();
        dir2.Normalize();
        
        // Calculate bisector direction
        gp_Vec2d bisector = dir1 + dir2;
        bisector.Normalize();
        
        // Calculate offset distance based on radius and angle
        double angle = dir1.Angle(dir2);
        double offset = radius / sin(abs(angle) / 2.0);
        
        // Calculate fillet center
        gp_Pnt2d fillet_center(intersection.X() + bisector.X() * offset,
                               intersection.Y() + bisector.Y() * offset);
        
        // Calculate proper tangent points where the fillet circle is tangent to each line
        // For each line, find the point on the line that is at distance 'radius' from fillet_center
        
        // For line 1: project fillet center onto line 1
        gp_Vec2d to_center1(fillet_center.X() - element1->start_point.X(),
                           fillet_center.Y() - element1->start_point.Y());
        double dot1 = to_center1.Dot(dir1);
        gp_Pnt2d projection1(element1->start_point.X() + dot1 * dir1.X(),
                            element1->start_point.Y() + dot1 * dir1.Y());
        
        // The tangent point is on the line between projection and fillet center at distance radius
        gp_Vec2d to_fillet1(fillet_center.X() - projection1.X(),
                           fillet_center.Y() - projection1.Y());
        to_fillet1.Normalize();
        gp_Pnt2d tangent1(fillet_center.X() - to_fillet1.X() * radius,
                         fillet_center.Y() - to_fillet1.Y() * radius);
        
        // For line 2: project fillet center onto line 2
        gp_Vec2d to_center2(fillet_center.X() - element2->start_point.X(),
                           fillet_center.Y() - element2->start_point.Y());
        double dot2 = to_center2.Dot(dir2);
        gp_Pnt2d projection2(element2->start_point.X() + dot2 * dir2.X(),
                            element2->start_point.Y() + dot2 * dir2.Y());
        
        // The tangent point is on the line between projection and fillet center at distance radius
        gp_Vec2d to_fillet2(fillet_center.X() - projection2.X(),
                           fillet_center.Y() - projection2.Y());
        to_fillet2.Normalize();
        gp_Pnt2d tangent2(fillet_center.X() - to_fillet2.X() * radius,
                         fillet_center.Y() - to_fillet2.Y() * radius);
        
        // Create fillet element
        SketchElement fillet(SketchElement::FILLET, fillet_id);
        fillet.center_point = fillet_center;
        fillet.start_point = tangent1;
        fillet.end_point = tangent2;
        fillet.parameters.push_back(radius);
        fillet.referenced_elements.push_back(element1_id);
        fillet.referenced_elements.push_back(element2_id);
        
        elements_.push_back(fillet);
        
        std::cout << "Added fillet to sketch " << sketch_id_ << ": " << fillet_id 
                  << " (radius=" << radius << ")" << std::endl;
        return fillet_id;
    }
    
    // TODO: Handle other element type combinations (line-circle, circle-circle, etc.)
    std::cerr << "Fillet between element types not yet supported: " 
              << element1->type << " and " << element2->type << std::endl;
    return "";
}

bool Sketch::getElementIntersection(const std::string& element1_id, const std::string& element2_id, gp_Pnt2d& intersection) const {
    const SketchElement* element1 = nullptr;
    const SketchElement* element2 = nullptr;
    
    for (const auto& element : elements_) {
        if (element.id == element1_id) element1 = &element;
        if (element.id == element2_id) element2 = &element;
    }
    
    if (!element1 || !element2) {
        return false;
    }
    
    // Handle line-line intersection
    if (element1->type == SketchElement::LINE && element2->type == SketchElement::LINE) {
        // Line 1: P1 + t1 * D1
        gp_Pnt2d p1 = element1->start_point;
        gp_Vec2d d1(element1->end_point.X() - element1->start_point.X(),
                    element1->end_point.Y() - element1->start_point.Y());
        
        // Line 2: P2 + t2 * D2
        gp_Pnt2d p2 = element2->start_point;
        gp_Vec2d d2(element2->end_point.X() - element2->start_point.X(),
                    element2->end_point.Y() - element2->start_point.Y());
        
        // Solve for intersection: P1 + t1*D1 = P2 + t2*D2
        double det = d1.X() * d2.Y() - d1.Y() * d2.X();
        
        if (abs(det) < 1e-10) {
            // Lines are parallel
            return false;
        }
        
        double dx = p2.X() - p1.X();
        double dy = p2.Y() - p1.Y();
        
        double t1 = (dx * d2.Y() - dy * d2.X()) / det;
        
        intersection.SetCoord(p1.X() + t1 * d1.X(), p1.Y() + t1 * d1.Y());
        return true;
    }
    
    // TODO: Handle other intersection types (line-circle, circle-circle, etc.)
    return false;
}

bool Sketch::isElementsConnected(const std::string& element1_id, const std::string& element2_id) const {
    const SketchElement* element1 = nullptr;
    const SketchElement* element2 = nullptr;
    
    for (const auto& element : elements_) {
        if (element.id == element1_id) element1 = &element;
        if (element.id == element2_id) element2 = &element;
    }
    
    if (!element1 || !element2) {
        return false;
    }
    
    const double tolerance = 1e-6;
    
    // Check if any endpoints are close to each other
    if (element1->type == SketchElement::LINE && element2->type == SketchElement::LINE) {
        return (element1->start_point.Distance(element2->start_point) < tolerance ||
                element1->start_point.Distance(element2->end_point) < tolerance ||
                element1->end_point.Distance(element2->start_point) < tolerance ||
                element1->end_point.Distance(element2->end_point) < tolerance);
    }
    
    // TODO: Handle connections with circles and arcs
    return false;
} 