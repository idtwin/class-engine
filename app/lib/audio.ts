import { useClassroomStore } from "../store/useClassroomStore";

export type SFXName = "correct" | "wrong" | "tick" | "times-up" | "twist";

// Registry to track active sound instances
const activeSounds: Partial<Record<SFXName, HTMLAudioElement>> = {};

export const playSFX = (name: SFXName) => {
  if (typeof window === "undefined") return;
  
  const { soundEnabled } = useClassroomStore.getState();
  if (!soundEnabled) return;

  // If a sound with the same name is already playing, stop it first
  if (activeSounds[name]) {
    activeSounds[name]!.pause();
    activeSounds[name]!.currentTime = 0;
  }

  const audio = new Audio(`/sounds/${name}.mp3`);
  audio.volume = 0.5;
  activeSounds[name] = audio;

  audio.play().catch((err) => {
    console.warn("Sound playback blocked by browser:", err);
  });

  // Remove from registry when finished playing
  audio.onended = () => {
    if (activeSounds[name] === audio) {
      delete activeSounds[name];
    }
  };
};

export const stopSFX = (name: SFXName) => {
  if (activeSounds[name]) {
    activeSounds[name]!.pause();
    activeSounds[name]!.currentTime = 0;
    delete activeSounds[name];
  }
};

export const stopAllSFX = () => {
  Object.keys(activeSounds).forEach((key) => {
    const name = key as SFXName;
    if (activeSounds[name]) {
      activeSounds[name]!.pause();
      activeSounds[name]!.currentTime = 0;
    }
  });
  // Clear the registry
  for (const name in activeSounds) {
    delete activeSounds[name as SFXName];
  }
};
