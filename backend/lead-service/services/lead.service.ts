import { prisma } from '../database/prisma';
import { CreateLeadInput } from '../schemas/lead.schema';
import { encodeCursor, decodeCursor } from '../../lib/crypto';
import { CACHE_KEYS } from '../../lib/constants';
import { deleteCachePattern } from '../../lib/cache';

export const leadService = {
  async getAllLeads(limit: number, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;

    const leads = await prisma.lead.findMany({
      take: limit + 1,
      skip: decodedCursor ? 1 : 0,
      cursor: decodedCursor ? { id: decodedCursor } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    let nextCursor = null;

    if (leads.length > limit) {
      const nextItem = leads[limit - 1];

      nextCursor = encodeCursor(nextItem.id);

      leads.pop(); // remove extra item
    }

    return { leads, nextCursor };
  },

  async getLeadById(id: string) {
    return await prisma.lead.findUnique({
      where: { id },
    });
  },

  async createLead(data: CreateLeadInput) {
    const lead = await prisma.lead.create({
      data,
    });

    // Invalidate list cache
    await deleteCachePattern(CACHE_KEYS.LEADS_LIST + '*');

    return lead;
  },
};
