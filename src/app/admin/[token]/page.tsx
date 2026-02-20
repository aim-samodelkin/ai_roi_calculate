import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminClient } from "@/components/admin/admin-client";

type PageProps = { params: Promise<{ token: string }> };

export default async function AdminPage({ params }: PageProps) {
  const { token } = await params;

  if (token !== process.env.ADMIN_SECRET_TOKEN) {
    notFound();
  }

  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      processSteps: { orderBy: { order: "asc" } },
      errorItems: { orderBy: { order: "asc" } },
      capexItems: { orderBy: { order: "asc" } },
      opexItems: { orderBy: { order: "asc" } },
      rolloutConfig: true,
    },
  });

  return <AdminClient token={token} templates={JSON.parse(JSON.stringify(templates))} />;
}
