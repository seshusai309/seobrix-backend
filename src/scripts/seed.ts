import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('\n🌱  Seeding SEO Brix...\n');

  // ─── 1. Super Admin ────────────────────────────────────────────────────────
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
  console.log(`✅ Super Admin: ${superAdmin.email} / ${superAdminPassword}`);

  // ─── 2. Demo Agency ────────────────────────────────────────────────────────
  const agency = await prisma.agency.upsert({
    where: { id: 'demo-agency-northshore' },
    update: {},
    create: {
      id: 'demo-agency-northshore',
      name: 'Northshore Digital',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Agency: ${agency.name}`);

  // ─── 3. Agency Admin ───────────────────────────────────────────────────────
  const adminEmail = 'admin@northshore.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Agency Admin',
      passwordHash: await hash('demo123'),
      role: Role.AGENCY_ADMIN,
      agencyId: agency.id,
      isActive: true,
    },
  });
  console.log(`✅ Agency Admin: ${adminUser.email} / demo123`);

  // ─── 4. SEO Manager ────────────────────────────────────────────────────────
  const managerEmail = 'manager@northshore.com';
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {},
    create: {
      email: managerEmail,
      name: 'SEO Manager',
      passwordHash: await hash('demo123'),
      role: Role.SEO_MANAGER,
      agencyId: agency.id,
      isActive: true,
    },
  });
  console.log(`✅ SEO Manager: ${manager.email} / demo123`);

  // ─── 5. SEO Expert (Tech Reviewer) ────────────────────────────────────────
  const expertEmail = 'expert@northshore.com';
  const expert = await prisma.user.upsert({
    where: { email: expertEmail },
    update: {},
    create: {
      email: expertEmail,
      name: 'SEO Expert',
      passwordHash: await hash('demo123'),
      role: Role.SEO_EXPERT,
      agencyId: agency.id,
      isActive: true,
    },
  });
  console.log(`✅ SEO Expert: ${expert.email} / demo123`);

  // ─── 6. Demo Client ────────────────────────────────────────────────────────
  const client = await prisma.client.upsert({
    where: { id: 'demo-client-smilecare' },
    update: {},
    create: {
      id: 'demo-client-smilecare',
      name: 'Smile Care Dental',
      websiteUrl: 'https://smilecare.example.com',
      industry: 'Healthcare / Dental',
      agencyId: agency.id,
      isActive: true,
    },
  });
  console.log(`✅ Client: ${client.name}`);

  // ─── 7. Assign Manager to Client ──────────────────────────────────────────
  await prisma.clientAssignment.upsert({
    where: { clientId_userId: { clientId: client.id, userId: manager.id } },
    update: {},
    create: { clientId: client.id, userId: manager.id },
  });
  console.log(`✅ Manager assigned to ${client.name}`);

  // ─── 8. Client Portal User ────────────────────────────────────────────────
  const clientUserEmail = 'client@smilecare.com';
  const clientUser = await prisma.user.upsert({
    where: { email: clientUserEmail },
    update: {},
    create: {
      email: clientUserEmail,
      name: 'Smile Care Portal User',
      passwordHash: await hash('demo123'),
      role: Role.CLIENT,
      agencyId: agency.id,
      clientId: client.id,
      isActive: true,
    },
  });
  console.log(`✅ Client Portal: ${clientUser.email} / demo123`);

  // ─── 9. Demo Blog (draft) ─────────────────────────────────────────────────
  const blog = await prisma.blog.upsert({
    where: { id: 'demo-blog-001' },
    update: {},
    create: {
      id: 'demo-blog-001',
      title: 'Dental Implant Cost in Hyderabad — 2026 Guide',
      slug: 'dental-implant-cost-hyderabad-2026',
      content: '<p>Getting dental implants in Hyderabad is one of the smartest long-term investments you can make in your oral health. In this guide, we break down exactly what implants cost and what drives the price up or down.</p>',
      metaTitle: 'Dental Implant Cost in Hyderabad (2026 Guide)',
      metaDescription: 'Discover what dental implants really cost in Hyderabad in 2026, what affects the price, and how to choose the right clinic.',
      status: 'DRAFT',
      clientId: client.id,
      authorId: manager.id,
    },
  });
  console.log(`✅ Demo blog: "${blog.title}" (DRAFT)`);

  console.log('\n─────────────────────────────────────────');
  console.log('🎉  Seed complete! Login credentials:\n');
  console.log(`  Super Admin  →  ${superAdminEmail}  /  ${superAdminPassword}`);
  console.log(`  Agency Admin →  ${adminUser.email}  /  demo123`);
  console.log(`  SEO Manager  →  ${manager.email}  /  demo123`);
  console.log(`  SEO Expert   →  ${expert.email}  /  demo123`);
  console.log(`  Client User  →  ${clientUser.email}  /  demo123`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
