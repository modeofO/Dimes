#include "geometry/sketch_plane.h"
#include <sstream>

SketchPlane::SketchPlane(PlaneType type, const Vector3d& origin) 
    : plane_type_(type), origin_(origin) {
    
    gp_Pnt gp_origin(origin.x, origin.y, origin.z);
    
    switch (type) {
        case PlaneType::XY:
            coordinate_system_ = gp_Ax2(gp_origin, gp_Dir(0, 0, 1), gp_Dir(1, 0, 0));
            normal_ = Vector3d(0, 0, 1);
            plane_id_ = "XY_Plane";
            break;
            
        case PlaneType::XZ:
            coordinate_system_ = gp_Ax2(gp_origin, gp_Dir(0, 1, 0), gp_Dir(1, 0, 0));
            normal_ = Vector3d(0, 1, 0);
            plane_id_ = "XZ_Plane";
            break;
            
        case PlaneType::YZ:
            coordinate_system_ = gp_Ax2(gp_origin, gp_Dir(1, 0, 0), gp_Dir(0, 1, 0));
            normal_ = Vector3d(1, 0, 0);
            plane_id_ = "YZ_Plane";
            break;
            
        case PlaneType::CUSTOM:
            // Will be set up by the other constructor
            break;
    }
}

SketchPlane::SketchPlane(const Vector3d& origin, const Vector3d& normal, const std::string& id)
    : plane_type_(PlaneType::CUSTOM), origin_(origin), normal_(normal), plane_id_(id) {
    
    gp_Pnt gp_origin(origin.x, origin.y, origin.z);
    gp_Dir gp_normal(normal.x, normal.y, normal.z);
    
    // Create a default X direction (perpendicular to normal)
    gp_Dir x_dir;
    if (std::abs(normal.z) < 0.9) {
        // Normal is not close to Z, use Z cross Normal
        x_dir = gp_Dir(gp_normal.Crossed(gp_Dir(0, 0, 1)));
    } else {
        // Normal is close to Z, use X cross Normal
        x_dir = gp_Dir(gp_normal.Crossed(gp_Dir(1, 0, 0)));
    }
    
    coordinate_system_ = gp_Ax2(gp_origin, gp_normal, x_dir);
}

gp_Pnt SketchPlane::to3D(const gp_Pnt2d& point2d) const {
    return coordinate_system_.Location().Translated(
        point2d.X() * coordinate_system_.XDirection().XYZ() +
        point2d.Y() * coordinate_system_.YDirection().XYZ()
    );
}

gp_Pnt2d SketchPlane::to2D(const gp_Pnt& point3d) const {
    gp_Vec vec(coordinate_system_.Location(), point3d);
    
    double u = vec.Dot(coordinate_system_.XDirection());
    double v = vec.Dot(coordinate_system_.YDirection());
    
    return gp_Pnt2d(u, v);
}

std::shared_ptr<SketchPlane> SketchPlane::createXYPlane(const Vector3d& origin) {
    return std::make_shared<SketchPlane>(PlaneType::XY, origin);
}

std::shared_ptr<SketchPlane> SketchPlane::createXZPlane(const Vector3d& origin) {
    return std::make_shared<SketchPlane>(PlaneType::XZ, origin);
}

std::shared_ptr<SketchPlane> SketchPlane::createYZPlane(const Vector3d& origin) {
    return std::make_shared<SketchPlane>(PlaneType::YZ, origin);
}

std::shared_ptr<SketchPlane> SketchPlane::createCustomPlane(const Vector3d& origin, const Vector3d& normal) {
    std::stringstream ss;
    ss << "Custom_Plane_" << std::time(nullptr);
    return std::make_shared<SketchPlane>(origin, normal, ss.str());
} 