import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err as Response;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch models from OpenRouter" }, { status: 502 });
    }

    const json = (await res.json()) as { data: OpenRouterModel[] };
    const models = (json.data ?? []).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      contextLength: m.context_length,
    }));

    return NextResponse.json({ data: models });
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
