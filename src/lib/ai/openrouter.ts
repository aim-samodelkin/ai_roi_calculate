export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AudioContentPart {
  type: "input_audio";
  input_audio: {
    data: string;
    format: string;
  };
}

interface TextContentPart {
  type: "text";
  text: string;
}

interface OpenRouterMultimodalMessage {
  role: "user";
  content: (TextContentPart | AudioContentPart)[];
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 120000;

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find first { or [ and last } or ]
  const startObj = text.indexOf("{");
  const startArr = text.indexOf("[");
  let start = -1;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);
  if (start === -1) return text.trim();
  const endObj = text.lastIndexOf("}");
  const endArr = text.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (end === -1) return text.trim();
  return text.slice(start, end + 1);
}

export async function callOpenRouter<T = unknown>(
  model: string,
  messages: OpenRouterMessage[],
  expectJson = true
): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const body = {
    model,
    messages,
    ...(expectJson ? { response_format: { type: "json_object" } } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    // Fresh controller + timeout per attempt so the timer isn't cleared prematurely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-roi-calculator.app",
          "X-Title": "AI ROI Calculator",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.status === 429) {
        // Rate limited — wait and retry once
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw new Error("OpenRouter rate limit exceeded");
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content ?? "";

      if (!expectJson) return content as T;

      const jsonStr = extractJson(content);
      return JSON.parse(jsonStr) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0 && lastError.message.includes("rate limit")) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error("OpenRouter call failed");
}

export async function callOpenRouterWithAudio(
  model: string,
  systemPrompt: string,
  textPrompt: string,
  audioBase64: string,
  audioFormat: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const messages: (OpenRouterMultimodalMessage | { role: "system"; content: string })[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: textPrompt },
        {
          type: "input_audio",
          input_audio: { data: audioBase64, format: audioFormat },
        },
      ],
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-roi-calculator.app",
        "X-Title": "AI ROI Calculator",
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as OpenRouterResponse;
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}
