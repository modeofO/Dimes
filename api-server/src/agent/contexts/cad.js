import { context } from '@daydreamsai/core';
import { z } from 'zod';

const shapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  parameters: z.record(z.any()),
});

const cadMemorySchema = z.object({
  shapes: z.array(shapeSchema),
  lastOperation: z.string().nullable(),
});

export const cadContext = context({
  type: 'cad',
  schema: z.object({
    sessionId: z.string(),
  }),
  key: ({ sessionId }) => sessionId,
  
  create: () => ({
    shapes: [],
    lastOperation: null,
  }),

  render: (state) => {
    const { shapes, lastOperation } = state.memory;
    let description = 'Current CAD Session State:\\n';
    if (shapes.length === 0) {
      description += 'No shapes have been created yet.\\n';
    } else {
      description += `Shapes created (${shapes.length}):\\n`;
      shapes.forEach((shape) => {
        description += `- ID: ${shape.id}, Type: ${shape.type}\\n`;
      });
    }
    if (lastOperation) {
      description += `Last operation: ${lastOperation}\\n`;
    }
    return description;
  },

  instructions: 'You are a CAD assistant. Your goal is to help the user create and modify 3D models based on their instructions. Use the available actions to interact with the CAD system. When an operation is successful, briefly inform the user what was done and what the resulting shape IDs are.',
}); 