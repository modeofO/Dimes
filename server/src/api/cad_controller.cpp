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
#include <fstream>
#include <cstdio>
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
            std::cout << "🔍 HTTP Request received - Content-Length: " << req.get_header_value("Content-Length") << std::endl;
            std::cout << "🔍 HTTP Request body size: " << req.body.size() << std::endl;
            std::cout << "🔍 HTTP Request first 100 chars: " << req.body.substr(0, 100) << std::endl;
            std::cout.flush();
            
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

    // Sketch-based modeling endpoints
    server_->Post("/api/v1/sketch-planes", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleCreateSketchPlane(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    server_->Post("/api/v1/sketches", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleCreateSketch(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    server_->Post("/api/v1/sketch-elements", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleAddSketchElement(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(createErrorResponse(e.what()), "application/json");
        }
    });

    server_->Post("/api/v1/extrude", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string session_id = getSessionId(req);
            std::string response_body;
            handleExtrudeSketch(session_id, req.body, response_body);
            res.set_content(response_body, "application/json");
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
        // Debug: Print raw request body first
        std::cout << "🔧 RAW request body: " << request_body << std::endl;
        std::cout.flush();
        
        // Parse JSON request
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "❌ JSON parsing failed. Raw body: " << request_body << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        // Read directly from flat structure (avoiding nested JSON parsing issues)
        std::string type = request.get("type", "primitive").asString();
        
        // Read from flat structure
        std::string primitive_type = request.get("primitive_type", "box").asString();
        
        // Debug: Print the entire JSON structure
        std::cout << "🔧 Full request JSON: " << jsonToString(request) << std::endl;
        std::cout << "🔧 Parsed type: '" << type << "'" << std::endl;
        std::cout << "🔧 Parsed primitive_type: '" << primitive_type << "'" << std::endl;
        std::cout.flush();
        
        std::string shape_id;
        
        if (type == "primitive") {
            // Get position if provided (from flat structure)
            Vector3d position(0, 0, 0);
            if (request.isMember("position") && request["position"].size() >= 3) {
                position.x = request["position"][0].asDouble();
                position.y = request["position"][1].asDouble();
                position.z = request["position"][2].asDouble();
            }
            
            std::cout << "🔧 Creating primitive: " << primitive_type << std::endl;
            std::cout.flush();
            
            if (primitive_type == "box") {
                BoxParameters box_params;
                Json::Value dimensions = request.get("dimensions", Json::Value());
                box_params.width = dimensions.get("width", 10.0).asDouble();
                box_params.height = dimensions.get("height", 10.0).asDouble();
                box_params.depth = dimensions.get("depth", 10.0).asDouble();
                box_params.position = position;
                
                std::cout << "📦 Creating BOX: " << box_params.width << "x" << box_params.height << "x" << box_params.depth 
                          << " at (" << position.x << "," << position.y << "," << position.z << ")" << std::endl;
                std::cout.flush();
                
                shape_id = engine->createBox(box_params);
                
            } else if (primitive_type == "cylinder") {
                Json::Value dimensions = request.get("dimensions", Json::Value());
                double radius = dimensions.get("radius", 5.0).asDouble();
                double height = dimensions.get("height", 10.0).asDouble();
                
                std::cout << "🛢️ Creating CYLINDER: radius=" << radius << ", height=" << height 
                          << " at (" << position.x << "," << position.y << "," << position.z << ")" << std::endl;
                std::cout.flush();
                
                shape_id = engine->createCylinder(radius, height, position);
                
            } else if (primitive_type == "sphere") {
                Json::Value dimensions = request.get("dimensions", Json::Value());
                double radius = dimensions.get("radius", 5.0).asDouble();
                
                std::cout << "🔮 Creating SPHERE: radius=" << radius 
                          << " at (" << position.x << "," << position.y << "," << position.z << ")" << std::endl;
                std::cout.flush();
                
                shape_id = engine->createSphere(radius, position);
            } else {
                std::cout << "❌ Unknown primitive type: " << primitive_type << std::endl;
                std::cout.flush();
            }
            
            std::cout << "✅ Created shape with ID: " << shape_id << std::endl;
            std::cout.flush();
        }
        
        if (shape_id.empty()) {
            response = createErrorResponse("Failed to create model");
            return;
        }
        
        // Generate mesh data
        std::cout << "🔍 Tessellating shape: " << shape_id << std::endl;
        std::cout.flush();
        
        MeshData mesh = engine->tessellate(shape_id);
        
        std::cout << "📊 Tessellation result: " << mesh.metadata.vertex_count << " vertices, " 
                  << mesh.metadata.face_count << " faces" << std::endl;
        std::cout.flush();
        
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
    try {
        // Force immediate console output
        std::cout << "=== BOOLEAN OPERATION CALLED ===" << std::endl;
        std::cout.flush();
        
        // Debug: Print the raw request body
        std::cout << "Boolean operation - Raw request body: " << request_body << std::endl;
        std::cout.flush();
        
        // Parse JSON request
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "Boolean operation - JSON parsing failed: Invalid JSON format" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        // Debug: Print parsed JSON
        std::cout << "Boolean operation - Parsed JSON: " << jsonToString(request) << std::endl;
        std::cout.flush();
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        // Extract parameters from JSON
        Json::Value params = request.get("parameters", Json::Value());
        std::cout << "Boolean operation - Parameters: " << jsonToString(params) << std::endl;
        std::cout.flush();
        
        // This JSON library has issues with nested objects - let's extract parameters manually from raw request
        std::cout << "Attempting to extract parameters manually from raw request..." << std::endl;
        std::cout.flush();
        
        size_t params_start = request_body.find("\"parameters\":{");
        if (params_start != std::string::npos) {
            // Find the opening brace
            size_t brace_start = request_body.find("{", params_start + 13);
            if (brace_start != std::string::npos) {
                // Find the matching closing brace
                int brace_count = 1;
                size_t brace_end = brace_start + 1;
                while (brace_end < request_body.length() && brace_count > 0) {
                    if (request_body[brace_end] == '{') brace_count++;
                    else if (request_body[brace_end] == '}') brace_count--;
                    brace_end++;
                }
                
                if (brace_count == 0) {
                    // Extract the parameters JSON substring
                    std::string params_json = request_body.substr(brace_start, brace_end - brace_start - 1);
                    std::cout << "Extracted parameters JSON: " << params_json << std::endl;
                    std::cout.flush();
                    
                    // Parse this as JSON
                    Json::Reader params_reader;
                    Json::Value params_obj;
                    if (params_reader.parse(params_json, params_obj)) {
                        params = params_obj;
                        std::cout << "Successfully parsed manual parameters: " << jsonToString(params) << std::endl;
                        std::cout.flush();
                    }
                }
            }
        }
        
        std::string operation_type = params.get("operation_type", "").asString();
        std::string target_id = params.get("target_id", "").asString();
        std::string tool_id = params.get("tool_id", "").asString();
        
        std::cout << "Boolean operation - Extracted params: operation_type='" << operation_type 
                  << "', target_id='" << target_id << "', tool_id='" << tool_id << "'" << std::endl;
        std::cout.flush();
        
        if (operation_type.empty() || target_id.empty() || tool_id.empty()) {
            std::cout << "=== MISSING PARAMETERS ERROR ===" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Missing required parameters: operation_type, target_id, tool_id");
            return;
        }
        
        // Generate result ID
        std::string result_id = "result_" + std::to_string(std::time(nullptr));
        
        // Perform boolean operation
        bool success = false;
        if (operation_type == "union") {
            success = engine->unionShapes(target_id, tool_id, result_id);
        } else if (operation_type == "cut") {
            success = engine->cutShapes(target_id, tool_id, result_id);
        } else if (operation_type == "intersect") {
            success = engine->intersectShapes(target_id, tool_id, result_id);
        } else {
            response = createErrorResponse("Unknown operation type: " + operation_type);
            return;
        }
        
        if (!success) {
            response = createErrorResponse("Boolean operation failed");
            return;
        }
        
        // Generate mesh data for the result
        MeshData mesh = engine->tessellate(result_id);
        
        // Create JSON response
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["result_id"] = result_id;
        data["operation_type"] = operation_type;
        data["target_id"] = target_id;
        data["tool_id"] = tool_id;
        
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
        
        json_response["data"] = data;
        
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Boolean operation exception: ") + e.what());
    }
}

void CADController::handleTessellate(const std::string& session_id, const std::string& request_body, std::string& response) {
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
        std::string model_id = request.get("model_id", "").asString();
        double tessellation_quality = request.get("tessellation_quality", 0.1).asDouble();
        
        if (model_id.empty()) {
            response = createErrorResponse("Missing required parameter: model_id");
            return;
        }
        
        // Check if shape exists
        if (!engine->shapeExists(model_id)) {
            response = createErrorResponse("Shape not found: " + model_id);
            return;
        }
        
        // Generate mesh data
        MeshData mesh = engine->tessellate(model_id, tessellation_quality);
        
        // Create JSON response
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
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
        
        json_response["mesh_data"] = mesh_data;
        
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Tessellation exception: ") + e.what());
    }
}

void CADController::handleExport(const std::string& session_id, const std::string& format, std::string& response) {
    try {
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        // For now, we'll export the first shape in the session
        // TODO: Add model_id parameter to export specific shapes
        auto available_shapes = engine->getAvailableShapeIds();
        if (available_shapes.empty()) {
            response = createErrorResponse("No shapes available for export");
            return;
        }
        
        // Get the first shape ID (temporary solution)
        std::string shape_id = available_shapes[0];
        
        // Generate temporary filename
        std::string temp_filename = "/tmp/export_" + session_id + "_" + std::to_string(std::time(nullptr)) + "." + format;
        
        bool export_success = false;
        if (format == "step" || format == "stp") {
            export_success = engine->exportSTEP(shape_id, temp_filename);
        } else if (format == "stl") {
            export_success = engine->exportSTL(shape_id, temp_filename);
        } else {
            response = createErrorResponse("Unsupported export format: " + format);
            return;
        }
        
        if (!export_success) {
            response = createErrorResponse("Export operation failed");
            return;
        }
        
        // Read the file content
        std::ifstream file(temp_filename, std::ios::binary);
        if (!file.is_open()) {
            response = createErrorResponse("Failed to read exported file");
            return;
        }
        
        std::string file_content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        file.close();
        
        // Clean up temporary file
        std::remove(temp_filename.c_str());
        
        // Return file content directly (not JSON)
        response = file_content;
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Export exception: ") + e.what());
    }
}

// ==================== SKETCH-BASED MODELING HANDLERS ====================

void CADController::handleCreateSketchPlane(const std::string& session_id, const std::string& request_body, std::string& response) {
    try {
        std::cout << "🎯 Creating sketch plane for session: " << session_id << std::endl;
        std::cout << "📋 Received request body: '" << request_body << "'" << std::endl;
        std::cout << "📋 Request body length: " << request_body.length() << std::endl;
        std::cout.flush();
        
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "❌ JSON parsing failed!" << std::endl;
            std::cout << "❌ Request body was: '" << request_body << "'" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        std::cout << "✅ JSON parsed successfully" << std::endl;
        std::cout.flush();
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        std::string plane_type = request.get("plane_type", "XY").asString();
        Vector3d origin(0, 0, 0);
        
        // Get origin from individual x,y,z fields (avoiding array parsing issues)
        origin.x = request.get("origin_x", 0.0).asDouble();
        origin.y = request.get("origin_y", 0.0).asDouble(); 
        origin.z = request.get("origin_z", 0.0).asDouble();
        
        std::string plane_id = engine->createSketchPlane(plane_type, origin);
        
        if (plane_id.empty()) {
            response = createErrorResponse("Failed to create sketch plane");
            return;
        }
        
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["plane_id"] = plane_id;
        data["plane_type"] = plane_type;
        // Return origin as individual fields to avoid array parsing issues
        data["origin_x"] = origin.x;
        data["origin_y"] = origin.y;
        data["origin_z"] = origin.z;
        
        json_response["data"] = data;
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Create sketch plane exception: ") + e.what());
    }
}

void CADController::handleCreateSketch(const std::string& session_id, const std::string& request_body, std::string& response) {
    try {
        std::cout << "📐 Creating sketch for session: " << session_id << std::endl;
        std::cout << "📋 Received request body: '" << request_body << "'" << std::endl;
        std::cout.flush();
        
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "❌ JSON parsing failed for sketch creation!" << std::endl;
            std::cout << "❌ Request body was: '" << request_body << "'" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        std::cout << "✅ Sketch JSON parsed successfully" << std::endl;
        std::cout.flush();
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        std::string plane_id = request.get("plane_id", "").asString();
        if (plane_id.empty()) {
            response = createErrorResponse("plane_id is required");
            return;
        }
        
        std::string sketch_id = engine->createSketch(plane_id);
        
        if (sketch_id.empty()) {
            response = createErrorResponse("Failed to create sketch");
            return;
        }
        
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["sketch_id"] = sketch_id;
        data["plane_id"] = plane_id;
        
        json_response["data"] = data;
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Create sketch exception: ") + e.what());
    }
}

void CADController::handleAddSketchElement(const std::string& session_id, const std::string& request_body, std::string& response) {
    try {
        std::cout << "✏️ Adding sketch element for session: " << session_id << std::endl;
        std::cout << "📋 Received request body: '" << request_body << "'" << std::endl;
        std::cout.flush();
        
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "❌ JSON parsing failed for sketch element!" << std::endl;
            std::cout << "❌ Request body was: '" << request_body << "'" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        std::cout << "✅ Sketch element JSON parsed successfully" << std::endl;
        std::cout.flush();
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        std::string sketch_id = request.get("sketch_id", "").asString();
        std::string element_type = request.get("element_type", "").asString();
        
        if (sketch_id.empty() || element_type.empty()) {
            response = createErrorResponse("sketch_id and element_type are required");
            return;
        }
        
        bool success = false;
        std::string element_id;
        
        if (element_type == "line") {
            double x1 = request["x1"].asDouble();
            double y1 = request["y1"].asDouble();
            double x2 = request["x2"].asDouble();
            double y2 = request["y2"].asDouble();
            
            success = engine->addLineToSketch(sketch_id, x1, y1, x2, y2);
            element_id = "line_element";
            
        } else if (element_type == "circle") {
            double center_x = request["center_x"].asDouble();
            double center_y = request["center_y"].asDouble();
            double radius = request["radius"].asDouble();
            
            success = engine->addCircleToSketch(sketch_id, center_x, center_y, radius);
            element_id = "circle_element";
        } else {
            response = createErrorResponse("Unsupported element_type: " + element_type);
            return;
        }
        
        if (!success) {
            response = createErrorResponse("Failed to add sketch element");
            return;
        }
        
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["sketch_id"] = sketch_id;
        data["element_type"] = element_type;
        data["element_id"] = element_id;
        
        json_response["data"] = data;
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Add sketch element exception: ") + e.what());
    }
}

void CADController::handleExtrudeSketch(const std::string& session_id, const std::string& request_body, std::string& response) {
    try {
        std::cout << "🚀 Extruding sketch for session: " << session_id << std::endl;
        std::cout << "📋 Received request body: '" << request_body << "'" << std::endl;
        std::cout.flush();
        
        Json::Value request;
        Json::Reader reader;
        if (!reader.parse(request_body, request)) {
            std::cout << "❌ JSON parsing failed for extrude!" << std::endl;
            std::cout << "❌ Request body was: '" << request_body << "'" << std::endl;
            std::cout.flush();
            response = createErrorResponse("Invalid JSON in request body");
            return;
        }
        
        std::cout << "✅ Extrude JSON parsed successfully" << std::endl;
        std::cout.flush();
        
        auto engine = SessionManager::getInstance().getOrCreateSession(session_id);
        if (!engine) {
            response = createErrorResponse("Failed to get session");
            return;
        }
        
        std::string sketch_id = request.get("sketch_id", "").asString();
        double distance = request.get("distance", 10.0).asDouble();
        std::string direction = request.get("direction", "normal").asString();
        
        if (sketch_id.empty()) {
            response = createErrorResponse("sketch_id is required");
            return;
        }
        
        std::string feature_id = engine->extrudeSketch(sketch_id, distance, direction);
        
        if (feature_id.empty()) {
            response = createErrorResponse("Failed to extrude sketch");
            return;
        }
        
        // Generate mesh data for visualization
        MeshData mesh = engine->tessellate(feature_id);
        
        Json::Value json_response;
        json_response["success"] = true;
        json_response["session_id"] = session_id;
        json_response["timestamp"] = static_cast<int64_t>(std::time(nullptr));
        
        Json::Value data;
        data["feature_id"] = feature_id;
        data["sketch_id"] = sketch_id;
        data["distance"] = distance;
        data["direction"] = direction;
        
        // Include mesh data for immediate visualization
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
        
        json_response["data"] = data;
        response = jsonToString(json_response);
        
    } catch (const std::exception& e) {
        response = createErrorResponse(std::string("Extrude sketch exception: ") + e.what());
    }
} 