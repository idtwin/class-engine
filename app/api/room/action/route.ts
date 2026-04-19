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
    if (action === "set_game_mode") {
      room.gameMode = payload.gameMode;
      // Optional per-game sub-settings (e.g. fixitMode: "Easy"|"Hard")
      if (payload.fixitMode !== undefined) room.fixitMode = payload.fixitMode;
    }
    if (action === "end_session") room.status = "ended";
    if (action === "reveal_answer") {
      room.answerRevealed = true;
      if (payload.answer)      room.revealedAnswer      = payload.answer;
      if (payload.explanation) room.revealedExplanation = payload.explanation;
    }
    if (action === "end_session") room.status = "ended";
    
    // Handle Student actions mapping
    if (action === "student_answer") {
      const student = room.students.find((s: any) => s.id === payload.studentId);
      if (student) {
        // Check if a teammate already answered (one per team)
        if (student.teamId) {
          const teammateAnswered = room.students.find((s: any) => 
            s.teamId === student.teamId && s.answered && s.id !== student.id
          );
          if (teammateAnswered) {
            await redis.set(roomCode, room, { ex: 14400 });
            return NextResponse.json({ success: false, error: "teammate_answered", answeredBy: teammateAnswered.name });
          }
        }
        student.answered = true;
        student.lastAnswer = payload.answer;
        student.answerTime = Date.now();
      }
    }

    // Buzz-in system (records timestamp for ordering)
    if (action === "buzz_in") {
      if (!room.buzzes) room.buzzes = [];
      const student = room.students.find((s: any) => s.id === payload.studentId);
      const teamId = student?.teamId || payload.studentId;
      
      // Check if anyone from same team already buzzed
      const teamAlreadyBuzzed = room.buzzes.find((b: any) => b.teamId === teamId);
      if (!teamAlreadyBuzzed) {
        room.buzzes.push({ 
          studentId: payload.studentId, 
          name: payload.name, 
          teamId, 
          teamName: student?.teamName || payload.name,
          time: Date.now() 
        });
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

    // Chain Reaction state sync (projector → phones)
    if (action === "set_chain_state") {
      room.chainState = payload;
      room.chainSubmit = null;
    }

    // Phone submits a word guess
    if (action === "submit_chain_answer") {
      if (room.chainState?.currentTeamId === payload.teamId) {
        room.chainSubmit = { answer: payload.answer, teamId: payload.teamId, ts: Date.now() };
      }
    }

    // Projector clears after processing phone submit
    if (action === "clear_chain_submit") {
      room.chainSubmit = null;
    }

    // Picture Reveal: projector sets answer when game starts
    if (action === "set_reveal_answer") {
      room.revealImageAnswer = payload.answer;
    }

    // Projector syncs tile count on each reveal
    if (action === "set_tiles_revealed") {
      room.tilesRevealed = payload.count;
    }

    // Phone submits open guess — server auto-checks
    if (action === "submit_open_guess") {
      const guess = (payload.guess || "").toLowerCase().trim();
      const answer = (room.revealImageAnswer || "").toLowerCase().trim();
      if (!room.openGuesses) room.openGuesses = [];
      room.openGuesses = [
        ...room.openGuesses.slice(-9),
        { teamId: payload.teamId, teamName: payload.teamName, guess: payload.guess, ts: Date.now() },
      ];
      if (guess && answer && guess === answer && !room.openGuessWon) {
        const count = room.tilesRevealed || 0;
        const points = count <= 4 ? 500 : count <= 10 ? 400 : 300;
        room.openGuessWon = {
          teamId: payload.teamId,
          teamName: payload.teamName,
          guess: payload.guess,
          tilesRevealed: count,
          points,
        };
      }
    }

    // Projector clears between rounds
    if (action === "clear_open_guesses") {
      room.openGuessWon = null;
      room.openGuesses = [];
      room.revealImageAnswer = null;
      room.tilesRevealed = 0;
    }

    await redis.set(roomCode, room, { ex: 14400 });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Room Action Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
