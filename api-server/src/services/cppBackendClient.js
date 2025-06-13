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
        primitive_type: parameters.primitive_type,
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