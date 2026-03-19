import { Request, Response } from 'express';
import { activityService } from '../services/activity.service';
import { ActivityListResponse } from '../schemas/activity.schema';
import { asyncHandler } from '../../middleware/utils';

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

    res.status(201).json(activity);
  }),
};
