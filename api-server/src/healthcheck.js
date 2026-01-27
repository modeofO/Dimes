// Minimal health check server for Railway debugging
import { createServer } from 'http';

const port = process.env.PORT || 3000;

// Log environment for debugging
console.log('=== ENVIRONMENT ===');
console.log('PORT:', process.env.PORT);
console.log('RAILWAY_SERVICE_NAME:', process.env.RAILWAY_SERVICE_NAME);
console.log('RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
console.log('===================');

const server = createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port, url: req.url }));
});

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Health check server running on 0.0.0.0:${port}`);
});
