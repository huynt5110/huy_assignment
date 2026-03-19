import { PrismaClient as LeadClient } from '@prisma/client/lead/index.js';
import { PrismaClient as ActivityClient } from '@prisma/client/activity';

const leadPrisma = new LeadClient();
const activityPrisma = new ActivityClient();

async function main() {
  console.log('--- Starting Seeding ---');

  // 1. Seed Activities DB (Users) first as they are needed for activities
  console.log('Seeding Activity Database (Users)...');
  const user1 = await activityPrisma.user.upsert({
    where: { email: 'jane.smith@dealership.com' },
    update: {},
    create: {
      fullName: 'Jane Smith',
      email: 'jane.smith@dealership.com',
      role: 'salesperson',
    },
  });

  const user2 = await activityPrisma.user.upsert({
    where: { email: 'mike.jones@dealership.com' },
    update: {},
    create: {
      fullName: 'Mike Jones',
      email: 'mike.jones@dealership.com',
      role: 'salesperson',
    },
  });

  // 2. Seed Leads DB
  console.log('Seeding Lead Database (Leads)...');
  const lead1 = await leadPrisma.lead.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-1234',
      source: 'website',
      status: 'new',
      notes: 'Interested in the new SUV models.',
    },
  });

  const lead2 = await leadPrisma.lead.upsert({
    where: { email: 'alice.b@example.com' },
    update: {},
    create: {
      fullName: 'Alice Brown',
      email: 'alice.b@example.com',
      phone: '+1-555-5678',
      source: 'referral',
      status: 'contacted',
      notes: 'Referral from previous customer.',
    },
  });

  // 3. Seed Activities (linking to Leads and Users)
  console.log('Seeding Activity Database (Activities)...');
  const activities = [
    {
      leadId: lead1.id,
      type: 'phone_call',
      description: 'First introductory call — no answer.',
      performedBy: user1.id,
    },
    {
      leadId: lead2.id,
      type: 'email',
      description: 'Sent follow-up email about referral bonus.',
      performedBy: user2.id,
    },
  ];

  for (const activityData of activities) {
    const existing = await activityPrisma.activity.findFirst({
      where: {
        leadId: activityData.leadId,
        type: activityData.type,
        description: activityData.description,
      },
    });

    if (!existing) {
      await activityPrisma.activity.create({ data: activityData });
    }
  }

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await leadPrisma.$disconnect();
    await activityPrisma.$disconnect();
  });
