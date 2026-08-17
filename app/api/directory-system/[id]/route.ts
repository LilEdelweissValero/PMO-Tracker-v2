import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const systemId = parseInt(id);
  if (isNaN(systemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const system = await prisma.directorySystem.findUnique({ where: { id: systemId } });
  if (!system) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(system);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const systemId = parseInt(id);
  if (isNaN(systemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const system = await prisma.directorySystem.update({
    where: { id: systemId },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      details: body.details !== undefined ? body.details : undefined,
    },
  });

  return NextResponse.json(system);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const systemId = parseInt(id);
  if (isNaN(systemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await prisma.directorySystem.update({
    where: { id: systemId },
    data: { archived: true },
  });

  return NextResponse.json({ success: true });
}
