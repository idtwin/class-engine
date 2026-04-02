import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { code, name, id } = await req.json();
    
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ error: "Missing Upstash Credentials" }, { status: 500 });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const roomCode = `room:${code}`;
    const room: any = await redis.get(roomCode);

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const studentId = id || nanoid();
    
    // Check if student already actively joined
    const exists = room.students.find((s: any) => s.id === studentId || s.name === name);
    if (!exists) {
      room.students.push({ id: studentId, name, answered: false, lastAnswer: null });
      await redis.set(roomCode, room, { ex: 14400 }); // Refresh TTL on modify
    }

    return NextResponse.json({ studentId, name });
  } catch (error: any) {
    console.error("Room Join Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
