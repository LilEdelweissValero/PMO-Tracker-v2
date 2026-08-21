import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const configId = parseInt(id);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const config = await prisma.configValue.findUnique({ where: { id: configId } });
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const configId = parseInt(id);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.configValue.findUnique({ where: { id: configId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await prisma.configValue.update({
    where: { id: configId },
    data: {
      value: body.value !== undefined ? body.value : undefined,
      acronym: body.acronym !== undefined ? body.acronym : undefined,
      color: body.color !== undefined ? body.color : undefined,
      status: body.status !== undefined ? body.status : undefined,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : undefined,
      archived: body.archived !== undefined ? body.archived : undefined,
    },
  });

  if (
    body.value !== undefined &&
    existing.category === "project_status" &&
    body.value !== existing.value
  ) {
    await prisma.configValue.updateMany({
      where: { category: "flow_template", status: existing.value, archived: false },
      data: { status: body.value },
    });
  }

  return NextResponse.json(config);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const configId = parseInt(id);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await prisma.configValue.update({
    where: { id: configId },
    data: { archived: true },
  });

  return NextResponse.json({ success: true });
}
