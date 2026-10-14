import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    let body;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
      // Handle the nested payload if it's coming from a form (rare but possible)
      if (body.payload && typeof body.payload === 'string') {
        try { body.payload = JSON.parse(body.payload); } catch(e) {}
      }
    } else {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }

    const { code, action, payload = {} } = body || {};
    if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
    const supabaseAdmin = createAdminClient();

    let room: any = null;
    try {
      const { data: roomRow } = await supabaseAdmin
        .from("live_rooms")
        .select("state")
        .eq("code", code)
        .single();
      if (roomRow?.state) {
        room = roomRow.state;
      }
    } catch (e) {}

    if (!room) {
      const { getLocalRoom } = await import("@/app/lib/localRoomStore");
      room = getLocalRoom(code);
    }

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Helper: Distribute XP to Team
    const distributeTeamXp = async (teamId: string, basePoints: number, actorId?: string) => {
      const team = room.teams.find((t: any) => t.id === teamId);
      if (!team) return;

      // Update team score in room state
      team.score = (team.score || 0) + basePoints;

      // Distribute XP in Supabase
      const teamMembers = team.students || [];
      const xpEvents = teamMembers.map((member: any) => ({
        roster_id: member.id,
        game_mode: room.gameMode || "unknown",
        event_type: member.id === actorId ? "Connector Bonus" : "Team Synergy",
        xp_awarded: member.id === actorId ? Math.round(basePoints / 5) + 50 : Math.round(basePoints / 5),
      }));

      if (xpEvents.length > 0) {
        await supabaseAdmin.from("xp_events").insert(xpEvents);
        
        // Update student_profiles XP
        for (const event of xpEvents) {
          await supabaseAdmin.rpc('increment_student_xp', { 
            student_id: event.roster_id, 
            xp_to_add: event.xp_awarded 
          });
        }
      }
    };

    // Handle Teacher actions mapping
    if (action === "update_status") room.status = payload.status;
    if (action === "sync_teams") room.teams = payload.teams;
    if (action === "set_question") {
      room.currentQuestion = payload.question;
      room.questionStartTime = Date.now();
      room.answerRevealed = false;
    }
    if (action === "set_game_mode") {
      room.gameMode = payload.gameMode;
      if (payload.fixitMode !== undefined) room.fixitMode = payload.fixitMode;
    }
    if (action === "end_session") room.status = "ended";
    if (action === "reveal_answer") {
      room.answerRevealed = true;
      if (payload.answer)      room.revealedAnswer      = payload.answer;
      if (payload.explanation) room.revealedExplanation = payload.explanation;
    }
    
    // Handle Student actions mapping
    if (action === "student_vote") {
      const student = room.students.find((s: any) => s.id === payload.studentId);
      if (student) {
        student.answered = true;
        student.lastAnswer = payload.vote;
      }
    }
    
    // Chain Reaction logic
    if (action === "set_chain_state") {
      room.chainState = payload;
      room.chainSubmit = null;
    }

    if (action === "submit_chain_answer") {
      const activeTeamId = room.chainState?.currentTeamId;
      const isAllowed = !activeTeamId || !payload.teamId || activeTeamId === payload.teamId;
      if (isAllowed) {
        room.chainSubmit = {
          answer: (payload.answer || "").toUpperCase().trim(),
          teamId: payload.teamId || activeTeamId,
          studentName: payload.studentName || "Player",
          ts: Date.now(),
        };
      }
    }

    if (action === "clear_chain_submit") room.chainSubmit = null;

    // Picture Reveal logic
    if (action === "set_reveal_answer") room.revealImageAnswer = payload.answer;
    if (action === "set_tiles_revealed") room.tilesRevealed = payload.count;

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
        await distributeTeamXp(payload.teamId, points, payload.studentId);
      }
    }

    if (action === "clear_open_guesses") {
      room.openGuessWon = null;
      room.openGuesses = [];
      room.revealImageAnswer = null;
      room.tilesRevealed = 0;
    }

    // Audience Reaction Logic (Hot Seat & Story Chain)
    if (action === "audience_reaction") {
      if (!room.reactions) room.reactions = [];
      room.reactions = [
        ...room.reactions.slice(-19),
        {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          reaction: payload.reaction, // "cheer" | "clap" | "pass" | "boost" | "rating"
          value: payload.value,
          studentId: payload.studentId,
          studentName: payload.studentName || "Audience",
          teamId: payload.teamId,
          ts: Date.now(),
        }
      ];

      if (payload.reaction === "rating" && typeof payload.value === "number") {
        if (!room.ratings) room.ratings = [];
        room.ratings.push({ studentId: payload.studentId, score: payload.value, ts: Date.now() });
      }
    }

    if (action === "clear_reactions") {
      room.reactions = [];
      room.ratings = [];
    }

    if (action === "sync_scores") {
      if (Array.isArray(payload.teams)) {
        room.teams = payload.teams;
      }
    }

    if (action === "student_answer") {
      const student = room.students.find((s: any) => s.id === payload.studentId);
      const isSquadLockedGame = ["jeopardy", "rapidfire_buzz", "reveal"].includes(room.gameMode);
      
      if (student) {
        // Only block teammates if explicitly a squad-locked game or explicitly requested
        if (isSquadLockedGame && !payload.allowIndividual && student.teamId) {
          const teammateAnswered = room.students.find((s: any) => 
            s.teamId === student.teamId && s.answered && s.id !== student.id
          );
          if (teammateAnswered) {
            return NextResponse.json({ success: false, error: "teammate_answered", answeredBy: teammateAnswered.name });
          }
        }
        student.answered = true;
        student.lastAnswer = payload.answer;
        student.answerTime = Date.now();
      }
    }

    // Hot Seat logic from phone controller
    if (action === "hotseat_action") {
      const subAction = payload.subAction; // "score" | "pass" | "taboo"
      if (!room.hotseatEvents) room.hotseatEvents = [];
      const evt = {
        type: subAction,
        teamId: payload.teamId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        ts: Date.now(),
      };
      room.hotseatEvents = [...room.hotseatEvents.slice(-9), evt];
      room.latestHotseatEvent = evt;

      if (subAction === "score" && payload.teamId) {
        await distributeTeamXp(payload.teamId, 100, payload.studentId);
      } else if (subAction === "taboo" && payload.teamId) {
        const team = room.teams?.find((t: any) => t.id === payload.teamId);
        if (team) team.score = Math.max(0, (team.score || 0) - 50);
      }
    }

    // Wheel of Fortune logic from phone
    if (action === "wheel_spin") {
      room.latestWheelSpin = {
        teamId: payload.teamId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        ts: Date.now(),
      };
    }

    if (action === "wheel_solve") {
      if (!room.wheelSolves) room.wheelSolves = [];
      const solveEvt = {
        guess: payload.guess,
        teamId: payload.teamId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        ts: Date.now(),
      };
      room.wheelSolves = [...room.wheelSolves.slice(-9), solveEvt];
      room.latestWheelSolve = solveEvt;
    }

    if (action === "buzz_in" || action === "student_buzz") {
      if (!room.buzzes) room.buzzes = [];
      const student = room.students.find((s: any) => s.id === payload.studentId);
      const teamId = payload.teamId || student?.teamId || payload.studentId;
      const teamAlreadyBuzzed = room.buzzes.find((b: any) => b.teamId === teamId);
      if (!teamAlreadyBuzzed) {
        room.buzzes.push({ 
          studentId: payload.studentId, 
          name: payload.name || payload.studentName || student?.name || "Operative", 
          teamId, 
          teamName: student?.teamName || payload.teamName || payload.name,
          time: Date.now() 
        });
      }
    }

    if (action === "clear_buzzes" || action === "clear_answers") {
      room.students = room.students.map((s: any) => ({ ...s, answered: false, lastAnswer: null }));
      room.buzzes = [];
    }

    // Word Surge logic from phone
    if (action === "word_surge_submit") {
      room.surgeSubmit = {
        sentence: payload.sentence,
        teamId: payload.teamId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        ts: Date.now(),
      };
    }

    // Category Sprint logic from phone
    if (action === "category_sprint_word") {
      if (!room.categorySprintWords) room.categorySprintWords = [];
      room.categorySprintWords = [
        ...room.categorySprintWords.slice(-19),
        {
          word: payload.word,
          teamId: payload.teamId,
          studentName: payload.studentName,
          ts: Date.now(),
        }
      ];
      room.latestCategoryWord = { word: payload.word, teamId: payload.teamId, studentName: payload.studentName, ts: Date.now() };
    }

    if (action === "clear_category_words") {
      room.categorySprintWords = [];
      room.latestCategoryWord = null;
    }

    // Story Chain logic from phone
    if (action === "story_word_used") {
      if (payload.teamId) {
        await distributeTeamXp(payload.teamId, 50, payload.studentId);
      }
      room.latestStoryEvent = { type: "word_used", teamId: payload.teamId, studentName: payload.studentName, ts: Date.now() };
    }

    if (action === "story_line_submit") {
      room.latestStoryLine = { line: payload.line, teamId: payload.teamId, studentName: payload.studentName, ts: Date.now() };
    }

    // Cargo Hunt logic
    if (action === "set_cargo") {
      room.cargoItem = payload.item;
      room.startTime = Date.now();
    }

    // Award points from teacher
    if (action === "award_team_points") {
      const teamId = payload.teamId;
      let points = payload.points || 100;

      // Dynamic XP decay for Cargo Hunt
      if (room.cargoItem && room.startTime) {
        const elapsed = (Date.now() - room.startTime) / 1000;
        const decayRate = 1.5;
        points = Math.max(10, Math.floor(100 - (elapsed * decayRate)));
      }

      await distributeTeamXp(teamId, points, payload.studentId);
    }

    // Save updated state back to Supabase
    try {
      await supabaseAdmin
        .from("live_rooms")
        .update({ state: room, updated_at: new Date().toISOString() })
        .eq("code", code);
    } catch (e) {}

    // Save to local fallback store
    const { updateLocalRoom } = await import("@/app/lib/localRoomStore");
    updateLocalRoom(code, () => room);

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Room Action Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
