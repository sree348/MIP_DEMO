import { createServer } from 'node:http';
import { app } from '../src/server';

// Vercel calls this exported function for each request.
export default async function handler(req, res) {
  const server = createServer(app);
  // Forward the incoming request to the Express app.
  server.emit('request', req, res);
}
