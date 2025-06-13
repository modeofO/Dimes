import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    sessionId: req.sessionId,
    body: req.body,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
      timestamp: Date.now(),
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.message,
      timestamp: Date.now(),
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      timestamp: Date.now(),
    });
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      error: 'Request timeout',
      details: 'The operation took too long to complete',
      timestamp: Date.now(),
    });
  }

  // Handle connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      details: 'Unable to connect to backend service',
      timestamp: Date.now(),
    });
  }

  // Handle rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      details: 'Rate limit exceeded. Please try again later.',
      timestamp: Date.now(),
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: Date.now(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url}`);
  
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    details: `${req.method} ${req.url} is not a valid endpoint`,
    timestamp: Date.now(),
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 