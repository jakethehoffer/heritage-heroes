const Render = (function () {
  const colors = {
    bg: "#faf3e0",
    ink: "#1a1a1a",
    terracotta: "#c1462d",
    olive: "#6b8e23",
    cream: "#fff8e7",
    navy: "#1a2a4f",
    gold: "#d4a574"
  };

  function hpBar({ hp, max, label, side }) {
    const W = 320, H = 32;
    const padding = 4;
    const innerW = W - padding * 2;
    const fillW = Math.max(0, Math.floor(innerW * (hp / max)));
    const fillColor = hp > max * 0.5 ? colors.olive : hp > max * 0.25 ? "#d4a017" : colors.terracotta;
    const labelX = side === "right" ? W - 12 : 12;
    const labelAnchor = side === "right" ? "end" : "start";
    return `
<svg viewBox="0 0 ${W} ${H + 24}" width="${W}" height="${H + 24}" xmlns="http://www.w3.org/2000/svg">
  <text x="${labelX}" y="18" font-family="Georgia,serif" font-size="18" font-weight="700"
        fill="${colors.ink}" text-anchor="${labelAnchor}">${escapeXml(label)}</text>
  <rect x="0" y="24" width="${W}" height="${H}" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="3" rx="6" />
  <rect x="${padding}" y="${24 + padding}" width="${fillW}" height="${H - padding * 2}" fill="${fillColor}" rx="3" />
  <text x="${W / 2}" y="${24 + H / 2 + 5}" font-family="Georgia,serif" font-size="14" font-weight="700"
        fill="${colors.ink}" text-anchor="middle">${hp} / ${max}</text>
</svg>`;
  }

  function callout(text) {
    return `<div class="callout">${escapeHtml(text)}</div>`;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
  }

  function escapeHtml(s) {
    return String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Each hero builder returns the INNER SVG shapes; renderHero wraps them.
  const HERO_BUILDERS = {
    moses(pose) {
      const lunge = pose === "attack" ? 18 : 0;
      return `
        <ellipse cx="100" cy="180" rx="60" ry="6" fill="#000" opacity="0.2" />
        <!-- robe -->
        <path d="M60,180 L70,80 Q100,70 130,80 L140,180 Z" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- head -->
        <circle cx="100" cy="55" r="22" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- beard -->
        <path d="M82,60 Q100,95 118,60 Q118,75 100,80 Q82,75 82,60Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- staff -->
        <line x1="${145 + lunge}" y1="40" x2="${130 + lunge}" y2="170" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${145 + lunge}" cy="40" r="6" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    david(pose) {
      const lunge = pose === "attack" ? 22 : 0;
      return `
        <ellipse cx="100" cy="180" rx="50" ry="6" fill="#000" opacity="0.2"/>
        <path d="M65,180 L75,80 Q100,70 125,80 L135,180 Z" fill="${colors.olive}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- crown -->
        <path d="M82,40 L88,28 L94,40 L100,26 L106,40 L112,28 L118,40 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- sling pouch swinging -->
        <circle cx="${135 + lunge}" cy="${110 - lunge / 2}" r="8" fill="${colors.ink}" />
        <line x1="125" y1="100" x2="${135 + lunge}" y2="${110 - lunge / 2}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    esther(pose) {
      const lunge = pose === "attack" ? 12 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L75,90 Q100,75 125,90 L140,180 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- veil -->
        <path d="M70,70 Q100,40 130,70 Q130,90 100,95 Q70,90 70,70Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <circle cx="100" cy="65" r="18" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- scepter -->
        <line x1="${135 + lunge}" y1="60" x2="${125 + lunge}" y2="160" stroke="${colors.ink}" stroke-width="4"/>
        <circle cx="${135 + lunge}" cy="55" r="6" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    judah(pose) {
      const lunge = pose === "attack" ? 24 : 0;
      return `
        <ellipse cx="100" cy="180" rx="60" ry="6" fill="#000" opacity="0.2"/>
        <!-- breastplate -->
        <rect x="70" y="90" width="60" height="80" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3" rx="6"/>
        <rect x="80" y="100" width="40" height="10" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="1"/>
        <!-- helmet -->
        <path d="M80,55 Q100,30 120,55 L120,75 L80,75 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="65" r="16" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- spear -->
        <line x1="${145 + lunge}" y1="30" x2="${135 + lunge}" y2="170" stroke="${colors.ink}" stroke-width="5"/>
        <path d="M${140 + lunge},20 L${145 + lunge},5 L${150 + lunge},20 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    rambam(pose) {
      const lunge = pose === "attack" ? 10 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L70,80 Q100,70 130,80 L140,180 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- white beard -->
        <path d="M80,60 Q100,110 120,60 Q120,90 100,100 Q80,90 80,60Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- book -->
        <rect x="${135 + lunge}" y="110" width="22" height="28" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3"/>
        <line x1="${146 + lunge}" y1="110" x2="${146 + lunge}" y2="138" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    golda(pose) {
      const lunge = pose === "attack" ? 14 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L75,90 Q100,80 125,90 L140,180 Z" fill="${colors.olive}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="60" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- bun hair -->
        <ellipse cx="100" cy="42" rx="22" ry="14" fill="${colors.ink}"/>
        <!-- handbag -->
        <rect x="${130 + lunge}" y="120" width="22" height="22" fill="${colors.ink}" />
        <path d="M${130 + lunge},120 Q${141 + lunge},108 ${152 + lunge},120" fill="none" stroke="${colors.ink}" stroke-width="3"/>`;
    },
    einstein(pose) {
      const lunge = pose === "attack" ? 8 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M65,180 L75,90 Q100,80 125,90 L135,180 Z" fill="#777" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- wild hair -->
        <path d="M78,40 Q70,15 95,32 Q90,5 105,30 Q120,8 115,35 Q140,20 125,45 Q140,55 122,50 Q130,70 110,55 Q90,72 78,55 Q60,60 78,40Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- mustache -->
        <path d="M88,62 Q100,72 112,62" fill="none" stroke="${colors.ink}" stroke-width="3"/>
        <!-- chalkboard -->
        <rect x="${130 + lunge}" y="100" width="32" height="22" fill="${colors.ink}" stroke="${colors.ink}" stroke-width="2"/>
        <text x="${146 + lunge}" y="116" font-family="Georgia,serif" font-size="11" fill="${colors.cream}" text-anchor="middle">E=mc²</text>`;
    }
  };

  function renderHero({ heroId, pose, facing }) {
    const builder = HERO_BUILDERS[heroId];
    if (!builder) throw new Error(`unknown hero: ${heroId}`);
    const flip = facing === "right" ? "" : ` transform="scale(-1,1) translate(-200,0)"`;
    return `<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <g${flip}>${builder(pose)}</g>
</svg>`;
  }

  return { colors, hpBar, callout, escapeXml, escapeHtml, renderHero };
})();

if (typeof module !== "undefined") module.exports = Render;
