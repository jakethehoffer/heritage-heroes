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

    // Victory: shofar-flavored stinger (Tekiah-Shevarim-Tekiah Gedolah pattern).
    // Sawtooth gives the rough, reedy character of a shofar's overtones.
    victory(c, t0) {
      // 1. Opening Tekiah — short blast on A3 (220 Hz)
      playTone(c, t0, 220, 220, 0.18, "sawtooth", 0.25, { attackTime: 0.02 });
      // Add a fifth harmonic to thicken the call
      playTone(c, t0, 330, 330, 0.18, "triangle", 0.12, { attackTime: 0.02 });

      // 2. Shevarim — three short broken notes on B3 (247 Hz)
      for (let i = 0; i < 3; i++) {
        playTone(c, t0 + 0.25 + i * 0.15, 247, 247, 0.12, "sawtooth", 0.22, { attackTime: 0.02 });
      }

      // 3. Tekiah Gedolah — long ascending sustained blast A3 → E4
      playTone(c, t0 + 0.95, 220, 330, 1.2, "sawtooth", 0.30, { attackTime: 0.05 });
      // Octave shimmer up top for the climax
      playTone(c, t0 + 1.10, 440, 660, 1.05, "triangle", 0.15, { attackTime: 0.08 });
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

  // ── Jewish music helpers ───────────────────────────────────────────────────
  // Tools for authoring music in characteristic Jewish modes. All MUSIC_RECIPES
  // below are built from these helpers — author melodies as [degree, beats]
  // pairs against a named scale instead of raw frequencies.

  // Note frequency from MIDI number (A4 = MIDI 69 = 440 Hz, equal temperament).
  function noteHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Scale interval definitions (semitones from tonic).
  // Each scale is a 1-octave template; degreeToMidi() handles octave wrapping.
  const SCALES = {
    freygish:    [0, 1, 4, 5, 7, 8, 10],   // Phrygian dominant — THE klezmer sound
    miSheberach: [0, 2, 3, 6, 7, 8, 10],   // Ukrainian minor — liturgical / soulful
    adonai:      [0, 2, 4, 5, 7, 9, 10],   // Mixolydian-ish — pastoral
    magenAvot:   [0, 2, 3, 5, 7, 8, 11],   // Harmonic minor — Sephardic liturgy
    hijaz:       [0, 1, 4, 5, 7, 9, 10],   // Middle Eastern — Persian/Sephardic
    pentaMinor:  [0, 3, 5, 7, 10],         // Pentatonic minor — ancient, harp-like
    israeliMin:  [0, 2, 3, 5, 7, 8, 10]    // Modern Israeli minor — hora feel
  };

  // Convert a 1-based scale degree to a MIDI note relative to a root.
  // Degree 1 = tonic, degree 8 = octave above tonic. Negative degrees go below.
  function degreeToMidi(scaleName, rootMidi, degree) {
    const scale = SCALES[scaleName];
    if (!scale) return rootMidi;
    const octaveOffset = Math.floor((degree - 1) / scale.length);
    const idx = ((degree - 1) % scale.length + scale.length) % scale.length;
    return rootMidi + 12 * octaveOffset + scale[idx];
  }

  // Schedule a single melodic note with attack / sustain / release envelope.
  // Pushes the oscillator + gain nodes into `nodes` for later cleanup.
  function _scheduleNote(c, mg, nodes, t, freq, duration, type, peakGain, attack, release) {
    type = type || "sine";
    peakGain = (peakGain == null) ? 0.1 : peakGain;
    attack = (attack == null) ? 0.02 : attack;
    release = (release == null) ? 0.15 : release;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peakGain, t + attack);
    // Hold the peak until just before release begins, then ramp to 0.
    const sustainEnd = t + Math.max(attack, duration - release);
    g.gain.setValueAtTime(peakGain, sustainEnd);
    g.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(g);
    g.connect(mg);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    nodes.push(osc, g);
  }

  // Schedule a sequence of melodic notes as [degree, beats] pairs against a scale.
  // degree 0 = rest. The full phrase is repeated `loops` times.
  function _scheduleMelody(c, mg, nodes, t0, scaleName, rootMidi, beatSec, notes, opts) {
    opts = opts || {};
    const type = opts.type || "triangle";
    const peakGain = opts.peakGain != null ? opts.peakGain : 0.1;
    const loops = opts.loops || 1;
    const attack = opts.attack || 0.02;
    const release = opts.release || 0.2;
    let cursor = t0;
    for (let loop = 0; loop < loops; loop++) {
      for (const [degree, beats] of notes) {
        if (degree !== 0) {
          const midi = degreeToMidi(scaleName, rootMidi, degree);
          _scheduleNote(c, mg, nodes, cursor, noteHz(midi), beats * beatSec,
                        type, peakGain, attack, release);
        }
        cursor += beats * beatSec;
      }
    }
  }

  // Schedule a sustained drone of root + fifth (+ optional low octave).
  // Slow fade-in / fade-out so the drone doesn't click at the boundaries.
  function _scheduleDrone(c, mg, nodes, t0, duration, rootMidi, opts) {
    opts = opts || {};
    const peakGain = opts.peakGain != null ? opts.peakGain : 0.18;
    const type = opts.type || "sine";
    const freqs = [noteHz(rootMidi), noteHz(rootMidi + 7)];
    if (opts.lowOctave) freqs.push(noteHz(rootMidi - 12));
    for (const f of freqs) {
      const osc = c.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peakGain, t0 + 1.0);
      g.gain.setValueAtTime(peakGain, t0 + duration - 1.0);
      g.gain.linearRampToValueAtTime(0, t0 + duration);
      osc.connect(g);
      g.connect(mg);
      osc.start(t0);
      osc.stop(t0 + duration + 0.1);
      nodes.push(osc, g);
    }
  }

  // ── Music recipes ──────────────────────────────────────────────────────────
  // Each recipe is (c, mg) where c = AudioContext, mg = musicGain destination
  // node. Returns an array of oscillator/source nodes for later cleanup.
  // Pre-schedules ~60 seconds of music up-front; the playback loop never
  // mutates these after start, so all timing is deterministic.

  const MUSIC_RECIPES = {

    // redsea (Moses) — Mi Sheberach, slow ancient prayer.
    // Vast and chant-like, like a cantor leading a congregation.
    // ~40 BPM, D minor centered. Drone + sustained melodic phrase, no rhythm.
    redsea(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 50;       // D3 — low and ancient
      const beatSec  = 1.5;      // ~40 BPM, very slow

      // Long sustained drone — root, fifth, and low octave for breadth.
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi, {
        peakGain: 0.16, lowOctave: true, type: "sine"
      });

      // Chant-like melody in Mi Sheberach: ascending climb, then resolves down
      // to the tonic. Final note (degree 1, 4 beats) provides a clean seam.
      const phrase = [
        [1, 2], [3, 2], [4, 1], [5, 3],
        [4, 1], [3, 2], [1, 4],
        [5, 1], [6, 1], [7, 2],
        [6, 2], [5, 2], [3, 2], [1, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 2, "miSheberach", rootMidi + 12, beatSec, phrase, {
        type: "sine", peakGain: 0.11, loops: 2, attack: 0.18, release: 0.5
      });

      // Soft upper-octave echo on alternating phrases for added depth.
      const echo = [
        [0, 8], [0, 6], [0, 4],
        [1, 2], [3, 2], [1, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 2, "miSheberach", rootMidi + 24, beatSec, echo, {
        type: "triangle", peakGain: 0.045, loops: 2, attack: 0.25, release: 0.6
      });

      return nodes;
    },

    // elah (David) — Pentatonic minor, harp-like and pastoral.
    // David the Psalmist plays his kinnor on the hills of Judea.
    // ~75 BPM, A minor pentatonic. Plucked-feel arpeggios over a soft drone.
    elah(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 57;       // A3
      const beatSec  = 0.8;      // ~75 BPM, walking pace

      // Soft drone — narrower than redsea, no low octave (keep it gentle).
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.13, lowOctave: false, type: "sine"
      });

      // Harp arpeggio: ascending pentatonic figures, like a kinnor's strings.
      // Triangle wave with very fast attack gives the plucked character.
      const arpeggio = [
        [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5],
        [5, 0.5], [4, 0.5], [3, 0.5], [2, 0.5],
        [1, 0.5], [3, 0.5], [5, 0.5], [6, 0.5],
        [5, 1], [3, 1], [1, 2]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 1, "pentaMinor", rootMidi + 12, beatSec, arpeggio, {
        type: "triangle", peakGain: 0.09, loops: 5, attack: 0.005, release: 0.25
      });

      // Lyrical counter-melody in the lower octave on offset timing —
      // suggests a singing voice over the harp.
      const lyric = [
        [0, 2], [1, 2], [3, 2], [2, 2],
        [1, 4], [0, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 5, "pentaMinor", rootMidi, beatSec, lyric, {
        type: "sine", peakGain: 0.075, loops: 4, attack: 0.15, release: 0.35
      });

      return nodes;
    },

    // throne (Esther) — Hijaz mode, Persian court mystery.
    // The augmented 2nd (b2 → 3) gives the iconic Middle Eastern flavor.
    // ~65 BPM, A3 root. Slow, ornamented, with chromatic neighbor flourishes.
    throne(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 57;       // A3
      const beatSec  = 0.92;     // ~65 BPM

      // Drone with low octave — gives the music a tonic anchor like a tanpura.
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.14, lowOctave: false, type: "sine"
      });

      // Ornamented Hijaz melody — emphasizes the flat 2nd (Bb) and major 3rd (C#)
      // that produce the augmented second leap (Bb → C#) characteristic of
      // Middle Eastern music. Includes grace-note style neighbor descents.
      const melody = [
        [1, 2], [2, 0.5], [3, 0.5], [4, 1], [3, 2],
        [2, 1], [1, 3],
        [5, 1], [6, 0.5], [5, 0.5], [4, 1], [3, 1],
        [2, 0.5], [3, 0.5], [2, 1], [1, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 1, "hijaz", rootMidi + 12, beatSec, melody, {
        type: "triangle", peakGain: 0.10, loops: 3, attack: 0.04, release: 0.3
      });

      // Chromatic ornaments scheduled as quick grace notes — every 4 seconds,
      // a brief upper-neighbor scratch (degree 5 → 6 → 5) for an oud-like flourish.
      const ornament = [
        [0, 7],
        [5, 0.25], [6, 0.25], [5, 0.5]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 3, "hijaz", rootMidi + 24, beatSec, ornament, {
        type: "sawtooth", peakGain: 0.05, loops: 6, attack: 0.01, release: 0.15
      });

      return nodes;
    },

    // temple (Judah) — Freygish, heroic Hanukkah march.
    // The Maccabees retake Jerusalem. ~120 BPM marching tempo, E freygish.
    // Pulsing bass + bold ascending melody. The freygish scale's b2 over a
    // major-third tonic chord gives the bittersweet victory feel.
    temple(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 52;       // E3
      const beatSec  = 0.5;      // 120 BPM marching tempo

      // Sustained low drone underneath the march for weight.
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.10, lowOctave: false, type: "sine"
      });

      // Marching bass on tonic and fifth: pulse-pulse-fifth-pulse pattern.
      const bass = [
        [1, 1], [1, 1], [5, 1], [1, 1]
      ];
      _scheduleMelody(c, mg, nodes, t0, "freygish", rootMidi, beatSec, bass, {
        type: "triangle", peakGain: 0.13, loops: 30, attack: 0.02, release: 0.12
      });

      // Heroic melody — ascending freygish line, then a higher answering phrase.
      // The leap from b2 to 3 (degrees 2 → 3) is the augmented second that says
      // "klezmer" before any other note even sounds.
      const melody = [
        [1, 1], [2, 0.5], [3, 0.5], [4, 1], [5, 1],
        [4, 0.5], [3, 0.5], [2, 1], [1, 2],
        [5, 1], [6, 0.5], [7, 0.5], [8, 1], [7, 1],
        [6, 0.5], [5, 0.5], [4, 1], [1, 2]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 0.5, "freygish", rootMidi + 12, beatSec, melody, {
        type: "sawtooth", peakGain: 0.085, loops: 4, attack: 0.015, release: 0.15
      });

      // Bright counter-melody an octave up for the second half — adds lift.
      const counter = [
        [0, 16],
        [5, 0.5], [6, 0.5], [5, 0.5], [4, 0.5], [3, 1], [1, 2],
        [0, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 8, "freygish", rootMidi + 24, beatSec, counter, {
        type: "triangle", peakGain: 0.055, loops: 3, attack: 0.02, release: 0.2
      });

      return nodes;
    },

    // cordoba (Maimonides) — Sephardic Andalusia, Magen Avot (harmonic minor).
    // Moorish-Jewish synthesis. Plucked oud feel via sawtooth with fast attack.
    // ~80 BPM, D root. The leading tone (degree 7 = C#) over a D minor sets
    // the harmonic-minor / liturgical character.
    cordoba(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 50;       // D3
      const beatSec  = 0.75;     // ~80 BPM

      // Drone — sustained root + fifth, no octave below (lighter than redsea).
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.13, lowOctave: false, type: "sine"
      });

      // Oud-flavored melodic phrase — descending then ascending, with a
      // pluck-and-decay shape (sawtooth + very fast attack). Magen Avot's
      // raised 7th gives the line its Sephardic liturgical color.
      const oudPhrase = [
        [5, 1], [4, 0.5], [3, 0.5], [4, 1], [5, 1],
        [4, 0.5], [3, 0.5], [2, 0.5], [1, 1.5],
        [3, 0.5], [4, 0.5], [5, 0.5], [7, 0.5], [8, 1.5],
        [7, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [1, 2]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 1, "magenAvot", rootMidi + 12, beatSec, oudPhrase, {
        type: "sawtooth", peakGain: 0.08, loops: 4, attack: 0.008, release: 0.22
      });

      // Soft sustained inner voice — triangle, like a vocal line beneath the oud.
      const inner = [
        [1, 4], [3, 4], [5, 4], [4, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 2, "magenAvot", rootMidi, beatSec, inner, {
        type: "triangle", peakGain: 0.06, loops: 4, attack: 0.2, release: 0.4
      });

      return nodes;
    },

    // knesset (Golda) — Israeli minor, hora dance feel.
    // Modern Israel celebrates around the bonfire. ~130 BPM 4/4 dance tempo
    // with the classic eighth-note "and-uh, and-uh" hora pulse.
    knesset(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 55;       // G3 — bright but grounded
      const beatSec  = 0.46;     // ~130 BPM hora tempo

      // Light drone — dance music needs space; keep this subtle.
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.09, lowOctave: false, type: "sine"
      });

      // Hora bass pulse: classic "boom-CHA, boom-CHA" alternating tonic and fifth
      // every quarter note — drives the dance.
      const horaBass = [
        [1, 1], [5, 1], [1, 1], [5, 1]
      ];
      _scheduleMelody(c, mg, nodes, t0, "israeliMin", rootMidi, beatSec, horaBass, {
        type: "triangle", peakGain: 0.11, loops: 30, attack: 0.01, release: 0.1
      });

      // Rising hora melody — characteristic of Israeli folk tunes like
      // "Hava Nagila" rising through the scale and resolving back to tonic.
      // Israeli minor (= natural minor with raised 7th sometimes) lets us
      // climb cleanly through degrees 1 → 8.
      const horaMelody = [
        [1, 1], [3, 0.5], [2, 0.5], [1, 1], [5, 1],
        [3, 0.5], [4, 0.5], [5, 1], [3, 2],
        [5, 1], [6, 0.5], [5, 0.5], [4, 1], [3, 1],
        [2, 0.5], [1, 0.5], [2, 1], [1, 2]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 0.5, "israeliMin", rootMidi + 12, beatSec, horaMelody, {
        type: "sawtooth", peakGain: 0.075, loops: 5, attack: 0.02, release: 0.13
      });

      // Sparkling upper-octave answering phrase every other loop — adds joy.
      const sparkle = [
        [0, 9],
        [8, 0.25], [7, 0.25], [5, 0.5], [3, 0.5], [1, 1]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 6, "israeliMin", rootMidi + 24, beatSec, sparkle, {
        type: "triangle", peakGain: 0.05, loops: 7, attack: 0.005, release: 0.18
      });

      return nodes;
    },

    // princeton (Einstein) — Wistful klezmer, freygish at moderate tempo.
    // Diaspora intellectual with European roots — a soulful clarinet line in
    // freygish, decorated with ornamental grace notes (krechtz). ~90 BPM, D.
    princeton(c, mg) {
      const nodes = [];
      const t0 = c.currentTime;
      const rootMidi = 50;       // D3
      const beatSec  = 0.67;     // ~90 BPM moderate

      // Soft drone — gives the klezmer line something to lean on.
      _scheduleDrone(c, mg, nodes, t0, 65, rootMidi - 12, {
        peakGain: 0.10, lowOctave: false, type: "sine"
      });

      // Walking bass on the off-beats — gentle "oom-pah" rhythm-section feel.
      const walkBass = [
        [1, 1], [5, 1], [1, 1], [4, 1]
      ];
      _scheduleMelody(c, mg, nodes, t0, "freygish", rootMidi, beatSec, walkBass, {
        type: "triangle", peakGain: 0.08, loops: 22, attack: 0.02, release: 0.18
      });

      // Main klezmer melody — bittersweet ascending phrases with the freygish
      // b2 → 3 augmented-second leap. Triangle for a soft, clarinet-like body.
      // Grace notes are scheduled as separate eighth-note "krechtz" approaches.
      const melody = [
        // Phrase 1: rising plea
        [3, 0.5], [2, 0.5],      // grace approach
        [1, 2],
        [3, 1], [4, 1], [5, 2],
        // Phrase 2: ornament + descent
        [6, 0.5], [5, 0.5], [4, 1], [3, 2],
        // Phrase 3: climb and resolve
        [4, 0.5], [5, 0.5], [6, 1], [5, 1], [4, 1],
        [3, 0.5], [2, 0.5], [1, 4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 1, "freygish", rootMidi + 12, beatSec, melody, {
        type: "triangle", peakGain: 0.09, loops: 4, attack: 0.04, release: 0.25
      });

      // Ornamental grace notes (krechtz): brief upper-neighbor sighs that drift
      // in and out, sawtooth gives the reedy clarinet bite. Schedule sparingly.
      const krechtz = [
        [0, 5],
        [5, 0.2], [6, 0.2], [5, 0.4],
        [0, 7],
        [3, 0.2], [4, 0.2], [3, 0.4]
      ];
      _scheduleMelody(c, mg, nodes, t0 + 4, "freygish", rootMidi + 24, beatSec, krechtz, {
        type: "sawtooth", peakGain: 0.045, loops: 5, attack: 0.01, release: 0.2
      });

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
