import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, excludeId } = await req.json();
  let query = supabase.from("schedules").select("id, client_name, start_time, end_time").eq("consultant_id", user.id).eq("date", date).neq("status", "REJECTED");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hasConflict: (data?.length ?? 0) > 0, conflicts: data });
}