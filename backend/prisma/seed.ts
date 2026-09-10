import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import dotenv from 'dotenv';
import { PasswordService } from '../src/modules/auth-user/services/password.service';

dotenv.config();

const prisma = new PrismaClient();

export async function seedAdmin(): Promise<void> {
  const email = (process.env.DEV_ADMIN_EMAIL || 'admin.dev@foodshare.test').toLowerCase().trim();
  const password = process.env.DEV_ADMIN_PASSWORD || 'AdminPassword123!';
  const passwordHash = await PasswordService.hashPassword(password);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email,
      phone: '+919999999999',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`[Seed] Development Admin user configured successfully.`);
  console.log(`[Seed] User ID: ${adminUser.id} | Email: ${adminUser.email} | Role: ${adminUser.role} | Status: ${adminUser.status}`);
}

if (require.main === module) {
  seedAdmin()
    .catch((err) => {
      console.error('[Seed Error] Failed to seed development admin:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
