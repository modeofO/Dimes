"""
Session manager for CAD operations - Python version of SessionManager
"""
from typing import Dict, Optional
from threading import Lock
from geometry_engine import OCCTEngine


class SessionManager:
    """
    Python version of the C++ SessionManager
    Manages OCCTEngine instances per session using singleton pattern
    """
    
    _instance: Optional['SessionManager'] = None
    _lock = Lock()
    
    def __new__(cls) -> 'SessionManager':
        """Singleton implementation"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize session manager"""
        if not hasattr(self, '_initialized'):
            self.sessions: Dict[str, OCCTEngine] = {}
            self._session_lock = Lock()
            self._initialized = True
            print("Session Manager initialized (Python)")
    
    @classmethod
    def get_instance(cls) -> 'SessionManager':
        """Get singleton instance - equivalent to C++ getInstance"""
        return cls()
    
    def get_or_create_session(self, session_id: str) -> Optional[OCCTEngine]:
        """
        Get existing session or create new one - equivalent to C++ getOrCreateSession
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            OCCTEngine instance for the session, or None if creation failed
        """
        with self._session_lock:
            try:
                if session_id not in self.sessions:
                    print(f"🆕 Creating new session: {session_id}")
                    self.sessions[session_id] = OCCTEngine()
                else:
                    print(f"📁 Using existing session: {session_id}")
                
                return self.sessions[session_id]
                
            except Exception as e:
                print(f"❌ Failed to create/get session {session_id}: {e}")
                return None
    
    def get_session(self, session_id: str) -> Optional[OCCTEngine]:
        """
        Get existing session only - equivalent to C++ getSession
        
        Args:
            session_id: Session identifier
            
        Returns:
            OCCTEngine instance if exists, None otherwise
        """
        with self._session_lock:
            return self.sessions.get(session_id)
    
    def has_session(self, session_id: str) -> bool:
        """
        Check if session exists
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if session exists, False otherwise
        """
        with self._session_lock:
            return session_id in self.sessions
    
    def remove_session(self, session_id: str) -> bool:
        """
        Remove session - equivalent to C++ removeSession
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if session was removed, False if it didn't exist
        """
        with self._session_lock:
            if session_id in self.sessions:
                # Clean up the engine
                self.sessions[session_id].clear_all()
                del self.sessions[session_id]
                print(f"🗑️  Removed session: {session_id}")
                return True
            return False
    
    def clear_all_sessions(self) -> None:
        """
        Clear all sessions - equivalent to C++ clearAllSessions
        """
        with self._session_lock:
            for session_id, engine in self.sessions.items():
                engine.clear_all()
                print(f"🗑️  Cleared session: {session_id}")
            
            self.sessions.clear()
            print("🗑️  All sessions cleared")
    
    def get_session_count(self) -> int:
        """
        Get number of active sessions
        
        Returns:
            Number of active sessions
        """
        with self._session_lock:
            return len(self.sessions)
    
    def get_session_ids(self) -> list[str]:
        """
        Get list of active session IDs
        
        Returns:
            List of session identifiers
        """
        with self._session_lock:
            return list(self.sessions.keys())
    
    def cleanup_session(self, session_id: str) -> None:
        """
        Cleanup session resources without removing it
        
        Args:
            session_id: Session identifier
        """
        with self._session_lock:
            if session_id in self.sessions:
                self.sessions[session_id].clear_all()
                print(f"🧹 Cleaned up session: {session_id}")
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """
        Get session information
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with session info, or None if session doesn't exist
        """
        with self._session_lock:
            if session_id not in self.sessions:
                return None
            
            engine = self.sessions[session_id]
            return {
                "session_id": session_id,
                "shape_count": len(engine.get_available_shape_ids()),
                "shape_ids": engine.get_available_shape_ids(),
                "parameter_count": len(engine.parameters),
                "parameters": dict(engine.parameters)
            }
    
    def __del__(self):
        """Cleanup on destruction"""
        if hasattr(self, 'sessions'):
            self.clear_all_sessions() 