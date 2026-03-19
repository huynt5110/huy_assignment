import { Request, Response } from 'express';
import { activityService } from '../services/activity.service';
import { ActivityListResponse } from '../schemas/activity.schema';
import { asyncHandler } from '../../middleware/utils';
import { KAFKA_TOPICS, KAFKA_EVENT_TYPES } from '../../lib/constants';
import { logger } from '../../lib/logger';

export const activityController = {
  listActivities: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id: leadId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor as string | undefined;

    const { activities, nextCursor } = await activityService.getActivitiesByLeadId(leadId, limit, cursor);

    const response: ActivityListResponse = {
      data: activities,
      nextCursor,
    };

    res.json(response);
  }),

  createActivity: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id: leadId } = req.params;
    const activity = await activityService.logActivity(leadId, req.body);

    // Publish to Kafka
    const producer = req.app.get('kafkaProducer');
    if (producer) {
      try {
        await producer.send({
          topic: KAFKA_TOPICS.ACTIVITY_EVENTS,
          messages: [
            {
              value: JSON.stringify({
                type: KAFKA_EVENT_TYPES.ACTIVITY_CREATED,
                data: activity,
              }),
            },
          ],
        });
        logger.info(`Published ${KAFKA_EVENT_TYPES.ACTIVITY_CREATED} event to Kafka`, { activityId: activity.id, event: KAFKA_EVENT_TYPES.ACTIVITY_CREATED });
      } catch (error) {
        logger.error('Failed to publish event to Kafka', { error });
      }
    }

    res.status(201).json(activity);
  }),
};
