BRepMesh_IncrementalMesh mesh(shape, deflection);
        
        // Extract triangulation data
        TopExp_Explorer exp(shape, TopAbs_FACE);
        for (; exp.More(); exp.Next()) {
            TopoDS_Face face = TopoDS::Face(exp.Current());
            TopLoc_Location loc;
        meshData.metadata.vertex_count = static_cast<int>(meshData.vertices.size() / 3);
        meshData.metadata.face_count = static_cast<int>(meshData.faces.size() / 3);
        meshData.metadata.tessellation_quality = deflection;
        
    } catch (const Standard_Failure& e) {
        std::cerr << "OCCT Error in tessellation: " << e.GetMessageString() << std::endl;
    }
    
    return meshData;
} 