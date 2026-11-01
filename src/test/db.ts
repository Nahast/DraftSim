import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");

export const testDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

export async function resetDb() {
  await testDb.$executeRawUnsafe(
    'TRUNCATE "DraftPick","Draft","PlayerRanking","Player","SourceSync" RESTART IDENTITY CASCADE',
  );
}
