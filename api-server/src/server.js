import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';
// Removed all Daydreams and AI SDK related imports

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { validateSession } from './middleware/sessionValidator.js';
import cadRoutes from './routes/cad.js';
import healthRoutes from './routes/health.js';
import { WebSocketManager } from './services/websocketManager.js';
import { CppBackendClient } from './services/cppBackendClient.js';
import { logger } from './utils/logger.js';
import { initializeAgent } from './agent/index.ts';

// Load environment variables
dotenv.config();

// Basic security and performance middleware
const app = express();
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3001',
    'http://localhost:3001',  // Support new Next.js client
  ],
  credentials: true,
}));
app.use(compression());

// Request logging
app.use(morgan('dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));

// Create HTTP server
const server = createServer(app);

// Initialize WebSocketManager with the HTTP server
const webSocketManager = new WebSocketManager(server);
const agent = await initializeAgent(webSocketManager);

// Session validation middleware
app.use(validateSession);

// API Routes
app.use('/api/v1/cad', cadRoutes(webSocketManager));
app.use('/api/v1/health', healthRoutes);

// Not found and error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  logger.info(`🚀 Dimes CAD API Server running on port ${port}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 C++ Backend: ${process.env.CPP_BACKEND_URL || '127.0.0.1:8080'}`);
});

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

export default app; 