import { prisma } from '../database/prisma';
import { CreateActivityInput } from '../schemas/activity.schema';
import { encodeCursor, decodeCursor } from '../../lib/crypto';
import { CACHE_KEYS } from '../../lib/constants';
import { deleteCache } from '../../lib/cache';

export const activityService = {
  async getActivitiesByLeadId(leadId: string, limit: number, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;

    const activities = await prisma.activity.findMany({
      where: { leadId },
      take: limit + 1,
      skip: decodedCursor ? 1 : 0,
      cursor: decodedCursor ? { id: decodedCursor } : undefined,
      orderBy: { performedAt: 'desc' },
    });

    let nextCursor = null;

    if (activities.length > limit) {
      const nextItem = activities[limit - 1];
      nextCursor = encodeCursor(nextItem.id);
      activities.pop();
    }

    return { activities, nextCursor };
  },

  async logActivity(leadId: string, data: CreateActivityInput) {
    const activity = await prisma.activity.create({
      data: {
        ...data,
        leadId,
      },
    });

    // Invalidate caches
    await deleteCache(CACHE_KEYS.ACTIVITY_LIST(leadId));
    await deleteCache(CACHE_KEYS.LEAD_ITEM(leadId));

    return activity;
  },
};
