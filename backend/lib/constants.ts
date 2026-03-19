export const KAFKA_TOPICS = {
  LEAD_EVENTS: 'lead-events',
  ACTIVITY_EVENTS: 'activity-events',
} as const;

export const KAFKA_EVENT_TYPES = {
  LEAD_CREATED: 'lead.created',
  ACTIVITY_CREATED: 'activity.created',
} as const;

export const CACHE_KEYS = {
  LEADS_LIST: 'leads:list',
  LEAD_ITEM: (id: string) => `leads:item:${id}`,
  ACTIVITY_LIST: (leadId: string) => `activities:${leadId}`,
} as const;
