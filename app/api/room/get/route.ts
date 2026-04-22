import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json({ error: "Missing Upstash Redis Credentials" }, { status: 500 });
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const room: any = await redis.get(`room:${code}`);

    if (!room) {
      console.warn(`[ROOM_GET] Room ${code} not found in Redis`);
      return NextResponse.json({ error: "Room not found or expired" }, { status: 404 });
    }

    console.log(`[ROOM_GET] Room ${code} loaded. Roster size: ${room.activeRoster?.length || 0}`);
    
    // Return full room state for polling clients
    return NextResponse.json(room);
  } catch (error: any) {
    console.error("[ROOM_GET] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
