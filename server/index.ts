import http from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './handlers';
import type { ServerToClientEvents, ClientToServerEvents } from '../src/types/socket';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);

const httpServer = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
});

// Setup all socket event handlers
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`⚡ WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  io.close();
  httpServer.close();
  process.exit(0);
});
