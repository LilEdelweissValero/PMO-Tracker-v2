import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");

  const where: Record<string, unknown> = { archived: false };
  if (group) where.group = group;

  const entries = await prisma.directoryPersonnel.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const group = typeof body.group === "string" ? body.group.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";

  if (!group || !name || !department) {
    return NextResponse.json({ error: "group, name, and department are required" }, { status: 400 });
  }

  const existing = await prisma.directoryPersonnel.findFirst({
    where: { group, name, archived: false },
  });
  if (existing) {
    return NextResponse.json({ error: "This name already exists in the group" }, { status: 409 });
  }

  const entry = await prisma.directoryPersonnel.create({
    data: {
      group,
      name,
      department,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
