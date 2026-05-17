var Render = (function () {
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
        <!-- ground shadow -->
        <ellipse cx="100" cy="182" rx="58" ry="6" fill="#000" opacity="0.18"/>
        <!-- terracotta robe with sash -->
        <path d="M55,185 L68,78 Q100,65 132,78 L145,185 Z" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- sash across robe -->
        <path d="M66,110 Q100,102 134,110" fill="none" stroke="${colors.gold}" stroke-width="4" stroke-linecap="round"/>
        <!-- neck -->
        <rect x="94" y="68" width="12" height="14" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- head with subtle glow -->
        <circle cx="100" cy="52" r="24" fill="#fff2cc" stroke="${colors.gold}" stroke-width="2" opacity="0.5"/>
        <circle cx="100" cy="52" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- long flowing white beard — much larger -->
        <path d="M80,55 Q72,75 70,100 Q80,120 100,125 Q120,120 130,100 Q128,75 120,55 Q120,80 100,82 Q80,80 80,55Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- beard center line for texture -->
        <path d="M100,82 Q100,110 100,125" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.4"/>
        <!-- mustache -->
        <path d="M87,58 Q100,65 113,58" fill="none" stroke="${colors.ink}" stroke-width="2"/>
        <!-- small stone tablets in left hand -->
        <rect x="52" y="118" width="14" height="18" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2" rx="2"/>
        <rect x="57" y="124" width="4" height="1" fill="${colors.ink}"/>
        <rect x="57" y="128" width="4" height="1" fill="${colors.ink}"/>
        <!-- tall wooden staff with curved top -->
        <line x1="${148 + lunge}" y1="168" x2="${138 + lunge}" y2="30" stroke="#7a4a1a" stroke-width="6" stroke-linecap="round"/>
        <!-- curved crook at top of staff -->
        <path d="M${138 + lunge},30 Q${138 + lunge},15 ${150 + lunge},18 Q${160 + lunge},20 ${157 + lunge},30" fill="none" stroke="#7a4a1a" stroke-width="6" stroke-linecap="round"/>`;
    },
    david(pose) {
      const lunge = pose === "attack" ? 22 : 0;
      return `
        <ellipse cx="100" cy="182" rx="52" ry="6" fill="#000" opacity="0.18"/>
        <!-- royal blue/purple robe -->
        <path d="M62,185 L74,82 Q100,70 126,82 L138,185 Z" fill="#4a2a7a" stroke="${colors.ink}" stroke-width="3"/>
        <!-- gold trim at hem -->
        <path d="M62,185 L74,82" fill="none" stroke="${colors.gold}" stroke-width="3"/>
        <path d="M126,82 L138,185" fill="none" stroke="${colors.gold}" stroke-width="3"/>
        <path d="M62,185 L138,185" fill="none" stroke="${colors.gold}" stroke-width="2"/>
        <!-- Star of David on tunic -->
        <polygon points="100,95 106,107 118,107 108,115 112,127 100,119 88,127 92,115 82,107 94,107" fill="none" stroke="${colors.gold}" stroke-width="2"/>
        <!-- youthful face — no beard, light skin -->
        <circle cx="100" cy="50" r="20" fill="#f5c58a" stroke="${colors.ink}" stroke-width="3"/>
        <!-- very short stubble -->
        <path d="M84,60 Q100,66 116,60" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.4"/>
        <!-- tall multi-point gold crown -->
        <path d="M78,42 L82,22 L90,36 L100,18 L110,36 L118,22 L122,42 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2.5"/>
        <rect x="78" y="42" width="44" height="10" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- sling — prominent -->
        <line x1="120" y1="98" x2="${138 + lunge}" y2="${82 - lunge / 2}" stroke="${colors.ink}" stroke-width="3"/>
        <line x1="${138 + lunge}" y1="${82 - lunge / 2}" x2="${148 + lunge}" y2="${96 - lunge / 2}" stroke="${colors.ink}" stroke-width="3"/>
        <ellipse cx="${148 + lunge}" cy="${96 - lunge / 2}" rx="8" ry="5" fill="${colors.ink}" transform="rotate(-20,${148 + lunge},${96 - lunge / 2})"/>`;
    },
    esther(pose) {
      const lunge = pose === "attack" ? 12 : 0;
      return `
        <ellipse cx="100" cy="182" rx="58" ry="6" fill="#000" opacity="0.18"/>
        <!-- long elegant gown with gold trim -->
        <path d="M58,185 L72,88 Q100,72 128,88 L142,185 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- gold trim lines on gown -->
        <path d="M68,105 Q100,96 132,105" fill="none" stroke="${colors.gold}" stroke-width="3"/>
        <path d="M65,130 Q100,120 135,130" fill="none" stroke="${colors.gold}" stroke-width="2"/>
        <path d="M62,160 Q100,150 138,160" fill="none" stroke="${colors.gold}" stroke-width="2"/>
        <!-- neck/shoulders -->
        <rect x="92" y="70" width="16" height="16" fill="#f0c080" stroke="${colors.ink}" stroke-width="2"/>
        <!-- head -->
        <circle cx="100" cy="52" r="18" fill="#f0c080" stroke="${colors.ink}" stroke-width="3"/>
        <!-- soft veil falling from crown -->
        <path d="M72,38 Q100,28 128,38 Q130,60 128,80 Q100,85 72,80 Q70,60 72,38Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="1" opacity="0.6"/>
        <!-- tall pointed crown with jewels -->
        <path d="M76,40 L84,18 L100,28 L116,18 L124,40 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2.5"/>
        <rect x="76" y="40" width="48" height="8" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- jewels on crown -->
        <circle cx="84" cy="30" r="4" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="1.5"/>
        <circle cx="100" cy="24" r="4" fill="#9b59b6" stroke="${colors.ink}" stroke-width="1.5"/>
        <circle cx="116" cy="30" r="4" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="1.5"/>
        <!-- scepter with ornate top -->
        <line x1="${136 + lunge}" y1="55" x2="${126 + lunge}" y2="162" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${136 + lunge}" cy="50" r="8" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2.5"/>
        <circle cx="${136 + lunge}" cy="50" r="4" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="1.5"/>`;
    },
    judah(pose) {
      const lunge = pose === "attack" ? 24 : 0;
      return `
        <ellipse cx="100" cy="182" rx="62" ry="6" fill="#000" opacity="0.18"/>
        <!-- segmented armor legs/lower -->
        <rect x="72" y="128" width="56" height="55" fill="#888" stroke="${colors.ink}" stroke-width="3" rx="4"/>
        <!-- armor segments -->
        <line x1="72" y1="148" x2="128" y2="148" stroke="${colors.ink}" stroke-width="2"/>
        <line x1="72" y1="163" x2="128" y2="163" stroke="${colors.ink}" stroke-width="2"/>
        <!-- breastplate -->
        <rect x="68" y="88" width="64" height="44" fill="#a0a0a0" stroke="${colors.ink}" stroke-width="3" rx="6"/>
        <!-- breastplate segments -->
        <line x1="68" y1="104" x2="132" y2="104" stroke="${colors.ink}" stroke-width="2"/>
        <line x1="68" y1="118" x2="132" y2="118" stroke="${colors.ink}" stroke-width="2"/>
        <!-- menorah symbol in gold on shield/breastplate -->
        <line x1="100" y1="92" x2="100" y2="108" stroke="${colors.gold}" stroke-width="3"/>
        <line x1="88" y1="95" x2="112" y2="95" stroke="${colors.gold}" stroke-width="2"/>
        <line x1="88" y1="92" x2="88" y2="102" stroke="${colors.gold}" stroke-width="2"/>
        <line x1="94" y1="93" x2="94" y2="102" stroke="${colors.gold}" stroke-width="2"/>
        <line x1="106" y1="93" x2="106" y2="102" stroke="${colors.gold}" stroke-width="2"/>
        <line x1="112" y1="92" x2="112" y2="102" stroke="${colors.gold}" stroke-width="2"/>
        <!-- neck guard -->
        <rect x="88" y="75" width="24" height="16" fill="#a0a0a0" stroke="${colors.ink}" stroke-width="2"/>
        <!-- Greek-style helmet -->
        <path d="M74,55 Q74,22 100,20 Q126,22 126,55 L120,72 L80,72 Z" fill="#999" stroke="${colors.ink}" stroke-width="3"/>
        <!-- cheek guards -->
        <rect x="74" y="55" width="14" height="20" fill="#888" stroke="${colors.ink}" stroke-width="2" rx="2"/>
        <rect x="112" y="55" width="14" height="20" fill="#888" stroke="${colors.ink}" stroke-width="2" rx="2"/>
        <!-- red plume on helmet -->
        <path d="M88,22 Q100,5 112,22 Q108,8 100,14 Q92,8 88,22Z" fill="#c0392b" stroke="${colors.ink}" stroke-width="2"/>
        <!-- plume feathers -->
        <path d="M100,14 Q96,8 92,12" fill="none" stroke="#c0392b" stroke-width="2"/>
        <path d="M100,14 Q104,8 108,12" fill="none" stroke="#c0392b" stroke-width="2"/>
        <!-- spear held forward -->
        <line x1="${148 + lunge}" y1="168" x2="${140 + lunge}" y2="22" stroke="#7a5a2a" stroke-width="6" stroke-linecap="round"/>
        <path d="M${136 + lunge},12 L${140 + lunge},22 L${144 + lunge},12 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- shield on left side -->
        <ellipse cx="62" cy="120" rx="18" ry="22" fill="#888" stroke="${colors.ink}" stroke-width="3"/>
        <!-- menorah on shield -->
        <line x1="62" y1="108" x2="62" y2="124" stroke="${colors.gold}" stroke-width="2"/>
        <line x1="54" y1="111" x2="70" y2="111" stroke="${colors.gold}" stroke-width="1.5"/>
        <line x1="54" y1="108" x2="54" y2="118" stroke="${colors.gold}" stroke-width="1.5"/>
        <line x1="58" y1="109" x2="58" y2="118" stroke="${colors.gold}" stroke-width="1.5"/>
        <line x1="66" y1="109" x2="66" y2="118" stroke="${colors.gold}" stroke-width="1.5"/>
        <line x1="70" y1="108" x2="70" y2="118" stroke="${colors.gold}" stroke-width="1.5"/>`;
    },
    rambam(pose) {
      const lunge = pose === "attack" ? 10 : 0;
      return `
        <ellipse cx="100" cy="182" rx="56" ry="6" fill="#000" opacity="0.18"/>
        <!-- scholarly dark robe -->
        <path d="M58,185 L70,80 Q100,68 130,80 L142,185 Z" fill="#2a2a3a" stroke="${colors.ink}" stroke-width="3"/>
        <!-- robe collar/lapels -->
        <path d="M82,80 L88,68 L100,75 L112,68 L118,80" fill="none" stroke="${colors.gold}" stroke-width="2"/>
        <!-- neck -->
        <rect x="93" y="68" width="14" height="14" fill="#d4a060" stroke="${colors.ink}" stroke-width="2"/>
        <!-- face with long gray beard -->
        <circle cx="100" cy="52" r="20" fill="#d4a060" stroke="${colors.ink}" stroke-width="3"/>
        <!-- long gray beard — extends well below chin -->
        <path d="M82,55 Q75,75 74,100 Q84,118 100,122 Q116,118 126,100 Q125,75 118,55 Q118,78 100,80 Q82,78 82,55Z" fill="#c0c0c0" stroke="${colors.ink}" stroke-width="2"/>
        <!-- beard texture lines -->
        <path d="M92,80 Q92,105 95,118" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.3"/>
        <path d="M108,80 Q108,105 105,118" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.3"/>
        <!-- mustache -->
        <path d="M87,58 Q100,66 113,58" fill="none" stroke="#888" stroke-width="2"/>
        <!-- large Sephardic white turban — big rounded wrap -->
        <ellipse cx="100" cy="35" rx="28" ry="18" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- turban wrap fold -->
        <path d="M72,35 Q80,22 100,20 Q120,22 128,35" fill="none" stroke="${colors.ink}" stroke-width="2"/>
        <path d="M74,40 Q80,30 100,28 Q120,30 126,40" fill="none" stroke="${colors.ink}" stroke-width="1.5" opacity="0.5"/>
        <!-- open book (Mishneh Torah) held in front -->
        <path d="M${132 + lunge},108 L${135 + lunge},88 L${158 + lunge},88 L${155 + lunge},108 Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2.5" rx="2"/>
        <!-- book spine -->
        <line x1="${144 + lunge}" y1="88" x2="${143 + lunge}" y2="108" stroke="${colors.ink}" stroke-width="2"/>
        <!-- text lines in book -->
        <line x1="${137 + lunge}" y1="94" x2="${142 + lunge}" y2="94" stroke="${colors.ink}" stroke-width="1"/>
        <line x1="${137 + lunge}" y1="98" x2="${142 + lunge}" y2="98" stroke="${colors.ink}" stroke-width="1"/>
        <line x1="${137 + lunge}" y1="102" x2="${142 + lunge}" y2="102" stroke="${colors.ink}" stroke-width="1"/>
        <line x1="${146 + lunge}" y1="94" x2="${153 + lunge}" y2="94" stroke="${colors.ink}" stroke-width="1"/>
        <line x1="${146 + lunge}" y1="98" x2="${153 + lunge}" y2="98" stroke="${colors.ink}" stroke-width="1"/>
        <line x1="${146 + lunge}" y1="102" x2="${153 + lunge}" y2="102" stroke="${colors.ink}" stroke-width="1"/>
        <!-- book title in Hebrew-style -->
        <text x="${144 + lunge}" y="86" font-family="Georgia,serif" font-size="7" fill="${colors.ink}" text-anchor="middle">MT</text>`;
    },
    golda(pose) {
      const lunge = pose === "attack" ? 14 : 0;
      return `
        <ellipse cx="100" cy="182" rx="56" ry="6" fill="#000" opacity="0.18"/>
        <!-- simple navy dress -->
        <path d="M60,185 L74,90 Q100,78 126,90 L140,185 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- dress collar -->
        <path d="M86,90 Q100,82 114,90 L112,78 L100,84 L88,78 Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- brooch at collar -->
        <circle cx="100" cy="93" r="7" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <circle cx="100" cy="93" r="3" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="1"/>
        <!-- elderly face, warm -->
        <circle cx="100" cy="54" r="20" fill="#d4956a" stroke="${colors.ink}" stroke-width="3"/>
        <!-- wrinkle lines -->
        <path d="M88,50 Q92,48 96,50" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.4"/>
        <path d="M104,50 Q108,48 112,50" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.4"/>
        <path d="M90,60 Q100,64 110,60" fill="none" stroke="${colors.ink}" stroke-width="1" opacity="0.3"/>
        <!-- gray hair in a tight bun -->
        <ellipse cx="100" cy="38" rx="20" ry="12" fill="#a0a0a0" stroke="${colors.ink}" stroke-width="2.5"/>
        <!-- bun detail -->
        <circle cx="100" cy="34" r="8" fill="#909090" stroke="${colors.ink}" stroke-width="2"/>
        <!-- bun pin/twist -->
        <path d="M95,32 Q100,30 105,32" fill="none" stroke="${colors.ink}" stroke-width="1.5"/>
        <!-- round spectacles -->
        <circle cx="93" cy="54" r="9" fill="none" stroke="${colors.ink}" stroke-width="2.5"/>
        <circle cx="107" cy="54" r="9" fill="none" stroke="${colors.ink}" stroke-width="2.5"/>
        <line x1="102" y1="54" x2="98" y2="54" stroke="${colors.ink}" stroke-width="2"/>
        <line x1="84" y1="54" x2="80" y2="52" stroke="${colors.ink}" stroke-width="2"/>
        <line x1="116" y1="54" x2="120" y2="52" stroke="${colors.ink}" stroke-width="2"/>
        <!-- eyes through glasses -->
        <circle cx="93" cy="54" r="3" fill="${colors.navy}" opacity="0.6"/>
        <circle cx="107" cy="54" r="3" fill="${colors.navy}" opacity="0.6"/>
        <!-- determined mouth -->
        <path d="M93,64 Q100,67 107,64" fill="none" stroke="${colors.ink}" stroke-width="2" stroke-linecap="round"/>
        <!-- arm lunge effect -->
        <line x1="126" y1="100" x2="${140 + lunge}" y2="${110 + lunge / 3}" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round"/>`;
    },
    einstein(pose) {
      const lunge = pose === "attack" ? 8 : 0;
      return `
        <ellipse cx="100" cy="182" rx="56" ry="6" fill="#000" opacity="0.18"/>
        <!-- tweed brown sweater -->
        <path d="M62,185 L74,88 Q100,76 126,88 L138,185 Z" fill="#7a5c2e" stroke="${colors.ink}" stroke-width="3"/>
        <!-- sweater texture chevrons -->
        <path d="M74,100 Q100,94 126,100" fill="none" stroke="#5a3c0e" stroke-width="2" opacity="0.5"/>
        <path d="M73,114 Q100,108 127,114" fill="none" stroke="#5a3c0e" stroke-width="2" opacity="0.5"/>
        <path d="M72,128 Q100,122 128,128" fill="none" stroke="#5a3c0e" stroke-width="2" opacity="0.5"/>
        <!-- collar of sweater -->
        <path d="M86,88 Q100,80 114,88 L112,76 L100,82 L88,76 Z" fill="#6a4c1e" stroke="${colors.ink}" stroke-width="2"/>
        <!-- face with big mustache -->
        <circle cx="100" cy="56" r="20" fill="#f0c070" stroke="${colors.ink}" stroke-width="3"/>
        <!-- big bushy white mustache -->
        <path d="M84,66 Q88,60 94,64 Q97,58 100,62 Q103,58 106,64 Q112,60 116,66 Q112,72 106,70 Q103,74 100,70 Q97,74 94,70 Q88,72 84,66Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- wild white hair flying outward — much bigger cloud -->
        <path d="M80,44 Q72,30 82,20 Q74,10 90,18 Q86,5 100,14 Q102,2 116,12 Q126,4 128,18 Q142,12 136,28 Q150,30 142,44 Q148,52 138,52 Q140,68 126,58 Q120,72 110,62 Q106,74 100,66 Q94,74 90,62 Q80,72 74,58 Q60,58 62,44 Q58,36 70,38 Q66,28 76,36 Q76,28 80,44Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2.5"/>
        <!-- chalkboard floating beside him -->
        <rect x="${132 + lunge}" y="90" width="38" height="30" fill="#2a4a2a" stroke="${colors.ink}" stroke-width="3" rx="3"/>
        <!-- chalk tray -->
        <rect x="${132 + lunge}" y="118" width="38" height="5" fill="#5a3a1a" stroke="${colors.ink}" stroke-width="2"/>
        <!-- E=mc² text on chalkboard -->
        <text x="${151 + lunge}" y="110" font-family="Georgia,serif" font-size="13" fill="${colors.cream}" text-anchor="middle" font-weight="bold">E=mc&#178;</text>
        <!-- chalk piece -->
        <rect x="${164 + lunge}" y="115" width="4" height="8" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="1" rx="1"/>`;
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
