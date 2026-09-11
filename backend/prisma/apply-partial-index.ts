import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating partial unique index unique_active_assignment_per_donation...');
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_active_assignment_per_donation
    ON assignments (donation_id)
    WHERE status IN ('PENDING', 'ACCEPTED');
  `;
  console.log('Partial unique index created successfully!');

  const indexCheck: any[] = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'assignments' AND indexname = 'unique_active_assignment_per_donation';
  `;
  console.log('Verification result:', JSON.stringify(indexCheck, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
