import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const systems = await prisma.directorySystem.findMany({
    where: { archived: false },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(systems);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.directorySystem.findUnique({ where: { name: body.name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "System already exists" }, { status: 409 });
  }

  const system = await prisma.directorySystem.create({
    data: {
      name: body.name.trim(),
      details: body.details ?? null,
    },
  });

  return NextResponse.json(system, { status: 201 });
}
