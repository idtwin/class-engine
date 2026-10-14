import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const { gameMode, activeRoster, teams } = await req.json();
    
    const supabaseAdmin = createAdminClient();
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit code

    const roomData = {
      code,
      gameMode,
      status: "waiting",
      currentQuestion: null,
      activeRoster: activeRoster || [],
      teams: teams || [],
      students: [],
      scores: {}
    };

    // Store in Supabase live_rooms
    let supabaseSuccess = false;
    try {
      const { error: roomError } = await supabaseAdmin
        .from("live_rooms")
        .upsert({
          code,
          state: roomData,
          updated_at: new Date().toISOString()
        });

      if (!roomError) {
        supabaseSuccess = true;
      } else {
        console.warn("[ROOM_CREATE] Supabase room error, using local fallback:", roomError?.message || roomError);
      }
    } catch (e: any) {
      console.warn("[ROOM_CREATE] Supabase unreachable, using local fallback:", e?.message);
    }

    // Always guarantee local memory persistence as fallback
    const { saveLocalRoom } = await import("@/app/lib/localRoomStore");
    saveLocalRoom(code, roomData);

    // ── Sync the classroom roster to Supabase ──
    const studentsToSync = (activeRoster || [])
      .filter((p: any) => p.type === "student" && p.id && p.name)
      .map((p: any) => ({ id: p.id, name: p.name, class_name: p.class_name || "Class" }));

    console.log(`[ROOM_CREATE] Room ${code} created in Supabase. Syncing ${studentsToSync.length} students.`);

    let syncSuccess = false;
    if (studentsToSync.length > 0) {
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from("roster")
        .upsert(studentsToSync, { onConflict: "id" })
        .select();
      
      if (upsertError) {
        console.error("[ROOM_CREATE] Supabase roster sync error:", upsertError);
      } else {
        console.log(`[ROOM_CREATE] Supabase roster sync successful. Entities: ${upsertData?.length || 0}`);
        syncSuccess = true;
      }
    }

    console.log(`[ROOM_CREATE] Room ${code} created successfully in Supabase.`);
    return NextResponse.json({ 
      code, 
      sync: syncSuccess,
      message: "Room created successfully" 
    });
  } catch (error: any) {
    console.error("[ROOM_CREATE] Exception:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      code: null 
    }, { status: 500 });
  }
}
