import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { createDreams, createMemoryStore, LogLevel } from '@daydreamsai/core';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { cadExtension } from './agent/extensions/cad.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { validateSession } from './middleware/sessionValidator.js';
import cadRoutes from './routes/cad.js';
import healthRoutes from './routes/health.js';
import { WebSocketManager } from './services/websocketManager.js';
import { CppBackendClient } from './services/cppBackendClient.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize services
const cppBackend = new CppBackendClient();
const wsManager = new WebSocketManager(server, cppBackend);

// Create Daydreams Agent
const agent = createDreams({
    model: openrouter(process.env.OPENROUTER_API_KEY || 'google/gemini-2.0-flash-001'),
    logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    memory: {
        store: createMemoryStore(),
    },
    extensions: [cadExtension],
});

// Pass services to the agent's container
agent.container.instance('logger', logger);
agent.container.instance('wsManager', wsManager);

// Start the agent
agent.start().then(() => {
    logger.info('Daydreams AI Agent started successfully.');
}).catch(error => {
    logger.error('Failed to start Daydreams AI Agent:', error);
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session validation middleware for CAD routes
app.use('/api/v1/cad', validateSession);

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/cad', cadRoutes(agent));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(port, () => {
  logger.info(`🚀 Dimes CAD API Server running on port ${port}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 C++ Backend: ${process.env.CPP_BACKEND_HOST}:${process.env.CPP_BACKEND_PORT}`);
});

export default app; 