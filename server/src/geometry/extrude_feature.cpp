#include "geometry/extrude_feature.h"
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <sstream>
#include <iostream>
#include <cmath>

ExtrudeFeature::ExtrudeFeature(std::shared_ptr<Sketch> sketch, const ExtrudeParameters& params, const std::string& id)
    : base_sketch_(sketch), parameters_(params), is_valid_(false) {
    
    if (id.empty()) {
        std::stringstream ss;
        ss << "Extrude_" << std::time(nullptr);
        feature_id_ = ss.str();
    } else {
        feature_id_ = id;
    }
    
    std::cout << "Created extrude feature: " << feature_id_ << " for sketch: " << sketch->getId() << std::endl;
}

bool ExtrudeFeature::execute() {
    if (!canExtrude()) {
        std::cerr << "Cannot execute extrude: validation failed" << std::endl;
        is_valid_ = false;
        return false;
    }
    
    try {
        switch (parameters_.type) {
            case ExtrudeType::BLIND:
                result_shape_ = performBlindExtrude();
                break;
                
            case ExtrudeType::SYMMETRIC:
                result_shape_ = performSymmetricExtrude();
                break;
                
            case ExtrudeType::THROUGH_ALL:
            case ExtrudeType::TO_SURFACE:
                // Not implemented yet - fallback to blind extrude
                std::cout << "ExtrudeType not fully implemented, using BLIND extrude" << std::endl;
                result_shape_ = performBlindExtrude();
                break;
        }
        
        if (!result_shape_.IsNull()) {
            // Validate the result
            BRepCheck_Analyzer analyzer(result_shape_);
            is_valid_ = analyzer.IsValid();
            
            if (is_valid_) {
                std::cout << "✅ Extrude feature " << feature_id_ << " executed successfully" << std::endl;
            } else {
                std::cerr << "❌ Extrude feature " << feature_id_ << " produced invalid geometry" << std::endl;
            }
        } else {
            is_valid_ = false;
            std::cerr << "❌ Extrude feature " << feature_id_ << " failed to create shape" << std::endl;
        }
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in extrude operation: " << e.GetMessageString() << std::endl;
        is_valid_ = false;
        return false;
    }
    
    return is_valid_;
}

bool ExtrudeFeature::regenerate() {
    std::cout << "Regenerating extrude feature: " << feature_id_ << std::endl;
    return execute();
}

TopoDS_Shape ExtrudeFeature::performBlindExtrude() const {
    // Get the face from the sketch
    TopoDS_Face sketch_face = base_sketch_->createFace();
    if (sketch_face.IsNull()) {
        std::cerr << "Cannot extrude: sketch face is null" << std::endl;
        return TopoDS_Shape();
    }
    
    // Calculate extrude vector
    gp_Vec extrude_vector = calculateExtrudeDirection();
    extrude_vector.Scale(parameters_.distance);
    
    if (parameters_.reverse_direction) {
        extrude_vector.Reverse();
    }
    
    // Perform the extrusion
    BRepPrimAPI_MakePrism extruder(sketch_face, extrude_vector);
    
    if (extruder.IsDone()) {
        return extruder.Shape();
    } else {
        std::cerr << "Failed to create prism from sketch face" << std::endl;
        return TopoDS_Shape();
    }
}

TopoDS_Shape ExtrudeFeature::performSymmetricExtrude() const {
    // Get the face from the sketch
    TopoDS_Face sketch_face = base_sketch_->createFace();
    if (sketch_face.IsNull()) {
        std::cerr << "Cannot extrude: sketch face is null" << std::endl;
        return TopoDS_Shape();
    }
    
    // Calculate extrude vectors for both directions
    gp_Vec direction = calculateExtrudeDirection();
    
    gp_Vec positive_vector = direction;
    positive_vector.Scale(parameters_.distance1);
    
    gp_Vec negative_vector = direction;
    negative_vector.Scale(-parameters_.distance2);
    
    // Total extrude vector
    gp_Vec total_vector = positive_vector;
    total_vector.Add(negative_vector);
    
    // Perform the extrusion
    BRepPrimAPI_MakePrism extruder(sketch_face, total_vector);
    
    if (extruder.IsDone()) {
        return extruder.Shape();
    } else {
        std::cerr << "Failed to create symmetric prism from sketch face" << std::endl;
        return TopoDS_Shape();
    }
}

gp_Vec ExtrudeFeature::calculateExtrudeDirection() const {
    // For now, use the sketch plane normal as default direction
    Vector3d plane_normal = base_sketch_->getPlane()->getNormal();
    gp_Vec sketch_normal(plane_normal.x, plane_normal.y, plane_normal.z);
    
    // If a custom direction is specified, use it
    if (parameters_.direction.Magnitude() > 1e-6) {
        return parameters_.direction;
    }
    
    return sketch_normal;
}

void ExtrudeFeature::setDistance(double distance) {
    parameters_.distance = distance;
    std::cout << "Set extrude distance to " << distance << " for feature " << feature_id_ << std::endl;
}

void ExtrudeFeature::setDirection(const gp_Vec& direction) {
    parameters_.direction = direction;
    std::cout << "Set extrude direction for feature " << feature_id_ << std::endl;
}

void ExtrudeFeature::setExtrudeType(ExtrudeType type) {
    parameters_.type = type;
    std::cout << "Set extrude type for feature " << feature_id_ << std::endl;
}

void ExtrudeFeature::setTaperAngle(double angle_degrees) {
    parameters_.taper_angle = angle_degrees;
    std::cout << "Set taper angle to " << angle_degrees << " degrees for feature " << feature_id_ << std::endl;
}

void ExtrudeFeature::setSymmetricDistances(double dist1, double dist2) {
    parameters_.distance1 = dist1;
    parameters_.distance2 = dist2;
    std::cout << "Set symmetric distances (" << dist1 << ", " << dist2 << ") for feature " << feature_id_ << std::endl;
}

std::vector<std::string> ExtrudeFeature::getValidationErrors() const {
    std::vector<std::string> errors;
    
    if (!base_sketch_) {
        errors.push_back("No base sketch provided");
        return errors;
    }
    
    if (!base_sketch_->isValid()) {
        errors.push_back("Base sketch is invalid");
        auto sketch_errors = base_sketch_->getValidationErrors();
        errors.insert(errors.end(), sketch_errors.begin(), sketch_errors.end());
    }
    
    if (parameters_.distance <= 0 && parameters_.type == ExtrudeType::BLIND) {
        errors.push_back("Extrude distance must be positive");
    }
    
    if (parameters_.type == ExtrudeType::SYMMETRIC) {
        if (parameters_.distance1 <= 0 || parameters_.distance2 <= 0) {
            errors.push_back("Symmetric extrude distances must be positive");
        }
    }
    
    if (parameters_.direction.Magnitude() < 1e-6) {
        errors.push_back("Extrude direction vector is too small");
    }
    
    return errors;
}

bool ExtrudeFeature::canExtrude() const {
    return getValidationErrors().empty();
}

TopoDS_Shape ExtrudeFeature::generatePreview() const {
    // Generate preview without storing the result
    if (!canExtrude()) {
        return TopoDS_Shape();
    }
    
    switch (parameters_.type) {
        case ExtrudeType::BLIND:
            return performBlindExtrude();
            
        case ExtrudeType::SYMMETRIC:
            return performSymmetricExtrude();
            
        default:
            return performBlindExtrude();
    }
} 