"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useClassroomStore } from "@/app/store/useClassroomStore";
import { createClient } from "@/utils/supabase/client";

export interface AudienceReaction {
  id: string;
  reaction: "cheer" | "clap" | "pass" | "boost" | "rating";
  value?: number;
  studentId: string;
  studentName: string;
  teamId?: string;
  ts: number;
}

export function useLiveRoomHost(gameModeName: string) {
  const { activeRoomCode, currentTeams } = useClassroomStore();
  const [roomState, setRoomState] = useState<any>(null);
  const [reactions, setReactions] = useState<AudienceReaction[]>([]);
  const [buzzes, setBuzzes] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const supabaseRef = useRef<any>(null);

  // Initialize Supabase Client & Realtime Subscription
  useEffect(() => {
    if (!activeRoomCode) return;

    const supabase = createClient();
    supabaseRef.current = supabase;

    // Fetch initial room state
    supabase
      .from("live_rooms")
      .select("state")
      .eq("code", activeRoomCode)
      .single()
      .then(({ data }) => {
        if (data?.state) {
          setRoomState(data.state);
          if (data.state.reactions) setReactions(data.state.reactions);
          if (data.state.buzzes) setBuzzes(data.state.buzzes);
        }
      });

    // Realtime Postgres Changes
    const channel = supabase
      .channel(`room_host:${activeRoomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_rooms", filter: `code=eq.${activeRoomCode}` },
        (payload) => {
          const newState = payload.new?.state;
          if (newState) {
            setRoomState(newState);
            if (newState.reactions) setReactions(newState.reactions);
            if (newState.buzzes) setBuzzes(newState.buzzes);
            if (newState.students) {
              setAnswers(newState.students.filter((s: any) => s.answered));
            }
          }
        }
      )
      .subscribe();

    // Polling fallback to ensure robust real-time updates even without Supabase WebSockets
    const pollRoomState = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const json = await res.json();
          const state = json.state || json;
          if (state) {
            setRoomState(state);
            if (state.reactions) setReactions(state.reactions);
            if (state.buzzes) setBuzzes(state.buzzes);
            if (state.students) {
              setAnswers(state.students.filter((s: any) => s.answered));
            }
          }
        }
      } catch (e) {}
    };

    pollRoomState();
    const pollInterval = setInterval(pollRoomState, 1000);

    // Auto-set gameMode and promote to playing when game page mounts
    fetch("/api/room/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: activeRoomCode,
        action: "set_game_mode",
        payload: { gameMode: gameModeName, status: "playing" }
      })
    }).catch(console.error);

    fetch("/api/room/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: activeRoomCode,
        action: "update_status",
        payload: { status: "playing" }
      })
    }).catch(console.error);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeRoomCode, gameModeName]);

  // Push helper: Send Room Action
  const sendRoomAction = useCallback(
    async (action: string, payload: object = {}) => {
      if (!activeRoomCode) return null;
      try {
        const res = await fetch("/api/room/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action, payload })
        });
        const data = await res.json();
        if (data.room) setRoomState(data.room);
        return data;
      } catch (err) {
        console.error("[useLiveRoomHost] Action error:", err);
        return null;
      }
    },
    [activeRoomCode]
  );

  // Set Current Question for phones
  const setQuestion = useCallback(
    (question: any) => sendRoomAction("set_question", { question }),
    [sendRoomAction]
  );

  // Reveal Answer & Explanation
  const revealAnswer = useCallback(
    (answer?: string, explanation?: string) =>
      sendRoomAction("reveal_answer", { answer, explanation }),
    [sendRoomAction]
  );

  // Clear answers/buzzes for next round
  const clearRound = useCallback(
    () => sendRoomAction("clear_answers"),
    [sendRoomAction]
  );

  // Clear incoming audience reactions
  const clearReactions = useCallback(
    () => sendRoomAction("clear_reactions"),
    [sendRoomAction]
  );

  // Synchronize team scores from Zustand to Supabase
  const syncScores = useCallback(() => {
    if (!currentTeams || currentTeams.length === 0) return;
    const teamsPayload = currentTeams.map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      color: t.color,
      students: t.students?.map((s) => ({ id: s.id, name: s.name })),
    }));
    sendRoomAction("sync_scores", { teams: teamsPayload });
  }, [currentTeams, sendRoomAction]);

  // Auto-sync scores whenever currentTeams change
  useEffect(() => {
    syncScores();
  }, [currentTeams, syncScores]);

  return {
    activeRoomCode,
    roomState,
    reactions,
    buzzes,
    answers,
    sendRoomAction,
    setQuestion,
    revealAnswer,
    clearRound,
    clearReactions,
    syncScores,
  };
}
