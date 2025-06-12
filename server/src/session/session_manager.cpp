#include "session/session_manager.h"
#include "geometry/occt_engine.h"

#include <iostream>
#include <random>
#include <sstream>

SessionManager& SessionManager::getInstance() {
    static SessionManager instance;
    return instance;
}

OCCTEngine* SessionManager::getOrCreateSession(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    
    auto it = sessions_.find(session_id);
    if (it != sessions_.end()) {
        return it->second.get();
    }
    
    // Create new session
    try {
        auto engine = std::make_unique<OCCTEngine>();
        OCCTEngine* engine_ptr = engine.get();
        sessions_[session_id] = std::move(engine);
        
        std::cout << "Created new CAD session: " << session_id << std::endl;
        return engine_ptr;
        
    } catch (const std::exception& e) {
        std::cerr << "Failed to create session " << session_id << ": " << e.what() << std::endl;
        return nullptr;
    }
}

void SessionManager::cleanupSession(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    
    auto it = sessions_.find(session_id);
    if (it != sessions_.end()) {
        std::cout << "Cleaning up session: " << session_id << std::endl;
        sessions_.erase(it);
    }
}

bool SessionManager::sessionExists(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    return sessions_.find(session_id) != sessions_.end();
}

size_t SessionManager::getActiveCount() const {
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    return sessions_.size();
}

void SessionManager::cleanupExpiredSessions() {
    // TODO: Implement session expiration logic
    std::cout << "Cleanup expired sessions (not implemented)" << std::endl;
}

void SessionManager::cleanupAllSessions() {
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    
    std::cout << "Cleaning up all " << sessions_.size() << " sessions" << std::endl;
    sessions_.clear();
}

std::string SessionManager::generateSessionId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(100000, 999999);
    
    std::stringstream ss;
    ss << "session_" << dis(gen);
    return ss.str();
} 