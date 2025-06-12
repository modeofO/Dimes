#pragma once

#include <map>
#include <string>
#include <memory>
#include <mutex>

class OCCTEngine;

class SessionManager {
private:
    std::map<std::string, std::unique_ptr<OCCTEngine>> sessions_;
    mutable std::mutex sessions_mutex_;
    
    // Singleton pattern
    SessionManager() = default;
    
public:
    static SessionManager& getInstance();
    
    // Disable copy constructor and assignment operator
    SessionManager(const SessionManager&) = delete;
    SessionManager& operator=(const SessionManager&) = delete;
    
    // Session management
    OCCTEngine* getOrCreateSession(const std::string& session_id);
    void cleanupSession(const std::string& session_id);
    bool sessionExists(const std::string& session_id);
    size_t getActiveCount() const;
    
    // Cleanup
    void cleanupExpiredSessions();
    void cleanupAllSessions();
    
private:
    std::string generateSessionId();
}; 