let sharedCtx: AudioContext | null = null;
let unlockRegistered = false;

function ensureAudioUnlocked() {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;
  const unlock = () => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctor();
      if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
    } catch {
      // ignore
    }
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

if (typeof window !== "undefined") {
  ensureAudioUnlocked();
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ensureAudioUnlocked();
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctor();
    if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
    return sharedCtx;
  } catch {
    return null;
  }
}

export function playTones(
  freqs: number[],
  stepSec = 0.09,
  gainValue = 0.12,
  type: OscillatorType = "sine"
) {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = start + i * stepSec;
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + stepSec * 0.95);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + stepSec);
  });
}

export const callSfx = {
  mute: () => playTones([520, 340]),
  unmute: () => playTones([340, 520]),
  deafen: () => playTones([440, 330, 220], 0.08),
  undeafen: () => playTones([220, 330, 440], 0.08),
  connected: () => playTones([523, 659, 784], 0.1),
  ended: () => playTones([659, 523, 392], 0.12),
  screenOn: () => playTones([600, 800], 0.08),
  screenOff: () => playTones([800, 600], 0.08),
};

/** Çalma sesi: "incoming" (karşıdan gelen arama) veya "outgoing" (arıyor sesi). */
export function startRing(kind: "incoming" | "outgoing"): () => void {
  const ring = () => {
    if (kind === "incoming") {
      playTones([784, 988, 784, 988], 0.16, 0.18);
    } else {
      playTones([425, 425], 0.42, 0.1);
    }
  };
  ring();
  const interval = setInterval(ring, kind === "incoming" ? 1800 : 2800);
  return () => clearInterval(interval);
}
