import { prisma } from "@/lib/db";
import { TemplatesClient } from "@/components/templates-client";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  return <TemplatesClient templates={JSON.parse(JSON.stringify(templates))} />;
}
