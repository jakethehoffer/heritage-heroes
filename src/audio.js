var Sfx = (function () {
  // Web Audio API synthesis — no external sound files required.
  // All sounds are generated programmatically via AudioContext.

  let ctx = null;        // AudioContext, created lazily
  let masterGain = null; // GainNode wired to ctx.destination
  let musicGain  = null; // Separate gain node for ambient music (quieter than SFX)
  let muted = true;      // legacy; kept in sync with sfxMuted for backward compat
  let sfxMuted  = true;  // controls SFX (masterGain)
  let musicMuted = false; // controls music (musicGain)
  let unlocked = false;  // whether AudioContext has been resumed after user gesture

  // Volume levels (0..1 multipliers, computed from 0-100 save values).
  // Effective music gain = masterLevel * musicLevel * MUSIC_MASTER_VOLUME
  // Effective SFX   gain = masterLevel * sfxLevel   * 0.5
  let masterLevel = 1;
  let musicLevel  = 1;
  let sfxLevel    = 1;

  // ── Music state ────────────────────────────────────────────────────────────
  let activeMusicNodes = [];   // oscillators/sources currently playing
  let activeMusicStage = null; // current stage id, prevents restarts when unchanged

  const MUSIC_MASTER_VOLUME = 0.15; // much quieter than SFX master (0.5)

  // ── Context bootstrap ──────────────────────────────────────────────────────

  function getCtx() {
    if (ctx) return ctx;
    const AC = (typeof window !== "undefined") &&
               (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = sfxMuted ? 0 : (masterLevel * sfxLevel * 0.5);
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0; // always starts at 0; fade in via playMusic
      musicGain.connect(ctx.destination);
    } catch (_) {
      ctx = null;
    }
    return ctx;
  }

  // ── Volume helpers ─────────────────────────────────────────────────────────

  function clamp01(x) {
    if (typeof x !== "number" || !isFinite(x)) return 1;
    return Math.max(0, Math.min(1, x));
  }

  // Effective music-gain target when not muted and music is currently playing.
  function _targetMusicGain() {
    return masterLevel * musicLevel * MUSIC_MASTER_VOLUME;
  }

  // Recompute and apply gain.value on both nodes. Safe before ctx exists (no-op).
  function _applyGains() {
    if (!ctx) return;
    if (masterGain) {
      masterGain.gain.value = sfxMuted ? 0 : (masterLevel * sfxLevel * 0.5);
    }
    if (musicGain) {
      // Music gain is only "live" when a track is playing — leave it at 0 otherwise
      // so we don't get a click on the next playMusic fade-in.
      musicGain.gain.value = musicMuted
        ? 0
        : (activeMusicStage ? _targetMusicGain() : 0);
    }
  }

  function setMasterVolume(pct) {
    masterLevel = clamp01((typeof pct === "number" ? pct : 100) / 100);
    _applyGains();
  }

  function setMusicVolume(pct) {
    musicLevel = clamp01((typeof pct === "number" ? pct : 100) / 100);
    _applyGains();
  }

  function setSfxVolume(pct) {
    sfxLevel = clamp01((typeof pct === "number" ? pct : 100) / 100);
    _applyGains();
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

  // ── Music recipes ──────────────────────────────────────────────────────────
  // Each recipe is (c, mg) where c = AudioContext, mg = musicGain destination node.
  // Returns an array of oscillator/source nodes for later cleanup.
  // Uses option 1 for accent scheduling: pre-schedule 60 seconds of accents up-front.

  const MUSIC_RECIPES = {

    // redsea (Moses) — Aquatic, vast, peaceful
    redsea(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine 80 Hz
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(80, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.3, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Pad: A3 (220 Hz) + E4 (330 Hz) — open fifth
      const padFreqs = [220, 330];
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.15, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // LFO: 0.2 Hz modulating the pad's frequency ±4 Hz (wave-like vibrato)
      // Attach to first pad oscillator (220 Hz)
      const lfo = c.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.2, t0);
      const lfoGain = c.createGain();
      lfoGain.gain.setValueAtTime(4, t0);
      lfo.connect(lfoGain);
      // Connect LFO to frequency of both pad oscs (nodes[2] and nodes[4] are the pad oscs)
      lfoGain.connect(nodes[2].frequency);
      lfoGain.connect(nodes[4].frequency);
      lfo.start(t0);
      nodes.push(lfo, lfoGain);

      // Sparse accent: bell tone at 880 Hz every 4 seconds, 0.8s duration
      // Pre-schedule 60 seconds worth (15 bells)
      for (let i = 0; i < 15; i++) {
        const bt = t0 + i * 4;
        const bellOsc = c.createOscillator();
        bellOsc.type = "sine";
        bellOsc.frequency.setValueAtTime(880, bt);
        const bellGain = c.createGain();
        bellGain.gain.setValueAtTime(0, bt);
        bellGain.gain.linearRampToValueAtTime(0.1, bt + 0.1);  // slow attack
        bellGain.gain.linearRampToValueAtTime(0, bt + 0.8);    // long decay
        bellOsc.connect(bellGain);
        bellGain.connect(mg);
        bellOsc.start(bt);
        bellOsc.stop(bt + 0.85);
        nodes.push(bellOsc, bellGain);
      }

      return nodes;
    },

    // elah (David) — Pastoral, hopeful, major
    elah(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine C3 (130.8 Hz)
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(130.8, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.3, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Pad: C major triad — C4 (261.6), E4 (329.6), G4 (392)
      const padFreqs = [261.6, 329.6, 392];
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.12, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // Sparse arpeggio: pluck-like at C5/E5/G5/C5 cycling every 6 seconds
      // 4 notes x 0.4s each = 1.6s of notes per cycle
      const arpeggioFreqs = [523.25, 659.25, 784, 523.25]; // C5, E5, G5, C5
      const arpCycle = 6; // seconds between arpeggio starts
      const arpCount = Math.floor(60 / arpCycle); // ~10 cycles
      for (let cycle = 0; cycle < arpCount; cycle++) {
        for (let note = 0; note < arpeggioFreqs.length; note++) {
          const nt = t0 + cycle * arpCycle + note * 0.4;
          const arpOsc = c.createOscillator();
          arpOsc.type = "triangle";
          arpOsc.frequency.setValueAtTime(arpeggioFreqs[note], nt);
          const arpGain = c.createGain();
          arpGain.gain.setValueAtTime(0, nt);
          arpGain.gain.linearRampToValueAtTime(0.1, nt + 0.02);  // pluck attack
          arpGain.gain.linearRampToValueAtTime(0, nt + 0.4);
          arpOsc.connect(arpGain);
          arpGain.connect(mg);
          arpOsc.start(nt);
          arpOsc.stop(nt + 0.42);
          nodes.push(arpOsc, arpGain);
        }
      }

      return nodes;
    },

    // throne (Esther) — Royal, mysterious, minor with eastern flavor
    throne(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sawtooth A2 (110 Hz) — slightly aggressive timbre
      const droneOsc = c.createOscillator();
      droneOsc.type = "sawtooth";
      droneOsc.frequency.setValueAtTime(110, t0);
      const droneFilt = c.createBiquadFilter();
      droneFilt.type = "lowpass";
      droneFilt.frequency.setValueAtTime(800, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.2, t0);
      droneOsc.connect(droneFilt);
      droneFilt.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneFilt, droneGain);

      // Pad: A3 (220 Hz) + C4 (261.6 Hz) — minor second, tense interval
      const padFreqs = [220, 261.6];
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.10, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // Slow ascending phrase: every 8 seconds, A4→B4→C5→D5 (0.5s each)
      const phraseFreqs = [440, 493.88, 523.25, 587.33]; // A4, B4, C5, D5
      const phraseCycle = 8;
      const phraseCount = Math.floor(60 / phraseCycle); // ~7 cycles
      for (let cycle = 0; cycle < phraseCount; cycle++) {
        for (let note = 0; note < phraseFreqs.length; note++) {
          const nt = t0 + cycle * phraseCycle + note * 0.5;
          const pOsc = c.createOscillator();
          pOsc.type = "triangle";
          pOsc.frequency.setValueAtTime(phraseFreqs[note], nt);
          const pGain = c.createGain();
          pGain.gain.setValueAtTime(0, nt);
          pGain.gain.linearRampToValueAtTime(0.08, nt + 0.08);
          pGain.gain.linearRampToValueAtTime(0, nt + 0.5);
          pOsc.connect(pGain);
          pGain.connect(mg);
          pOsc.start(nt);
          pOsc.stop(nt + 0.52);
          nodes.push(pOsc, pGain);
        }
      }

      return nodes;
    },

    // temple (Judah) — Solemn, triumphant, open
    temple(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine 110 Hz (A2)
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(110, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.3, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Pad: A3 (220 Hz) + E4 (329.6 Hz) — open fifth
      const padFreqs = [220, 329.6];
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.15, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // Bell accents: E6 (1320 Hz) every 5 seconds, exponential-like decay 1s
      const bellCycle = 5;
      const bellCount = Math.floor(60 / bellCycle); // 12 bells
      for (let i = 0; i < bellCount; i++) {
        const bt = t0 + i * bellCycle;
        const bellOsc = c.createOscillator();
        bellOsc.type = "sine";
        bellOsc.frequency.setValueAtTime(1320, bt);
        const bellGain = c.createGain();
        bellGain.gain.setValueAtTime(0, bt);
        bellGain.gain.linearRampToValueAtTime(0.12, bt + 0.005); // very fast attack
        bellGain.gain.linearRampToValueAtTime(0, bt + 1.0);      // 1s decay
        bellOsc.connect(bellGain);
        bellGain.connect(mg);
        bellOsc.start(bt);
        bellOsc.stop(bt + 1.05);
        nodes.push(bellOsc, bellGain);
      }

      return nodes;
    },

    // cordoba (Rambam) — Contemplative, ancient, modal
    cordoba(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine F2 (87.3 Hz)
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(87.3, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.3, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Pad: F3 (175 Hz) + G#3 (207.7 Hz) + A3 (220 Hz) — Phrygian flavor
      const padFreqs = [175, 207.7, 220];  // closer spacing = modal tension
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.10, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // Sparse oud-like notes: every 7 seconds, Bb4 (466 Hz) → G#4 (415 Hz), 0.6s each
      const oudFreqs = [466, 415]; // Bb4, G#4
      const oudCycle = 7;
      const oudCount = Math.floor(60 / oudCycle); // ~8 cycles
      for (let cycle = 0; cycle < oudCount; cycle++) {
        for (let note = 0; note < oudFreqs.length; note++) {
          const nt = t0 + cycle * oudCycle + note * 0.6;
          const oudOsc = c.createOscillator();
          oudOsc.type = "triangle";
          oudOsc.frequency.setValueAtTime(oudFreqs[note], nt);
          const oudGain = c.createGain();
          oudGain.gain.setValueAtTime(0, nt);
          oudGain.gain.linearRampToValueAtTime(0.08, nt + 0.03);
          oudGain.gain.linearRampToValueAtTime(0, nt + 0.6);
          oudOsc.connect(oudGain);
          oudGain.connect(mg);
          oudOsc.start(nt);
          oudOsc.stop(nt + 0.62);
          nodes.push(oudOsc, oudGain);
        }
      }

      return nodes;
    },

    // knesset (Golda) — Determined, modern, minor mode
    knesset(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine A2 (110 Hz)
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(110, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.25, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Pad: A minor triad — A3 (220), C4 (261.6), E4 (329.6)
      const padFreqs = [220, 261.6, 329.6];
      for (const f of padFreqs) {
        const padOsc = c.createOscillator();
        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, t0);
        const padGain = c.createGain();
        padGain.gain.setValueAtTime(0.10, t0);
        padOsc.connect(padGain);
        padGain.connect(mg);
        padOsc.start(t0);
        nodes.push(padOsc, padGain);
      }

      // Heartbeat pulse: triangle 110 Hz repeating every 2 seconds for 0.2s
      const pulseCycle = 2;
      const pulseCount = Math.floor(60 / pulseCycle); // 30 pulses
      for (let i = 0; i < pulseCount; i++) {
        const pt = t0 + i * pulseCycle;
        const pulseOsc = c.createOscillator();
        pulseOsc.type = "triangle";
        pulseOsc.frequency.setValueAtTime(110, pt);
        const pulseGain = c.createGain();
        pulseGain.gain.setValueAtTime(0, pt);
        pulseGain.gain.linearRampToValueAtTime(0.12, pt + 0.02);
        pulseGain.gain.linearRampToValueAtTime(0, pt + 0.2);
        pulseOsc.connect(pulseGain);
        pulseGain.connect(mg);
        pulseOsc.start(pt);
        pulseOsc.stop(pt + 0.22);
        nodes.push(pulseOsc, pulseGain);
      }

      return nodes;
    },

    // princeton (Einstein) — Cerebral, minimalist, modern
    princeton(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;

      // Drone: sine C3 (130.8 Hz), very quiet
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(130.8, t0);
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0.15, t0);
      droneOsc.connect(droneGain);
      droneGain.connect(mg);
      droneOsc.start(t0);
      nodes.push(droneOsc, droneGain);

      // Mid drone: sine C4 (261.6 Hz)
      const midOsc = c.createOscillator();
      midOsc.type = "sine";
      midOsc.frequency.setValueAtTime(261.6, t0);
      const midGain = c.createGain();
      midGain.gain.setValueAtTime(0.10, t0);
      midOsc.connect(midGain);
      midGain.connect(mg);
      midOsc.start(t0);
      nodes.push(midOsc, midGain);

      // Sparse high notes: triangle from C5/D5/E5/G5/A5, every 4-6 seconds (alternating 4/6)
      const highFreqs = [523.25, 587.33, 659.25, 784, 880]; // C5, D5, E5, G5, A5
      let elapsed = 0;
      let freqIdx = 0;
      while (elapsed < 60) {
        const nt = t0 + elapsed;
        const noteFreq = highFreqs[freqIdx % highFreqs.length];
        const interval = (freqIdx % 2 === 0) ? 4 : 6; // alternate 4s and 6s

        const hOsc = c.createOscillator();
        hOsc.type = "triangle";
        hOsc.frequency.setValueAtTime(noteFreq, nt);
        const hGain = c.createGain();
        hGain.gain.setValueAtTime(0, nt);
        hGain.gain.linearRampToValueAtTime(0.10, nt + 0.4);  // slow attack
        hGain.gain.linearRampToValueAtTime(0, nt + 1.0);     // slow decay
        hOsc.connect(hGain);
        hGain.connect(mg);
        hOsc.start(nt);
        hOsc.stop(nt + 1.05);
        nodes.push(hOsc, hGain);

        elapsed += interval;
        freqIdx++;
      }

      return nodes;
    }
  };

  // ── Music playback ─────────────────────────────────────────────────────────

  function playMusic(stageId) {
    // No-op if same stage is already playing
    if (activeMusicStage === stageId && activeMusicNodes.length > 0) return;

    const c = getCtx();
    if (!c) return;
    ensureUnlocked();
    if (c.state === "suspended") return; // not yet unlocked by user gesture

    const recipe = MUSIC_RECIPES[stageId];
    if (!recipe) return; // graceful: unknown stage

    // Fade out any currently-playing music
    if (activeMusicNodes.length > 0) {
      const oldNodes = activeMusicNodes.slice();
      const now = c.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0, now + 0.8);
      window.setTimeout(function () {
        for (const node of oldNodes) {
          try { node.stop && node.stop(); } catch (_) {}
          try { node.disconnect(); } catch (_) {}
        }
      }, 850);
    }

    // Start new recipe
    let newNodes;
    try {
      newNodes = recipe(c, musicGain);
    } catch (_) {
      return;
    }

    activeMusicNodes = newNodes || [];
    activeMusicStage = stageId;

    // Fade in
    const now = c.currentTime;
    const targetVol = musicMuted ? 0 : _targetMusicGain();
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(0, now);
    if (!musicMuted) {
      musicGain.gain.linearRampToValueAtTime(targetVol, now + 1.5);
    }
  }

  function stopMusic() {
    if (!ctx || activeMusicNodes.length === 0) return;

    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0, now + 0.8);

    const nodesToStop = activeMusicNodes.slice();
    activeMusicNodes = [];
    activeMusicStage = null;

    window.setTimeout(function () {
      for (const node of nodesToStop) {
        try { node.stop && node.stop(); } catch (_) {}
        try { node.disconnect(); } catch (_) {}
      }
    }, 850);
  }

  function getActiveMusicStage() {
    return activeMusicStage;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function preload() {
    getCtx();             // Create context eagerly
    installUnlockListener();
  }

  function play(id) {
    if (sfxMuted) return;
    const c = getCtx();
    if (!c) return;
    ensureUnlocked();
    const recipe = RECIPES[id];
    if (!recipe) return;
    try {
      recipe(c, c.currentTime);
    } catch (_) { /* silently ignore synthesis errors */ }
  }

  function setSfxMuted(value) {
    sfxMuted = !!value;
    muted = sfxMuted; // keep legacy flag in sync
    // Use setValueAtTime so any scheduled ramps don't overwrite the mute.
    if (masterGain && ctx) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(sfxMuted ? 0 : (masterLevel * sfxLevel * 0.5), ctx.currentTime);
    } else {
      _applyGains();
    }
  }

  function setMusicMuted(value) {
    musicMuted = !!value;
    if (musicGain && ctx) {
      const now = ctx.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      const target = musicMuted
        ? 0
        : (activeMusicStage ? _targetMusicGain() : 0);
      musicGain.gain.setValueAtTime(target, now);
    } else {
      _applyGains();
    }
  }

  function setMuted(value) {
    setSfxMuted(value);
    setMusicMuted(value);
  }

  function isMuted() { return sfxMuted && musicMuted; }

  return {
    preload, play, setMuted, setSfxMuted, setMusicMuted, isMuted,
    playMusic, stopMusic, getActiveMusicStage,
    setMasterVolume, setMusicVolume, setSfxVolume,
    // expose levels for tests (underscore-prefixed)
    _getLevels: function () { return { master: masterLevel, music: musicLevel, sfx: sfxLevel }; }
  };
})();

if (typeof module !== "undefined") module.exports = Sfx;
