import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err as Response;
  }

  let body: { tabType?: string; promptType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tabType, promptType } = body;

  if (tabType && promptType) {
    // Reset a single prompt
    await prisma.aiPrompt.deleteMany({
      where: { tabType, promptType },
    });
  } else if (tabType) {
    // Reset all prompts for a tab
    await prisma.aiPrompt.deleteMany({ where: { tabType } });
  } else {
    // Reset all prompts
    await prisma.aiPrompt.deleteMany({});
  }

  return NextResponse.json({ ok: true });
}
