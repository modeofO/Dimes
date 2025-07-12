import fetch from 'node-fetch';
import { Agent } from 'http';
import { logger } from '../utils/logger.js';

// Create IPv4-only agent
const ipv4Agent = new Agent({
  family: 4, // Force IPv4
  keepAlive: true,
  timeout: 30000
});

export class CppBackendClient {
  constructor() {
    this.baseUrl = `http://${process.env.CPP_BACKEND_HOST || 'localhost'}:${process.env.CPP_BACKEND_PORT || 8080}`;
    this.timeout = parseInt(process.env.CPP_BACKEND_TIMEOUT) || 30000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Make a request to the C++ backend with retry logic
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      timeout: this.timeout,
      agent: ipv4Agent, // Force IPv4
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`Making request to C++ backend: ${url} (attempt ${attempt})`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle different content types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.buffer();
        }

      } catch (error) {
        logger.warn(`C++ backend request failed (attempt ${attempt}): ${error.message}`);
        
        if (attempt === this.retryAttempts) {
          logger.error(`All retry attempts failed for ${url}`);
          throw new Error(`C++ backend unavailable: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Health check for C++ backend
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest('/api/v1/health', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      logger.error('C++ backend health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a model in the C++ backend
   */
  async createModel(sessionId, parameters) {
    try {
      // Flatten the structure to avoid C++ JSON parsing issues
      const requestBody = {
        session_id: sessionId,
        operation: 'create_model',
        type: parameters.type,
        dimensions: parameters.dimensions,
        position: parameters.position,
        rotation: parameters.rotation,
        // Keep original nested structure as backup
        parameters,
      };
      
      const jsonString = JSON.stringify(requestBody);
      
      // Debug: Log what we're sending to C++
      console.log('🔧 Node.js sending to C++:', jsonString);
      console.log('🔧 Parameters object:', JSON.stringify(parameters, null, 2));
      
      const response = await this.makeRequest('/api/v1/models', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to create model in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Create a sketch plane in the C++ backend
   */
  async createSketchPlane(sessionId, planeData) {
    try {
      const origin = planeData.origin || [0, 0, 0];
      const requestBody = {
        session_id: sessionId,
        plane_type: planeData.plane_type,
        origin_x: origin[0],
        origin_y: origin[1], 
        origin_z: origin[2],
      };

      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending sketch plane request to C++:');
      console.log('📋 Request body object:', JSON.stringify(requestBody, null, 2));
      console.log('📋 JSON string:', jsonString);
      console.log('📋 JSON string length:', jsonString.length);

      logger.debug('Creating sketch plane:', requestBody);

      const response = await this.makeRequest('/api/v1/sketch-planes', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to create sketch plane in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Create a sketch in the C++ backend
   */
  async createSketch(sessionId, sketchData) {
    try {
      const requestBody = {
        session_id: sessionId,
        plane_id: sketchData.plane_id,
      };

      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending sketch request to C++:');
      console.log('📋 Request body object:', JSON.stringify(requestBody, null, 2));
      console.log('📋 JSON string:', jsonString);

      logger.debug('Creating sketch:', requestBody);

      const response = await this.makeRequest('/api/v1/sketches', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to create sketch in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Add element to sketch in the C++ backend
   */
  async addSketchElement(sessionId, elementData) {
    try {
      console.log('📋 Element data received:', elementData);

      // Flatten parameters to avoid nested JSON parsing issues in C++
      const requestBody = {
        session_id: sessionId,
        sketch_id: elementData.sketch_id,
        element_type: elementData.element_type,
      };

      // Flatten parameters based on element type
      if (elementData.element_type === 'line') {
        if (elementData.parameters.start && elementData.parameters.end) {
          // Agent format: {"start": [x,y], "end": [x,y]}
          requestBody.x1 = elementData.parameters.start[0];
          requestBody.y1 = elementData.parameters.start[1];
          requestBody.x2 = elementData.parameters.end[0];
          requestBody.y2 = elementData.parameters.end[1];
        } else {
          // Direct format
          requestBody.x1 = elementData.parameters.x1 || 0;
          requestBody.y1 = elementData.parameters.y1 || 0;
          requestBody.x2 = elementData.parameters.x2 || 0;
          requestBody.y2 = elementData.parameters.y2 || 0;
        }
      } else if (elementData.element_type === 'circle') {
        requestBody.center_x = elementData.parameters.center_x || 0;
        requestBody.center_y = elementData.parameters.center_y || 0;
        requestBody.radius = elementData.parameters.radius || 5;
      } else if (elementData.element_type === 'rectangle') {
        if (elementData.parameters.corner) {
          requestBody.x = elementData.parameters.corner[0];
          requestBody.y = elementData.parameters.corner[1];
        } else {
          requestBody.x = elementData.parameters.x || 0;
          requestBody.y = elementData.parameters.y || 0;
        }
        requestBody.width = elementData.parameters.width || 10;
        requestBody.height = elementData.parameters.height || 10;
      } else if (elementData.element_type === 'arc') {
        // Handle arc parameters
        const arcType = elementData.parameters.arc_type || 'three_points';
        requestBody.arc_type = arcType;
        
        if (arcType === 'three_points') {
          requestBody.x1 = elementData.parameters.x1 || 0;
          requestBody.y1 = elementData.parameters.y1 || 0;
          requestBody.x_mid = elementData.parameters.x_mid || 0;
          requestBody.y_mid = elementData.parameters.y_mid || 0;
          requestBody.x2 = elementData.parameters.x2 || 0;
          requestBody.y2 = elementData.parameters.y2 || 0;
        } else if (arcType === 'endpoints_radius') {
          requestBody.x1 = elementData.parameters.x1 || 0;
          requestBody.y1 = elementData.parameters.y1 || 0;
          requestBody.x2 = elementData.parameters.x2 || 0;
          requestBody.y2 = elementData.parameters.y2 || 0;
          requestBody.radius = elementData.parameters.radius || 5;
          requestBody.large_arc = elementData.parameters.large_arc || false;
        }
      } else if (elementData.element_type === 'polygon') {
        requestBody.center_x = elementData.parameters.center_x || 0;
        requestBody.center_y = elementData.parameters.center_y || 0;
        requestBody.sides = elementData.parameters.sides || 6;
        requestBody.radius = elementData.parameters.radius || 5;
      }
      
      console.log('📋 Flattened request body object:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending sketch element request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/sketch-elements', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to add sketch element in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Add fillet to sketch in the C++ backend
   */
  async addFillet(sessionId, filletData) {
    try {
      console.log('🔵 Fillet data received:', filletData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: filletData.sketch_id,
        line1_id: filletData.line1_id || filletData.element1_id,
        line2_id: filletData.line2_id || filletData.element2_id,
        radius: filletData.radius,
      };
      
      console.log('🔵 Flattened fillet request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending fillet request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/fillets', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to add fillet in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Add chamfer to sketch in the C++ backend
   */
  async addChamfer(sessionId, chamferData) {
    try {
      console.log('🔶 Chamfer data received:', chamferData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: chamferData.sketch_id,
        line1_id: chamferData.line1_id || chamferData.element1_id,
        line2_id: chamferData.line2_id || chamferData.element2_id,
        distance: chamferData.distance,
      };
      
      console.log('🔶 Flattened chamfer request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending chamfer request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/chamfers', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to add chamfer in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Trim line to line in the C++ backend
   */
  async trimLineToLine(sessionId, trimData) {
    try {
      console.log('✂️ Trim line to line data received:', trimData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: trimData.sketch_id,
        line_to_trim_id: trimData.line_to_trim_id,
        cutting_line_id: trimData.cutting_line_id,
        keep_start: trimData.keep_start,
      };
      
      console.log('✂️ Flattened trim line to line request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending trim line to line request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/trim-line-to-line', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to trim line to line in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Trim line to geometry in the C++ backend
   */
  async trimLineToGeometry(sessionId, trimData) {
    try {
      console.log('✂️ Trim line to geometry data received:', trimData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: trimData.sketch_id,
        line_to_trim_id: trimData.line_to_trim_id,
        cutting_geometry_id: trimData.cutting_geometry_id,
        keep_start: trimData.keep_start,
      };
      
      console.log('✂️ Flattened trim line to geometry request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending trim line to geometry request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/trim-line-to-geometry', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to trim line to geometry in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Extend line to line in the C++ backend
   */
  async extendLineToLine(sessionId, extendData) {
    try {
      console.log('📏 Extend line to line data received:', extendData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: extendData.sketch_id,
        line_to_extend_id: extendData.line_to_extend_id,
        target_line_id: extendData.target_line_id,
        extend_start: extendData.extend_start,
      };
      
      console.log('📏 Flattened extend line to line request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending extend line to line request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/extend-line-to-line', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to extend line to line in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Extend line to geometry in the C++ backend
   */
  async extendLineToGeometry(sessionId, extendData) {
    try {
      console.log('📏 Extend line to geometry data received:', extendData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: extendData.sketch_id,
        line_to_extend_id: extendData.line_to_extend_id,
        target_geometry_id: extendData.target_geometry_id,
        extend_start: extendData.extend_start,
      };
      
      console.log('📏 Flattened extend line to geometry request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending extend line to geometry request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/extend-line-to-geometry', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to extend line to geometry in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Mirror elements in the C++ backend
   */
  async mirrorElements(sessionId, mirrorData) {
    try {
      console.log('🪞 Mirror elements data received:', mirrorData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: mirrorData.sketch_id,
        element_ids: mirrorData.element_ids || (mirrorData.element_id ? [mirrorData.element_id] : []),
        mirror_line_id: mirrorData.mirror_line_id,
        keep_original: mirrorData.keep_original,
      };
      
      console.log('🪞 Flattened mirror elements request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending mirror elements request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/mirror-elements', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to mirror elements in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Mirror elements by two points in the C++ backend
   */
  async mirrorElementsByTwoPoints(sessionId, mirrorData) {
    try {
      console.log('🪞 Mirror elements by two points data received:', mirrorData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: mirrorData.sketch_id,
        element_ids: mirrorData.element_ids,
        x1: mirrorData.x1,
        y1: mirrorData.y1,
        x2: mirrorData.x2,
        y2: mirrorData.y2,
        keep_original: mirrorData.keep_original,
      };
      
      console.log('🪞 Flattened mirror elements by two points request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending mirror elements by two points request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/mirror-elements-by-two-points', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to mirror elements by two points in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Offset element in the C++ backend
   */
  async offsetElement(sessionId, offsetData) {
    try {
      console.log('📐 Offset element data received:', offsetData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: offsetData.sketch_id,
        element_id: offsetData.element_id,
        offset_distance: offsetData.offset_distance || offsetData.distance,
      };
      
      console.log('📐 Flattened offset element request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending offset element request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/offset-element', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to offset element in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Offset element directionally in the C++ backend
   */
  async offsetElementDirectional(sessionId, offsetData) {
    try {
      console.log('📐 Offset element directional data received:', offsetData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: offsetData.sketch_id,
        element_id: offsetData.element_id,
        offset_distance: offsetData.offset_distance,
        direction: offsetData.direction,
      };
      
      console.log('📐 Flattened offset element directional request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending offset element directional request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/offset-element-directional', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to offset element directionally in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Copy element in the C++ backend
   */
  async copyElement(sessionId, copyData) {
    try {
      console.log('📋 Copy element data received:', copyData);

      // Handle translation array format from agent
      let directionX = copyData.direction_x;
      let directionY = copyData.direction_y; 
      let distance = copyData.distance;
      let numCopies = copyData.num_copies || 1;

      if (copyData.translation && Array.isArray(copyData.translation)) {
        const [dx, dy] = copyData.translation;
        distance = Math.sqrt(dx * dx + dy * dy);
        directionX = distance > 0 ? dx / distance : 1;
        directionY = distance > 0 ? dy / distance : 0;
      }

      const requestBody = {
        session_id: sessionId,
        sketch_id: copyData.sketch_id,
        element_id: copyData.element_id,
        num_copies: numCopies,
        direction_x: directionX,
        direction_y: directionY,
        distance: distance,
      };
      
      console.log('📋 Flattened copy element request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending copy element request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/copy-element', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to copy element in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Move element in the C++ backend
   */
  async moveElement(sessionId, moveData) {
    try {
      console.log('➡️ Move element data received:', moveData);

      // Handle translation array format from agent
      let directionX = moveData.direction_x;
      let directionY = moveData.direction_y; 
      let distance = moveData.distance;

      if (moveData.translation && Array.isArray(moveData.translation)) {
        const [dx, dy] = moveData.translation;
        distance = Math.sqrt(dx * dx + dy * dy);
        directionX = distance > 0 ? dx / distance : 1;
        directionY = distance > 0 ? dy / distance : 0;
      }

      const requestBody = {
        session_id: sessionId,
        sketch_id: moveData.sketch_id,
        element_id: moveData.element_id,
        direction_x: directionX,
        direction_y: directionY,
        distance: distance,
      };
      
      console.log('➡️ Flattened move element request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending move element request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/move-element', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to move element in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Extrude sketch or element in the C++ backend
   */
  async extrudeFeature(sessionId, extrudeData) {
    try {
      console.log('🔧 Extrude feature data received:', extrudeData);

      const requestBody = {
        session_id: sessionId,
        sketch_id: extrudeData.sketch_id,
        distance: extrudeData.distance,
        direction: extrudeData.direction || 'normal',
        element_id: extrudeData.element_id,
      };
      
      console.log('🔧 Flattened extrude feature request body:', requestBody);
      
      const jsonString = JSON.stringify(requestBody);
      
      console.log('🔧 Node.js sending extrude feature request to C++:');
      console.log('📋 JSON string:', jsonString);

      const response = await this.makeRequest('/api/v1/extrude', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: jsonString,
      });
      return response;
    } catch (error) {
      logger.error('Failed to extrude feature in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Perform boolean operation in the C++ backend
   */
  async performBooleanOperation(sessionId, operation) {
    try {
      const response = await this.makeRequest('/api/v1/operations', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          session_id: sessionId,
          operation: 'boolean_operation',
          parameters: operation,
        }),
      });
      return response;
    } catch (error) {
      logger.error('Failed to perform boolean operation in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Update parameters in the C++ backend
   */
  async updateParameters(sessionId, parameters) {
    try {
      const response = await this.makeRequest('/api/v1/parameters', {
        method: 'PUT',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          session_id: sessionId,
          operation: 'update_parameters',
          parameters,
        }),
      });
      return response;
    } catch (error) {
      logger.error('Failed to update parameters in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Tessellate a model in the C++ backend
   */
  async tessellateModel(sessionId, modelId, quality = 0.1) {
    try {
      const response = await this.makeRequest('/api/v1/tessellate', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          session_id: sessionId,
          model_id: modelId,
          tessellation_quality: quality,
        }),
      });
      return response;
    } catch (error) {
      logger.error('Failed to tessellate model in C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Export a model from the C++ backend
   */
  async exportModel(sessionId, format) {
    try {
      const response = await this.makeRequest(`/api/v1/sessions/${sessionId}/export/${format}`, {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId,
        },
      });
      return response;
    } catch (error) {
      logger.error('Failed to export model from C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Send Daydreams AI request to C++ backend
   */
  async sendDaydreamsRequest(sessionId, instruction, parameters = {}) {
    try {
      const response = await this.makeRequest('/api/v1/daydreams/cad', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          instruction,
          parameters,
        }),
      });
      return response;
    } catch (error) {
      logger.error('Failed to send Daydreams request to C++ backend:', error.message);
      throw error;
    }
  }

  /**
   * Check if C++ backend is available
   */
  async isAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
} 