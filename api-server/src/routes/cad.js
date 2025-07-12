import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CppBackendClient } from '../services/cppBackendClient.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';
import sessionValidator from '../middleware/sessionValidator.js';

export default function(webSocketManager) {
  const router = express.Router();
  const cppBackend = new CppBackendClient();

  // Validation middleware
  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation failed:', {
        url: req.url,
        method: req.method,
        body: req.body,
        errors: errors.array()
      });
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
    body('parameters.type').isIn(['sketch', 'imported']).withMessage('Invalid model type'),
    body('parameters.dimensions').optional().isObject().withMessage('Dimensions must be an object'),
    body('parameters.position').optional().isArray({ min: 3, max: 3 }).withMessage('Position must be an array of 3 numbers'),
    body('parameters.rotation').optional().isArray({ min: 3, max: 3 }).withMessage('Rotation must be an array of 3 numbers'),
    handleValidationErrors,
  ];

  // Sketch plane validation
  const validateSketchPlane = [
    body('plane_type').isIn(['XZ', 'XY', 'YZ']).withMessage('Invalid plane type'),
    body('origin').optional().isArray({ min: 3, max: 3 }).withMessage('Origin must be an array of 3 numbers'),
    handleValidationErrors,
  ];

  // Sketch validation
  const validateSketch = [
    body('plane_id').isString().notEmpty().withMessage('Plane ID is required'),
    handleValidationErrors,
  ];

  // Sketch element validation - updated to support all new element types
  const validateSketchElement = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_type').isIn(['line', 'circle', 'rectangle', 'arc', 'polygon']).withMessage('Invalid element type'),
    body('parameters').isObject().withMessage('Parameters must be an object'),
    handleValidationErrors,
  ];

  // Extrude validation
  const validateExtrude = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_id').optional().isString().withMessage('Element ID must be a string'),
    body('distance').isFloat({ min: 0.001 }).withMessage('Distance must be a positive number'),
    body('direction').optional().isIn(['normal', 'custom']).withMessage('Invalid extrude direction'),
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

  // Fillet validation
  const validateFillet = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line1_id').isString().notEmpty().withMessage('First line ID is required'),
    body('line2_id').isString().notEmpty().withMessage('Second line ID is required'),
    body('radius').isFloat({ min: 0.001 }).withMessage('Radius must be a positive number'),
    handleValidationErrors,
  ];

  // Chamfer validation
  const validateChamfer = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line1_id').isString().notEmpty().withMessage('First line ID is required'),
    body('line2_id').isString().notEmpty().withMessage('Second line ID is required'),
    body('distance').isFloat({ min: 0.001 }).withMessage('Distance must be a positive number'),
    handleValidationErrors,
  ];

  // Trim line to line validation
  const validateTrimLineToLine = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line_to_trim_id').isString().notEmpty().withMessage('Line to trim ID is required'),
    body('cutting_line_id').isString().notEmpty().withMessage('Cutting line ID is required'),
    body('keep_start').isBoolean().withMessage('Keep start must be a boolean'),
    handleValidationErrors,
  ];

  // Trim line to geometry validation
  const validateTrimLineToGeometry = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line_to_trim_id').isString().notEmpty().withMessage('Line to trim ID is required'),
    body('cutting_geometry_id').isString().notEmpty().withMessage('Cutting geometry ID is required'),
    body('keep_start').isBoolean().withMessage('Keep start must be a boolean'),
    handleValidationErrors,
  ];

  // Extend line to line validation
  const validateExtendLineToLine = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line_to_extend_id').isString().notEmpty().withMessage('Line to extend ID is required'),
    body('target_line_id').isString().notEmpty().withMessage('Target line ID is required'),
    body('extend_start').isBoolean().withMessage('Extend start must be a boolean'),
    handleValidationErrors,
  ];

  // Extend line to geometry validation
  const validateExtendLineToGeometry = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('line_to_extend_id').isString().notEmpty().withMessage('Line to extend ID is required'),
    body('target_geometry_id').isString().notEmpty().withMessage('Target geometry ID is required'),
    body('extend_start').isBoolean().withMessage('Extend start must be a boolean'),
    handleValidationErrors,
  ];

  // Mirror elements validation
  const validateMirrorElements = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_ids').isArray({ min: 1 }).withMessage('Element IDs must be a non-empty array'),
    body('mirror_line_id').isString().notEmpty().withMessage('Mirror line ID is required'),
    body('keep_original').isBoolean().withMessage('Keep original must be a boolean'),
    handleValidationErrors,
  ];

  // Mirror elements by two points validation
  const validateMirrorElementsByTwoPoints = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_ids').isArray({ min: 1 }).withMessage('Element IDs must be a non-empty array'),
    body('x1').isFloat().withMessage('X1 must be a number'),
    body('y1').isFloat().withMessage('Y1 must be a number'),
    body('x2').isFloat().withMessage('X2 must be a number'),
    body('y2').isFloat().withMessage('Y2 must be a number'),
    body('keep_original').isBoolean().withMessage('Keep original must be a boolean'),
    handleValidationErrors,
  ];

  // Offset element validation
  const validateOffsetElement = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_id').isString().notEmpty().withMessage('Element ID is required'),
    body('offset_distance').isFloat().withMessage('Offset distance must be a number'),
    handleValidationErrors,
  ];

  // Offset element directional validation
  const validateOffsetElementDirectional = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_id').isString().notEmpty().withMessage('Element ID is required'),
    body('offset_distance').isFloat({ min: 0.001 }).withMessage('Offset distance must be a positive number'),
    body('direction').isIn(['left', 'right']).withMessage('Direction must be left or right'),
    handleValidationErrors,
  ];

  // Copy element validation
  const validateCopyElement = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_id').isString().notEmpty().withMessage('Element ID is required'),
    body('num_copies').isInt({ min: 1 }).withMessage('Number of copies must be a positive integer'),
    body('direction_x').isFloat().withMessage('Direction X must be a number'),
    body('direction_y').isFloat().withMessage('Direction Y must be a number'),
    body('distance').isFloat({ min: 0.001 }).withMessage('Distance must be a positive number'),
    handleValidationErrors,
  ];

  // Move element validation
  const validateMoveElement = [
    body('sketch_id').isString().notEmpty().withMessage('Sketch ID is required'),
    body('element_id').isString().notEmpty().withMessage('Element ID is required'),
    body('direction_x').isFloat().withMessage('Direction X must be a number'),
    body('direction_y').isFloat().withMessage('Direction Y must be a number'),
    body('distance').isFloat({ min: 0.001 }).withMessage('Distance must be a positive number'),
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
   * POST /api/v1/cad/sketch-planes
   * Create a new sketch plane
   */
  router.post('/sketch-planes', validateSketchPlane, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const planeData = req.body;

      logger.info(`Creating sketch plane for session ${sessionId}`, { planeData });

      const result = await cppBackend.createSketchPlane(sessionId, planeData);

      console.log('🔍 Raw C++ backend createSketchPlane result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for sketch plane creation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to create sketch plane', error.message));
    }
  });

  /**
   * POST /api/v1/cad/sketches
   * Create a new sketch
   */
  router.post('/sketches', validateSketch, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const sketchData = req.body;

      logger.info(`Creating sketch for session ${sessionId}`, { sketchData });

      const result = await cppBackend.createSketch(sessionId, sketchData);

      console.log('🔍 Raw C++ backend createSketch result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for sketch creation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to create sketch', error.message));
    }
  });

  /**
   * POST /api/v1/cad/sketch-elements
   * Add element to sketch
   */
  router.post('/sketch-elements', validateSketchElement, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const elementData = req.body;

      logger.info(`Adding sketch element for session ${sessionId}`, { elementData });

      console.log('🔍 API Server received sketch element data:', JSON.stringify(elementData, null, 2));

      const result = await cppBackend.addSketchElement(sessionId, elementData);

      console.log('🔍 Raw C++ backend addSketchElement result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for sketch element addition');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to add sketch element', error.message));
    }
  });

  /**
   * POST /api/v1/cad/fillets
   * Add fillet to sketch
   */
  router.post('/fillets', validateFillet, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const filletData = req.body;

      logger.info(`Adding fillet for session ${sessionId}`, { filletData });

      const result = await cppBackend.addFillet(sessionId, filletData);

      console.log('🔍 Raw C++ backend addFillet result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for fillet addition');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to add fillet', error.message));
    }
  });

  /**
   * POST /api/v1/cad/chamfers
   * Add chamfer to sketch
   */
  router.post('/chamfers', validateChamfer, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const chamferData = req.body;

      logger.info(`Adding chamfer for session ${sessionId}`, { chamferData });

      const result = await cppBackend.addChamfer(sessionId, chamferData);

      console.log('🔍 Raw C++ backend addChamfer result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for chamfer addition');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to add chamfer', error.message));
    }
  });

  /**
   * POST /api/v1/cad/trim-line-to-line
   * Trim line to line
   */
  router.post('/trim-line-to-line', validateTrimLineToLine, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const trimData = req.body;

      logger.info(`Trimming line to line for session ${sessionId}`, { trimData });

      const result = await cppBackend.trimLineToLine(sessionId, trimData);

      console.log('🔍 Raw C++ backend trimLineToLine result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for trim operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to trim line to line', error.message));
    }
  });

  /**
   * POST /api/v1/cad/trim-line-to-geometry
   * Trim line to geometry
   */
  router.post('/trim-line-to-geometry', validateTrimLineToGeometry, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const trimData = req.body;

      logger.info(`Trimming line to geometry for session ${sessionId}`, { trimData });

      const result = await cppBackend.trimLineToGeometry(sessionId, trimData);

      console.log('🔍 Raw C++ backend trimLineToGeometry result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for trim operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to trim line to geometry', error.message));
    }
  });

  /**
   * POST /api/v1/cad/extend-line-to-line
   * Extend line to line
   */
  router.post('/extend-line-to-line', validateExtendLineToLine, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const extendData = req.body;

      logger.info(`Extending line to line for session ${sessionId}`, { extendData });

      const result = await cppBackend.extendLineToLine(sessionId, extendData);

      console.log('🔍 Raw C++ backend extendLineToLine result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for extend operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to extend line to line', error.message));
    }
  });

  /**
   * POST /api/v1/cad/extend-line-to-geometry
   * Extend line to geometry
   */
  router.post('/extend-line-to-geometry', validateExtendLineToGeometry, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const extendData = req.body;

      logger.info(`Extending line to geometry for session ${sessionId}`, { extendData });

      const result = await cppBackend.extendLineToGeometry(sessionId, extendData);

      console.log('🔍 Raw C++ backend extendLineToGeometry result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for extend operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to extend line to geometry', error.message));
    }
  });

  /**
   * POST /api/v1/cad/mirror-elements
   * Mirror elements across a line
   */
  router.post('/mirror-elements', validateMirrorElements, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const mirrorData = req.body;

      logger.info(`Mirroring elements for session ${sessionId}`, { mirrorData });

      const result = await cppBackend.mirrorElements(sessionId, mirrorData);

      console.log('🔍 Raw C++ backend mirrorElements result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for mirror operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to mirror elements', error.message));
    }
  });

  /**
   * POST /api/v1/cad/mirror-elements-by-two-points
   * Mirror elements across a line defined by two points
   */
  router.post('/mirror-elements-by-two-points', validateMirrorElementsByTwoPoints, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const mirrorData = req.body;

      logger.info(`Mirroring elements by two points for session ${sessionId}`, { mirrorData });

      const result = await cppBackend.mirrorElementsByTwoPoints(sessionId, mirrorData);

      console.log('🔍 Raw C++ backend mirrorElementsByTwoPoints result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for mirror operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to mirror elements by two points', error.message));
    }
  });

  /**
   * POST /api/v1/cad/offset-element
   * Offset element
   */
  router.post('/offset-element', validateOffsetElement, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const offsetData = req.body;

      logger.info(`Offsetting element for session ${sessionId}`, { offsetData });

      const result = await cppBackend.offsetElement(sessionId, offsetData);

      console.log('🔍 Raw C++ backend offsetElement result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for offset operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to offset element', error.message));
    }
  });

  /**
   * POST /api/v1/cad/offset-element-directional
   * Offset element directionally
   */
  router.post('/offset-element-directional', validateOffsetElementDirectional, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const offsetData = req.body;

      logger.info(`Offsetting element directionally for session ${sessionId}`, { offsetData });

      const result = await cppBackend.offsetElementDirectional(sessionId, offsetData);

      console.log('🔍 Raw C++ backend offsetElementDirectional result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for directional offset operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to offset element directionally', error.message));
    }
  });

  /**
   * POST /api/v1/cad/copy-element
   * Copy element
   */
  router.post('/copy-element', validateCopyElement, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const copyData = req.body;

      logger.info(`Copying element for session ${sessionId}`, { copyData });

      const result = await cppBackend.copyElement(sessionId, copyData);

      console.log('🔍 Raw C++ backend copyElement result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for copy operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to copy element', error.message));
    }
  });

  /**
   * POST /api/v1/cad/move-element
   * Move element
   */
  router.post('/move-element', validateMoveElement, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const moveData = req.body;

      logger.info(`Moving element for session ${sessionId}`, { moveData });

      const result = await cppBackend.moveElement(sessionId, moveData);

      console.log('🔍 Raw C++ backend moveElement result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        console.log('🔊 Sending WebSocket notification for move operation');
        webSocketManager.sendToClient(sessionId, {
          type: 'visualization_data',
          payload: result.data.visualization_data || result.data,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to move element', error.message));
    }
  });

  /**
   * POST /api/v1/cad/extrude
   * Extrude a sketch or a sketch element
   */
  router.post('/extrude', validateExtrude, async (req, res, next) => {
    try {
      const sessionId = req.sessionId;
      const extrudeData = req.body;

      logger.info(`Extruding feature for session ${sessionId}`, { extrudeData });

      const result = await cppBackend.extrudeFeature(sessionId, extrudeData);

      console.log('🔍 Raw C++ backend extrudeFeature result:', JSON.stringify(result, null, 2));

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        // Only send visualization data if the backend returned actual mesh/visualization data
        if (result.data.visualization_data) {
          console.log('🔊 Sending WebSocket notification for extrude operation');
          webSocketManager.sendToClient(sessionId, {
            type: 'visualization_data',
            payload: result.data.visualization_data,
            timestamp: Date.now(),
          });
        } else if (result.data.mesh_data) {
          console.log('🔊 Sending WebSocket geometry update for extrude operation');
          webSocketManager.sendToClient(sessionId, {
            type: 'geometry_update',
            payload: result.data.mesh_data,
            timestamp: Date.now(),
          });
        } else {
          console.log('🔊 No visualization data available for extrude operation');
        }
      }

      res.json({
        success: true,
        session_id: sessionId,
        timestamp: Date.now(),
        data: result.data || result,
      });

    } catch (error) {
      next(new ApiError(500, 'Failed to extrude feature', error.message));
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

      // Send WebSocket notification for real-time updates
      if (webSocketManager && result.success && result.data) {
        // Send geometry update if mesh data is available
        if (result.data.mesh_data) {
          console.log('🔊 Sending WebSocket geometry update for boolean operation');
          webSocketManager.sendToClient(sessionId, {
            type: 'geometry_update',
            data: result.data.mesh_data,
            timestamp: Date.now(),
          });
        }
      }

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