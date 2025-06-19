import { extension, context, input, output, type AnyAgent } from "@daydreamsai/core";
import { z } from "zod";
import type { WebSocketManager } from "../services/websocketManager.js";

// Define the memory structure for our chat context
type WebChatMemory = {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
};

// This context will manage the state for each individual chat session.
// The agent will use this to remember conversation history for a specific client.
const webChatContext = context<WebChatMemory>({
  type: "web-chat",
  // Each chat session is identified by a unique sessionId.
  schema: z.object({
    sessionId: z.string().describe("The unique session identifier for the client connection."),
  }),
  // The key function ensures that each session has a unique identifier in memory.
  key: ({ sessionId }) => sessionId,
  instructions:
    "You are a helpful CAD assistant. Your goal is to help the user create 3D models by calling the available CAD actions. When chaining actions, use the direct JSON results from the previous action as arguments for the next. For example, if a previous action returns `{\"plane_id\": \"some_plane_id\"}`, the next action call must use that exact `plane_id` value. Do not use any templated values (e.g., `{{...}}`). Always call one action at a time and wait for its result before calling the next one. Look at the conversation history to understand the context of the user's request.",
  // The 'create' function initializes the memory for a new chat session.
  create: () => ({
    messages: [],
  }),
  // The 'render' function provides the conversation history to the LLM.
  render: (state) => {
    return `
CONVERSATION HISTORY:
${state.memory.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
`;
  }
});

// The webChatExtension bundles all the components needed for WebSocket communication.
export const webChatExtension = extension({
  name: "web-chat-extension",
  // Register the context with the extension.
  contexts: {
    chat: webChatContext,
  },
  // Define how the agent receives messages from the client.
  inputs: {
    message: input({
      schema: z.object({
        content: z.string(),
        sessionId: z.string(),
      }),
      // Subscribe to the webSocketManager's message event.
      subscribe: (send, agent) => {
        const webSocketManager = agent.container.resolve<WebSocketManager>("webSocketManager");
        
        // Register the agent's send function as the callback for new messages.
        webSocketManager.onMessage((sessionId, message) => {
          if (message.type === 'agent_message' && message.payload?.content) {
            send(
              webChatContext,
              { sessionId },
              { content: message.payload.content, sessionId }
            );
          }
        });

        // Since onMessage only supports one listener, we don't return a cleanup function.
        // The connection is managed by the WebSocketManager's lifecycle.
        return () => {};
      },
      // The handler processes the incoming message, updating memory.
      async handler(data, ctx) {
        const memory = ctx.memory as WebChatMemory;
        if (!memory.messages) {
          memory.messages = [];
        }
        memory.messages.push({
          role: "user",
          content: data.content,
          timestamp: Date.now(),
        });
        return { data, params: {} };
      },
    }),
  },
  // Define how the agent sends messages back to the client.
  outputs: {
    message: output({
      schema: z.string(),
      // The handler processes the outgoing message.
      async handler(data, ctx, agent: AnyAgent) {
        const memory = ctx.memory as WebChatMemory;
        if (!memory.messages) {
          memory.messages = [];
        }
        // The agent's response is added to the session's message history.
        memory.messages.push({
          role: "assistant",
          content: data,
          timestamp: Date.now(),
        });
        
        // Send the message over the WebSocket.
        const webSocketManager = agent.container.resolve<WebSocketManager>("webSocketManager");
        webSocketManager.sendToClient(ctx.key, {
          type: "agent_message",
          data: { content: data },
          timestamp: Date.now(),
        });

        return { data: { content: data }, params: {}, processed: true };
      },
      examples: [`<output type="message">Hello! How can I help you design something today?</output>`],
    }),
  },
}); 