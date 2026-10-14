"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface ControllerSession {
  code: string;
  studentId: string;
  studentName: string;
  room: any | null;
  isConnected: boolean;
  isReconnecting: boolean;
  latencyMs: number;
  sendAction: (action: string, payload?: any) => Promise<any>;
}

export function useControllerSocket(code: string): ControllerSession {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [room, setRoom] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);

  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Session Identity extraction & redirect if missing
  useEffect(() => {
    let stored = localStorage.getItem(`studentId_${code}`);
    let storedName = localStorage.getItem(`studentName_${code}`);

    if (!stored) {
      const globalId = localStorage.getItem("globalStudentId");
      const globalName = localStorage.getItem("globalStudentName");
      if (globalId && globalName) {
        localStorage.setItem(`studentId_${code}`, globalId);
        localStorage.setItem(`studentName_${code}`, globalName);
        stored = globalId;
        storedName = globalName;
      }
    }

    if (!stored) {
      window.location.href = `/join?code=${code}`;
      return;
    }

    setStudentId(stored);
    setStudentName(storedName || "Player");
  }, [code]);

  // 2. Connect to Supabase Realtime Channel
  useEffect(() => {
    if (!studentId || !code) return;

    const supabase = createClient();
    setIsReconnecting(false);

    const channel = supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_rooms", filter: `code=eq.${code}` },
        (payload) => {
          setRoom(payload.new.state);
        }
      )
      .on("broadcast", { event: "quick_event" }, (payload) => {
        // High-speed ephemeral events (e.g. buzzer lockout broadcast)
        if (payload?.payload?.action === "lockout") {
          // Handled downstream via room state
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setIsReconnecting(false);

          // Track presence
          await channel.track({
            user_id: studentId,
            name: studentName,
            online_at: new Date().toISOString(),
          });

          // Sync join with API
          fetch("/api/room/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, id: studentId, name: studentName }),
          }).catch(console.error);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
          setIsReconnecting(true);
        }
      });

    channelRef.current = channel;

    // Fetch initial state & measure round-trip latency
    const startT = Date.now();
    const fetchStateFallback = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${code}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.state) {
            setRoom(json.state);
            setIsConnected(true);
            setLatencyMs(Math.max(12, Math.round((Date.now() - startT) / 2)));
          }
        }
      } catch (e) {}
    };

    fetchStateFallback();

    // In case Supabase realtime is offline, poll /api/room/get periodically
    const pollInterval = setInterval(fetchStateFallback, 2000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [code, studentId, studentName]);

  // 3. Robust Action Dispatcher
  const sendAction = useCallback(
    async (action: string, payload: any = {}) => {
      try {
        const res = await fetch("/api/room/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            action,
            payload: {
              ...payload,
              studentId,
              studentName,
              clientTimestamp: Date.now(),
            },
          }),
        });
        const data = await res.json();
        if (data?.room) {
          setRoom(data.room);
        }
        return data;
      } catch (err) {
        console.error("[ControllerSocket] Send action failed:", err);
        return null;
      }
    },
    [code, studentId, studentName]
  );

  return {
    code,
    studentId,
    studentName,
    room,
    isConnected,
    isReconnecting,
    latencyMs,
    sendAction,
  };
}
