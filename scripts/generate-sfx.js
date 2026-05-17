'use strict';
// One-shot WAV generator for heritage-heroes SFX assets.
// Usage: node scripts/generate-sfx.js
// Writes 10 mono 16-bit PCM WAV files to assets/sfx/.

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const AMPLITUDE = 0.3; // 30% of max — not too loud
const FADE_IN_MS = 10;
const FADE_OUT_MS = 50;

/**
 * Build a WAV Buffer from an array of Float32 samples in [-1, 1].
 */
function buildWav(samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit => 2 bytes per sample
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF chunk
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);

  // fmt  sub-chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);              // Subchunk1Size (PCM = 16)
  buf.writeUInt16LE(1, 20);              // AudioFormat (PCM = 1)
  buf.writeUInt16LE(NUM_CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, 28); // ByteRate
  buf.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, 32);               // BlockAlign
  buf.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data sub-chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  const fadeInSamples = Math.floor(FADE_IN_MS * SAMPLE_RATE / 1000);
  const fadeOutSamples = Math.floor(FADE_OUT_MS * SAMPLE_RATE / 1000);

  for (let i = 0; i < numSamples; i++) {
    let envelope = 1.0;
    if (i < fadeInSamples) {
      envelope = i / fadeInSamples;
    } else if (i >= numSamples - fadeOutSamples) {
      envelope = (numSamples - i) / fadeOutSamples;
    }
    const val = Math.max(-1, Math.min(1, samples[i] * envelope));
    const int16 = Math.round(val * 32767);
    buf.writeInt16LE(int16, 44 + i * 2);
  }

  return buf;
}

/** Generate a simple sine tone at `freq` Hz for `durationMs` ms. */
function tone(freq, durationMs) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = AMPLITUDE * Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE);
  }
  return out;
}

/** Linear frequency sweep from `f0` to `f1` Hz over `durationMs` ms. */
function sweep(f0, f1, durationMs) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const totalDur = durationMs / 1000;
    // Linear interpolation of instantaneous frequency
    const freq = f0 + (f1 - f0) * (i / n);
    // Phase accumulation to avoid discontinuities
    out[i] = AMPLITUDE * Math.sin(2 * Math.PI * freq * t);
  }
  return out;
}

/** Concatenate two Float32Arrays. */
function concat(a, b) {
  const out = new Float32Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

const sfxDir = path.join(__dirname, '..', 'assets', 'sfx');
fs.mkdirSync(sfxDir, { recursive: true });

const files = [
  { name: 'attack.wav',  samples: tone(200, 150) },
  { name: 'defend.wav',  samples: tone(700, 200) },
  {
    name: 'victory.wav',
    // ascending: 523 → 1047 Hz over 1 s (two steps for a richer sound)
    samples: concat(sweep(523, 784, 500), sweep(784, 1047, 500)),
  },
  { name: 'moses.wav',   samples: tone(220, 800) },
  { name: 'david.wav',   samples: tone(440, 500) },
  { name: 'esther.wav',  samples: tone(1000, 600) },
  { name: 'judah.wav',   samples: tone(180, 700) },
  { name: 'rambam.wav',  samples: tone(1320, 800) },
  { name: 'golda.wav',   samples: tone(330, 400) },
  { name: 'einstein.wav', samples: sweep(1200, 200, 1000) },
];

for (const { name, samples } of files) {
  const buf = buildWav(samples);
  const outPath = path.join(sfxDir, name);
  fs.writeFileSync(outPath, buf);
  console.log(`  wrote ${outPath}  (${buf.length} bytes, ${samples.length} samples)`);
}

console.log('\nAll SFX files written.');
