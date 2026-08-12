import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAuthed } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM revenue WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "revenue entry not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM revenue WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
