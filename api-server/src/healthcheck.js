// Minimal health check server for Railway debugging
import { createServer } from 'http';

const port = process.env.PORT || 3000;

const server = createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port, url: req.url }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Health check server running on 0.0.0.0:${port}`);
});
