/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Validation Error class
 */
export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Backend Connection Error class
 */
export class BackendError extends ApiError {
  constructor(message, details = null) {
    super(503, message, details);
    this.name = 'BackendError';
  }
}

/**
 * Session Error class
 */
export class SessionError extends ApiError {
  constructor(message, details = null) {
    super(401, message, details);
    this.name = 'SessionError';
  }
}

/**
 * Rate Limit Error class
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(429, message, details);
    this.name = 'RateLimitError';
  }
} 