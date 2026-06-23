// ─── Socket.io Setup ────────────────────────────────────────────────

const { Server } = require('socket.io');

let io;

/**
 * Initialize Socket.io with the HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`   User ${userId} joined personal room`);
    });

    // Join provider-specific room
    socket.on('join:provider', (providerId) => {
      socket.join(`provider:${providerId}`);
      console.log(`   Provider ${providerId} joined dashboard room`);
    });

    // Join a service room for real-time slot updates
    socket.on('join:service', (serviceId) => {
      socket.join(`service:${serviceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get the Socket.io instance.
 * @returns {Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(server) first.');
  }
  return io;
};

module.exports = { initSocket, getIO };
