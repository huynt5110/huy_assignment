import { z } from 'zod';

export const createActivitySchema = z.object({
  type: z.enum(['phone_call', 'email', 'meeting', 'note']),
  description: z.string().min(1).max(1000),
  performedBy: z.string().uuid()
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export interface ActivityResponse {
  id: string;
  leadId: string;
  type: string;
  description: string;
}

export interface ActivityListResponse {
  data: ActivityResponse[];
  nextCursor: string | null;
}
