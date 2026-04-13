"use client";

import { useState, useEffect, useRef } from "react";
import { FolderHeart, X, Search, Trash2, Calendar, Gamepad2, ChevronRight, BookOpen } from "lucide-react";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";

interface BoardLibraryProps {
  onLoadBoard: (board: SavedBoard) => void;
  currentGameType?: string;
  triggerOpen?: boolean;
  onClose?: () => void;
}

export default function BoardLibrary({ onLoadBoard, currentGameType, triggerOpen, onClose }: BoardLibraryProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { savedBoards, deleteBoard } = useClassroomStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (triggerOpen) setOpen(true);
  }, [triggerOpen]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (onClose) onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const filteredBoards = savedBoards
    .filter(b => !currentGameType || b.gameType === currentGameType)
    .filter(b => b.topic.toLowerCase().includes(search.toLowerCase()) || b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGameIcon = (type: string) => {
    // Basic mapping for visual flair
    switch(type) {
      case 'jeopardy': return <Gamepad2 size={16} color="#FFD700" />;
      case 'oddoneout': return <BookOpen size={16} color="#9370DB" />;
      default: return <Gamepad2 size={16} color="#2dd4bf" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "rgba(45, 212, 191, 0.1)",
          border: "1px solid rgba(45, 212, 191, 0.2)",
          borderRadius: "10px",
          padding: "0.5rem 1rem",
          color: "#2dd4bf",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
          fontWeight: 600,
          transition: "all 0.2s",
        }}
      >
        <FolderHeart size={18} />
        <span>Library</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)", zIndex: 1000
        }} />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed", top: 0, right: open ? 0 : "-450px",
          width: "400px", height: "100vh", background: "#0f172a",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
          transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 1001, display: "flex", flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderHeart size={22} color="#2dd4bf" />
              Saved Library
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
              {currentGameType ? `Showing saved ${currentGameType} boards` : "Browse all saved game content"}
            </p>
          </div>
          <button onClick={() => { setOpen(false); if (onClose) onClose(); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "1rem 1.5rem" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              placeholder="Search topics or titles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "0.6rem 0.6rem 0.6rem 2.5rem", borderRadius: "8px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "white", fontSize: "0.9rem", outline: "none"
              }}
            />
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 1.5rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredBoards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "rgba(255,255,255,0.2)" }}>
              <BookOpen size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
              <p>No saved boards found.</p>
            </div>
          ) : (
            filteredBoards.map(board => (
              <div
                key={board.id}
                style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
                  padding: "1rem", transition: "all 0.2s", cursor: "default", position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", color: "#2dd4bf", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {getGameIcon(board.gameType)}
                    {board.gameType}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
                    <Calendar size={12} />
                    {formatDate(board.timestamp)}
                  </div>
                </div>

                <h3 style={{ margin: 0, color: "white", fontSize: "1rem", fontWeight: 700 }}>{board.title}</h3>
                <p style={{ margin: "0.2rem 0 1rem 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  Topic: {board.topic}
                </p>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                        onLoadBoard(board);
                        setOpen(false);
                        if (onClose) onClose();
                    }}
                    style={{
                      flex: 1, background: "#2dd4bf", color: "#0f172a", border: "none", borderRadius: "8px",
                      padding: "0.5rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                    }}
                  >
                    Load Board <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => { if(confirm("Delete this saved board?")) deleteBoard(board.id); }}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "8px", padding: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center"
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          Saved boards are stored locally in this browser.
        </div>
      </div>
    </>
  );
}
