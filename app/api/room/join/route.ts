import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const { code, id, name, teamId, teamName } = await req.json();
    if (!code) return NextResponse.json({ error: "Missing room code" }, { status: 400 });

    let room: any = null;
    const supabaseAdmin = createAdminClient();

    // 1. Try Supabase
    try {
      const { data: roomRow, error: fetchError } = await supabaseAdmin
        .from("live_rooms")
        .select("state")
        .eq("code", code)
        .single();

      if (!fetchError && roomRow?.state) {
        room = roomRow.state;
      }
    } catch (e) {}

    // 2. Fallback to Local Store if Supabase offline/empty
    if (!room) {
      const { getLocalRoom } = await import("@/app/lib/localRoomStore");
      const local = getLocalRoom(code);
      if (local) {
        room = JSON.parse(JSON.stringify(local));
      }
    }

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.students) room.students = [];

    // Update or add student
    const existingIdx = room.students.findIndex((s: any) => s.id === id);
    const studentData = { 
      id, 
      name, 
      teamId, 
      teamName, 
      joinedAt: Date.now(),
      lastSeen: Date.now() 
    };

    if (existingIdx > -1) {
      room.students[existingIdx] = { ...room.students[existingIdx], ...studentData };
    } else {
      room.students.push(studentData);
    }

    // Try persisting back to Supabase
    try {
      await supabaseAdmin
        .from("live_rooms")
        .update({ state: room, updated_at: new Date().toISOString() })
        .eq("code", code);
    } catch (e) {}

    // Always update local store
    const { updateLocalRoom } = await import("@/app/lib/localRoomStore");
    updateLocalRoom(code, () => room);

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("[ROOM_JOIN] Error:", error);
    return NextResponse.json({ error: error?.message || "Join failed" }, { status: 500 });
  }
}
