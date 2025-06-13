import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CppBackendClient } from '../services/cppBackendClient.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';

export default function() {
  const router = express.Router();
  const cppBackend = new CppBackendClient();

  // Validation middleware
  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: Date.now(),
      });
    }
    next();
  };

  // Model creation validation
  const validateModelCreation = [
    body('parameters.type').isIn(['primitive', 'sketch', 'imported']).withMessage('Invalid model type'),
    body('parameters.primitive_type').optional().isIn(['box', 'cylinder', 'sphere', 'cone']).withMessage('Invalid primitive type'),
    body('parameters.dimensions').optional().isObject().withMessage('Dimensions must be an object'),
    body('parameters.position').optional().isArray({ min: 3, max: 3 }).withMessage('Position must be an array of 3 numbers'),
    body('parameters.rotation').optional().isArray({ min: 3, max: 3 }).withMessage('Rotation must be an array of 3 numbers'),
    handleValidationErrors,
  ];

  // Boolean operation validation
  const validateBooleanOperation = [
    body('operation_type').isIn(['union', 'cut', 'intersect']).withMessage('Invalid operation type'),
    body('target_id').isString().notEmpty().withMessage('Target ID is required'),
    body('tool_id').isString().notEmpty().withMessage('Tool ID is required'),
    handleValidationErrors,
  ];

  // Tessellation validation
  const validateTessellation = [
    body('model_id').isString().notEmpty().withMessage('Model ID is required'),
    body('tessellation_quality').optional().isFloat({ min: 0.001, max: 1.0 }).withMessage('Quality must be between 0.001 and 1.0'),
    handleValidationErrors,
  ];

  // Export validation
  const validateExport = [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    param('format').isIn(['step', 'stp', 'stl', 'obj', 'iges']).withMessage('Invalid export format'),
    handleValidationErrors,
  ];

  /**
   * POST /api/v1/cad/models
   * Create a new 3D model
   */
  router.post('/models', validateModelCreation, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const { parameters } = req.body;

      logger.info(`Creating model for session ${sessionId}`, { parameters });

      // Debug: Log detailed parameters
      console.log('🔧 API Server received parameters:', JSON.stringify(parameters, null, 2));

      const result = await cppBackend.createModel(sessionId, parameters);

      // Debug: Log C++ backend response
      console.log('📨 C++ Backend returned:', JSON.stringify(result, null, 2));

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to create model', error.message));
    }
  });

  /**
   * POST /api/v1/cad/operations
   * Perform boolean operations
   */
  router.post('/operations', validateBooleanOperation, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const operation = req.body;

      logger.info(`Performing boolean operation for session ${sessionId}`, { operation });

      const result = await cppBackend.performBooleanOperation(sessionId, operation);

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to perform boolean operation', error.message));
    }
  });

  /**
   * PUT /api/v1/cad/parameters
   * Update model parameters
   */
  router.put('/parameters', async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const parameters = req.body;

      logger.info(`Updating parameters for session ${sessionId}`, { parameters });

      const result = await cppBackend.updateParameters(sessionId, parameters);

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to update parameters', error.message));
    }
  });

  /**
   * POST /api/v1/cad/tessellate
   * Tessellate a model
   */
  router.post('/tessellate', validateTessellation, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const { model_id, tessellation_quality = 0.1 } = req.body;

      logger.info(`Tessellating model for session ${sessionId}`, { model_id, tessellation_quality });

      const result = await cppBackend.tessellateModel(sessionId, model_id, tessellation_quality);

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        mesh_data: result.mesh_data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to tessellate model', error.message));
    }
  });

  /**
   * GET /api/v1/cad/sessions/:sessionId/export/:format
   * Export a model
   */
  router.get('/sessions/:sessionId/export/:format', validateExport, async (req, res, next) => {
    try {
      const { sessionId, format } = req.params;

      logger.info(`Exporting model for session ${sessionId}`, { format });

      const result = await cppBackend.exportModel(sessionId, format);

      // Set appropriate headers for file download
      const contentType = getContentType(format);
      const filename = `model_${sessionId}_${Date.now()}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (Buffer.isBuffer(result)) {
        res.send(result);
      } else {
        res.send(Buffer.from(result));
      }

    } catch (error) {
      next(new ApiError(500, 'Failed to export model', error.message));
    }
  });

  /**
   * GET /api/v1/cad/backend/status
   * Check C++ backend status
   */
  router.get('/backend/status', async (req, res, next) => {
    try {
      const isAvailable = await cppBackend.isAvailable();
      
      if (isAvailable) {
        const healthData = await cppBackend.healthCheck();
        res.json({
          success: true,
          backend_status: 'available',
          backend_health: healthData,
          timestamp: Date.now(),
        });
      } else {
        res.status(503).json({
          success: false,
          backend_status: 'unavailable',
          error: 'C++ backend is not responding',
          timestamp: Date.now(),
        });
      }

    } catch (error) {
      next(new ApiError(503, 'Backend status check failed', error.message));
    }
  });

  // Helper function to get content type for export formats
  function getContentType(format) {
    const contentTypes = {
      'step': 'application/step',
      'stp': 'application/step',
      'stl': 'application/vnd.ms-pki.stl',
      'obj': 'application/wavefront-obj',
      'iges': 'application/iges',
    };
    return contentTypes[format] || 'application/octet-stream';
  }

  return router;
} 