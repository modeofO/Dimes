import express from 'express';
import { CppBackendClient } from '../services/cppBackendClient.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const cppBackend = new CppBackendClient();

/**
 * GET /api/v1/health
 * Health check endpoint for the Node.js API server
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check C++ backend health
    let backendStatus = 'unknown';
    let backendHealth = null;
    
    try {
      backendHealth = await cppBackend.healthCheck();
      backendStatus = 'healthy';
    } catch (error) {
      backendStatus = 'unhealthy';
      logger.warn('C++ backend health check failed:', error.message);
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: 'healthy',
      service: 'Dimes CAD API Server',
      version: '1.0.0',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      backend: {
        status: backendStatus,
        health: backendHealth,
        url: `${process.env.CPP_BACKEND_HOST}:${process.env.CPP_BACKEND_PORT}`,
      },
      performance: {
        response_time_ms: responseTime,
      },
    };
    
    // Return 503 if backend is unhealthy
    const statusCode = backendStatus === 'unhealthy' ? 503 : 200;
    
    res.status(statusCode).json(healthData);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(500).json({
      status: 'unhealthy',
      service: 'Dimes CAD API Server',
      version: '1.0.0',
      timestamp: Date.now(),
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/health/ready
 * Readiness probe - checks if the service is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if C++ backend is available
    const isBackendReady = await cppBackend.isAvailable();
    
    if (isBackendReady) {
      res.json({
        status: 'ready',
        timestamp: Date.now(),
        backend_ready: true,
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: Date.now(),
        backend_ready: false,
        message: 'C++ backend is not available',
      });
    }
    
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: Date.now(),
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/health/live
 * Liveness probe - checks if the service is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

export default router; 