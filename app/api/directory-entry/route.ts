import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.systemModuleEntry.findMany({
    where: { archived: false },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.system || typeof body.system !== "string" || !body.system.trim()) {
    return NextResponse.json({ error: "System is required" }, { status: 400 });
  }

  const system = body.system.trim();
  const moduleName = typeof body.module === "string" ? body.module.trim() || null : null;

  const existing = await prisma.systemModuleEntry.findFirst({
    where: { system, module: moduleName, archived: false },
  });
  if (existing) {
    return NextResponse.json({ error: "This system and module combination already exists" }, { status: 409 });
  }

  const entry = await prisma.systemModuleEntry.create({
    data: {
      system,
      acronym: typeof body.acronym === "string" ? body.acronym.trim() || null : null,
      color: typeof body.color === "string" ? body.color.trim() || null : null,
      link: typeof body.link === "string" ? body.link.trim() || null : null,
      module: moduleName,
      developerAssigned: typeof body.developerAssigned === "string" ? body.developerAssigned.trim() || null : null,
      systemOwnerName: typeof body.systemOwnerName === "string" ? body.systemOwnerName.trim() || null : null,
      systemOwnerDept: typeof body.systemOwnerDept === "string" ? body.systemOwnerDept.trim() || null : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
