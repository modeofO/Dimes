import { createDreams, context, LogLevel, type AnyAgent } from "@daydreamsai/core";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { webChatExtension, webChatContext } from "./extension.js";
import { cadActions } from "./actions.js";
import { cppBackendService } from "./service.js";
import type { WebSocketManager } from "../services/websocketManager.js";
import { logger } from "../utils/logger.js";

// This will hold the initialized agent instance.
let agentInstance: AnyAgent | undefined;

/**
 * Initializes and starts the Daydreams agent.
 * @param {WebSocketManager} webSocketManager - The application's WebSocket manager instance.
 * @returns {Promise<AnyAgent>} The initialized agent instance.
 */
export async function initializeAgent(webSocketManager: WebSocketManager) {
  if (agentInstance) {
    logger.info("Agent already initialized.");
    return agentInstance;
  }

  logger.info("Initializing Daydreams agent...");

  const agent = createDreams({
    logLevel: LogLevel.DEBUG,
    model: openrouter("google/gemini-2.5-flash"),
    extensions: [webChatExtension],
    contexts: [webChatContext],
    actions: cadActions,
    services: [cppBackendService],
  });

  // Make the webSocketManager instance available to the agent via the container.
  agent.container.instance("webSocketManager", webSocketManager);

  await agent.start();
  
  agentInstance = agent;
  logger.info("Daydreams agent started successfully.");
  return agentInstance;
}

/**
 * Forwards a message from a client to the agent.
 * @param {string} sessionId - The client's session ID.
 * @param {string} content - The message content from the client.
 */
export async function handleClientMessage(sessionId, content) {
  if (!agentInstance) {
    logger.error("Agent not initialized. Cannot handle client message.");
    return;
  }

  logger.info(`Forwarding client message to agent for session: ${sessionId}`);
  
  try {
    const chatContext = agentInstance.registry.contexts.get("chat");
    if (!chatContext) {
      logger.error("Chat context not found in agent registry.");
      return;
    }
    
    await agentInstance.send({
      context: chatContext,
      args: { sessionId: sessionId },
      input: {
        type: "message",
        data: {
          content: content,
          sessionId: sessionId,
        },
      },
    });
  } catch (error) {
    logger.error(`Error handling client message for session ${sessionId}:`, error);
  }
} 