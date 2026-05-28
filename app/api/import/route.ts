import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertQueuedPosts } from "@/lib/insertPosts";

export const dynamic = "force-dynamic";

// POST /api/import
// Заголовок: Authorization: Bearer <IMPORT_TOKEN>
// Тело: JSON-массив постов ИЛИ { "posts": [...] }
//   [{ "channel": "twitter", "scheduled_date": "2026-06-01", "body": "..." }, ...]
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const arr = Array.isArray(body)
    ? body
    : (body as { posts?: unknown })?.posts;

  if (!Array.isArray(arr)) {
    return NextResponse.json(
      { error: "expected a JSON array or { posts: [...] }" },
      { status: 400 }
    );
  }

  try {
    const imported = await insertQueuedPosts(arr);
    revalidatePath("/");
    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
