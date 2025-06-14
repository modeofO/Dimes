#pragma once

#include <cmath>

namespace Geometry {
    
// Common 3D vector structure
struct Vector3d {
    double x, y, z;
    
    Vector3d() : x(0.0), y(0.0), z(0.0) {}
    Vector3d(double x, double y, double z) : x(x), y(y), z(z) {}
    
    // Utility methods
    Vector3d operator+(const Vector3d& other) const {
        return Vector3d(x + other.x, y + other.y, z + other.z);
    }
    
    Vector3d operator-(const Vector3d& other) const {
        return Vector3d(x - other.x, y - other.y, z - other.z);
    }
    
    Vector3d operator*(double scalar) const {
        return Vector3d(x * scalar, y * scalar, z * scalar);
    }
    
    double dot(const Vector3d& other) const {
        return x * other.x + y * other.y + z * other.z;
    }
    
    Vector3d cross(const Vector3d& other) const {
        return Vector3d(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }
    
    double magnitude() const {
        return std::sqrt(x * x + y * y + z * z);
    }
    
    Vector3d normalize() const {
        double mag = magnitude();
        if (mag > 1e-10) {
            return Vector3d(x / mag, y / mag, z / mag);
        }
        return Vector3d(0, 0, 0);
    }
};

// Common 2D point structure for sketching
struct Point2d {
    double x, y;
    
    Point2d() : x(0.0), y(0.0) {}
    Point2d(double x, double y) : x(x), y(y) {}
    
    Point2d operator+(const Point2d& other) const {
        return Point2d(x + other.x, y + other.y);
    }
    
    Point2d operator-(const Point2d& other) const {
        return Point2d(x - other.x, y - other.y);
    }
    
    double distance(const Point2d& other) const {
        double dx = x - other.x;
        double dy = y - other.y;
        return std::sqrt(dx * dx + dy * dy);
    }
};

// Plane types for sketching  
enum class PlaneType {
    XY,     // World XY plane
    XZ,     // World XZ plane  
    YZ,     // World YZ plane
    CUSTOM  // User-defined plane
};

} // namespace Geometry 