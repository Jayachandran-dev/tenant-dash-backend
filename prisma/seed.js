require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking and seeding default data...");

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("Data already exists. Skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create User 1
  const user1 = await prisma.user.create({
    data: {
      mobile: "+919876543210",
      passwordHash: hashedPassword,
    },
  });

  // Create User 2
  const user2 = await prisma.user.create({
    data: {
      mobile: "+919876543211",
      passwordHash: hashedPassword,
    },
  });

  // Create Tenant 1 - Acme
  const acme = await prisma.tenant.create({
    data: {
      name: "Acme Corporation",
      slug: "acme",
    },
  });

  // Create Tenant 2 - Globex
  const globex = await prisma.tenant.create({
    data: {
      name: "Globex Corporation",
      slug: "globex",
    },
  });

  // Memberships
  await prisma.membership.create({
    data: {
      userId: user1.id,
      tenantId: acme.id,
      role: "owner",
    },
  });

  await prisma.membership.create({
    data: {
      userId: user2.id,
      tenantId: globex.id,
      role: "owner",
    },
  });

  // Sample items
  await prisma.item.createMany({
    data: [
      { title: "Acme Project Alpha", tenantId: acme.id },
      { title: "Acme Project Beta", tenantId: acme.id },
      { title: "Globex Initiative 1", tenantId: globex.id },
      { title: "Globex Initiative 2", tenantId: globex.id },
    ],
  });

  console.log("Seed completed successfully!");
  console.log("--------------------------------");
  console.log("Test accounts:");
  console.log("1. Mobile: +919876543210  | Password: password123  (Acme)");
  console.log("2. Mobile: +919876543211  | Password: password123  (Globex)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });