import { Request, Response } from 'express';
import { leadController } from '../../lead-service/controllers/lead.controller';
import { leadService } from '../../lead-service/services/lead.service';
import { activityController } from '../../activity-service/controllers/activity.controller';
import { activityService } from '../../activity-service/services/activity.service';
import * as kafkaUtils from '../../lib/kafka';
import * as socketUtils from '../../lib/socket';
import { KAFKA_TOPICS, KAFKA_EVENT_TYPES } from '../../lib/constants';
import { routeEvent } from '../../notification-service/handlers';

// Mock the services explicitly to avoid auto-mocking issues with object exports
jest.mock('../../lead-service/services/lead.service', () => ({
  leadService: {
    createLead: jest.fn(),
    getAllLeads: jest.fn(),
    getLeadById: jest.fn(),
  }
}));

jest.mock('../../activity-service/services/activity.service', () => ({
  activityService: {
    logActivity: jest.fn(),
    getActivitiesByLeadId: jest.fn(),
  }
}));

jest.mock('../../lib/socket', () => ({
  broadcast: jest.fn(),
  emitToRoom: jest.fn(),
  initSocket: jest.fn(),
  getIO: jest.fn(),
}));

jest.mock('../../lib/kafka', () => ({
  getProducer: jest.fn(),
  createConsumer: jest.fn(),
  disconnectKafka: jest.fn(),
}));

describe('Event Broadcasting Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockProducer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Producer
    mockProducer = {
      send: jest.fn().mockResolvedValue([{ topicName: 'test', partition: 0, errorCode: 0 }]),
    };
    
    mockReq = {
      params: {},
      body: {},
      app: {
        get: jest.fn().mockReturnValue(mockProducer),
      } as any,
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('Lead Service -> Kafka', () => {
    it('should publish LEAD_CREATED event to Kafka when a lead is created', async () => {
      const mockLead = { id: 'lead-123', fullName: 'John Doe', email: 'john@example.com' };
      (leadService.createLead as jest.Mock).mockResolvedValue(mockLead);
      
      mockReq.body = { fullName: 'John Doe', email: 'john@example.com' };
      
      await leadController.createLead(mockReq as Request, mockRes as Response, () => {});

      expect(mockProducer.send).toHaveBeenCalledWith(expect.objectContaining({
        topic: KAFKA_TOPICS.LEAD_EVENTS,
        messages: [
          expect.objectContaining({
            value: expect.stringContaining(KAFKA_EVENT_TYPES.LEAD_CREATED),
          }),
        ],
      }));
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockLead);
    });
  });

  describe('Activity Service -> Kafka', () => {
    it('should publish ACTIVITY_CREATED event to Kafka when an activity is logged', async () => {
      const mockActivity = { id: 'act-456', leadId: 'lead-123', type: 'phone_call', description: 'Test call' };
      (activityService.logActivity as jest.Mock).mockResolvedValue(mockActivity);
      
      mockReq.params = { id: 'lead-123' };
      mockReq.body = { type: 'phone_call', description: 'Test call' };
      
      await activityController.createActivity(mockReq as Request, mockRes as Response, () => {});

      expect(mockProducer.send).toHaveBeenCalledWith(expect.objectContaining({
        topic: KAFKA_TOPICS.ACTIVITY_EVENTS,
        messages: [
          expect.objectContaining({
            value: expect.stringContaining(KAFKA_EVENT_TYPES.ACTIVITY_CREATED),
          }),
        ],
      }));
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Notification Service -> Socket.io', () => {
    it('should broadcast LEAD_CREATED via WebSocket when receiving Kafka event', async () => {
      const spyBroadcast = jest.spyOn(socketUtils, 'broadcast');
      const data = { id: 'lead-123', fullName: 'New Lead' };
      
      await routeEvent(KAFKA_TOPICS.LEAD_EVENTS, KAFKA_EVENT_TYPES.LEAD_CREATED, data);

      expect(spyBroadcast).toHaveBeenCalledWith(KAFKA_EVENT_TYPES.LEAD_CREATED, data);
    });

    it('should emit to room and broadcast ACTIVITY_CREATED via WebSocket', async () => {
      const spyEmitToRoom = jest.spyOn(socketUtils, 'emitToRoom');
      const spyBroadcast = jest.spyOn(socketUtils, 'broadcast');
      const data = { id: 'act-456', leadId: 'lead-123', type: 'note', description: 'Some note' };
      
      await routeEvent(KAFKA_TOPICS.ACTIVITY_EVENTS, KAFKA_EVENT_TYPES.ACTIVITY_CREATED, data);

      expect(spyEmitToRoom).toHaveBeenCalledWith('lead:lead-123', KAFKA_EVENT_TYPES.ACTIVITY_CREATED, data);
      expect(spyBroadcast).toHaveBeenCalledWith(KAFKA_EVENT_TYPES.ACTIVITY_CREATED, data);
    });
  });
});
