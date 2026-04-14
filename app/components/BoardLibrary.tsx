"use client";

import { useState, useEffect, useRef } from "react";
import { FolderHeart, X, Search, Trash2, Calendar, Gamepad2, ChevronRight, BookOpen } from "lucide-react";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import styles from "./BoardLibrary.module.css";

interface BoardLibraryProps {
  onLoadBoard: (board: SavedBoard) => void;
  currentGameType?: string;
  triggerOpen?: boolean;
  onClose?: () => void;
  hideTriggerButton?: boolean;
}

export default function BoardLibrary({ onLoadBoard, currentGameType, triggerOpen, onClose, hideTriggerButton }: BoardLibraryProps) {
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
    switch(type) {
      case 'jeopardy': return <Gamepad2 size={12} color="#ffc843" />;
      case 'oddoneout': return <BookOpen size={12} color="#b06eff" />;
      default: return <Gamepad2 size={12} color="#00c8f0" />;
    }
  };

  const gameColors: Record<string, string> = {
    jeopardy: '#ffc843',
    oddoneout: '#b06eff',
    'rapid-fire': '#00c8f0',
    'fix-it': '#ffc843',
    'reveal': '#00c8f0',
    'wyr': '#ff4d8f',
    'story': '#00e87a',
    'chain-reaction': '#00e87a'
  };

  return (
    <>
      {!hideTriggerButton && (
        <button
          onClick={() => setOpen(true)}
          className="btn btnGhost"
        >
          <FolderHeart size={14} />
          <span>Library</span>
        </button>
      )}

      {/* Backdrop */}
      {open && <div className={styles.backdrop} onClick={() => { setOpen(false); if (onClose) onClose(); }} />}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={styles.drawer}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <h2>
              <FolderHeart size={20} color="#00e87a" />
              Neural Library
            </h2>
            <p className={styles.headerSubtitle}>
              {currentGameType ? `ACTIVE_FILTER: ${currentGameType}` : "BROWSING_COMMAND_HISTORY"}
            </p>
          </div>
          <button 
            className={styles.closeBtn}
            onClick={() => { setOpen(false); if (onClose) onClose(); }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchArea}>
          <div className={styles.searchInner}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filter topics or titles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Content list */}
        <div className={styles.contentList}>
          {filteredBoards.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={48} className={styles.emptyIcon} />
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', textTransform: 'uppercase' }}>No matching records found</div>
            </div>
          ) : (
            filteredBoards.map(board => (
              <div key={board.id} className={styles.boardCard}>
                <div className={styles.cardGlow} style={{ background: gameColors[board.gameType] || '#00c8f0' }}></div>
                <div className={styles.cardTop}>
                  <div className={styles.gameTypeTag} style={{ color: gameColors[board.gameType] || '#00c8f0' }}>
                    {getGameIcon(board.gameType)}
                    {board.gameType}
                  </div>
                  <div className={styles.timestamp}>
                    <Calendar size={10} />
                    {formatDate(board.timestamp)}
                  </div>
                </div>

                <h3 className={styles.boardTitle}>{board.title}</h3>
                <p className={styles.boardTopic}>
                  Topic: {board.topic}
                </p>

                <div className={styles.cardActions}>
                  <button
                    className={styles.loadBtn}
                    onClick={() => {
                        onLoadBoard(board);
                        setOpen(true); // Don't close immediately to show selection?
                        // Actually, better to stay open if user is browsing
                    }}
                  >
                    Load Neural Map <ChevronRight size={14} />
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => { if(confirm("Purge this record from history?")) deleteBoard(board.id); }}
                    title="Delete record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          Local encryption active // {savedBoards.length} Records found
        </div>
      </div>
    </>
  );
}
