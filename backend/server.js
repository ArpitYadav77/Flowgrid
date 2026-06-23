// ─── FlowGrid Server — HTTP + Socket.io + Slot Cleanup ──────────────

const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const { releaseExpiredLocks } = require('./src/services/slot.service');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// ─── Periodic Slot Lock Cleanup ────────────────────────────────────
// Runs every 60 seconds to release expired slot locks
const CLEANUP_INTERVAL_MS = 60 * 1000;

setInterval(async () => {
  try {
    await releaseExpiredLocks();
  } catch (error) {
    console.error('Slot cleanup error:', error.message);
  }
}, CLEANUP_INTERVAL_MS);

// ─── Graceful Shutdown ──────────────────────────────────────────────

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);

  // Close Socket.io connections
  io.close(() => {
    console.log('   Socket.io connections closed');
  });

  // Close HTTP server
  server.close(() => {
    console.log('   HTTP server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('   Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 FlowGrid API Server v2.0 — Production Grade`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Port      : ${PORT}`);
  console.log(`   Database   : PostgreSQL (Prisma ORM)`);
  console.log(`   Realtime   : Socket.io`);
  console.log(`   Payments   : Razorpay`);
  console.log(`   Health     : http://localhost:${PORT}/api/health`);
  console.log(`${'='.repeat(60)}\n`);
});

module.exports = server;
