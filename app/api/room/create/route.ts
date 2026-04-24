import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const { gameMode, activeRoster, teams } = await req.json();
    
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ error: "Missing Upstash Redis Credentials in .env.local" }, { status: 500 });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

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

    // TTL 4 hours (14400 seconds)
    await redis.set(`room:${code}`, roomData, { ex: 14400 });

    // ── Sync the classroom roster to Supabase so students can find their name in the join dropdown ──
    const studentsToSync = (activeRoster || [])
      .filter((p: any) => p.type === "student" && p.id && p.name)
      .map((p: any) => ({ id: p.id, name: p.name, class_name: p.class_name || "Class" }));

    console.log(`[ROOM_CREATE] Room ${code} created. Syncing ${studentsToSync.length} students to Supabase.`);

    let syncSuccess = false;
    if (studentsToSync.length > 0) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: upsertData, error: upsertError } = await supabaseAdmin.from("roster").upsert(studentsToSync, { onConflict: "id" }).select();
        
        if (upsertError) {
          console.error("[ROOM_CREATE] Supabase upsert error:", upsertError);
        } else {
          console.log(`[ROOM_CREATE] Supabase roster sync successful. Entities: ${upsertData?.length || 0}`);
          syncSuccess = true;
        }
      } catch (rosterErr) {
        console.warn("[ROOM_CREATE] Exception during roster sync:", rosterErr);
      }
    }

    return NextResponse.json({ code, sync: syncSuccess });
  } catch (error: any) {
    console.error("[ROOM_CREATE] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
