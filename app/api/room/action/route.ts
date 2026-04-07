import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { code, action, payload } = await req.json();
    
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ error: "Missing Upstash Configuration" }, { status: 500 });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const roomCode = `room:${code}`;
    const room: any = await redis.get(roomCode);

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Handle Teacher actions mapping
    if (action === "update_status") room.status = payload.status;
    if (action === "set_question") {
      room.currentQuestion = payload.question;
      room.questionStartTime = Date.now();
      room.answerRevealed = false;
    }
    if (action === "set_game_mode") room.gameMode = payload.gameMode;
    if (action === "end_session") room.status = "ended";
    if (action === "reveal_answer") room.answerRevealed = true;
    if (action === "end_session") room.status = "ended";
    
    // Handle Student actions mapping
    if (action === "student_answer") {
      const student = room.students.find((s: any) => s.id === payload.studentId);
      if (student) {
        student.answered = true;
        student.lastAnswer = payload.answer;
        student.answerTime = Date.now();
      }
    }

    // Buzz-in system (records timestamp for ordering)
    if (action === "buzz_in") {
      if (!room.buzzes) room.buzzes = [];
      const alreadyBuzzed = room.buzzes.find((b: any) => b.studentId === payload.studentId);
      if (!alreadyBuzzed) {
        room.buzzes.push({ studentId: payload.studentId, name: payload.name, time: Date.now() });
      }
    }

    // Clear buzzes for next question
    if (action === "clear_buzzes") {
      room.buzzes = [];
      room.students = room.students.map((s: any) => ({ ...s, answered: false, lastAnswer: null }));
    }

    // Vote system (for WYR: A/B voting)
    if (action === "student_vote") {
      const student = room.students.find((s: any) => s.id === payload.studentId);
      if (student) {
        student.answered = true;
        student.lastAnswer = payload.vote;
      }
    }
    
    // System utility mapping
    if (action === "clear_answers") {
      room.students = room.students.map((s: any) => ({ ...s, answered: false, lastAnswer: null }));
      room.buzzes = [];
    }

    await redis.set(roomCode, room, { ex: 14400 });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Room Action Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
