import fs from "fs";
import path from "path";

/**
 * In-memory + disk fallback room store.
 * Allows local hosting and development to function completely offline or
 * when Supabase network connectivity is unavailable, surviving hot-reloads and restarts.
 */

interface RoomData {
  code: string;
  gameMode: string;
  status: string;
  currentQuestion: any;
  activeRoster: any[];
  teams: any[];
  students: any[];
  scores: Record<string, number>;
  [key: string]: any;
}

const DB_PATH = path.resolve(process.cwd(), "scratch/local_rooms_db.json");

function loadFromDisk(): Map<string, RoomData> {
  const map = new Map<string, RoomData>();
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        map.set(k, v as RoomData);
      }
    }
  } catch (e) {
    console.warn("[LOCAL_ROOM_STORE] Disk load warn:", e);
  }
  return map;
}

function saveToDisk(map: Map<string, RoomData>) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, RoomData> = {};
    map.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.warn("[LOCAL_ROOM_STORE] Disk save warn:", e);
  }
}

// Global persistence across hot-reloads in Node dev server
const globalForRooms = globalThis as unknown as {
  __localRoomsStore: Map<string, RoomData>;
};

export const localRooms = globalForRooms.__localRoomsStore || loadFromDisk();
if (process.env.NODE_ENV !== "production") {
  globalForRooms.__localRoomsStore = localRooms;
}

export function saveLocalRoom(code: string, state: RoomData) {
  localRooms.set(code, { ...state, code, updatedAt: Date.now() });
  saveToDisk(localRooms);
}

export function getLocalRoom(code: string): RoomData | undefined {
  if (!localRooms.has(code)) {
    // Re-check disk in case another process wrote it
    const fromDisk = loadFromDisk();
    if (fromDisk.has(code)) {
      localRooms.set(code, fromDisk.get(code)!);
    }
  }
  return localRooms.get(code);
}

export function updateLocalRoom(code: string, updater: (prev: RoomData) => RoomData) {
  const existing = getLocalRoom(code);
  if (!existing) return null;
  const updated = updater(existing);
  localRooms.set(code, { ...updated, updatedAt: Date.now() });
  saveToDisk(localRooms);
  return updated;
}

