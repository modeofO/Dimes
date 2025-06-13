import { output } from '@daydreamsai/core';
import { z } from 'zod';

export const geometryUpdateOutput = output({
  type: 'geometry_update',
  description: 'Sends updated mesh data to the client via WebSocket.',
  schema: z.object({
    model_id: z.string(),
    mesh_data: z.any(),
  }),
  async handler(data, ctx, agent) {
    const wsManager = agent.container.resolve('wsManager');
    wsManager.notifyGeometryUpdate(ctx.key, data);
    return { sent: true };
  },
}); 