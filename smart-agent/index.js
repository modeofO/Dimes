import { createDreams, LogLevel, context } from '@daydreamsai/core';
import { createMcpExtension } from '@daydreamsai/mcp';
import { cliExtension } from '@daydreamsai/cli';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import path from 'path';

// Define a simple context for the agent's goal
const goalContext = context({
  type: 'goal',
  schema: z.object({
    description: z.string(),
  }),
  key: ({ description }) => description.replace(/\s+/g, '-').toLowerCase(),
  create: ({ args }) => ({
    goal: args.description,
    steps: [],
    status: 'in-progress',
  }),
  render: ({ memory }) => `
    Goal: ${memory.goal}
    Status: ${memory.status}
    Steps Taken:
    ${memory.steps.join('\n') || 'None yet.'}
  `,
  instructions: `You are an expert CAD designer specializing in sketch-based parametric modeling. Your task is to achieve the user's goal by using the available sketch-based modeling tools from the CAD MCP server. Plan your steps and execute them one by one. Think about the geometry and positioning required for each part.
  
  Your workflow should always follow these steps:
  1. Create a sketch plane (XY, XZ, or YZ)
  2. Create a sketch on that plane
  3. Add 2D elements (lines, circles) to the sketch
  4. Extrude the sketch to create 3D geometry
  5. Use boolean operations to combine multiple parts if needed
  
  Remember that all 3D geometry must be created through this sketch-based workflow. No primitive shapes are available.
  `,
});

async function main() {
  console.log('Starting Smart CAD Agent...');

  const agent = createDreams({
    model: openrouter('google/gemini-2.0-flash-001'),
    logLevel: LogLevel.DEBUG,
    extensions: [
      cliExtension, // For basic console interaction
      createMcpExtension([
        {
          id: 'cad-mcp',
          name: 'CAD Engine MCP Server',
          transport: {
            type: 'stdio',
            command: 'node',
            // Note: This path assumes the agent is run from the project root.
            args: [path.resolve(process.cwd(), 'api-server/src/mcp-server.js')],
          },
        },
      ]),
    ],
    contexts: [goalContext],
  });

  await agent.start();

  console.log('Agent started. Executing goal...');

  const goalDescription = 'Build a simple rectangular block. Create a sketch on the XY plane with a rectangle, then extrude it to create a 3D block.';
  
  await agent.run({
    context: goalContext,
    args: { description: goalDescription },
    input: {
      type: 'user_request',
      data: { goal: goalDescription }
    }
  });

  console.log('Goal execution finished. Check the Dimes client to see the result.');
}

main().catch(err => {
  console.error('Smart Agent crashed:', err);
  process.exit(1);
}); 