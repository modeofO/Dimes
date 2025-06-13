import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
// Removed all Daydreams and AI SDK related imports

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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
}));

// Initialize services
const cppBackend = new CppBackendClient();
const wsManager = new WebSocketManager(server, cppBackend);

// All agent creation code has been removed.

// Security middleware (moved up for proper ordering)
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100,
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
app.use('/api/v1/cad', cadRoutes()); // No agent passed

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(port, () => {
  logger.info(`🚀 Dimes CAD API Server running on port ${port}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 C++ Backend: ${process.env.CPP_BACKEND_HOST}:${process.env.CPP_BACKEND_PORT}`);
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