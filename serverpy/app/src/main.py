"""
Main entry point for CAD Engine Server - Python version of main.cpp
"""
import os
import sys
import signal
from api_server import CADAPIServer
from session_manager import SessionManager

# Configuration from environment
PORT = int(os.environ.get("PORT", 8080))
HOST = os.environ.get("HOST", "0.0.0.0")


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
    
    # Clean up sessions
    try:
        session_manager = SessionManager.get_instance()
        session_manager.clear_all_sessions()
        print("✅ Sessions cleaned up")
    except Exception as e:
        print(f"❌ Error cleaning up sessions: {e}")
    
    print("👋 CAD Engine Server shutdown complete")
    sys.exit(0)


def main():
    """Main function - equivalent to C++ main()"""
    print("🚀 Starting CAD Engine Server (Python)...")
    print("=" * 50)
    
    try:
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        print("📋 Initializing session manager...")
        # Initialize session manager (singleton)
        session_manager = SessionManager.get_instance()
        print(f"✅ Session manager initialized")
        
        print("🌐 Creating CAD API server...")
        # Create and start the API server
        server = CADAPIServer(host=HOST, port=PORT)
        print("✅ CAD API server created")

        print(f"🎯 Server ready on {HOST}:{PORT}")
        print(f"🔗 Health check: http://localhost:{PORT}/api/v1/health")
        print(f"📖 API docs: http://localhost:{PORT}/docs")
        print("💡 Press Ctrl+C to stop...")
        print("=" * 50)
        
        # Start server (this will block)
        server.start()
        
    except KeyboardInterrupt:
        print("\n🛑 Received keyboard interrupt")
        signal_handler(signal.SIGINT, None)
        
    except Exception as e:
        print(f"❌ Server error: {e}")
        print("🔍 Check the logs above for more details")
        
        # Try to clean up
        try:
            session_manager = SessionManager.get_instance()
            session_manager.clear_all_sessions()
        except:
            pass
        
        return 1
    
    return 0


if __name__ == "__main__":
    """Entry point when run directly"""
    exit_code = main()
    sys.exit(exit_code) 