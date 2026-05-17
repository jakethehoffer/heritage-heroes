const Audio = (function () {
  const SOURCES = {
    attack:  "assets/sfx/attack.wav",
    defend:  "assets/sfx/defend.wav",
    victory: "assets/sfx/victory.wav",
    moses:    "assets/sfx/moses.wav",
    david:    "assets/sfx/david.wav",
    esther:   "assets/sfx/esther.wav",
    judah:    "assets/sfx/judah.wav",
    rambam:   "assets/sfx/rambam.wav",
    golda:    "assets/sfx/golda.wav",
    einstein: "assets/sfx/einstein.wav"
  };

  const elements = {};
  let muted = true;

  function preload() {
    if (typeof window === "undefined" || typeof window.Audio !== "function") return;
    for (const [id, src] of Object.entries(SOURCES)) {
      try {
        const el = new window.Audio(src);
        el.preload = "auto";
        elements[id] = el;
      } catch (_) { /* ignore */ }
    }
  }

  function play(id) {
    if (muted) return;
    const el = elements[id];
    if (!el) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function setMuted(value) { muted = !!value; }
  function isMuted() { return muted; }

  return { preload, play, setMuted, isMuted };
})();

if (typeof module !== "undefined") module.exports = Audio;
