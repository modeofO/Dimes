#pragma once

#include "geometry/occt_engine.h"

namespace tessellation {

class MeshGenerator {
public:
    static MeshData generateMesh(const TopoDS_Shape& shape, double quality = 0.1);
    static MeshData generateAdaptiveMesh(const TopoDS_Shape& shape);
    static MeshData generateLODMesh(const TopoDS_Shape& shape, int level);
    
private:
    static void optimizeMesh(MeshData& mesh);
    static void validateMesh(const MeshData& mesh);
};

} // namespace tessellation 