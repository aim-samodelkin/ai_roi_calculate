import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_PROMPTS } from "@/lib/ai/prompts";
import type { TabType, PromptType } from "@/lib/ai/prompts";

const DEFAULT_GEN_MODEL = "google/gemini-2.5-flash";
const DEFAULT_VER_MODEL = "google/gemini-2.0-flash-001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err as Response;
  }

  const [config, dbPrompts] = await Promise.all([
    prisma.aiConfig.findUnique({ where: { id: "singleton" } }),
    prisma.aiPrompt.findMany(),
  ]);

  const generationModel = config?.generationModel ?? process.env.AI_GENERATION_MODEL ?? DEFAULT_GEN_MODEL;
  const verificationModel = config?.verificationModel ?? process.env.AI_VERIFICATION_MODEL ?? DEFAULT_VER_MODEL;

  // Build prompts map: DB values override defaults
  const promptsMap: Record<string, Record<string, string>> = {};
  for (const [tabType, types] of Object.entries(DEFAULT_PROMPTS)) {
    promptsMap[tabType] = {};
    for (const promptType of Object.keys(types)) {
      promptsMap[tabType][promptType] =
        DEFAULT_PROMPTS[tabType as TabType][promptType as PromptType];
    }
  }
  for (const p of dbPrompts) {
    if (!promptsMap[p.tabType]) promptsMap[p.tabType] = {};
    promptsMap[p.tabType][p.promptType] = p.systemPrompt;
  }

  return NextResponse.json({
    data: { generationModel, verificationModel, prompts: promptsMap },
  });
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err as Response;
  }

  let body: { generationModel?: string; verificationModel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { generationModel, verificationModel } = body;
  if (!generationModel && !verificationModel) {
    return NextResponse.json({ error: "generationModel or verificationModel required" }, { status: 400 });
  }

  const current = await prisma.aiConfig.findUnique({ where: { id: "singleton" } });
  const updated = await prisma.aiConfig.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      generationModel: generationModel ?? DEFAULT_GEN_MODEL,
      verificationModel: verificationModel ?? DEFAULT_VER_MODEL,
    },
    update: {
      ...(generationModel ? { generationModel } : {}),
      ...(verificationModel ? { verificationModel } : {}),
    },
  });

  void current;
  return NextResponse.json({ data: updated });
}
