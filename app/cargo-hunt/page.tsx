"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";

export default function CargoHuntLauncher() {
  const router = useRouter();
  const { activeClassId, classes, currentTeams } = useClassroomStore();

  useEffect(() => {
    const startAlpha = async () => {
      const activeClass = classes.find(c => c.id === activeClassId);
      
      const defaultTeams = [
        { id: "squad-alpha", name: "SQUAD ALPHA", color: "#00e87a", score: 0, students: [{ id: "s1", name: "Commander Alex" }] },
        { id: "squad-bravo", name: "SQUAD BRAVO", color: "#00c8f0", score: 0, students: [{ id: "s2", name: "Operator Sam" }] },
        { id: "squad-charlie", name: "SQUAD CHARLIE", color: "#ffc843", score: 0, students: [{ id: "s3", name: "Specialist Maya" }] },
        { id: "squad-delta", name: "SQUAD DELTA", color: "#ff4d8f", score: 0, students: [{ id: "s4", name: "Scout Liam" }] },
      ];

      const effectiveTeams = (currentTeams && currentTeams.length > 0) ? currentTeams : defaultTeams;
      const effectiveRoster = (activeClass?.students && activeClass.students.length > 0)
        ? activeClass.students.map(s => ({ ...s, type: 'student' }))
        : defaultTeams.flatMap(t => t.students.map(s => ({ ...s, type: 'student' })));

      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameMode: "cargo_hunt",
          activeRoster: effectiveRoster,
          teams: effectiveTeams
        })
      });

      const { code } = await res.json();
      if (code) {
        // Automatically open the remote in a new tab for convenience (or user can use phone)
        // window.open("/remote", "_blank"); 
        router.push(`/play/cargo-hunt/${code}`);
      }
    };

    startAlpha();
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      background: '#07090f', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#ff6600',
      fontFamily: 'monospace',
      letterSpacing: '0.2em'
    }}>
      INITIATING_CARGO_HUNT_ALPHA...
    </div>
  );
}
