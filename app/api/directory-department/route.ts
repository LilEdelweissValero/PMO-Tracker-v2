import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const departments = await prisma.directoryDepartment.findMany({
    where: { archived: false },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.directoryDepartment.findUnique({ where: { name: body.name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Department already exists" }, { status: 409 });
  }

  const department = await prisma.directoryDepartment.create({
    data: {
      name: body.name.trim(),
      details: body.details ?? null,
    },
  });

  return NextResponse.json(department, { status: 201 });
}
