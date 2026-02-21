"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Calculation } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProcessTable } from "@/components/process/process-table";
import { ErrorTable } from "@/components/errors/error-table";
import { RolloutForm } from "@/components/costs/rollout-form";
import { CapexTable } from "@/components/costs/capex-table";
import { OpexTable } from "@/components/costs/opex-table";
import { ResultsPanel } from "@/components/charts/results-panel";
import { SaveAsTemplateDialog } from "@/components/templates/save-as-template-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, label: "Процесс AS-IS" },
  { id: 1, label: "Процесс TO-BE" },
  { id: 2, label: "Ошибки AS-IS" },
  { id: 3, label: "Ошибки TO-BE" },
  { id: 4, label: "Раскатка" },
  { id: 5, label: "CAPEX" },
  { id: 6, label: "OPEX" },
  { id: 7, label: "Результаты" },
];

interface Props {
  initialData: Calculation;
}

export function CalculatorClient({ initialData }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<Calculation>(initialData);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (toSave: Calculation) => {
    setSaving(true);
    try {
      await fetch(`/api/calculations/${toSave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: toSave.name,
          processSteps: toSave.processSteps,
          errorItems: toSave.errorItems,
          capexItems: toSave.capexItems,
          opexItems: toSave.opexItems,
          rolloutConfig: toSave.rolloutConfig,
        }),
      });
      setSaved(true);
    } catch {
      // silently fail; user can retry
    } finally {
      setSaving(false);
    }
  }, []);

  const update = useCallback(
    (patch: Partial<Calculation>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        setSaved(false);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => save(next), 500);
        return next;
      });
    },
    [save]
  );

  // For anonymous users: save ID to localStorage so they can find calculations later
  useEffect(() => {
    if (user) return; // logged-in users have calculations tied to their account
    try {
      const raw = localStorage.getItem("roi-calculations");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(data.id)) {
        localStorage.setItem("roi-calculations", JSON.stringify([data.id, ...ids]));
      }
    } catch {}
  }, [data.id, user]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Input
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            className="text-lg font-semibold border-0 shadow-none px-0 focus-visible:ring-0 max-w-md"
            placeholder="Название расчёта"
          />
          {saving ? (
            <Badge variant="secondary" className="shrink-0">Сохранение…</Badge>
          ) : saved ? (
            <Badge variant="outline" className="shrink-0 text-green-600 border-green-200">Сохранено</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Сохранить как шаблон
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={copyLink}>
            Скопировать ссылку
          </Button>
        </div>
      </div>

      {/* Step tabs */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeStep === step.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div>
        {(() => {
          const fullAiContext = {
            calculationName: data.name,
            asisSteps:  data.processSteps.filter((s) => s.type === "AS_IS"),
            tobeSteps:  data.processSteps.filter((s) => s.type === "TO_BE"),
            asisErrors: data.errorItems.filter((e) => e.type === "AS_IS"),
            tobeErrors: data.errorItems.filter((e) => e.type === "TO_BE"),
            capexItems: data.capexItems,
            opexItems:  data.opexItems,
          };

          return (
            <>
              {activeStep === 0 && (
                <ProcessTable
                  steps={data.processSteps.filter((s) => s.type === "AS_IS")}
                  type="AS_IS"
                  onChange={(steps) =>
                    update({
                      processSteps: [
                        ...data.processSteps.filter((s) => s.type === "TO_BE"),
                        ...steps,
                      ],
                    })
                  }
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 1 && (
                <ProcessTable
                  steps={data.processSteps.filter((s) => s.type === "TO_BE")}
                  type="TO_BE"
                  asisSteps={data.processSteps.filter((s) => s.type === "AS_IS")}
                  onChange={(steps) =>
                    update({
                      processSteps: [
                        ...data.processSteps.filter((s) => s.type === "AS_IS"),
                        ...steps,
                      ],
                    })
                  }
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 2 && (
                <ErrorTable
                  items={data.errorItems.filter((e) => e.type === "AS_IS")}
                  type="AS_IS"
                  onChange={(items) =>
                    update({
                      errorItems: [
                        ...data.errorItems.filter((e) => e.type === "TO_BE"),
                        ...items,
                      ],
                    })
                  }
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 3 && (
                <ErrorTable
                  items={data.errorItems.filter((e) => e.type === "TO_BE")}
                  type="TO_BE"
                  asisItems={data.errorItems.filter((e) => e.type === "AS_IS")}
                  onChange={(items) =>
                    update({
                      errorItems: [
                        ...data.errorItems.filter((e) => e.type === "AS_IS"),
                        ...items,
                      ],
                    })
                  }
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 4 && (
                <RolloutForm
                  config={
                    data.rolloutConfig ?? {
                      id: "",
                      calculationId: data.id,
                      model: "LINEAR",
                      rolloutMonths: 6,
                      targetShare: 1,
                      operationsPerMonth: 100,
                    }
                  }
                  onChange={(config) => update({ rolloutConfig: config })}
                />
              )}
              {activeStep === 5 && (
                <CapexTable
                  items={data.capexItems}
                  calculationId={data.id}
                  onChange={(items) => update({ capexItems: items })}
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 6 && (
                <OpexTable
                  items={data.opexItems}
                  calculationId={data.id}
                  onChange={(items) => update({ opexItems: items })}
                  aiContext={fullAiContext}
                />
              )}
              {activeStep === 7 && <ResultsPanel calculation={data} />}
            </>
          );
        })()}
      </div>

      {/* Step navigation */}
      {activeStep < 7 && (
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            disabled={activeStep === 0}
          >
            ← Назад
          </Button>
          <Button onClick={() => setActiveStep((s) => Math.min(7, s + 1))}>
            {activeStep === 6 ? "Результаты →" : "Далее →"}
          </Button>
        </div>
      )}

      {/* Save as template dialog (admin only) */}
      {showTemplateDialog && (
        <SaveAsTemplateDialog
          calculationId={data.id}
          defaultName={data.name}
          onClose={() => setShowTemplateDialog(false)}
        />
      )}
    </div>
  );
}
