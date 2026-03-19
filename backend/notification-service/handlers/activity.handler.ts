import { KAFKA_EVENT_TYPES } from '../../lib/constants';
import { broadcast, emitToRoom } from '../../lib/socket';
import { logger } from '../../lib/logger';

export const handleActivityEvent = async (type: string, data: any) => {
  switch (type) {
    case KAFKA_EVENT_TYPES.ACTIVITY_CREATED:
      // Emit to a specific room for that lead's activity log
      if (data.leadId) {
        emitToRoom(`lead:${data.leadId}`, KAFKA_EVENT_TYPES.ACTIVITY_CREATED, data);
      }
      // Also broadcast globally
      broadcast(KAFKA_EVENT_TYPES.ACTIVITY_CREATED, data);
      logger.info(`Broadcasted ${data.id} ${type} via WebSocket`);
      break;
    default:
      logger.warn(`Unhandled activity event type: ${type}`);
  }
};
