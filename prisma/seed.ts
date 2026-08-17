import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const flowTemplateStages = [
    "Engagement Meeting",
    "TICRO #1 Requested",
    "TICRO #1 Approved",
    "TICRO #2 Requested",
    "TICRO #2 Approved",
    "Signed All Req Docs",
    "WBS Onboarded in Jira",
    "Dev Start",
    "Dev End",
    "UAT Start",
    "UAT End",
    "UAT Signed off",
    "Deployed",
    "All Required Documents Submitted",
    "Project Closed",
  ];

  for (let i = 0; i < flowTemplateStages.length; i++) {
    await prisma.configValue.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        category: "flow_template",
        value: flowTemplateStages[i],
        sortOrder: i,
      },
    });
  }
  console.log(`Seeded ${flowTemplateStages.length} flow template stages`);

  const priorities = ["Critical", "High", "Medium", "Low"];
  for (let i = 0; i < priorities.length; i++) {
    const existing = await prisma.configValue.findFirst({
      where: { category: "priority", value: priorities[i] },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "priority", value: priorities[i], sortOrder: i },
      });
    }
  }
  console.log("Seeded priority values");

  const requestTypes = ["Enhancement", "New System", "New Module"];
  for (let i = 0; i < requestTypes.length; i++) {
    const existing = await prisma.configValue.findFirst({
      where: { category: "request_type", value: requestTypes[i] },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "request_type", value: requestTypes[i], sortOrder: i },
      });
    }
  }
  console.log("Seeded request type values");

  const initiatedByOptions = ["System Owner", "PMO", "Developer", "Higher Authority"];
  for (let i = 0; i < initiatedByOptions.length; i++) {
    const existing = await prisma.configValue.findFirst({
      where: { category: "initiated_by", value: initiatedByOptions[i] },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "initiated_by", value: initiatedByOptions[i], sortOrder: i },
      });
    }
  }
  console.log("Seeded initiated_by values");

  const ballGroups = ["PMO", "Developers", "System Owner"];
  for (let i = 0; i < ballGroups.length; i++) {
    const existing = await prisma.configValue.findFirst({
      where: { category: "ball_groups", value: ballGroups[i] },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "ball_groups", value: ballGroups[i], sortOrder: i },
      });
    }
  }
  console.log("Seeded ball_groups values");

  const newComboCategories = [
    { category: "requested_by_name", label: "Requested By Name", values: [] as string[] },
    { category: "requested_by_dept", label: "Requested By Dept", values: [] as string[] },
    { category: "pm_officer", label: "PM Officer", values: [] as string[] },
  ];

  for (const combo of newComboCategories) {
    for (let i = 0; i < combo.values.length; i++) {
      const existing = await prisma.configValue.findFirst({
        where: { category: combo.category, value: combo.values[i] },
      });
      if (!existing) {
        await prisma.configValue.create({
          data: { category: combo.category, value: combo.values[i], sortOrder: i },
        });
      }
    }
    console.log(`Seeded ${combo.label} values`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
