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

/**
 * Tool to create a primitive shape.
 */
server.tool(
  'create_primitive',
  {
    description: 'Creates a primitive 3D shape like a box, cylinder, or sphere.',
    schema: z.object({
        primitive_type: z.enum(['box', 'cylinder', 'sphere', 'cone']).describe('The type of primitive shape.'),
        dimensions: z.record(z.number()).describe('Dimensions of the shape (e.g., {width: 10, height: 10, depth: 10}).'),
        position: z.array(z.number()).length(3).optional().describe('The [x, y, z] position.'),
    }),
  },
  async (params) => {
    try {
      logger.info('MCP: Executing create_primitive', params);
      const result = await cadClient.createModel(sessionId, { type: 'primitive', ...params });
      const modelId = result.data?.model_id || result.model_id;
      
      if (!modelId) {
        throw new Error('Model creation did not return an ID.');
      }
      
      const tessellation = await cadClient.tessellateModel(sessionId, modelId, 0.1);

      return {
        content: [{
          type: 'json',
          json: { ...result, mesh_data: tessellation.mesh_data },
        }],
      };
    } catch (error) {
      logger.error('MCP: create_primitive failed', { error: error.message });
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


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP Server connected to transport and is running.');
}

main().catch(err => {
  logger.error('MCP Server crashed', { error: err.message, stack: err.stack });
  process.exit(1);
}); 