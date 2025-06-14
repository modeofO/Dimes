#pragma once

#include "geometry/sketch.h"
#include <TopoDS_Shape.hxx>
#include <gp_Vec.hxx>
#include <string>
#include <memory>

enum class ExtrudeType {
    BLIND,      // Extrude a specific distance
    THROUGH_ALL, // Extrude through all geometry
    TO_SURFACE,  // Extrude to a specific surface
    SYMMETRIC    // Extrude symmetrically in both directions
};

struct ExtrudeParameters {
    ExtrudeType type = ExtrudeType::BLIND;
    double distance = 10.0;              // Distance for BLIND extrude
    gp_Vec direction = gp_Vec(0, 0, 1);  // Extrude direction (default: Z-up)
    bool reverse_direction = false;       // Reverse the extrude direction
    double taper_angle = 0.0;            // Taper angle in degrees (0 = straight)
    
    // For SYMMETRIC type
    double distance1 = 5.0;              // Distance in positive direction
    double distance2 = 5.0;              // Distance in negative direction
    
    ExtrudeParameters() = default;
    ExtrudeParameters(double dist, const gp_Vec& dir = gp_Vec(0, 0, 1)) 
        : distance(dist), direction(dir) {}
};

class ExtrudeFeature {
private:
    std::shared_ptr<Sketch> base_sketch_;
    ExtrudeParameters parameters_;
    std::string feature_id_;
    TopoDS_Shape result_shape_;
    bool is_valid_;
    
    // Internal methods
    TopoDS_Shape performBlindExtrude() const;
    TopoDS_Shape performSymmetricExtrude() const;
    gp_Vec calculateExtrudeDirection() const;

public:
    ExtrudeFeature(std::shared_ptr<Sketch> sketch, const ExtrudeParameters& params, const std::string& id = "");
    
    // Extrude operations
    bool execute();                      // Execute the extrude operation
    bool regenerate();                   // Regenerate after parameter changes
    
    // Parameter modification
    void setDistance(double distance);
    void setDirection(const gp_Vec& direction);
    void setExtrudeType(ExtrudeType type);
    void setTaperAngle(double angle_degrees);
    void setSymmetricDistances(double dist1, double dist2);
    
    // Getters
    const std::string& getId() const { return feature_id_; }
    TopoDS_Shape getShape() const { return result_shape_; }
    bool isValid() const { return is_valid_; }
    const ExtrudeParameters& getParameters() const { return parameters_; }
    std::shared_ptr<Sketch> getBaseSketch() const { return base_sketch_; }
    
    // Validation
    std::vector<std::string> getValidationErrors() const;
    bool canExtrude() const;
    
    // Preview
    TopoDS_Shape generatePreview() const;  // Generate preview without storing result
}; 