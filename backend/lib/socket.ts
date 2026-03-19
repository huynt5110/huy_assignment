import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './logger';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`New WebSocket client connected: ${socket.id}`);

    socket.on('join', (room: string) => {
      socket.join(room);
      logger.info(`Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(server) first.');
  }
  return io;
};

export const emitToRoom = (room: string, event: string, data: any) => {
  if (io) {
    io.to(room).emit(event, data);
    logger.debug(`Emitted event "${event}" to room "${room}"`);
  }
};

export const broadcast = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    logger.debug(`Broadcasted event "${event}"`);
  }
};
