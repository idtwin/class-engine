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
    // Use a custom fetch with a timeout if needed, but for now we'll just handle the catch
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // We use a Promise.race to enforce a server-side timeout of 5 seconds
    const roomPromise = redis.get(`room:${code}`);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Redis Request Timeout")), 5000)
    );

    const room: any = await Promise.race([roomPromise, timeoutPromise]);

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
