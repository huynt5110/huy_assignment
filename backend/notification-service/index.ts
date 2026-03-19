import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import express from 'express';

// Configure dotenv before any other imports that might use env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

import { initSocket, broadcast, emitToRoom } from '../lib/socket';
import { createConsumer } from '../lib/kafka';
import { logger } from '../lib/logger';

import { KAFKA_TOPICS, KAFKA_EVENT_TYPES } from '../lib/constants';

import { routeEvent } from './handlers';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket shared utility
const io = initSocket(httpServer);

async function startNotificationService() {
  try {
    const consumer = await createConsumer('notification-service-group');

    // Subscribe to topics using constants
    await consumer.subscribe({
      topics: [KAFKA_TOPICS.LEAD_EVENTS, KAFKA_TOPICS.ACTIVITY_EVENTS],
      fromBeginning: false
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const payload = message.value?.toString();
        if (!payload) return;

        try {
          const eventData = JSON.parse(payload);
          const { type, data } = eventData;
          const correlationId = message.headers?.correlationId?.toString();

          logger.info(`Processing Kafka message`, { topic, type, correlationId });

          // Delegate to specialized handlers
          await routeEvent(topic, type, data);
        } catch (error) {
          logger.error('Error processing Kafka message', { topic, error });
        }
      },
    });

    const PORT = process.env.NOTIFICATION_PORT || 3003;
    httpServer.listen(PORT, () => {
      logger.info(`Notification Service (WebSockets) listening on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start notification service', { error });
    process.exit(1);
  }
}

startNotificationService();
