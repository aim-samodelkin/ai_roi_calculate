import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CalculatorClient } from "@/components/calculator-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalculationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const readOnly = sp.shared === "1";

  const calculation = await prisma.calculation.findUnique({
    where: { id },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  if (!calculation) notFound();

  return (
    <CalculatorClient
      initialData={JSON.parse(JSON.stringify(calculation))}
      readOnly={readOnly}
    />
  );
}
