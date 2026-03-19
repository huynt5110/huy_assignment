import request from 'supertest';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const DEFAULT_USER_ID = '2b9afa13-384d-46a9-ae4f-a28d504062b1';


describe('Sales Lead Management System E2E', () => {
  let createdLeadId: string;

  it('should be able to create a new lead (Lead Ingestion)', async () => {
    const newLead = {
      fullName: 'John Integration',
      email: `john.int.${Date.now()}@example.com`,
      phone: '123456789',
      notes: 'Initial integration test lead',
    };

    const response = await request(GATEWAY_URL)
      .post('/api/leads')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send(newLead);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.fullName).toBe(newLead.fullName);

    createdLeadId = response.body.id;
  });

  it('should display the lead in the Lead Inbox', async () => {
    const response = await request(GATEWAY_URL)
      .get('/api/leads')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);

    // Check if our created lead is in the list
    const found = response.body.data.find((l: any) => l.id === createdLeadId);
    expect(found).toBeDefined();
  });

  it('should show lead details and activity log (Lead Details View)', async () => {
    const response = await request(GATEWAY_URL)
      .get(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdLeadId);
    expect(response.body.fullName).toBe('John Integration');

    // Check activities list (should be empty initially or just started)
    const activitiesResponse = await request(GATEWAY_URL)
      .get(`/api/leads/${createdLeadId}/activities`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(activitiesResponse.status).toBe(200);
    expect(activitiesResponse.body.data).toBeInstanceOf(Array);
  });

  it('should be able to log a new follow-up activity (Activity Logging)', async () => {
    const activityData = {
      type: 'phone_call',
      description: 'Called customer for initial follow-up',
      performedBy: DEFAULT_USER_ID
    };

    const response = await request(GATEWAY_URL)
      .post(`/api/leads/${createdLeadId}/activities`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send(activityData);

    expect(response.status).toBe(201);
    expect(response.body.description).toBe(activityData.description);
    expect(response.body.leadId).toBe(createdLeadId);

    // Verify activity appears in the chronological log
    const logResponse = await request(GATEWAY_URL)
      .get(`/api/leads/${createdLeadId}/activities`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(logResponse.status).toBe(200);
    expect(logResponse.body.data).toBeInstanceOf(Array);
    expect(logResponse.body.data.length).toBeGreaterThanOrEqual(1);
    expect(logResponse.body.data[0].description).toBe(activityData.description);
  });

  it('should return 401 with an invalid token', async () => {
    const response = await request(GATEWAY_URL)
      .get('/api/leads')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });

  it('should return 401 without authentication', async () => {
    const response = await request(GATEWAY_URL).get('/api/leads');
    expect(response.status).toBe(401);
  });

  describe('Lead Management Edge Cases', () => {
    it('should return 404 for a non-existent lead ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(GATEWAY_URL)
        .get(`/api/leads/${nonExistentId}`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 when creating a lead with an invalid email', async () => {
      const invalidLead = {
        fullName: 'Invalid User',
        email: 'not-an-email',
      };

      const response = await request(GATEWAY_URL)
        .post('/api/leads')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidLead);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ "details": [{ "message": "Invalid email address", "path": "email" }], "error": "Validation failed" });
    });

    it('should correctly handle pagination for leads', async () => {
      // Create a few leads to ensure we have enough for pagination
      const leadsToCreate = [
        { fullName: 'Lead Pagination 1', email: `p1.${Date.now()}@test.com` },
        { fullName: 'Lead Pagination 2', email: `p2.${Date.now()}@test.com` },
        { fullName: 'Lead Pagination 3', email: `p3.${Date.now()}@test.com` },
      ];

      for (const l of leadsToCreate) {
        await request(GATEWAY_URL)
          .post('/api/leads')
          .set('Authorization', `Bearer ${AUTH_TOKEN}`)
          .send(l);
      }

      // Fetch with limit 2
      const response = await request(GATEWAY_URL)
        .get('/api/leads?limit=2')
        .set('Authorization', `Bearer ${AUTH_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.nextCursor).not.toBeNull();

      // Fetch next page
      const nextResponse = await request(GATEWAY_URL)
        .get(`/api/leads?limit=2&cursor=${response.body.nextCursor}`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`);

      expect(nextResponse.status).toBe(200);
      expect(nextResponse.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Activity Management Edge Cases', () => {
    it('should return 400 for activity with missing description', async () => {
      const invalidActivity = {
        type: 'email',
        performedBy: DEFAULT_USER_ID
        // description is missing
      };

      const response = await request(GATEWAY_URL)
        .post(`/api/leads/${createdLeadId}/activities`)
        .set('Authorization', `Bearer ${AUTH_TOKEN}`)
        .send(invalidActivity);

      expect(response.status).toBe(400);
    });
  });
});
