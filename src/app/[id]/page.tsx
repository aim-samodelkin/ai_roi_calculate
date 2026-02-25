import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CalculatorClient } from "@/components/calculator-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalculationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const [user, calculation] = await Promise.all([
    getCurrentUser(),
    prisma.calculation.findUnique({
      where: { id },
      include: {
        processSteps: { orderBy: { order: "asc" } },
        errorItems: { orderBy: { order: "asc" } },
        capexItems: { orderBy: { order: "asc" } },
        opexItems: { orderBy: { order: "asc" } },
        rolloutConfig: true,
      },
    }),
  ]);

  if (!calculation) notFound();

  // Owner: for registered calculations — same user; for anonymous (userId === null) — everyone (variant A)
  const isOwner =
    calculation.userId === null ? true : user !== null && calculation.userId === user.id;
  const readOnly = sp.shared === "1" || !isOwner;

  return (
    <CalculatorClient
      initialData={JSON.parse(JSON.stringify(calculation))}
      readOnly={readOnly}
    />
  );
}
