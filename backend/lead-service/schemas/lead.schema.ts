import { z } from 'zod';

export const createLeadSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  source: z.string().optional().default('website'),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export interface LeadResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  source?: string;
  notes?: string | null;
  status: string;
}

export interface LeadListResponse {
  data: LeadResponse[];
  nextCursor: string | null;
}
