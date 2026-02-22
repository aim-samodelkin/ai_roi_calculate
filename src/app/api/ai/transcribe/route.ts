import { NextRequest, NextResponse } from "next/server";
import { callOpenRouterWithAudio } from "@/lib/ai/openrouter";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const DEFAULT_TRANSCRIPTION_MODEL = "google/gemini-2.0-flash-001";

const SYSTEM_PROMPT = `Ты — ассистент для обработки голосового ввода. Прослушай аудио и создай чистый, структурированный текст на основе того, что говорит пользователь.

Правила обработки:
- Убери слова-паразиты: э, ну, как бы, то есть, вот, значит, типа, короче, ну вот, так сказать
- Убери повторы, оговорки и самоисправления — сохрани только финальный вариант мысли
- Исправь грамматику и построение предложений, сохраняя стиль речи
- Организуй текст в связные предложения и логические абзацы
- Сохрани ВСЕ смысловое содержание: факты, цифры, названия, процессы, намерения
- Результат должен читаться так, будто человек его аккуратно и вдумчиво написал, а не надиктовал
- Не добавляй ничего от себя — только обработка того, что было сказано
- Не используй markdown-разметку (никаких **, ##, - и т.п.) — только чистый текст
- Верни только обработанный текст, без вводных фраз и комментариев`;

const USER_PROMPT =
  "Обработай следующую голосовую запись и верни чистый структурированный текст:";

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI не настроен (отсутствует OPENROUTER_API_KEY)" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  const format = (formData.get("format") as string | null) ?? "webm";

  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: "Аудиофайл не передан" }, { status: 400 });
  }

  if (audioFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Файл слишком большой (максимум 10 МБ)" },
      { status: 413 }
    );
  }

  if (audioFile.size === 0) {
    return NextResponse.json({ error: "Пустая запись" }, { status: 400 });
  }

  let audioBase64: string;
  try {
    const buffer = await audioFile.arrayBuffer();
    audioBase64 = Buffer.from(buffer).toString("base64");
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать аудиофайл" }, { status: 500 });
  }

  const model =
    process.env.AI_TRANSCRIPTION_MODEL ?? DEFAULT_TRANSCRIPTION_MODEL;

  try {
    const text = await callOpenRouterWithAudio(
      model,
      SYSTEM_PROMPT,
      USER_PROMPT,
      audioBase64,
      format
    );

    const cleaned = text.trim();

    if (!cleaned) {
      return NextResponse.json(
        { error: "Не удалось распознать речь. Попробуйте ещё раз." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: cleaned });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    console.error("[AI transcribe] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
