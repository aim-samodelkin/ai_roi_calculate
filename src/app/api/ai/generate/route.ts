import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai/openrouter";
import {
  buildGenerationMessages,
  buildVerificationMessages,
  type TabType,
  type GenerateContext,
} from "@/lib/ai/prompts";
import { prisma } from "@/lib/db";
import type { ProcessStep, ErrorItem, CapexItem, OpexItem } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  tabType: TabType;
  userPrompt: string;
  context: GenerateContext;
}

type GeneratedProcessResult = { steps: Omit<ProcessStep, "id" | "calculationId" | "type" | "order" | "timeUnit">[]; reasoning: string };
type GeneratedErrorResult = { items: Omit<ErrorItem, "id" | "calculationId" | "type" | "order">[]; reasoning: string };
type GeneratedCapexResult = { items: Omit<CapexItem, "id" | "calculationId" | "order">[]; reasoning: string };
type GeneratedOpexResult = { items: Omit<OpexItem, "id" | "calculationId" | "order">[]; reasoning: string };

const DEFAULT_GEN_MODEL = "google/gemini-2.5-flash";
const DEFAULT_VER_MODEL = "google/gemini-2.0-flash-001";

async function getModelsAndPrompts(tabType: TabType) {
  const [config, genPrompt, verPrompt] = await Promise.all([
    prisma.aiConfig.findUnique({ where: { id: "singleton" } }),
    prisma.aiPrompt.findUnique({ where: { tabType_promptType: { tabType, promptType: "generation" } } }),
    prisma.aiPrompt.findUnique({ where: { tabType_promptType: { tabType, promptType: "verification" } } }),
  ]);

  return {
    generation: config?.generationModel ?? process.env.AI_GENERATION_MODEL ?? DEFAULT_GEN_MODEL,
    verification: config?.verificationModel ?? process.env.AI_VERIFICATION_MODEL ?? DEFAULT_VER_MODEL,
    genPrompt: genPrompt?.systemPrompt ?? undefined,
    verPrompt: verPrompt?.systemPrompt ?? undefined,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured (missing OPENROUTER_API_KEY)" },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tabType, userPrompt, context } = body;

  if (!tabType || !userPrompt?.trim()) {
    return NextResponse.json({ error: "tabType and userPrompt are required" }, { status: 400 });
  }

  const { generation: genModel, verification: verModel, genPrompt, verPrompt } =
    await getModelsAndPrompts(tabType);

  try {
    // ── Step 1: Generation ────────────────────────────────────────────────
    const genMessages = buildGenerationMessages(tabType, userPrompt, context, genPrompt);
    const generated = await callOpenRouter<Record<string, unknown>>(genModel, genMessages, true);
    const generatedJson = JSON.stringify(generated);

    // ── Step 2: Verification ──────────────────────────────────────────────
    const verMessages = buildVerificationMessages(tabType, generatedJson, context, verPrompt);
    const verified = await callOpenRouter<Record<string, unknown>>(verModel, verMessages, true);

    // ── Map to typed output ───────────────────────────────────────────────

    if (tabType === "process_asis" || tabType === "process_tobe") {
      const result = verified as GeneratedProcessResult;
      const rawSteps = Array.isArray(result.steps) ? result.steps : [];
      const items: Omit<ProcessStep, "id" | "calculationId">[] = rawSteps.map((s, i) => ({
        type: tabType === "process_asis" ? "AS_IS" : "TO_BE",
        order: i,
        name: String(s.name ?? ""),
        employee: String(s.employee ?? ""),
        hourlyRate: Number(s.hourlyRate ?? 0),
        timeHours: Number(s.timeHours ?? 0),
        timeUnit: "hours" as const,
        calendarDays: Number(s.calendarDays ?? 0),
        executionShare: Math.min(1, Math.max(0, Number(s.executionShare ?? 1))),
        extraCost: Number(s.extraCost ?? 0),
      }));
      return NextResponse.json({ items, reasoning: result.reasoning ?? "" });
    }

    if (tabType === "errors_asis" || tabType === "errors_tobe") {
      const result = verified as GeneratedErrorResult;
      const rawItems = Array.isArray(result.items) ? result.items : [];
      const items: Omit<ErrorItem, "id" | "calculationId">[] = rawItems.map((e, i) => ({
        type: tabType === "errors_asis" ? "AS_IS" : "TO_BE",
        order: i,
        name: String(e.name ?? ""),
        processStep: String(e.processStep ?? ""),
        frequency: Math.min(1, Math.max(0, Number(e.frequency ?? 0))),
        fixCost: Math.max(0, Number(e.fixCost ?? 0)),
        fixTimeHours: Math.max(0, Number(e.fixTimeHours ?? 0)),
      }));
      return NextResponse.json({ items, reasoning: result.reasoning ?? "" });
    }

    if (tabType === "capex") {
      const result = verified as GeneratedCapexResult;
      const rawItems = Array.isArray(result.items) ? result.items : [];
      const items: Omit<CapexItem, "id" | "calculationId">[] = rawItems.map((c, i) => ({
        order: i,
        name: String(c.name ?? ""),
        amount: Math.max(0, Number(c.amount ?? 0)),
        comment: String(c.comment ?? ""),
      }));
      return NextResponse.json({ items, reasoning: result.reasoning ?? "" });
    }

    if (tabType === "opex") {
      const result = verified as GeneratedOpexResult;
      const rawItems = Array.isArray(result.items) ? result.items : [];
      const items: Omit<OpexItem, "id" | "calculationId">[] = rawItems.map((o, i) => ({
        order: i,
        name: String(o.name ?? ""),
        monthlyAmount: Math.max(0, Number(o.monthlyAmount ?? 0)),
        comment: String(o.comment ?? ""),
      }));
      return NextResponse.json({ items, reasoning: result.reasoning ?? "" });
    }

    return NextResponse.json({ error: "Unknown tabType" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI generate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
