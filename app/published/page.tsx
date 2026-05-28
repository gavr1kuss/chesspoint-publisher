import Nav from "@/components/Nav";
import PublishedClient from "@/components/PublishedClient";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublishedPage() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("posts")
    .select("*")
    .eq("status", "posted")
    .order("posted_at", { ascending: false });

  const posts = (data ?? []) as Post[];

  return (
    <>
      <Nav active="published" />
      <main className="flex-1">
        <PublishedClient posts={posts} />
      </main>
    </>
  );
}
