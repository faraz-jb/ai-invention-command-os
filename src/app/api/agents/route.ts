import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const clientFilter = req.nextUrl.searchParams.get("client");
  const db = getDb();

  let query = `
    SELECT a.*, c.name as client_name
    FROM agents a
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (clientFilter) {
    query += " AND a.client_id = ?";
    params.push(clientFilter);
  }
  query += " ORDER BY a.name ASC";

  const agents = db.prepare(query).all(...params);
  return NextResponse.json({ agents });
}
