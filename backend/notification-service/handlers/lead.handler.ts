import { KAFKA_EVENT_TYPES } from '../../lib/constants';
import { broadcast } from '../../lib/socket';
import { logger } from '../../lib/logger';

export const handleLeadEvent = async (type: string, data: any) => {
  switch (type) {
    case KAFKA_EVENT_TYPES.LEAD_CREATED:
      broadcast(KAFKA_EVENT_TYPES.LEAD_CREATED, data);
      logger.info(`Broadcasted ${data.id} ${type} via WebSocket`);
      break;
    default:
      logger.warn(`Unhandled lead event type: ${type}`);
  }
};
