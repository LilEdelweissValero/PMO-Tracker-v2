import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Backfilling initial status in change logs...");

  const templateStages = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });

  const initialStatus = templateStages[0]?.status ?? "Not Yet Started";

  const result = await prisma.changeLog.updateMany({
    where: {
      OR: [
        { newValue: "Not Started" },
        { note: "Not Started" },
      ],
    },
    data: {
      newValue: initialStatus,
      note: initialStatus,
    },
  });

  console.log(`Backfill complete. Updated ${result.count} change log entries to "${initialStatus}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
