// Windows headers needed for cpp-httplib - MUST be included first
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#endif

#include "api/cad_controller.h"
#include "session/session_manager.h"
#include "geometry/occt_engine.h"
#include "httplib.h"

#include <iostream>
#include <sstream>
#include <thread>
#include <ctime>
#include "json/json.h"

// Simple HTTP server implementation (placeholder)
// In production, use a proper HTTP library like httplib or crow

CADController::CADController(int port) : port_(port), server_(std::make_unique<httplib::Server>()) {
    // Use singleton instance instead of creating new one
    std::cout << "CAD Controller initialized on port " << port_ << std::endl;
    setupRoutes();
}

CADController::~CADController() {
    stop();
    std::cout << "CAD Controller destroyed" << std::endl;
}

void CADController::setupRoutes() {
    // Enable CORS for client connections
    server_->set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, X-Session-ID");
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // Handle preflight OPTIONS requests
    server_->Options(".*", [](const httplib::Request& req, httplib::Response& res) {
        return; // Headers already set in pre-routing handler
    });

    // Health check endpoint
    server_->Get("/api/v1/health", [this](const httplib::Request& req, httplib::Response& res) {
        Json::Value response;
        response["status"] = "healthy";
        response["service"] = "CAD Engine Server";
        response["version"] = "1.0.0";
        response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        res.set_content(jsonToString(response), "application/json");
    });

    // Create model endpoint
    server_->Post("/api/v1/models", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleCreateModel(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    // Update parameters endpoint
    server_->Put("/api/v1/parameters", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleUpdateParameter(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    // Boolean operations endpoint
    server_->Post("/api/v1/operations", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleBooleanOperation(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    // Tessellation endpoint
    server_->Post("/api/v1/tessellate", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleTessellate(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    // Export endpoint
    server_->Get(R"(/api/v1/sessions/([^/]+)/export/([^/]+))", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = req.matches[1];
            std::string format = req.matches[2];
            std::string response_body;
            handleExport(session_id, format, response_body);
            
            // Set appropriate content type based on format
            std::string content_type = getContentType(format);
            res.set_content(response_body, content_type);
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    // Daydreams AI compatibility endpoint
    server_->Post("/api/v1/daydreams/cad", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string response_body;
            handleDaydreamsCAD(req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    std::cout << "HTTP routes configured" << std::endl;
}

void CADController::start() {
    std::cout << "Starting HTTP server on port " << port_ << std::endl;
    
    // Start server in blocking mode
    if (!server_->listen("0.0.0.0", port_)) {
        throw std::runtime_error("Failed to start HTTP server on port " + std::to_string(port_));
    }
}

void CADController::stop() {
    if (server_) {
        std::cout << "Stopping CAD Controller..." << std::endl;
        server_->stop();
    }
}

std::string CADController::getSessionId(const httplib::Request& req) {
    // Try to get session ID from header first
    if (req.has_header("X-Session-ID")) {
        return req.get_header_value("X-Session-ID");
    }
    
    // Try to get from request body if it's a JSON request
    try {
        Json::Value json;
        Json::Reader reader;
        if (reader.parse(req.body, json) && json.isMember("session_id")) {
            return json["session_id"].asString();
        }
    } catch (...) {
        // Ignore JSON parsing errors
    }
    
    // Generate a default session ID
    return "default-session";
}

std::string CADController::getContentType(const std::string& format) {
    if (format == "step" || format == "stp") return "application/step";
    if (format == "stl") return "application/vnd.ms-pki.stl";
    if (format == "obj") return "application/wavefront-obj";
    if (format == "iges" || format == "igs") return "application/iges";
    return "application/octet-stream";
}

std::string CADController::jsonToString(const Json::Value& json) {
    return Json::valueToString(json);
}

void CADController::handleCreateModel(const std::string& session_id, const std::string& request_body, std::string& response) {
    try {
        // Parse JSON request
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        // Extract parameters from JSON
        Json::Value params = request.get("parameters", Json::Value());
        std::string type = params.get("type", "primitive").asString();
        
        std::string shape_id;
        
        if (type == "primitive") {
            std::string primitive_type = params.get("primitive_type", "box").asString();
            
            if (primitive_type == "box") {
                BoxParameters box_params;
                Json::Value dimensions = params.get("dimensions", Json::Value());
                box_params.width = dimensions.get("width", 10.0).asDouble();
                box_params.height = dimensions.get("height", 10.0).asDouble();
                box_params.depth = dimensions.get("depth", 10.0).asDouble();
                
                shape_id = engine->createBox(box_params);
            }
            // Add other primitive types here (cylinder, sphere, cone)
        }
        
        if (shape_id.empty()) {
            response = createErrorResponse("Failed to create model");
            return;
        }
        
        // Generate mesh data
        MeshData mesh = engine->tessellate(shape_id);
        
        // Create JSON response
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["model_id"] = shape_id;
        
        // Include mesh data
        Json::Value mesh_data;
        mesh_data["vertices"] = Json::Value(Json::Value::arrayValue);
        for (size_t i = 0; i < mesh.vertices.size(); ++i) {
            mesh_data["vertices"].append(mesh.vertices[i]);
        }
        
        mesh_data["faces"] = Json::Value(Json::Value::arrayValue);
        for (size_t i = 0; i < mesh.faces.size(); ++i) {
            mesh_data["faces"].append(mesh.faces[i]);
        }
        
        Json::Value metadata;
        metadata["vertex_count"] = static_cast<int>(mesh.metadata.vertex_count);
        metadata["face_count"] = static_cast<int>(mesh.metadata.face_count);
        metadata["tessellation_quality"] = mesh.metadata.tessellation_quality;
        mesh_data["metadata"] = metadata;
        
        data["mesh_data"] = mesh_data;
        
        // Add bounding box
        Json::Value bbox;
        bbox["min"] = Json::Value(Json::Value::arrayValue);
        bbox["max"] = Json::Value(Json::Value::arrayValue);
        for (int i = 0; i < 3; ++i) {
            bbox["min"].append(0.0); // TODO: Get actual bounding box from OCCT
            bbox["max"].append(10.0);
        }
        data["bounding_box"] = bbox;
        
        json_response["data"] = data;
        
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Exception: ") + e.what());
    }
}

void CADController::handleDaydreamsCAD(const std::string& request_body, std::string& response) {
    try {
        // Parse JSON request
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        std::string session_id = request.get("sessionId", "daydreams-session").asString();
        std::string instruction = request.get("instruction", "").asString();
        
        // TODO: Parse natural language instruction and convert to CAD operations
        // TODO: Execute operations and return compatible response
        
        Json::Value json_response;
        json_response["success"] = true;
        json_response["script"] = "";
        json_response["status"] = "idle";
        json_response["message"] = "CAD operation completed: " + instruction;
        
        Json::Value model_data;
        Json::Value mesh;
        mesh["vertices"] = Json::Value(Json::Value::arrayValue);
        mesh["faces"] = Json::Value(Json::Value::arrayValue);
        
        Json::Value metadata;
        metadata["vertex_count"] = 0;
        metadata["face_count"] = 0;
        metadata["tessellation_quality"] = 0.1;
        mesh["metadata"] = metadata;
        
        model_data["mesh"] = mesh;
        model_data["files"] = Json::Value(Json::Value::objectValue);
        model_data["parameters"] = Json::Value(Json::Value::objectValue);
        
        json_response["model_data"] = model_data;
        
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Daydreams handler exception: ") + e.what());
    }
}

std::string CADController::createErrorResponse(const std::string& message) {
    Json::Value error_response;
    error_response["success"] = false;
    error_response["error"] = message;
    error_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
    return jsonToString(error_response);
}

std::string CADController::createSuccessResponse(const std::string& data) {
    Json::Value success_response;
    success_response["success"] = true;
    success_response["data"] = data;
    success_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
    return jsonToString(success_response);
}

// Placeholder implementations
void CADController::handleUpdateParameter(const std::string& session_id, const std::string& request_body, std::string& response) {
    (void)session_id; (void)request_body; // Suppress unused parameter warnings
    response = createErrorResponse("Not implemented");
}

void CADController::handleBooleanOperation(const std::string& session_id, const std::string& request_body, std::string& response) {
    (void)session_id; (void)request_body; // Suppress unused parameter warnings
    response = createErrorResponse("Not implemented");
}

void CADController::handleTessellate(const std::string& session_id, const std::string& request_body, std::string& response) {
    (void)session_id; (void)request_body; // Suppress unused parameter warnings
    response = createErrorResponse("Not implemented");
}

void CADController::handleExport(const std::string& session_id, const std::string& format, std::string& response) {
    (void)session_id; (void)format; // Suppress unused parameter warnings
    response = createErrorResponse("Not implemented");
} 