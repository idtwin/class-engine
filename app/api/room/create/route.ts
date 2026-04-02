import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { gameMode, activeRoster } = await req.json();
    
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
      students: [],
      scores: {}
    };

    // TTL 4 hours (14400 seconds)
    await redis.set(`room:${code}`, roomData, { ex: 14400 });

    return NextResponse.json({ code });
  } catch (error: any) {
    console.error("Room Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
