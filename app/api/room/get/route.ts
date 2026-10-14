import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) return NextResponse.json({ error: "NO_CODE_PROVIDED" }, { status: 400 });

    const supabaseAdmin = createAdminClient();

    try {
      const { data, error } = await supabaseAdmin
        .from("live_rooms")
        .select("state")
        .eq("code", code)
        .single();

      if (!error && data?.state) {
        return NextResponse.json({ ...data.state, state: data.state });
      }
    } catch (e) {}

    // Fallback to in-memory local room store
    const { getLocalRoom } = await import("@/app/lib/localRoomStore");
    const local = getLocalRoom(code);
    if (local) {
      return NextResponse.json({ ...local, state: local });
    }

    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  } catch (err: any) {
    console.error("[ROOM_GET] Exception:", err);
    return NextResponse.json({ error: "INTERNAL_EXCEPTION", details: err.message }, { status: 500 });
  }
}

