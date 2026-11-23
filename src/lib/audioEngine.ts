// Web Audio API tabanlı çoklu enstrüman & melodi motoru.
// Her şarkı adına göre farklı tempo, gam, bas hattı ve enstrüman tınısı üretir.
// YouTube veya Spotify linki girildiğinde ise gerçek YouTube/Spotify embed çalar.

type MoodType = "melancholy" | "night" | "hope" | "rain";

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public start(
    mood: MoodType = "night",
    volume = 0.16,
    seedTitle = "default"
  ) {
    this.stop();
    const ctx = this.getContext();
    if (!ctx) return;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(
      volume,
      ctx.currentTime + 0.3
    );
    this.masterGain.connect(ctx.destination);

    const h = hashString(seedTitle.toLowerCase());
    // 6 farklı şarkı karakteri (farklı tempo, bas ve melodi kalıbı)
    const stepMsList = [320, 420, 520, 380, 460, 350];
    const stepMs = stepMsList[h % stepMsList.length];

    const scales: Record<MoodType, number[]> = {
      melancholy: [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440],
      night: [196, 220, 233.08, 261.63, 293.66, 311.13, 349.23, 392],
      hope: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
      rain: [185, 207.65, 220, 246.94, 277.18, 329.63, 369.99, 440],
    };

    const scale = scales[mood] || scales.night;
    const patterns = [
      [0, 2, 4, 7, 4, 2, 5, 3],
      [0, 4, 2, 5, 3, 7, 4, 1],
      [7, 5, 4, 2, 0, 2, 4, 6],
      [0, 1, 3, 4, 6, 4, 3, 2],
      [2, 4, 6, 7, 5, 3, 1, 0],
    ];
    const pattern = patterns[(h >>> 3) % patterns.length] || patterns[0];
    const transpose = [0.85, 0.95, 1.0, 1.08, 1.15][(h >>> 5) % 5] || 1.0;
    const leadTypes: OscillatorType[] = ["sine", "triangle", "square", "triangle"];
    const leadType = leadTypes[(h >>> 7) % leadTypes.length] || "sine";

    let tick = 0;

    const playStep = () => {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const noteIdx = pattern[tick % pattern.length];
      const freq = scale[noteIdx % scale.length] * transpose;

      // Melodi notası
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = leadType;
      osc.frequency.setValueAtTime(freq, now);

      const dur = (stepMs / 1000) * 1.4;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(
        leadType === "square" ? 0.06 : 0.18,
        now + 0.03
      );
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);

      // Her 4 vuruşta bir sıcak bas notası
      if (tick % 4 === 0) {
        const bass = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        bass.type = "sine";
        bass.frequency.setValueAtTime((freq / 2), now);
        bg.gain.setValueAtTime(0.001, now);
        bg.gain.linearRampToValueAtTime(0.22, now + 0.06);
        bg.gain.exponentialRampToValueAtTime(0.001, now + dur * 2.2);
        bass.connect(bg);
        bg.connect(this.masterGain);
        bass.start(now);
        bass.stop(now + dur * 2.3);
      }

      tick++;
    };

    this.isPlaying = true;
    playStep();
    this.intervalId = setInterval(playStep, stepMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.exponentialRampToValueAtTime(
          0.0001,
          this.ctx.currentTime + 0.15
        );
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
  }

  public setVolume(vol: number) {
    const safeVol = Math.max(0, Math.min(1, vol)) * 0.25;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(
          safeVol,
          this.ctx.currentTime,
          0.05
        );
      } catch {
        // ignore
      }
    }
  }

  public getIsPlaying() {
    return this.isPlaying;
  }
}

export const audioEngine = new AmbientAudioEngine();
