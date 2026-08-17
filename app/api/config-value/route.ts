import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where: Record<string, unknown> = { archived: false };
  if (category) where.category = category;

  const values = await prisma.configValue.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(values);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.category || !body.value) {
    return NextResponse.json({ error: "category and value are required" }, { status: 400 });
  }

  const existing = await prisma.configValue.findFirst({
    where: { category: body.category, value: body.value },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const configValue = await prisma.configValue.create({
    data: {
      category: body.category,
      value: body.value,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json(configValue, { status: 201 });
}
