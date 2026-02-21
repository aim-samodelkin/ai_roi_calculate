import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    const calculation = await prisma.calculation.create({
      data: {
        name: "Новый расчёт",
        userId: user?.id ?? null,
        rolloutConfig: {
          create: {
            model: "LINEAR",
            rolloutMonths: 6,
            targetShare: 1,
            operationsPerMonth: 100,
          },
        },
      },
    });

    return NextResponse.redirect(
      new URL(`/${calculation.id}`, process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
      { status: 303 }
    );
  } catch (error) {
    console.error("Failed to create calculation:", error);
    return NextResponse.json({ error: "Ошибка при создании расчёта" }, { status: 500 });
  }
}
