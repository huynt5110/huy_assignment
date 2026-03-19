import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../../database/prisma';
import { activityService } from '../activity.service';
import { PrismaClient } from '@prisma/client/activity/index.js';

// Mock the prisma client
jest.mock('../../database/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Mock the cache utility to prevent open Redis handles
jest.mock('../../../lib/cache', () => ({
  deleteCache: jest.fn().mockResolvedValue(undefined),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as any;

describe('activityService', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('logActivity', () => {
    it('should create a new activity for a lead', async () => {
      const leadId = 'lead-123';
      const input = {
        type: 'phone_call' as const,
        description: 'Called lead to discuss SUV interest',
        performedBy: 'user-456',
      };

      const mockActivity = {
        id: 'activity-1',
        leadId,
        ...input,
        performedAt: new Date(),
        createdAt: new Date(),
      };

      (prismaMock.activity.create as any).mockResolvedValue(mockActivity);

      const result = await activityService.logActivity(leadId, input);

      expect(result).toEqual(mockActivity);
      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          ...input,
          leadId,
        },
      });
    });
  });

  describe('getActivitiesByLeadId', () => {
    it('should return a list of activities for a lead', async () => {
      const leadId = 'lead-123';
      const mockActivities = [
        { id: '1', leadId, type: 'email', description: 'desc 1', performedAt: new Date() },
        { id: '2', leadId, type: 'note', description: 'desc 2', performedAt: new Date() },
      ] as any;

      prismaMock.activity.findMany.mockResolvedValue(mockActivities);

      const result = await activityService.getActivitiesByLeadId(leadId, 10);

      expect(result.activities).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { leadId },
        take: 11,
        orderBy: { performedAt: 'desc' },
      }));
    });

    it('should return nextCursor if more activities exist', async () => {
      const leadId = 'lead-123';
      const mockActivities = [
        { id: '1', leadId, type: 'email', description: 'd1', performedAt: new Date() },
        { id: '2', leadId, type: 'note', description: 'd2', performedAt: new Date() },
      ] as any;

      // Limit 1, but returns 2
      prismaMock.activity.findMany.mockResolvedValue(mockActivities);

      const result = await activityService.getActivitiesByLeadId(leadId, 1);

      expect(result.activities).toHaveLength(1);
      expect(result.nextCursor).not.toBeNull();
      expect(result.activities[0].id).toBe('1');
    });
  });
});
