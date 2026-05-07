import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
// ============================================================
// Middleware
// ============================================================
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ============================================================
// Health Check
// ============================================================
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});
// ============================================================
// MongoDB Connection
// ============================================================
const connectMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:admin-password@mongodb:27017/snake_game?authSource=admin';
        await mongoose.connect(mongoUri);
        logger.info('✅ MongoDB connected successfully');
    }
    catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};
// ============================================================
// Socket.io Events
// ============================================================
io.on('connection', (socket) => {
    logger.info(`📱 Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        logger.info(`📱 Client disconnected: ${socket.id}`);
    });
    socket.on('game:move', (data) => {
        io.emit('game:update', data);
    });
    socket.on('game:eat', (data) => {
        io.emit('game:foodEaten', data);
    });
    socket.on('room:join', (data) => {
        socket.join(`room-${data.roomId}`);
        io.to(`room-${data.roomId}`).emit('room:playerJoined', data);
    });
    socket.on('room:leave', (data) => {
        socket.leave(`room-${data.roomId}`);
        io.to(`room-${data.roomId}`).emit('room:playerLeft', data);
    });
});
// ============================================================
// Routes (Placeholder - to be implemented)
// ============================================================
app.get('/api/players', (_req, res) => {
    res.json({ message: 'GET /api/players' });
});
app.post('/api/games', (_req, res) => {
    res.json({ message: 'POST /api/games' });
});
app.get('/api/leaderboard', (_req, res) => {
    res.json({ message: 'GET /api/leaderboard' });
});
// ============================================================
// Error Handling
// ============================================================
app.use((err, _req, res, _next) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
// ============================================================
// Start Server
// ============================================================
const PORT = parseInt(process.env.PORT || '4000', 10);
const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '4001', 10);
const start = async () => {
    await connectMongoDB();
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`✅ Server running on port ${PORT}`);
        logger.info(`📡 Socket.io running on port ${SOCKET_PORT}`);
    });
};
start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map