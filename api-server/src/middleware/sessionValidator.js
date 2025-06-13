import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * Middleware to validate and extract session ID from requests
 */
export const validateSession = (req, res, next) => {
  try {
    let sessionId = null;
    
    // Try to get session ID from header first
    if (req.headers['x-session-id']) {
      sessionId = req.headers['x-session-id'];
    }
    
    // Try to get from request body if it's a JSON request
    if (!sessionId && req.body && req.body.sessionId) {
      sessionId = req.body.sessionId;
    }
    
    // Try to get from request body session_id field
    if (!sessionId && req.body && req.body.session_id) {
      sessionId = req.body.session_id;
    }
    
    // Try to get from URL parameters
    if (!sessionId && req.params.sessionId) {
      sessionId = req.params.sessionId;
    }
    
    // Generate a new session ID if none provided
    if (!sessionId) {
      sessionId = generateSessionId();
      logger.info(`Generated new session ID: ${sessionId}`);
    }
    
    // Validate session ID format
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format',
        timestamp: Date.now(),
      });
    }
    
    // Attach session ID to request object
    req.sessionId = sessionId;
    
    // Set session ID in response header for client reference
    res.setHeader('X-Session-ID', sessionId);
    
    logger.debug(`Session validated: ${sessionId}`);
    next();
    
  } catch (error) {
    logger.error('Session validation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Session validation failed',
      timestamp: Date.now(),
    });
  }
};

/**
 * Generate a new session ID
 */
function generateSessionId() {
  return `session_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Validate session ID format
 */
function isValidSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Allow various session ID formats
  const validPatterns = [
    /^session_[a-f0-9]{32}$/i,           // UUID-based: session_abc123...
    /^session_[a-zA-Z0-9]{10,50}$/,      // Alphanumeric: session_abc123def
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // Pure UUID
    /^[a-zA-Z0-9_-]{10,100}$/,           // General alphanumeric with dashes/underscores
  ];
  
  return validPatterns.some(pattern => pattern.test(sessionId));
}

/**
 * Middleware to require a specific session ID (for routes that need existing sessions)
 */
export const requireExistingSession = (req, res, next) => {
  if (!req.sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required',
      timestamp: Date.now(),
    });
  }
  
  // Additional validation could be added here to check if session exists in database/cache
  next();
}; 