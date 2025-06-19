import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CppBackendClient } from './services/cppBackendClient.js';
import { logger } from './utils/logger.js';

const server = new McpServer({
  name: 'CAD Engine MCP Server',
  version: '1.0.0',
});

const cadClient = new CppBackendClient();
const sessionId = 'mcp-agent-session'; // A dedicated session ID for the MCP agent

logger.info('MCP Server starting...');

// Define MCP tools that mirror the CAD actions

// Primitive creation has been removed - only sketch-based modeling is supported

/**
 * Tool to create a sketch plane.
 */
server.tool(
  'create_sketch_plane',
  {
    description: 'Creates a sketch plane for 2D sketching (XY, XZ, or YZ plane).',
    schema: z.object({
      plane_type: z.enum(['XY', 'XZ', 'YZ']).describe('The type of plane to create.'),
      origin: z.array(z.number()).length(3).optional().describe('The [x, y, z] origin point of the plane.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing create_sketch_plane', params);
      const result = await cadClient.createSketchPlane(sessionId, params);
      
      return {
        content: [{
          type: 'json',
          json: result,
        }],
      };
    } catch (error) {
      logger.error('MCP: create_sketch_plane failed', { error: error.message });
      return { error: error.message };
    }
  }
);

/**
 * Tool to create a sketch on a plane.
 */
server.tool(
  'create_sketch',
  {
    description: 'Creates a new sketch on a specified plane.',
    schema: z.object({
      plane_id: z.string().describe('The ID of the plane to create the sketch on.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing create_sketch', params);
      const result = await cadClient.createSketch(sessionId, params);
      
      return {
        content: [{
          type: 'json',
          json: result,
        }],
      };
    } catch (error) {
      logger.error('MCP: create_sketch failed', { error: error.message });
      return { error: error.message };
    }
  }
);

/**
 * Tool to add an element to a sketch.
 */
server.tool(
  'add_sketch_element',
  {
    description: 'Adds a 2D element (line or circle) to a sketch.',
    schema: z.object({
      sketch_id: z.string().describe('The ID of the sketch to add the element to.'),
      element_type: z.enum(['line', 'circle']).describe('The type of element to add.'),
      parameters: z.object({
        start_point: z.array(z.number()).length(2).optional().describe('Start point [x, y] for line.'),
        end_point: z.array(z.number()).length(2).optional().describe('End point [x, y] for line.'),
        center: z.array(z.number()).length(2).optional().describe('Center point [x, y] for circle.'),
        radius: z.number().optional().describe('Radius for circle.'),
      }).describe('Parameters specific to the element type.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing add_sketch_element', params);
      const result = await cadClient.addSketchElement(sessionId, params);
      
      return {
        content: [{
          type: 'json',
          json: result,
        }],
      };
    } catch (error) {
      logger.error('MCP: add_sketch_element failed', { error: error.message });
      return { error: error.message };
    }
  }
);

/**
 * Tool to extrude a sketch into a 3D solid.
 */
server.tool(
  'extrude_sketch',
  {
    description: 'Extrudes a 2D sketch into a 3D solid.',
    schema: z.object({
      sketch_id: z.string().describe('The ID of the sketch to extrude.'),
      distance: z.number().min(0.001).describe('The extrusion distance.'),
      extrude_type: z.enum(['blind', 'symmetric']).optional().describe('The type of extrusion.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing extrude_sketch', params);
      const result = await cadClient.extrudeSketch(sessionId, params);
      const modelId = result.data?.model_id || result.model_id;

      if (!modelId) {
        throw new Error('Extrusion did not return a model ID.');
      }

      const tessellation = await cadClient.tessellateModel(sessionId, modelId, 0.1);

      return {
        content: [{
          type: 'json',
          json: { ...result, mesh_data: tessellation.mesh_data },
        }],
      };
    } catch (error) {
      logger.error('MCP: extrude_sketch failed', { error: error.message });
      return { error: error.message };
    }
  }
);

/**
 * Tool to perform a boolean operation.
 */
server.tool(
    'perform_boolean',
    {
        description: 'Performs a boolean operation (union, cut, intersect) between two shapes.',
        schema: z.object({
            operation_type: z.enum(['union', 'cut', 'intersect']),
            target_id: z.string().describe('The ID of the target shape.'),
            tool_id: z.string().describe('The ID of the tool shape.'),
        }),
    },
    async (params) => {
        try {
            logger.info('MCP: Executing perform_boolean', params);
            const result = await cadClient.performBooleanOperation(sessionId, params);
            const modelId = result.data?.result_id || result.result_id;

            if (!modelId) {
                throw new Error('Boolean operation did not return a result ID.');
            }

            const tessellation = await cadClient.tessellateModel(sessionId, modelId, 0.1);

            return {
                content: [{
                    type: 'json',
                    json: { ...result, mesh_data: tessellation.mesh_data },
                }],
            };
        } catch (error) {
            logger.error('MCP: perform_boolean failed', { error: error.message });
            return { error: error.message };
        }
    }
);

/**
 * Tool to create a complete sketch-based model in one step.
 */
server.tool(
  'create_sketch_model',
  {
    description: 'Creates a complete 3D model using sketch-based workflow: plane → sketch → elements → extrude.',
    schema: z.object({
      plane_type: z.enum(['XY', 'XZ', 'YZ']).describe('The type of plane to create.'),
      plane_origin: z.array(z.number()).length(3).optional().describe('The [x, y, z] origin point of the plane.'),
      elements: z.array(z.object({
        element_type: z.enum(['line', 'circle']).describe('The type of element.'),
        parameters: z.object({
          start_point: z.array(z.number()).length(2).optional().describe('Start point [x, y] for line.'),
          end_point: z.array(z.number()).length(2).optional().describe('End point [x, y] for line.'),
          center: z.array(z.number()).length(2).optional().describe('Center point [x, y] for circle.'),
          radius: z.number().optional().describe('Radius for circle.'),
        }).describe('Parameters specific to the element type.'),
      })).describe('Array of 2D elements to add to the sketch.'),
      extrude_distance: z.number().min(0.001).describe('The extrusion distance.'),
      extrude_type: z.enum(['blind', 'symmetric']).optional().describe('The type of extrusion.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing create_sketch_model', params);
      
      // Step 1: Create sketch plane
      const planeResult = await cadClient.createSketchPlane(sessionId, {
        plane_type: params.plane_type,
        origin: params.plane_origin,
      });
      const planeId = planeResult.data?.plane_id || planeResult.plane_id;
      
      if (!planeId) {
        throw new Error('Plane creation did not return an ID.');
      }
      
      // Step 2: Create sketch
      const sketchResult = await cadClient.createSketch(sessionId, { plane_id: planeId });
      const sketchId = sketchResult.data?.sketch_id || sketchResult.sketch_id;
      
      if (!sketchId) {
        throw new Error('Sketch creation did not return an ID.');
      }
      
      // Step 3: Add elements to sketch
      for (const element of params.elements) {
        await cadClient.addSketchElement(sessionId, {
          sketch_id: sketchId,
          element_type: element.element_type,
          parameters: element.parameters,
        });
      }
      
      // Step 4: Extrude sketch
      const extrudeResult = await cadClient.extrudeSketch(sessionId, {
        sketch_id: sketchId,
        distance: params.extrude_distance,
        extrude_type: params.extrude_type,
      });
      const modelId = extrudeResult.data?.model_id || extrudeResult.model_id;
      
      if (!modelId) {
        throw new Error('Extrusion did not return a model ID.');
      }
      
      // Step 5: Generate mesh
      const tessellation = await cadClient.tessellateModel(sessionId, modelId, 0.1);
      
      return {
        content: [{
          type: 'json',
          json: {
            plane_id: planeId,
            sketch_id: sketchId,
            model_id: modelId,
            mesh_data: tessellation.mesh_data,
            workflow: 'sketch-based',
          },
        }],
      };
    } catch (error) {
      logger.error('MCP: create_sketch_model failed', { error: error.message });
      return { error: error.message };
    }
  }
);


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP Server connected to transport and is running.');
}

main().catch(err => {
  logger.error('MCP Server crashed', { error: err.message, stack: err.stack });
  process.exit(1);
}); 