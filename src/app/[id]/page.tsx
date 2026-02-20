import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CalculatorClient } from "@/components/calculator-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function CalculationPage({ params }: PageProps) {
  const { id } = await params;

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

  return <CalculatorClient initialData={JSON.parse(JSON.stringify(calculation))} />;
}
