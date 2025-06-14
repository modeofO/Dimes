#pragma once

#include <gp_Ax2.hxx>
#include <gp_Pnt.hxx>
#include <gp_Dir.hxx>
#include <gp_Pnt2d.hxx>
#include <string>
#include <memory>

// Forward declarations
struct Vector3d {
    double x, y, z;
    Vector3d(double x = 0, double y = 0, double z = 0) : x(x), y(y), z(z) {}
};

enum class PlaneType {
    XY,     // World XY plane
    XZ,     // World XZ plane  
    YZ,     // World YZ plane
    CUSTOM  // User-defined plane
};

class SketchPlane {
private:
    gp_Ax2 coordinate_system_;
    PlaneType plane_type_;
    std::string plane_id_;
    Vector3d origin_;
    Vector3d normal_;

public:
    SketchPlane(PlaneType type, const Vector3d& origin = Vector3d(0, 0, 0));
    SketchPlane(const Vector3d& origin, const Vector3d& normal, const std::string& id);
    
    // Coordinate transformations
    gp_Pnt to3D(const gp_Pnt2d& point2d) const;
    gp_Pnt2d to2D(const gp_Pnt& point3d) const;
    
    // Getters
    const gp_Ax2& getCoordinateSystem() const { return coordinate_system_; }
    PlaneType getPlaneType() const { return plane_type_; }
    const std::string& getPlaneId() const { return plane_id_; }
    Vector3d getOrigin() const { return origin_; }
    Vector3d getNormal() const { return normal_; }
    
    // Plane creation helpers
    static std::shared_ptr<SketchPlane> createXYPlane(const Vector3d& origin = Vector3d(0, 0, 0));
    static std::shared_ptr<SketchPlane> createXZPlane(const Vector3d& origin = Vector3d(0, 0, 0));
    static std::shared_ptr<SketchPlane> createYZPlane(const Vector3d& origin = Vector3d(0, 0, 0));
    static std::shared_ptr<SketchPlane> createCustomPlane(const Vector3d& origin, const Vector3d& normal);
}; 