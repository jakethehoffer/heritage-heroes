var Sfx = (function () {
  // Web Audio API synthesis — no external sound files required.
  // All sounds are generated programmatically via AudioContext.

  let ctx = null;        // AudioContext, created lazily
  let masterGain = null; // GainNode wired to ctx.destination
  let muted = true;
  let unlocked = false;  // whether AudioContext has been resumed after user gesture

  // ── Context bootstrap ──────────────────────────────────────────────────────

  function getCtx() {
    if (ctx) return ctx;
    const AC = (typeof window !== "undefined") &&
               (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.5;
      masterGain.connect(ctx.destination);
    } catch (_) {
      ctx = null;
    }
    return ctx;
  }

  function ensureUnlocked() {
    if (unlocked || !ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    unlocked = true;
  }

  // Install a one-time click listener so the first user interaction unlocks audio.
  function installUnlockListener() {
    if (typeof document === "undefined") return;
    function handler() {
      getCtx();
      ensureUnlocked();
      document.removeEventListener("click", handler, true);
    }
    document.addEventListener("click", handler, true);
  }

  // ── Low-level synthesis helpers ────────────────────────────────────────────

  /**
   * White noise through a biquad filter with a sharp gain envelope.
   * @param {AudioContext} c
   * @param {number} t0      - start time (AudioContext time)
   * @param {number} duration - seconds
   * @param {number|{start:number,end:number}} filterFreq - Hz, or {start,end} for linear ramp
   * @param {string} filterType - BiquadFilterNode type string
   * @param {number} peakGain
   * @param {Object} [opts]
   * @param {number} [opts.attackTime=0.005]
   */
  function playNoise(c, t0, duration, filterFreq, filterType, peakGain, opts) {
    const attackTime = (opts && opts.attackTime != null) ? opts.attackTime : 0.005;
    const decayTime  = Math.max(0, duration - attackTime);

    // Build a white-noise buffer (one second, reused via looping)
    const bufLen = c.sampleRate;
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const filter = c.createBiquadFilter();
    filter.type = filterType || "lowpass";
    if (typeof filterFreq === "object" && filterFreq !== null) {
      filter.frequency.setValueAtTime(filterFreq.start, t0);
      filter.frequency.linearRampToValueAtTime(filterFreq.end, t0 + duration);
    } else {
      filter.frequency.setValueAtTime(filterFreq, t0);
    }

    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(peakGain, t0 + attackTime);
    env.gain.linearRampToValueAtTime(0, t0 + attackTime + decayTime);

    src.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    src.start(t0);
    src.stop(t0 + duration + 0.01);
  }

  /**
   * Oscillator with optional frequency ramp and gain envelope.
   * @param {AudioContext} c
   * @param {number} t0
   * @param {number} freqStart
   * @param {number} freqEnd
   * @param {number} duration  - seconds
   * @param {string} type      - OscillatorNode type
   * @param {number} peakGain
   * @param {Object} [opts]
   * @param {number} [opts.attackTime=0.005]
   * @param {number} [opts.detuneCents=0]
   * @param {OscillatorNode} [opts.vibratoLfo] - pre-connected modulator
   */
  function playTone(c, t0, freqStart, freqEnd, duration, type, peakGain, opts) {
    const attackTime  = (opts && opts.attackTime  != null) ? opts.attackTime  : 0.005;
    const detuneCents = (opts && opts.detuneCents != null) ? opts.detuneCents : 0;
    const decayTime   = Math.max(0, duration - attackTime);

    const osc = c.createOscillator();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd !== freqStart) {
      osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
    }
    if (detuneCents) osc.detune.setValueAtTime(detuneCents, t0);

    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(peakGain, t0 + attackTime);
    env.gain.linearRampToValueAtTime(0, t0 + attackTime + decayTime);

    if (opts && opts.vibratoLfo) {
      opts.vibratoLfo.connect(osc.frequency);
    }

    osc.connect(env);
    env.connect(masterGain);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /**
   * Play several tones simultaneously (chord).
   */
  function playChord(c, t0, freqs, duration, type, peakGain) {
    for (const f of freqs) {
      playTone(c, t0, f, f, duration, type, peakGain);
    }
  }

  /**
   * Play tones in sequence (arpeggio), staggered by noteDuration.
   */
  function playArpeggio(c, t0, freqs, noteDuration, type, peakGain) {
    freqs.forEach((f, i) => {
      playTone(c, t0 + i * noteDuration, f, f, noteDuration, type, peakGain);
    });
  }

  // ── Sound recipes ──────────────────────────────────────────────────────────
  // Each recipe is (c, t0) where c = AudioContext and t0 = ctx.currentTime.

  const RECIPES = {

    // Generic: sharp thwack — band-passed white noise
    attack(c, t0) {
      playNoise(c, t0, 0.12, 350, "bandpass", 0.6, { attackTime: 0.003 });
    },

    // Generic: metallic shing — descending sine + triangle harmonic
    defend(c, t0) {
      playTone(c, t0, 800, 400, 0.25, "sine",     0.4);
      playTone(c, t0, 800, 400, 0.25, "triangle", 0.2);
    },

    // Generic: major-chord arpeggio victory fanfare
    victory(c, t0) {
      // C5=523, E5=659, G5=784, C6=1047 — each 200ms, staggered 100ms
      playArpeggio(c, t0, [523, 659, 784, 1047], 0.1, "triangle", 0.4);
    },

    // Generic: low-impact damage thud
    hit(c, t0) {
      playNoise(c, t0, 0.10, 80, "lowpass", 0.5, { attackTime: 0.003 });
    },

    // Einstein charge tick: brief rising chirp
    chargeTick(c, t0) {
      playTone(c, t0, 200, 600, 0.2, "sine", 0.3);
    },

    // Trivia correct: cheerful major third up (E5 → G5)
    triviaCorrect(c, t0) {
      playTone(c, t0,       659, 659, 0.15, "sine", 0.35);
      playTone(c, t0 + 0.15, 784, 784, 0.15, "sine", 0.35);
    },

    // Trivia wrong: descending minor second (A4 → G#4)
    triviaWrong(c, t0) {
      playTone(c, t0,       440, 440, 0.20, "sine", 0.3);
      playTone(c, t0 + 0.20, 415, 415, 0.20, "sine", 0.3);
    },

    // Achievement: triumphant ascending arpeggio (overlapping)
    achievement(c, t0) {
      // Stagger by 90ms so notes overlap: C5, E5, G5, C6
      playArpeggio(c, t0, [523, 659, 784, 1047], 0.09, "triangle", 0.45);
    },

    // UI tick: subtle square click
    buttonClick(c, t0) {
      playTone(c, t0, 1000, 1000, 0.025, "square", 0.15);
    },

    // ── Per-hero specials ──────────────────────────────────────────────────

    // Moses — Part the Sea: low rumble + crashing wave
    moses(c, t0) {
      // Layer 1: deep sine rumble for 800ms
      playTone(c, t0, 60, 60, 0.8, "sine", 0.3);
      // Layer 2: white noise low-passed, filter descending from 600→200Hz, starts at 300ms
      playNoise(c, t0 + 0.3, 0.5, { start: 600, end: 200 }, "lowpass", 0.5);
    },

    // David — Sling Stone: whoosh + impact thud
    david(c, t0) {
      // Layer 1: band-pass noise sweep 200→1500Hz over 250ms (the whoosh)
      playNoise(c, t0, 0.25, { start: 200, end: 1500 }, "bandpass", 0.4);
      // Layer 2: low-pass noise burst at 80Hz, 150ms (the thud)
      playNoise(c, t0 + 0.25, 0.15, 80, "lowpass", 0.5, { attackTime: 0.003 });
    },

    // Esther — Reversal: ethereal shimmer — A major chord with vibrato
    esther(c, t0) {
      // A major: A4 (440), C#5 (554), E5 (659)
      // Each voice gets ±5 cents detune and a 5Hz LFO for vibrato
      const voices = [
        { freq: 440, detune: -5 },
        { freq: 554, detune: +5 },
        { freq: 659, detune: -5 }
      ];
      for (const v of voices) {
        // Build a vibrato LFO
        const lfo = c.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(5, t0);
        const lfoGain = c.createGain();
        lfoGain.gain.setValueAtTime(8, t0); // ±8 Hz modulation depth
        lfo.connect(lfoGain);
        lfo.start(t0);
        lfo.stop(t0 + 0.75);

        playTone(c, t0, v.freq, v.freq, 0.7, "sine", 0.25, {
          attackTime: 0.05,
          detuneCents: v.detune,
          vibratoLfo: lfoGain
        });
      }
    },

    // Judah — Menorah Flame: fire crackle + bell
    judah(c, t0) {
      // Layer 1: high-pass noise with 3 short bursts over 500ms
      for (let i = 0; i < 3; i++) {
        const burstStart = t0 + i * 0.15;
        playNoise(c, burstStart, 0.08, 2000, "highpass", 0.3, { attackTime: 0.005 });
      }
      // Layer 2: bell — sine 880Hz with long exponential-like decay
      playTone(c, t0 + 0.5, 880, 880, 0.6, "sine", 0.4, { attackTime: 0.002 });
    },

    // Rambam — Healing Touch: gentle rising C major chord
    rambam(c, t0) {
      // C5=523, E5=659, G5=784 — slow 100ms attack, chorus via ±3 cents
      const voices = [
        { freq: 523, detune: -3 },
        { freq: 659, detune: +3 },
        { freq: 784, detune: -3 }
      ];
      for (const v of voices) {
        playTone(c, t0, v.freq, v.freq, 0.8, "sine", 0.3, {
          attackTime: 0.1,
          detuneCents: v.detune
        });
      }
    },

    // Golda — Resolve: power chord — perfect fifth sawtooth + low-pass filter
    golda(c, t0) {
      // A3=220, E4=330 — sawtooth, filtered at 1500Hz, brief amplitude swell
      const freqs = [220, 330];
      for (const f of freqs) {
        const osc  = c.createOscillator();
        osc.type   = "sawtooth";
        osc.frequency.setValueAtTime(f, t0);

        const filt  = c.createBiquadFilter();
        filt.type   = "lowpass";
        filt.frequency.setValueAtTime(1500, t0);

        const env = c.createGain();
        // Brief amplitude swell: fast rise, slow decay
        env.gain.setValueAtTime(0,    t0);
        env.gain.linearRampToValueAtTime(0.35, t0 + 0.05);
        env.gain.linearRampToValueAtTime(0,    t0 + 0.5);

        osc.connect(filt);
        filt.connect(env);
        env.connect(masterGain);

        osc.start(t0);
        osc.stop(t0 + 0.55);
      }
    },

    // Einstein — E=mc²: rising sine sweep (charge ramp) + explosion burst
    einstein(c, t0) {
      // Layer 1: sine ramp 100→2000Hz over 800ms (the charge)
      playTone(c, t0, 100, 2000, 0.8, "sine", 0.4);
      // Layer 2: white noise burst at 800ms, low-pass descending 4000→200Hz, 400ms (explosion)
      playNoise(c, t0 + 0.8, 0.4, { start: 4000, end: 200 }, "lowpass", 0.7, { attackTime: 0.005 });
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  function preload() {
    getCtx();             // Create context eagerly
    installUnlockListener();
  }

  function play(id) {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    ensureUnlocked();
    const recipe = RECIPES[id];
    if (!recipe) return;
    try {
      recipe(c, c.currentTime);
    } catch (_) { /* silently ignore synthesis errors */ }
  }

  function setMuted(value) {
    muted = !!value;
    if (masterGain) {
      masterGain.gain.setValueAtTime(muted ? 0 : 0.5, ctx ? ctx.currentTime : 0);
    }
  }

  function isMuted() { return muted; }

  return { preload, play, setMuted, isMuted };
})();

if (typeof module !== "undefined") module.exports = Sfx;
