#pragma once

#include <string>
#include <TopoDS_Shape.hxx>
#include "geometry/occt_engine.h"

namespace export_module {

class FileExporter {
public:
    static bool exportSTEP(const TopoDS_Shape& shape, const std::string& filename);
    static bool exportSTL(const TopoDS_Shape& shape, const std::string& filename);
    static bool exportOBJ(const MeshData& mesh, const std::string& filename);
    static bool exportIGES(const TopoDS_Shape& shape, const std::string& filename);
    
private:
    static bool validateShape(const TopoDS_Shape& shape);
    static bool writeFile(const std::string& content, const std::string& filename);
};

} // namespace export_module 