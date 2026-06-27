import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger';
import { setSocketServer } from '../services/notification.service';
import { ChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';

interface JwtPayload {
  userId: string;
  role: string;
}

const CHAT_HISTORY_LIMIT = 50; // messages to send on room join

export function initSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth['token'] as string | undefined ??
      (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

    if (!token) return next(new Error('Authentication token required.'));

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data['userId'] = payload.userId;
      socket.data['role']   = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data['userId'] as string;

    // Personal notification room
    socket.join(`user:${userId}`);
    logger.info(`[socket] User ${userId} connected (${socket.id})`);

    // ── Chat: join a room ───────────────────────────────────────────────────
    socket.on('chat:join', async (room: string) => {
      if (!room || typeof room !== 'string') return;
      const safeRoom = `community:${room.replace(/[^a-z0-9_-]/gi, '').slice(0, 50)}`;
      socket.join(safeRoom);

      // Send recent history
      try {
        const history = await ChatMessage.find({ room: safeRoom })
          .sort({ createdAt: -1 })
          .limit(CHAT_HISTORY_LIMIT)
          .lean();
        socket.emit('chat:history', history.reverse());
      } catch (e) {
        logger.error('[socket] Failed to load chat history:', e);
      }
    });

    // ── Chat: leave a room ──────────────────────────────────────────────────
    socket.on('chat:leave', (room: string) => {
      const safeRoom = `community:${room.replace(/[^a-z0-9_-]/gi, '').slice(0, 50)}`;
      socket.leave(safeRoom);
    });

    // ── Chat: send message ──────────────────────────────────────────────────
    socket.on('chat:send', async (payload: { room: string; body: string }) => {
      if (!payload?.body?.trim() || !payload.room) return;
      const body = payload.body.trim().slice(0, 2000);
      const safeRoom = `community:${payload.room.replace(/[^a-z0-9_-]/gi, '').slice(0, 50)}`;

      try {
        const user = await User.findById(userId).select('name avatar').lean();
        if (!user) return;

        const msg = await ChatMessage.create({
          room:       safeRoom,
          userId,
          userName:   user.name,
          userAvatar: user.avatar ?? '',
          body,
        });

        // Broadcast to everyone in the room (including sender)
        io.to(safeRoom).emit('chat:message', {
          _id:        msg._id,
          room:       safeRoom,
          userId,
          userName:   user.name,
          userAvatar: user.avatar ?? '',
          body,
          createdAt:  msg.createdAt,
        });
      } catch (e) {
        logger.error('[socket] Failed to save/broadcast chat message:', e);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[socket] User ${userId} disconnected (${socket.id})`);
    });
  });

  setSocketServer(io);
  logger.info('[socket] Socket.io server initialized.');
  return io;
}
