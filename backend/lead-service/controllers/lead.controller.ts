import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
import { LeadListResponse } from '../schemas/lead.schema';
import { getCache, setCache } from '../../lib/cache';
import { logger } from '../../lib/logger';
import { asyncHandler } from '../../middleware/utils';
import { KAFKA_TOPICS, KAFKA_EVENT_TYPES } from '../../lib/constants';

export const leadController = {
  listLeads: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor as string | undefined;

    const { leads, nextCursor } = await leadService.getAllLeads(limit, cursor);

    const response: LeadListResponse = {
      data: leads,
      nextCursor,
    };

    res.json(response);
  }),

  getLead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cacheKey = `leads:item:${id}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      logger.info(`Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    const lead = await leadService.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await setCache(cacheKey, JSON.stringify(lead), 120); // 120s TTL
    res.json(lead);
  }),

  createLead: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.createLead(req.body);

    // Publish to Kafka
    const producer = req.app.get('kafkaProducer');
    if (producer) {
      try {
        await producer.send({
          topic: KAFKA_TOPICS.LEAD_EVENTS,
          messages: [
            {
              value: JSON.stringify({
                type: KAFKA_EVENT_TYPES.LEAD_CREATED,
                data: lead,
              }),
            },
          ],
        });
        logger.info(`Published ${KAFKA_EVENT_TYPES.LEAD_CREATED} event to Kafka`);
      } catch (error) {
        logger.error('Failed to publish event to Kafka', { error });
      }
    }

    res.status(201).json(lead);
  }),
};
