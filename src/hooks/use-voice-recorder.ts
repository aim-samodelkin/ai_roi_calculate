"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type RecorderStatus = "idle" | "recording" | "transcribing";

interface UseVoiceRecorderReturn {
  isSupported: boolean;
  status: RecorderStatus;
  elapsedSeconds: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

const MAX_DURATION_SECONDS = 120;

function getBestMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function mimeToFormat(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function useVoiceRecorder(
  onTranscribed: (text: string) => void
): UseVoiceRecorderReturn {
  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const sendForTranscription = useCallback(
    async (blob: Blob, mimeType: string) => {
      setStatus("transcribing");
      setError(null);

      try {
        const format = mimeToFormat(mimeType);
        const formData = new FormData();
        formData.append("audio", blob, `recording.${format}`);
        formData.append("format", format);

        const res = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as { text?: string; error?: string };

        if (!res.ok || data.error) {
          setError(data.error ?? "Ошибка при обработке записи");
        } else if (data.text) {
          onTranscribed(data.text);
        }
      } catch {
        setError("Сетевая ошибка при отправке записи");
      } finally {
        setStatus("idle");
      }
    },
    [onTranscribed]
  );

  const startRecording = useCallback(async () => {
    if (!isSupported || status !== "idle") return;

    setError(null);
    setElapsedSeconds(0);
    cancelledRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      releaseStream();
      clearTimers();

      if (cancelledRef.current) {
        setStatus("idle");
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
      sendForTranscription(blob, mimeType || "audio/webm");
    };

    recorder.start(250);
    setStatus("recording");

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    autoStopRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_DURATION_SECONDS * 1000);
  }, [isSupported, status, releaseStream, clearTimers, sendForTranscription]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    clearTimers();
  }, [clearTimers]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    clearTimers();
    releaseStream();
    setStatus("idle");
    setElapsedSeconds(0);
    setError(null);
  }, [clearTimers, releaseStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearTimers();
      releaseStream();
    };
  }, [clearTimers, releaseStream]);

  return {
    isSupported,
    status,
    elapsedSeconds,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
