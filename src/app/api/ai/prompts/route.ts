import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err as Response;
  }

  let body: { tabType?: string; promptType?: string; systemPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tabType, promptType, systemPrompt } = body;
  if (!tabType || !promptType || systemPrompt === undefined) {
    return NextResponse.json({ error: "tabType, promptType and systemPrompt are required" }, { status: 400 });
  }

  const updated = await prisma.aiPrompt.upsert({
    where: { tabType_promptType: { tabType, promptType } },
    create: { tabType, promptType, systemPrompt },
    update: { systemPrompt },
  });

  return NextResponse.json({ data: updated });
}
