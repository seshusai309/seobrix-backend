import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

// Seeds only the platform Super Admin. Agencies, workspaces, clients and
// projects are created at runtime via the signup / invite / API flows.
async function main() {
  console.log('\n🌱  Seeding SEO Brix...\n');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@seobrix.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      name: 'Super Admin',
      passwordHash: await hash(superAdminPassword),
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Super Admin: ${superAdmin.email}`);
  console.log('\n🎉  Seed complete.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
