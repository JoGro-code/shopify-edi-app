import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding minimal data...");
  // nothing mandatory; tables fill on first run.
}

main().finally(()=>prisma.$disconnect());
