import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** PATCH: toggle isPublished for a template. DELETE: remove a template. */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err instanceof Response ? err : NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const { id, isPublished } = await req.json();
    if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

    const updated = await prisma.calculation.update({
      where: { id, isTemplate: true },
      data: { isPublished },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Ошибка при обновлении шаблона" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return err instanceof Response ? err : NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

    await prisma.calculation.delete({ where: { id, isTemplate: true } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Ошибка при удалении шаблона" }, { status: 500 });
  }
}
