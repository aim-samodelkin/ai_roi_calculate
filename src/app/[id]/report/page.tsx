import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReportView } from "@/components/report/report-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ horizon?: string }>;
};

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { horizon: horizonParam } = await searchParams;
  const horizon = [12, 24, 36].includes(parseInt(horizonParam ?? ""))
    ? parseInt(horizonParam!)
    : 24;

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
    <>
      <style>{`
        header, footer { display: none !important; }
        main { padding: 16px 0 0 0 !important; max-width: 100% !important; }
        .container { max-width: 100% !important; padding: 0 !important; }
      `}</style>
      <ReportView
        calculation={JSON.parse(JSON.stringify(calculation))}
        horizonMonths={horizon}
      />
    </>
  );
}
