import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deptId = parseInt(id);
  if (isNaN(deptId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const dept = await prisma.directoryDepartment.findUnique({ where: { id: deptId } });
  if (!dept) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(dept);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deptId = parseInt(id);
  if (isNaN(deptId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const dept = await prisma.directoryDepartment.update({
    where: { id: deptId },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      details: body.details !== undefined ? body.details : undefined,
    },
  });

  return NextResponse.json(dept);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deptId = parseInt(id);
  if (isNaN(deptId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await prisma.directoryDepartment.update({
    where: { id: deptId },
    data: { archived: true },
  });

  return NextResponse.json({ success: true });
}
