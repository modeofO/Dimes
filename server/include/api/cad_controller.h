#pragma once

#include <string>
#include <memory>

// Forward declarations
class SessionManager;
namespace httplib {
    class Server;
    class Request;
}
namespace Json {
    class Value;
}

class CADController {
private:
    int port_;
    std::unique_ptr<httplib::Server> server_;
    
public:
    explicit CADController(int port);
    ~CADController();
    
    void start();
    void stop();
    
private:
    // HTTP server setup
    void setupRoutes();
    
    // Utility functions
    std::string getSessionId(const httplib::Request& req);
    std::string getContentType(const std::string& format);
    std::string jsonToString(const Json::Value& json);
    
    // HTTP request handlers
    void handleCreateModel(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleUpdateParameter(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleBooleanOperation(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleTessellate(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleExport(const std::string& session_id, const std::string& format, std::string& response);
    
    // Sketch-based modeling handlers
    void handleCreateSketchPlane(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleCreateSketch(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleAddSketchElement(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleExtrudeFeature(const std::string& session_id, const std::string& request_body, std::string& response);
    
    // Daydreams compatibility endpoint
    void handleDaydreamsCAD(const std::string& request_body, std::string& response);
    
    // Response utilities
    std::string createErrorResponse(const std::string& message);
    std::string createSuccessResponse(const std::string& data);
}; 