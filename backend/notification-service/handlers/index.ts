import { KAFKA_TOPICS } from '../../lib/constants';
import { handleLeadEvent } from './lead.handler';
import { handleActivityEvent } from './activity.handler';
import { logger } from '../../lib/logger';

export const routeEvent = async (topic: string, type: string, data: any) => {
  switch (topic) {
    case KAFKA_TOPICS.LEAD_EVENTS:
      await handleLeadEvent(type, data);
      break;
    case KAFKA_TOPICS.ACTIVITY_EVENTS:
      await handleActivityEvent(type, data);
      break;
    default:
      logger.warn(`No handler for topic: ${topic}`);
  }
};
