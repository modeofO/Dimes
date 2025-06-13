import { action } from '@daydreamsai/core';
import { z } from 'zod';

export const createModelAction = action({
  name: 'createModel',
  description: 'Creates a 3D model, such as a box, cylinder, or sphere.',
  schema: z.object({
    type: z.enum(['primitive', 'sketch', 'imported']),
    primitive_type: z.enum(['box', 'cylinder', 'sphere', 'cone']).optional(),
    dimensions: z.record(z.number()).optional(),
    position: z.array(z.number()).length(3).optional(),
    rotation: z.array(z.number()).length(3).optional(),
  }),
  async handler(params, ctx, agent) {
    const cadClient = agent.container.resolve('cadClient');
    return cadClient.createModel(ctx.key, params);
  },
});

export const performBooleanOperationAction = action({
  name: 'performBooleanOperation',
  description: 'Performs a boolean operation (union, cut, intersect) between two shapes.',
  schema: z.object({
    operation_type: z.enum(['union', 'cut', 'intersect']),
    target_id: z.string(),
    tool_id: z.string(),
  }),
  async handler(params, ctx, agent) {
    const cadClient = agent.container.resolve('cadClient');
    return cadClient.performBooleanOperation(ctx.key, params);
  },
});

export const updateParametersAction = action({
    name: 'updateParameters',
    description: 'Updates parameters of a model.',
    schema: z.record(z.string(), z.number()),
    async handler(params, ctx, agent) {
        const cadClient = agent.container.resolve('cadClient');
        return cadClient.updateParameters(ctx.key, params);
    }
});

export const tessellateModelAction = action({
    name: 'tessellateModel',
    description: 'Tessellates a model to generate mesh data.',
    schema: z.object({
        model_id: z.string(),
        quality: z.number().min(0.001).max(1.0).optional(),
    }),
    async handler(params, ctx, agent) {
        const cadClient = agent.container.resolve('cadClient');
        const { model_id, quality } = params;
        return cadClient.tessellateModel(ctx.key, model_id, quality);
    }
});

export const cadActions = [
    createModelAction,
    performBooleanOperationAction,
    updateParametersAction,
    tessellateModelAction
]; 