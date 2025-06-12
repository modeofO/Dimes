#include <iostream>
#include <memory>
#include "api/cad_controller.h"
#include "session/session_manager.h"

int main() {
    std::cout << "Starting CAD Engine Server..." << std::endl;
    std::cout.flush(); // Force output
    
    try {
        std::cout << "Initializing session manager..." << std::endl;
        // Initialize session manager
        auto& sessionManager = SessionManager::getInstance();
        (void)sessionManager; // Suppress unused variable warning
        std::cout << "Session manager initialized." << std::endl;
        
        std::cout << "Creating CAD controller..." << std::endl;
        // Initialize API server
        CADController server(8080);
        std::cout << "CAD controller created." << std::endl;
        
        std::cout << "Server started on port 8080" << std::endl;
        std::cout << "Press Ctrl+C to stop..." << std::endl;
        
        // Start server (this will block)
        std::cout << "Starting server..." << std::endl;
        server.start();
        
    } catch (const std::exception& e) {
        std::cerr << "Server error: " << e.what() << std::endl;
        std::cerr << "Press Enter to exit..." << std::endl;
        std::cin.get();
        return 1;
    }
    
    return 0;
} 