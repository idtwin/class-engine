"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, X } from "lucide-react";

interface SettingItem {
  label: string;
  type: "select" | "checkbox" | "number";
  value: any;
  onChange: (val: any) => void;
  options?: { value: any; label: string }[];
  description?: string;
}

interface GameSettingsDrawerProps {
  settings: SettingItem[];
  title?: string;
}

export default function GameSettingsDrawer({ settings, title = "Game Settings" }: GameSettingsDrawerProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          padding: "0.5rem 0.75rem",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          transition: "all 0.2s",
        }}
        title="Game Settings"
      >
        <Settings size={16} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 998,
          }}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : "-380px",
          width: "360px",
          height: "100vh",
          background: "#1a1a2e",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: open ? "-10px 0 40px rgba(0,0,0,0.5)" : "none",
          transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "white" }}>
            <Settings size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", opacity: 0.6 }} />
            {title}
          </h3>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "8px",
              padding: "0.4rem",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings list */}
        <div style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          overflowY: "auto",
          flex: 1,
        }}>
          {settings.map((s, i) => (
            <div key={i}>
              {s.type === "checkbox" ? (
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  userSelect: "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <input
                    type="checkbox"
                    checked={s.value}
                    onChange={e => s.onChange(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#2dd4bf", cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "white" }}>{s.label}</div>
                    {s.description && <div style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: "0.15rem" }}>{s.description}</div>}
                  </div>
                </label>
              ) : s.type === "select" ? (
                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {s.label}
                  </label>
                  <select
                    value={s.value}
                    onChange={e => s.onChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.7rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                      }}
                  >
                    {s.options?.map(o => (
                      <option key={String(o.value)} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {s.description && <div style={{ fontSize: "0.75rem", opacity: 0.4, marginTop: "0.3rem" }}>{s.description}</div>}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
        }}>
          Settings apply immediately
        </div>
      </div>
    </>
  );
}
