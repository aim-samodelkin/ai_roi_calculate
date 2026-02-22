import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_GEN_MODEL = "google/gemini-2.5-flash";
const DEFAULT_VER_MODEL = "google/gemini-2.0-flash-001";

export const dynamic = "force-dynamic";

/**
 * Public endpoint: returns the AI models used for generation (no auth required).
 * Used to display model info in the AI generation dialog.
 */
export async function GET() {
  const config = await prisma.aiConfig.findUnique({ where: { id: "singleton" } });

  const generationModel =
    config?.generationModel ??
    process.env.AI_GENERATION_MODEL ??
    DEFAULT_GEN_MODEL;
  const verificationModel =
    config?.verificationModel ??
    process.env.AI_VERIFICATION_MODEL ??
    DEFAULT_VER_MODEL;

  return NextResponse.json({
    generationModel,
    verificationModel,
  });
}
