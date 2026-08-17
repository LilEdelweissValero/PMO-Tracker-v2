import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function defaultWorkStreamName(system: string, moduleName: string | null): string {
  return moduleName ? `${system} - ${moduleName}` : system;
}

async function main() {
  console.log("Backfilling work streams for existing projects...");

  const templateStages = await prisma.configValue.findMany({
    where: { category: "flow_template", archived: false },
    orderBy: { sortOrder: "asc" },
  });

  if (templateStages.length === 0) {
    console.warn("No flow_template config values found; skipping stage creation.");
  }

  const projects = await prisma.project.findMany({
    where: { archived: false },
    include: {
      projectSystems: {
        include: { systemModuleEntry: true },
      },
      workStreams: {
        where: { archived: false },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  let created = 0;
  let reused = 0;
  let kept = 0;

  for (const project of projects) {
    const systems = project.projectSystems
      .map((ps) => ps.systemModuleEntry)
      .filter((s) => !s.archived);

    let desiredNames: string[];
    if (systems.length > 0) {
      desiredNames = systems.map((s) => defaultWorkStreamName(s.system, s.module));
    } else {
      const base = project.systemName?.trim() || project.name;
      const moduleName = project.specificModule?.trim() || null;
      desiredNames = [moduleName ? `${base} - ${moduleName}` : base];
    }

    const existingStreams = project.workStreams.filter(
      (ws) => !desiredNames.includes(ws.name ?? "")
    );
    const matched = new Set<number>();

    for (const name of desiredNames) {
      let workStream = project.workStreams.find((ws) => ws.name === name);
      if (workStream) {
        matched.add(workStream.id);
        kept++;
      } else {
        const reuse = existingStreams.find((ws) => !matched.has(ws.id));
        if (reuse) {
          workStream = await prisma.workStream.update({
            where: { id: reuse.id },
            data: { name },
          });
          matched.add(reuse.id);
          reused++;
        } else {
          workStream = await prisma.workStream.create({
            data: {
              projectId: project.id,
              name,
              currentBall: "PMO",
              flowStages: {
                create: templateStages.map((stage, i) => ({
                  name: stage.value,
                  orderIdx: i,
                })),
              },
            },
          });
          created++;
        }
      }

      const hasProgress = await prisma.changeLog.count({
        where: { workStreamId: workStream.id, entryType: "progress" },
      });
      if (hasProgress === 0) {
        await prisma.changeLog.createMany({
          data: [
            {
              workStreamId: workStream.id,
              projectId: project.id,
              entryType: "progress",
              fieldName: "status",
              newValue: "Not Started",
              note: "Not Started",
              changedBy: "System",
            },
            {
              workStreamId: workStream.id,
              projectId: project.id,
              entryType: "bump",
              fieldName: "status",
              newValue: "PMO",
              note: "Not Started",
              changedBy: "System",
            },
          ],
        });
        console.log(`  [${project.name}] initial logs added for "${workStream.name}"`);
      }
    }
  }

  console.log(`Backfill complete. Created: ${created}, Reused (renamed): ${reused}, Kept: ${kept}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
