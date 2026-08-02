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
  console.log("Checking and seeding default tenants...");

  const existingTenants = await prisma.tenant.count();

  if (existingTenants > 0) {
    console.log("Tenants already exist. Skipping seed.");
    return;
  }

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

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Users
  await prisma.user.create({
    data: {
      email: "admin@acme.com",
      passwordHash: hashedPassword,
      tenantId: acme.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@globex.com",
      passwordHash: hashedPassword,
      tenantId: globex.id,
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

  console.log("Default tenants and users created successfully!");
  console.log("Login credentials:");
  console.log("  Acme   → admin@acme.com / password123");
  console.log("  Globex → admin@globex.com / password123");
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