"use client";

import { useEffect, useState } from "react";
import { Template } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  calculationId: string;
  defaultName: string;
  onClose: () => void;
}

type Mode = "new" | "replace";

export function SaveAsTemplateDialog({ calculationId, defaultName, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("new");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [existingTemplates, setExistingTemplates] = useState<Template[]>([]);
  const [replaceId, setReplaceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/templates?all=1")
      .then((r) => r.json())
      .then((j) => setExistingTemplates(j.data ?? []))
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      setError("Введите название шаблона");
      return;
    }
    if (mode === "replace" && !replaceId) {
      setError("Выберите шаблон для замены");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/templates/from-calculation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculationId,
          name: name.trim(),
          description: description.trim(),
          industry: industry.trim(),
          replaceTemplateId: mode === "replace" ? replaceId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Ошибка при сохранении");
        return;
      }

      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const selectedTemplate = existingTemplates.find((t) => t.id === replaceId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Сохранить как шаблон</DialogTitle>
          <DialogDescription>
            Текущий расчёт будет сохранён в библиотеку шаблонов со всеми данными
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-green-600 font-medium">
            Шаблон успешно сохранён!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <RadioGroup
              value={mode}
              onValueChange={(v: string) => setMode(v as Mode)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="new" id="mode-new" />
                <Label htmlFor="mode-new" className="cursor-pointer">Создать новый</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="replace" id="mode-replace" disabled={existingTemplates.length === 0} />
                <Label
                  htmlFor="mode-replace"
                  className={existingTemplates.length === 0 ? "cursor-not-allowed text-gray-400" : "cursor-pointer"}
                >
                  Заменить существующий
                </Label>
              </div>
            </RadioGroup>

            {mode === "replace" && (
              <div className="space-y-2">
                <Label>Шаблон для замены</Label>
                <Select value={replaceId} onValueChange={setReplaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите шаблон..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-amber-600">
                    Шаблон «{selectedTemplate.name}» будет удалён и заменён новым
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tmpl-name">Название *</Label>
              <Input
                id="tmpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название шаблона"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tmpl-desc">Описание</Label>
              <Textarea
                id="tmpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание процесса..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tmpl-industry">Отрасль / категория</Label>
              <Input
                id="tmpl-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Например: HR, Финансы, Производство..."
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить шаблон"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
