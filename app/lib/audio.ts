import { useClassroomStore } from "../store/useClassroomStore";

type SFXName = "correct" | "wrong" | "tick" | "times-up" | "twist";

export const playSFX = (name: SFXName) => {
  if (typeof window === "undefined") return;
  
  const { soundEnabled } = useClassroomStore.getState();
  if (!soundEnabled) return;

  const audio = new Audio(`/sounds/${name}.mp3`);
  audio.volume = 0.5; // Default volume 50%
  audio.play().catch((err) => {
    // Chrome and other browsers block autoplay until user interaction
    console.warn("Sound playback blocked by browser:", err);
  });
};
