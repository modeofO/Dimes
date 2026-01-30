import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

export class WebSocketManager {
  constructor(server, cadBackendClient) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });
    
    this.cadBackend = cadBackendClient;
    this.clients = new Map(); // sessionId -> WebSocket
    this.heartbeatInterval = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;
    this.onMessageCallback = null; // Callback for incoming messages
    
    this.setupWebSocketServer();
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || url.pathname.split('/').pop();
      
      if (!sessionId) {
        logger.warn('WebSocket connection rejected: No session ID provided');
        ws.close(1008, 'Session ID required');
        return;
      }

      logger.info(`WebSocket client connected: ${sessionId}`);
      
      // Store client connection
      this.clients.set(sessionId, ws);
      ws.sessionId = sessionId;
      ws.isAlive = true;

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      // Handle connection close
      ws.on('close', (code, reason) => {
        logger.info(`WebSocket client disconnected: ${sessionId} (${code}: ${reason})`);
        this.clients.delete(sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for session ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      this.sendToClient(sessionId, {
        type: 'connection_established',
        sessionId: sessionId,
        timestamp: Date.now(),
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      logger.debug(`WebSocket message received from ${ws.sessionId}:`, { type, payload });

      // If a callback is registered, call it
      if (this.onMessageCallback) {
        this.onMessageCallback(ws.sessionId, message);
        if (type === 'agent_message') {
          return;
        }
      }

      switch (type) {
        case 'ping':
          this.sendToClient(ws.sessionId, { type: 'pong', timestamp: Date.now() });
          break;

        case 'subscribe_geometry_updates':
          // Client wants to receive geometry updates
          ws.subscribeGeometry = true;
          this.sendToClient(ws.sessionId, { 
            type: 'subscription_confirmed', 
            subscription: 'geometry_updates',
            timestamp: Date.now(),
          });
          break;

        case 'unsubscribe_geometry_updates':
          ws.subscribeGeometry = false;
          this.sendToClient(ws.sessionId, { 
            type: 'subscription_cancelled', 
            subscription: 'geometry_updates',
            timestamp: Date.now(),
          });
          break;

        case 'subscribe_sketch_updates':
          // Client wants to receive sketch workflow updates
          ws.subscribeSketch = true;
          this.sendToClient(ws.sessionId, { 
            type: 'subscription_confirmed', 
            subscription: 'sketch_updates',
            timestamp: Date.now(),
          });
          break;

        case 'unsubscribe_sketch_updates':
          ws.subscribeSketch = false;
          this.sendToClient(ws.sessionId, { 
            type: 'subscription_cancelled', 
            subscription: 'sketch_updates',
            timestamp: Date.now(),
          });
          break;

        case 'request_status':
          this.sendBackendStatus(ws.sessionId);
          break;

        case 'register_session':
          const oldId = ws.sessionId;
          const newId = payload.sessionId;
          if (oldId !== newId && !this.clients.has(newId)) {
            this.clients.set(newId, this.clients.get(oldId));
            this.clients.delete(oldId);
            logger.info(`Re-registered client ${oldId} as ${newId}`);
          }
          break;

        default:
          logger.warn(`Unknown WebSocket message type: ${type}`);
          this.sendToClient(ws.sessionId, {
            type: 'error',
            error: `Unknown message type: ${type}`,
            timestamp: Date.now(),
          });
      }

    } catch (error) {
      logger.error(`Error handling WebSocket message from ${ws.sessionId}:`, error);
      this.sendToClient(ws.sessionId, {
        type: 'error',
        error: 'Invalid message format',
        timestamp: Date.now(),
      });
    }
  }

  sendToClient(sessionId, message) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        logger.debug(`Message sent to ${sessionId}:`, message.type);
      } catch (error) {
        logger.error(`Error sending message to ${sessionId}:`, error);
        this.clients.delete(sessionId);
      }
    }
  }

  broadcastToAll(message) {
    this.clients.forEach((ws, sessionId) => {
      this.sendToClient(sessionId, message);
    });
  }

  // Send geometry updates to subscribed clients
  notifyGeometryUpdate(sessionId, meshData) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.subscribeGeometry) {
      this.sendToClient(sessionId, {
        type: 'geometry_update',
        data: meshData,
        timestamp: Date.now(),
      });
    }
  }

  // Send sketch workflow updates to subscribed clients
  notifySketchPlaneCreated(sessionId, planeData) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.subscribeSketch) {
      this.sendToClient(sessionId, {
        type: 'sketch_plane_created',
        data: planeData,
        timestamp: Date.now(),
      });
    }
  }

  notifySketchCreated(sessionId, sketchData) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.subscribeSketch) {
      this.sendToClient(sessionId, {
        type: 'sketch_created',
        data: sketchData,
        timestamp: Date.now(),
      });
    }
  }

  notifySketchElementAdded(sessionId, elementData) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.subscribeSketch) {
      this.sendToClient(sessionId, {
        type: 'sketch_element_added',
        data: elementData,
        timestamp: Date.now(),
      });
    }
  }

  notifySketchExtruded(sessionId, extrudeData) {
    const ws = this.clients.get(sessionId);
    if (ws && ws.subscribeSketch) {
      this.sendToClient(sessionId, {
        type: 'sketch_extruded',
        data: extrudeData,
        timestamp: Date.now(),
      });
    }
  }

  // Send parameter updates to clients
  notifyParameterUpdate(sessionId, parameters) {
    this.sendToClient(sessionId, {
      type: 'parameter_update',
      data: parameters,
      timestamp: Date.now(),
    });
  }

  // Send backend status to client
  async sendBackendStatus(sessionId) {
    try {
      const isAvailable = await this.cadBackend.isAvailable();
      this.sendToClient(sessionId, {
        type: 'backend_status',
        status: isAvailable ? 'available' : 'unavailable',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.sendToClient(sessionId, {
        type: 'backend_status',
        status: 'error',
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  // Send workflow progress updates
  notifyWorkflowProgress(sessionId, step, total, description) {
    this.sendToClient(sessionId, {
      type: 'workflow_progress',
      data: {
        step,
        total,
        description,
        progress: (step / total) * 100,
      },
      timestamp: Date.now(),
    });
  }

  // Send CAD operation completion
  notifyOperationComplete(sessionId, operation, result) {
    this.sendToClient(sessionId, {
      type: 'operation_complete',
      data: {
        operation,
        result,
        success: true,
      },
      timestamp: Date.now(),
    });
  }

  // Send CAD operation error
  notifyOperationError(sessionId, operation, error) {
    this.sendToClient(sessionId, {
      type: 'operation_error',
      data: {
        operation,
        error: error.message,
        success: false,
      },
      timestamp: Date.now(),
    });
  }

  // Heartbeat to keep connections alive
  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((ws, sessionId) => {
        if (!ws.isAlive) {
          logger.info(`Terminating inactive WebSocket connection: ${sessionId}`);
          ws.terminate();
          this.clients.delete(sessionId);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  // Get connection statistics
  getStats() {
    return {
      total_connections: this.clients.size,
      active_sessions: Array.from(this.clients.keys()),
      server_uptime: process.uptime(),
    };
  }

  // Close all connections
  closeAll() {
    this.clients.forEach((ws, sessionId) => {
      logger.info(`Closing WebSocket connection: ${sessionId}`);
      ws.close(1001, 'Server shutting down');
    });
    this.clients.clear();
    this.wss.close();
  }

  /**
   * Registers a callback function to be invoked when a message is received.
   * @param {Function} callback - The function to call with (sessionId, message).
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }
} 