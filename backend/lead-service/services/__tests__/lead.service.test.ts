import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../../database/prisma';
import { leadService } from '../lead.service';
import { PrismaClient } from '@prisma/client/lead';

// Mock the prisma client
jest.mock('../../database/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Mock the cache utility to prevent open Redis handles
jest.mock('../../../lib/cache', () => ({
  deleteCachePattern: jest.fn().mockResolvedValue(undefined),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
  deleteCache: jest.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as any;

describe('leadService', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('getLeadById', () => {
    it('should return a lead if it exists', async () => {
      const mockLead = {
        id: '1',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        source: 'website',
        status: 'new',
        notes: 'test note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaMock.lead.findUnique as any).mockResolvedValue(mockLead);

      const result = await leadService.getLeadById('1');

      expect(result).toEqual(mockLead);
      expect(prismaMock.lead.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null if the lead does not exist', async () => {
      (prismaMock.lead.findUnique as any).mockResolvedValue(null);

      const result = await leadService.getLeadById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createLead', () => {
    it('should create a new lead', async () => {
      const input = {
        fullName: 'Alice Brown',
        email: 'alice@example.com',
        source: 'website',
      };

      const mockLead = {
        id: '1',
        ...input,
        phone: null,
        source: 'website',
        status: 'new',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaMock.lead.create as any).mockResolvedValue(mockLead);

      const result = await leadService.createLead(input);

      expect(result).toEqual(mockLead);
      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: input,
      });
    });
  });

  describe('getAllLeads', () => {
    it('should return a list of leads without a cursor', async () => {
      const mockLeads = [
        { id: '1', fullName: 'Lead 1', email: 'l1@ex.com', createdAt: new Date() },
        { id: '2', fullName: 'Lead 2', email: 'l2@ex.com', createdAt: new Date() },
      ] as any;

      prismaMock.lead.findMany.mockResolvedValue(mockLeads);

      const result = await leadService.getAllLeads(10);

      expect(result.leads).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 11,
        orderBy: { createdAt: 'desc' },
      }));
    });

    it('should return nextCursor if more leads exist', async () => {
      const mockLeads = [
        { id: '1', fullName: 'Lead 1', email: 'l1@ex.com', createdAt: new Date() },
        { id: '2', fullName: 'Lead 2', email: 'l2@ex.com', createdAt: new Date() },
      ] as any;

      // Request limit 1, but findMany returns 2
      prismaMock.lead.findMany.mockResolvedValue(mockLeads);

      const result = await leadService.getAllLeads(1);

      expect(result.leads).toHaveLength(1);
      expect(result.nextCursor).not.toBeNull();
      expect(result.leads[0].id).toBe('1');
    });
  });
});
