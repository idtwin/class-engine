/**
 * Haptic feedback helper with progressive fallback.
 * Uses Web Vibration API when available on mobile devices.
 */

export type HapticPattern = "tap" | "buzz" | "success" | "failure" | "lockout" | "ping" | "burst" | "warning";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 15,
  buzz: [40, 25, 40],
  burst: [30, 20, 30, 20, 50],
  warning: [50, 50, 50],
  success: [30, 40, 60],
  failure: [70, 40, 70, 40, 100],
  lockout: [120, 60, 120],
  ping: 25,
};

export function triggerHaptic(pattern: HapticPattern = "tap") {
  if (typeof window === "undefined" || !("vibrate" in navigator)) {
    return;
  }
  try {
    const sequence = PATTERNS[pattern];
    navigator.vibrate(sequence);
  } catch {
    // Ignore permissions or browser policy issues
  }
}
