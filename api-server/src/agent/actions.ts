import { action, AnyAgent } from "@daydreamsai/core";
import { z } from "zod";
import { CppBackendClient } from "../services/cppBackendClient.js";
import type { WebSocketManager } from "../services/websocketManager.js";

interface CppBackendResponse {
  success: boolean;
  data?: any;
}

function sendVisualizationData(agent: AnyAgent, sessionId: string, data: any) {
  if (data && data.visualization_data) {
    const webSocketManager = agent.container.resolve<WebSocketManager>("webSocketManager");
    webSocketManager.sendToClient(sessionId, {
      type: 'visualization_data',
      payload: data.visualization_data,
    });
  }
}

const createModelAction = action({
  name: "createModel",
  description: "Create a new 3D model (primitive, sketch-based, or imported).",
  schema: z.object({
    type: z.enum(['primitive', 'sketch', 'imported']).describe("The type of model to create."),
    primitive_type: z.enum(['box', 'cylinder', 'sphere', 'cone']).optional().describe("The type of primitive to create."),
    dimensions: z.object({}).passthrough().optional().describe("An object representing the dimensions (e.g., { x: 10, y: 5, z: 2 } or { radius: 5, height: 10 })."),
    position: z.array(z.number()).length(3).optional().describe("An array of 3 numbers for the [x, y, z] position."),
    rotation: z.array(z.number()).length(3).optional().describe("An array of 3 numbers for the [x, y, z] rotation in degrees.")
  }),
  async handler(parameters, ctx, agent) {
    const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
    const sessionId = ctx.id;
    const result = await cppBackend.createModel(sessionId, parameters) as CppBackendResponse;
    if (result.success && result.data) {
      sendVisualizationData(agent, sessionId, result.data);
      return result.data;
    }
    return result;
  }
});

const createSketchPlaneAction = action({
    name: "createSketchPlane",
    description: "Create a new 2D sketch plane.",
    schema: z.object({
        plane_type: z.enum(['XY', 'XZ', 'YZ']).describe("The plane to create the sketch on."),
        origin: z.array(z.number()).length(3).optional().describe("An array of 3 numbers for the [x, y, z] origin of the plane.")
    }),
    async handler(planeData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.createSketchPlane(sessionId, planeData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const createSketchAction = action({
    name: "createSketch",
    description: "Create a new sketch on a specific plane.",
    schema: z.object({
        plane_id: z.string().describe("The ID of the plane to create the sketch on.")
    }),
    async handler(sketchData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.createSketch(sessionId, sketchData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const addSketchElementAction = action({
    name: "addSketchElement",
    description: "Add a 2D element (e.g., line, circle) to a sketch.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to add the element to."),
        element_type: z.enum(['line', 'circle']).describe("The type of element to add."),
        parameters: z.object({}).passthrough().describe("An object with the geometric parameters. IMPORTANT: For a 'circle', the object MUST be `{ \"x\": number, \"y\": number, \"radius\": number }`. For a 'line', it MUST be `{ \"start\": [number, number], \"end\": [number, number] }`.")
    }),
    async handler(elementData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.addSketchElement(sessionId, elementData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const extrudeFeatureAction = action({
    name: "extrudeFeature",
    description: "Extrude a sketch or a specific element from a sketch to create a 3D feature.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to extrude."),
        element_id: z.string().optional().describe("Optional ID of a specific element within the sketch to extrude."),
        distance: z.number().gt(0).describe("The distance to extrude."),
        direction: z.enum(['normal', 'custom']).optional().describe("The direction of the extrusion.")
    }),
    async handler(extrudeData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.extrudeFeature(sessionId, extrudeData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const performBooleanOperationAction = action({
    name: "performBooleanOperation",
    description: "Perform a boolean operation (union, cut, intersect) between two models.",
    schema: z.object({
        operation_type: z.enum(['union', 'cut', 'intersect']).describe("The type of boolean operation."),
        target_id: z.string().describe("The ID of the target model."),
        tool_id: z.string().describe("The ID of the tool model to use for the operation.")
    }),
    async handler(operation, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.performBooleanOperation(sessionId, operation) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const tessellateModelAction = action({
    name: "tessellateModel",
    description: "Generate a mesh (tessellation) for a model to be visualized.",
    schema: z.object({
        model_id: z.string().describe("The ID of the model to tessellate."),
        tessellation_quality: z.number().min(0.001).max(1.0).optional().describe("The quality of the tessellation (0.001 to 1.0).")
    }),
    async handler(tessellationData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const { model_id, tessellation_quality } = tessellationData;
        const result = await cppBackend.tessellateModel(sessionId, model_id, tessellation_quality) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

export const cadActions = [
  createModelAction,
  createSketchPlaneAction,
  createSketchAction,
  addSketchElementAction,
  extrudeFeatureAction,
  performBooleanOperationAction,
  tessellateModelAction,
]; 