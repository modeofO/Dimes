#pragma once

#include <string>
#include <memory>

class SessionManager;

class CADController {
private:
    int port_;
    
public:
    explicit CADController(int port);
    ~CADController();
    
    void start();
    void stop();
    
private:
    // HTTP request handlers
    void handleCreateModel(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleUpdateParameter(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleBooleanOperation(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleTessellate(const std::string& session_id, const std::string& request_body, std::string& response);
    void handleExport(const std::string& session_id, const std::string& format, std::string& response);
    
    // Daydreams compatibility endpoint
    void handleDaydreamsCAD(const std::string& request_body, std::string& response);
    
    // Utility functions
    std::string createErrorResponse(const std::string& message);
    std::string createSuccessResponse(const std::string& data);
}; 