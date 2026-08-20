import { PrismaClient } from "../lib/generated/prisma/client";
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

  const flowTemplateStatuses = [
    "Not Yet Started",
    "Planning",
    "Planning",
    "Planning",
    "Planning",
    "Planning",
    "Partial Progress",
    "Partial Progress",
    "Partial Progress",
    "Partial Progress",
    "Partial Progress",
    "Mostly Done",
    "Mostly Done",
    "Mostly Done",
    "Complete",
  ];

  for (let i = 0; i < flowTemplateStages.length; i++) {
    await prisma.configValue.upsert({
      where: { id: i + 1 },
      update: { status: flowTemplateStatuses[i] },
      create: {
        category: "flow_template",
        value: flowTemplateStages[i],
        status: flowTemplateStatuses[i],
        sortOrder: i,
      },
    });
  }
  console.log(`Seeded ${flowTemplateStages.length} flow template stages`);

  const projectStatuses = [
    "Not Yet Started",
    "Planning",
    "Partial Progress",
    "Mostly Done",
    "Complete",
  ];
  for (let i = 0; i < projectStatuses.length; i++) {
    const existing = await prisma.configValue.findFirst({
      where: { category: "project_status", value: projectStatuses[i] },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "project_status", value: projectStatuses[i], sortOrder: i },
      });
    }
  }
  console.log("Seeded project status values");

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

  const ballGroups = [
    { value: "Project Management Office", acronym: "PMO" },
    { value: "Developers", acronym: "DEV" },
    { value: "Business Unit", acronym: "BU" },
  ];
  for (let i = 0; i < ballGroups.length; i++) {
    const { value, acronym } = ballGroups[i];
    const existing = await prisma.configValue.findFirst({
      where: { category: "ball_groups", value },
    });
    if (!existing) {
      await prisma.configValue.create({
        data: { category: "ball_groups", value, acronym, sortOrder: i },
      });
    }
  }
  console.log("Seeded ball_groups values");

  const newComboCategories = [
    { category: "requested_by_name", label: "Requested By Name", values: [] as string[] },
    { category: "requested_by_dept", label: "Requested By Dept", values: [] as string[] },
    { category: "pm_officer", label: "PM Officer", values: ["Lil Valero", "Zelene Tolentino"] },
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
