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
        plane_type: z.enum(['XZ', 'XY', 'YZ']).describe("The plane to create the sketch on."),
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
        element_type: z.enum(['line', 'circle', 'rectangle', 'arc', 'polygon']).describe("The type of element to add."),
        parameters: z.object({}).passthrough().describe("Geometric parameters. For circles: { \"x\": number, \"y\": number, \"radius\": number }. For lines: { \"start\": [number, number], \"end\": [number, number] }. For rectangles: { \"corner\": [number, number], \"width\": number, \"height\": number }. For arcs: { \"center\": [number, number], \"radius\": number, \"start_angle\": number, \"end_angle\": number } or { \"start\": [number, number], \"end\": [number, number], \"radius\": number }. For polygons: { \"center\": [number, number], \"sides\": number, \"radius\": number }.")
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

const createArcAction = action({
    name: "createArc",
    description: "Create an arc in a sketch. Can be defined by center-radius-angles or by three points.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to add the arc to."),
        type: z.enum(['center_radius', 'three_points', 'endpoints_radius']).describe("How to define the arc."),
        center: z.array(z.number()).length(2).optional().describe("Center point [x, y] for center_radius type."),
        radius: z.number().gt(0).optional().describe("Radius for center_radius or endpoints_radius type."),
        start_angle: z.number().optional().describe("Start angle in degrees for center_radius type."),
        end_angle: z.number().optional().describe("End angle in degrees for center_radius type."),
        start_point: z.array(z.number()).length(2).optional().describe("Start point [x, y] for endpoints_radius type."),
        end_point: z.array(z.number()).length(2).optional().describe("End point [x, y] for endpoints_radius type."),
        point1: z.array(z.number()).length(2).optional().describe("First point [x, y] for three_points type."),
        point2: z.array(z.number()).length(2).optional().describe("Second point [x, y] for three_points type."),
        point3: z.array(z.number()).length(2).optional().describe("Third point [x, y] for three_points type.")
    }),
    async handler(params, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        
        let parameters;
        if (params.type === 'center_radius') {
            parameters = {
                center: params.center,
                radius: params.radius,
                start_angle: params.start_angle,
                end_angle: params.end_angle
            };
        } else if (params.type === 'endpoints_radius') {
            parameters = {
                start: params.start_point,
                end: params.end_point,
                radius: params.radius
            };
        } else { // three_points
            parameters = {
                point1: params.point1,
                point2: params.point2,
                point3: params.point3
            };
        }
        
        const elementData = {
            sketch_id: params.sketch_id,
            element_type: 'arc' as const,
            parameters
        };
        
        const result = await cppBackend.addSketchElement(sessionId, elementData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const createPolygonAction = action({
    name: "createPolygon",
    description: "Create a regular polygon in a sketch.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch to add the polygon to."),
        center: z.array(z.number()).length(2).describe("Center point [x, y] of the polygon."),
        sides: z.number().int().min(3).describe("Number of sides (minimum 3)."),
        radius: z.number().gt(0).describe("Radius from center to vertices.")
    }),
    async handler(params, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const elementData = {
            sketch_id: params.sketch_id,
            element_type: 'polygon' as const,
            parameters: {
                center: params.center,
                sides: params.sides,
                radius: params.radius
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

const addChamferAction = action({
    name: "addChamfer",
    description: "Add a chamfer (angled cut) between two sketch elements. Creates a straight line transition between two lines or other geometric elements.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the elements to chamfer."),
        element1_id: z.string().describe("The ID of the first element to connect with the chamfer."),
        element2_id: z.string().describe("The ID of the second element to connect with the chamfer."),
        distance: z.number().gt(0).describe("The distance of the chamfer cut.")
    }),
    async handler(chamferData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.addChamfer(sessionId, chamferData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const trimLineToLineAction = action({
    name: "trimLineToLine",
    description: "Trim one line to intersect with another line.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the lines."),
        line_to_trim_id: z.string().describe("The ID of the line to be trimmed."),
        cutting_line_id: z.string().describe("The ID of the line that defines the trim boundary.")
    }),
    async handler(trimData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.trimLineToLine(sessionId, trimData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const extendLineToLineAction = action({
    name: "extendLineToLine",
    description: "Extend one line to intersect with another line.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the lines."),
        line_to_extend_id: z.string().describe("The ID of the line to be extended."),
        target_line_id: z.string().describe("The ID of the line that defines the extension target.")
    }),
    async handler(extendData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.extendLineToLine(sessionId, extendData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const mirrorElementAction = action({
    name: "mirrorElement",
    description: "Mirror (reflect) a sketch element across a line of symmetry.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to mirror."),
        element_id: z.string().describe("The ID of the element to mirror."),
        mirror_line: z.object({
            point1: z.array(z.number()).length(2).describe("First point [x, y] defining the mirror line."),
            point2: z.array(z.number()).length(2).describe("Second point [x, y] defining the mirror line.")
        }).describe("The line of symmetry to mirror across.")
    }),
    async handler(mirrorData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.mirrorElements(sessionId, mirrorData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const offsetElementAction = action({
    name: "offsetElement",
    description: "Create an offset copy of a sketch element at a specified distance.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to offset."),
        element_id: z.string().describe("The ID of the element to offset."),
        distance: z.number().describe("The offset distance (positive or negative).")
    }),
    async handler(offsetData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.offsetElement(sessionId, offsetData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const copyElementAction = action({
    name: "copyElement",
    description: "Copy a sketch element to a new position.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to copy."),
        element_id: z.string().describe("The ID of the element to copy."),
        translation: z.array(z.number()).length(2).describe("Translation vector [dx, dy] for the copy.")
    }),
    async handler(copyData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.copyElement(sessionId, copyData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const moveElementAction = action({
    name: "moveElement",
    description: "Move a sketch element to a new position.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to move."),
        element_id: z.string().describe("The ID of the element to move."),
        translation: z.array(z.number()).length(2).describe("Translation vector [dx, dy] for the move.")
    }),
    async handler(moveData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await cppBackend.moveElement(sessionId, moveData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const createLinearArrayAction = action({
    name: "createLinearArray",
    description: "Create a linear array (pattern) of a sketch element with specified spacing and count.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to array."),
        element_id: z.string().describe("The ID of the element to array."),
        direction: z.array(z.number()).length(2).describe("Direction vector [dx, dy] for the array spacing."),
        count: z.number().int().min(2).describe("Number of copies in the array (minimum 2).")
    }),
    async handler(arrayData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await (cppBackend as any).createLinearArray(sessionId, arrayData) as CppBackendResponse;
        if (result.success && result.data) {
          sendVisualizationData(agent, sessionId, result.data);
          return result.data;
        }
        return result;
    }
});

const createMirrorArrayAction = action({
    name: "createMirrorArray",
    description: "Create a mirror array (symmetrical pattern) of a sketch element across a line of symmetry.",
    schema: z.object({
        sketch_id: z.string().describe("The ID of the sketch containing the element to array."),
        element_id: z.string().describe("The ID of the element to array."),
        mirror_line: z.object({
            point1: z.array(z.number()).length(2).describe("First point [x, y] defining the mirror line."),
            point2: z.array(z.number()).length(2).describe("Second point [x, y] defining the mirror line.")
        }).describe("The line of symmetry for the mirror array.")
    }),
    async handler(arrayData, ctx, agent) {
        const cppBackend = agent.container.resolve<CppBackendClient>("cppBackend");
        const sessionId = ctx.id;
        const result = await (cppBackend as any).createMirrorArray(sessionId, arrayData) as CppBackendResponse;
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
  createArcAction,
  createPolygonAction,
  addFilletAction,
  addChamferAction,
  trimLineToLineAction,
  extendLineToLineAction,
  mirrorElementAction,
  offsetElementAction,
  copyElementAction,
  moveElementAction,
  createLinearArrayAction,
  createMirrorArrayAction,
  extrudeFeatureAction,
  performBooleanOperationAction,
  tessellateModelAction,
]; 