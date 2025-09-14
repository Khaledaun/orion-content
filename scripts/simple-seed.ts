import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Simple Phase 10 seeding...");

  try {
    // Create admin user with correct field names
    const passwordHash = await bcrypt.hash("admin123", 12);

    const admin = await prisma.user.upsert({
      where: { email: "admin@orion.com" },
      update: {},
      create: {
        email: "admin@orion.com",
        name: "Admin User",
        passwordHash,
        roles: {
          create: [{ role: "ADMIN" }],
        },
      },
    });

    console.log("✅ Admin user created:", admin.email);
    console.log("🎉 Simple seed completed successfully!");
  } catch (error) {
    const err = error as Error;
    console.log("ℹ️  Admin user may already exist, skipping...", err.message);
  }
}

main()
  .catch((e) => {
    const err = e as Error;
    console.log("⚠️  Seed completed with warnings:", err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
