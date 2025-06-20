import { action, AnyAgent } from "@daydreamsai/core";
import { z } from "zod";
import { CppBackendClient } from "../services/cppBackendClient.js";
import type { WebSocketManager } from "../services/websocketManager.js";

interface CppBackendResponse {
  success: boolean;
  data?: any;
}

function sendVisualizationData(agent: AnyAgent, agentSessionId: string, data: any) {
  const webSocketManager = agent.container.resolve<WebSocketManager>("webSocketManager");
  
  // Extract the actual WebSocket session ID from the agent context ID
  // Agent context ID format: "web-chat:ws-session-xxx" or "web-chat:session_xxx"
  const actualSessionId = agentSessionId.replace('web-chat:', '');
  
  if (data && data.visualization_data) {
    console.log(`🎨 Sending visualization data from agent session ${agentSessionId} to frontend session ${actualSessionId}`);
    
    webSocketManager.sendToClient(actualSessionId, {
      type: 'visualization_data',
      payload: data.visualization_data,
    });
  }
  
  // Also send mesh data for geometry updates
  if (data && data.mesh_data) {
    console.log(`🎯 Sending mesh data from agent session ${agentSessionId} to frontend session ${actualSessionId}`);
    
    webSocketManager.sendToClient(actualSessionId, {
      type: 'geometry_update',
      data: data.mesh_data,
    });
  }
}

const createModelAction = action({
  name: "createModel",
  description: "Create a new 3D model (sketch-based or imported).",
  schema: z.object({
    type: z.enum(['sketch', 'imported']).describe("The type of model to create."),
    dimensions: z.object({}).passthrough().optional().describe("An object representing the dimensions."),
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
    description: "Add a 2D element to a sketch.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to add the element to."),
        element_type: z.enum(['line', 'circle', 'rectangle']).describe("The type of element to add. Use 'rectangle' for squares/rectangles."),
        parameters: z.object({}).passthrough().describe("Geometric parameters. For circles: { \"x\": number, \"y\": number, \"radius\": number }. For lines: { \"start\": [number, number], \"end\": [number, number] }. For rectangles: { \"corner\": [number, number], \"width\": number, \"height\": number }.")
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

const createRectangleAction = action({
    name: "createRectangle",
    description: "Create a rectangle in a sketch. Use this instead of 4 separate lines for rectangular shapes.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to add the rectangle to."),
        corner: z.array(z.number()).length(2).describe("Bottom-left corner [x, y] of the rectangle."),
        width: z.number().gt(0).describe("Width of the rectangle."),
        height: z.number().gt(0).describe("Height of the rectangle.")
    }),
    async handler(params, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const elementData = {
            sketch_id: params.sketch_id,
            element_type: 'rectangle' as const,
            parameters: {
                corner: params.corner,
                width: params.width,
                height: params.height
            }
        };
        const result = await cppBackend.addSketchElement(sessionId, elementData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const addFilletAction = action({
    name: "addFillet",
    description: "Add a fillet (rounded corner) between two sketch elements. Creates a smooth arc transition between two lines or other geometric elements.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the elements to fillet."),
        element1_id: z.string().describe("The ID of the first element to connect with the fillet."),
        element2_id: z.string().describe("The ID of the second element to connect with the fillet."),
        radius: z.number().gt(0).describe("The radius of the fillet arc.")
    }),
    async handler(filletData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.addFillet(sessionId, filletData) as CppBackendResponse;
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
  createRectangleAction,
  addFilletAction,
  extrudeFeatureAction,
  performBooleanOperationAction,
  tessellateModelAction,
]; 