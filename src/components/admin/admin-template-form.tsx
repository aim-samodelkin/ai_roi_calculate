"use client";

import { useState } from "react";
import { Template, TemplateProcessStep, TemplateErrorItem, TemplateCapexItem, TemplateOpexItem, RolloutModel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  token: string;
  template?: Template;
  onSaved: (template: Template) => void;
  onCancel: () => void;
}

type FormStep = Omit<TemplateProcessStep, "id" | "templateId"> & { id: string };
type FormError = Omit<TemplateErrorItem, "id" | "templateId"> & { id: string };
type FormCapex = Omit<TemplateCapexItem, "id" | "templateId"> & { id: string };
type FormOpex = Omit<TemplateOpexItem, "id" | "templateId"> & { id: string };

const emptyStep = (type: "AS_IS" | "TO_BE", order: number): FormStep => ({
  id: crypto.randomUUID(),
  type,
  order,
  name: "",
  employee: "",
  calendarDays: undefined,
  executionShare: undefined,
});

const emptyError = (type: "AS_IS" | "TO_BE", order: number): FormError => ({
  id: crypto.randomUUID(),
  type,
  order,
  name: "",
  processStep: "",
  frequency: undefined,
});

const emptyCapex = (order: number): FormCapex => ({
  id: crypto.randomUUID(),
  order,
  name: "",
  comment: "",
});

const emptyOpex = (order: number): FormOpex => ({
  id: crypto.randomUUID(),
  order,
  name: "",
  comment: "",
});

export function AdminTemplateForm({ token, template, onSaved, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [industry, setIndustry] = useState(template?.industry ?? "");
  const [rolloutModel, setRolloutModel] = useState<RolloutModel>(
    (template?.rolloutConfig?.model as RolloutModel) ?? "LINEAR"
  );

  const [asisSteps, setAsisSteps] = useState<FormStep[]>(
    (template?.processSteps.filter((s) => s.type === "AS_IS") as FormStep[]) ?? []
  );
  const [tobeSteps, setTobeSteps] = useState<FormStep[]>(
    (template?.processSteps.filter((s) => s.type === "TO_BE") as FormStep[]) ?? []
  );
  const [asisErrors, setAsisErrors] = useState<FormError[]>(
    (template?.errorItems.filter((e) => e.type === "AS_IS") as FormError[]) ?? []
  );
  const [tobeErrors, setTobeErrors] = useState<FormError[]>(
    (template?.errorItems.filter((e) => e.type === "TO_BE") as FormError[]) ?? []
  );
  const [capexItems, setCapexItems] = useState<FormCapex[]>(
    (template?.capexItems as FormCapex[]) ?? []
  );
  const [opexItems, setOpexItems] = useState<FormOpex[]>(
    (template?.opexItems as FormOpex[]) ?? []
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert("Укажите название шаблона");
    setSaving(true);

    const body = {
      name,
      description,
      industry,
      processSteps: [
        ...asisSteps.map((s, i) => ({ ...s, type: "AS_IS", order: i })),
        ...tobeSteps.map((s, i) => ({ ...s, type: "TO_BE", order: i })),
      ],
      errorItems: [
        ...asisErrors.map((e, i) => ({ ...e, type: "AS_IS", order: i })),
        ...tobeErrors.map((e, i) => ({ ...e, type: "TO_BE", order: i })),
      ],
      capexItems: capexItems.map((c, i) => ({ ...c, order: i })),
      opexItems: opexItems.map((o, i) => ({ ...o, order: i })),
      rolloutConfig: { model: rolloutModel },
    };

    const url = template
      ? `/api/admin/templates/${template.id}?token=${token}`
      : `/api/admin/templates?token=${token}`;
    const method = template ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) onSaved(json.data);
      else alert(json.error ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {template ? "Редактирование шаблона" : "Новый шаблон"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label>Название шаблона *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр.: Обработка входящих заявок" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Отрасль / категория</Label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Напр.: Финансы" />
        </div>
        <div className="flex flex-col gap-2 md:col-span-3">
          <Label>Описание</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание шаблона" />
        </div>
      </div>

      {/* Rollout model */}
      <div>
        <Label className="mb-2 block">Модель раскатки по умолчанию</Label>
        <div className="flex gap-3">
          {(["LINEAR", "S_CURVE", "INSTANT"] as RolloutModel[]).map((m) => (
            <button
              key={m}
              onClick={() => setRolloutModel(m)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                rolloutModel === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
              }`}
            >
              {m === "LINEAR" ? "Линейная" : m === "S_CURVE" ? "S-кривая" : "Моментальная"}
            </button>
          ))}
        </div>
      </div>

      {/* Process steps */}
      <SimpleStepEditor label="Этапы AS-IS" steps={asisSteps} type="AS_IS" onChangeSteps={setAsisSteps} emptyStepFn={emptyStep} />
      <SimpleStepEditor label="Этапы TO-BE" steps={tobeSteps} type="TO_BE" onChangeSteps={setTobeSteps} emptyStepFn={emptyStep} />

      {/* Error items */}
      <SimpleErrorEditor label="Ошибки AS-IS" errors={asisErrors} type="AS_IS" onChange={setAsisErrors} />
      <SimpleErrorEditor label="Ошибки TO-BE" errors={tobeErrors} type="TO_BE" onChange={setTobeErrors} />

      {/* CAPEX */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-semibold">Статьи CAPEX (без сумм)</Label>
        {capexItems.map((c, idx) => (
          <div key={c.id} className="flex gap-2">
            <Input value={c.name} onChange={(e) => setCapexItems(capexItems.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Статья затрат" />
            <Input value={c.comment ?? ""} onChange={(e) => setCapexItems(capexItems.map((x, i) => i === idx ? { ...x, comment: e.target.value } : x))} placeholder="Комментарий" />
            <button onClick={() => setCapexItems(capexItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 px-2">×</button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => setCapexItems([...capexItems, emptyCapex(capexItems.length)])}>+ Добавить</Button>
      </div>

      {/* OPEX */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-semibold">Статьи OPEX (без сумм)</Label>
        {opexItems.map((o, idx) => (
          <div key={o.id} className="flex gap-2">
            <Input value={o.name} onChange={(e) => setOpexItems(opexItems.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Статья затрат" />
            <Input value={o.comment ?? ""} onChange={(e) => setOpexItems(opexItems.map((x, i) => i === idx ? { ...x, comment: e.target.value } : x))} placeholder="Комментарий" />
            <button onClick={() => setOpexItems(opexItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 px-2">×</button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => setOpexItems([...opexItems, emptyOpex(opexItems.length)])}>+ Добавить</Button>
      </div>
    </div>
  );
}

function SimpleStepEditor({
  label,
  steps,
  type,
  onChangeSteps,
  emptyStepFn,
}: {
  label: string;
  steps: FormStep[];
  type: "AS_IS" | "TO_BE";
  onChangeSteps: (s: FormStep[]) => void;
  emptyStepFn: (type: "AS_IS" | "TO_BE", order: number) => FormStep;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-semibold">{label}</Label>
      {steps.map((s, idx) => (
        <div key={s.id} className="flex gap-2 items-center">
          <Input
            value={s.name}
            onChange={(e) => onChangeSteps(steps.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
            placeholder="Название этапа"
          />
          <Input
            value={s.employee}
            onChange={(e) => onChangeSteps(steps.map((x, i) => i === idx ? { ...x, employee: e.target.value } : x))}
            placeholder="Сотрудник"
            className="max-w-40"
          />
          <button
            onClick={() => onChangeSteps(steps.filter((_, i) => i !== idx))}
            className="text-red-400 hover:text-red-600 px-2"
          >
            ×
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChangeSteps([...steps, emptyStepFn(type, steps.length)])}
      >
        + Добавить этап
      </Button>
    </div>
  );
}

function SimpleErrorEditor({
  label,
  errors,
  type,
  onChange,
}: {
  label: string;
  errors: FormError[];
  type: "AS_IS" | "TO_BE";
  onChange: (e: FormError[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-semibold">{label}</Label>
      {errors.map((e, idx) => (
        <div key={e.id} className="flex gap-2 items-center">
          <Input
            value={e.name}
            onChange={(ev) => onChange(errors.map((x, i) => i === idx ? { ...x, name: ev.target.value } : x))}
            placeholder="Тип ошибки"
          />
          <Input
            value={e.processStep}
            onChange={(ev) => onChange(errors.map((x, i) => i === idx ? { ...x, processStep: ev.target.value } : x))}
            placeholder="Этап процесса"
            className="max-w-48"
          />
          <button
            onClick={() => onChange(errors.filter((_, i) => i !== idx))}
            className="text-red-400 hover:text-red-600 px-2"
          >
            ×
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...errors, emptyError(type, errors.length)])}
      >
        + Добавить ошибку
      </Button>
    </div>
  );
}
