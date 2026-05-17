var Stages = (function () {
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const C = Render.colors;
  const W = 800, H = 300;

  function frame(content) {
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
  }

  const STAGES = {
    redsea() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#a8d5e5"/>
        <rect y="200" width="${W}" height="100" fill="#e8d59a"/>
        <g>
          <path d="M-50,200 Q50,180 150,200 Q250,220 350,200 Q450,180 550,200 Q650,220 750,200 Q850,180 900,200 L900,220 L-50,220Z" fill="${C.navy}" opacity="0.6"/>
          <animateTransform attributeName="transform" type="translate" values="-30,0; 30,0; -30,0" dur="14s" repeatCount="indefinite"/>
        </g>
        <g>
          <path d="M-50,160 Q100,140 250,160 Q400,180 550,160 Q700,140 850,160 Q950,180 950,160 L950,200 L-50,200Z" fill="${C.navy}" opacity="0.4"/>
          <animateTransform attributeName="transform" type="translate" values="30,0; -30,0; 30,0" dur="11s" repeatCount="indefinite"/>
        </g>
      `);
    },
    elah() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#cfe6c5"/>
        <path d="M0,200 L150,120 L300,180 L450,100 L600,170 L800,150 L${W},${H} L0,${H} Z" fill="${C.olive}" />
        <rect y="240" width="${W}" height="60" fill="#a8b97a"/>
        <circle cx="700" cy="60" r="30" fill="${C.gold}">
          <animate attributeName="r" values="30;34;30" dur="5s" repeatCount="indefinite"/>
        </circle>
        <g opacity="0.7">
          <ellipse cx="0" cy="70" rx="30" ry="12" fill="white"/>
          <ellipse cx="20" cy="62" rx="24" ry="14" fill="white"/>
          <ellipse cx="40" cy="72" rx="26" ry="11" fill="white"/>
          <animateTransform attributeName="transform" type="translate" values="-100,0; 900,0" dur="40s" repeatCount="indefinite"/>
        </g>
        <g opacity="0.55">
          <ellipse cx="0" cy="40" rx="22" ry="9" fill="white"/>
          <ellipse cx="18" cy="34" rx="18" ry="11" fill="white"/>
          <ellipse cx="34" cy="42" rx="20" ry="8" fill="white"/>
          <animateTransform attributeName="transform" type="translate" values="-150,0; 900,0" dur="30s" repeatCount="indefinite" begin="-12s"/>
        </g>
      `);
    },
    throne() {
      return frame(`
        <rect width="${W}" height="${H}" fill="${C.terracotta}" opacity="0.6"/>
        <rect y="240" width="${W}" height="60" fill="${C.navy}"/>
        <rect x="60" width="60" height="240" fill="${C.gold}" opacity="0.5"/>
        <rect x="680" width="60" height="240" fill="${C.gold}" opacity="0.5"/>
        <rect x="60" y="40" width="680" height="20" fill="${C.gold}"/>
        <rect x="350" y="180" width="100" height="60" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
        <g transform="translate(120, 100)">
          <ellipse cx="0" cy="0" rx="8" ry="14" fill="#ff6020" opacity="0.85">
            <animate attributeName="opacity" values="0.7;1;0.8;1;0.7" dur="1.3s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="14;16;13;15;14" dur="1.3s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="0" cy="0" rx="4" ry="8" fill="#ffdd44" opacity="0.9">
            <animate attributeName="opacity" values="0.8;1;0.7;1;0.8" dur="0.9s" repeatCount="indefinite"/>
          </ellipse>
        </g>
        <g transform="translate(680, 100)">
          <ellipse cx="0" cy="0" rx="8" ry="14" fill="#ff6020" opacity="0.85">
            <animate attributeName="opacity" values="0.8;1;0.7;1;0.8" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="14;13;15;14" dur="1.5s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="0" cy="0" rx="4" ry="8" fill="#ffdd44" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.7;1;0.8" dur="1.1s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      `);
    },
    temple() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#f1e3b3"/>
        <rect y="240" width="${W}" height="60" fill="#d9c187"/>
        <rect x="100" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="300" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="500" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="660" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="80" y="60" width="640" height="30" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M400,180 L380,200 L390,220 L410,220 L420,200 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
        <g transform="translate(400, 178)">
          <ellipse cx="0" cy="-8" rx="6" ry="12" fill="#ff8030" opacity="0.85">
            <animate attributeName="opacity" values="0.75;1;0.8;1;0.75" dur="1.4s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="12;14;11;13;12" dur="1.4s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="0" cy="-8" rx="3" ry="7" fill="#ffe055" opacity="0.95">
            <animate attributeName="opacity" values="0.85;1;0.8;1" dur="1s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      `);
    },
    cordoba() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#fff2d6"/>
        <rect y="240" width="${W}" height="60" fill="#c79c5b"/>
        <path d="M120,240 L120,140 Q180,80 240,140 L240,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M340,240 L340,140 Q400,80 460,140 L460,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M560,240 L560,140 Q620,80 680,140 L680,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <g>
          <path d="M0,0 Q-5,-3 -10,0 M0,0 Q5,-3 10,0" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
          <animateTransform attributeName="transform" type="translate" values="-50,50; 850,80" dur="20s" repeatCount="indefinite"/>
        </g>
      `);
    },
    knesset() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#d9d1c2"/>
        <rect y="240" width="${W}" height="60" fill="${C.navy}"/>
        <rect x="200" y="100" width="400" height="140" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="240" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="320" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="400" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="480" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="560" y="140" width="40" height="100" fill="${C.navy}"/>
        <line x1="400" y1="100" x2="400" y2="60" stroke="${C.ink}" stroke-width="2"/>
        <g transform="translate(400, 65)">
          <g>
            <rect x="0" y="0" width="40" height="22" fill="white" stroke="${C.ink}" stroke-width="1.5"/>
            <rect x="0" y="0" width="40" height="4" fill="#0038b8"/>
            <rect x="0" y="18" width="40" height="4" fill="#0038b8"/>
            <polygon points="20,7 24,13 16,13" fill="none" stroke="#0038b8" stroke-width="1.5"/>
            <polygon points="20,15 24,9 16,9" fill="none" stroke="#0038b8" stroke-width="1.5"/>
            <animateTransform attributeName="transform" type="rotate" values="-3; 3; -3" dur="3.5s" repeatCount="indefinite"/>
          </g>
        </g>
      `);
    },
    princeton() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#2b3a55"/>
        <rect x="40" y="40" width="${W - 80}" height="200" fill="${C.ink}" stroke="${C.cream}" stroke-width="4"/>
        <text x="${W / 2}" y="130" font-family="Georgia,serif" font-size="48" fill="${C.cream}" text-anchor="middle">E = m c²<animate attributeName="opacity" values="0.9;1;0.85;1;0.9" dur="4s" repeatCount="indefinite"/></text>
        <text x="${W / 2}" y="190" font-family="Georgia,serif" font-size="22" fill="${C.cream}" opacity="0.7" text-anchor="middle">∇·E = ρ/ε₀</text>
        <circle cx="200" cy="240" r="2" fill="${C.cream}" opacity="0">
          <animate attributeName="cy" values="240;80" dur="8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.7;0" dur="8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="380" cy="240" r="1.5" fill="${C.cream}" opacity="0">
          <animate attributeName="cy" values="240;60" dur="10s" repeatCount="indefinite" begin="-3s"/>
          <animate attributeName="opacity" values="0;0.6;0" dur="10s" repeatCount="indefinite" begin="-3s"/>
        </circle>
        <circle cx="580" cy="240" r="2" fill="${C.cream}" opacity="0">
          <animate attributeName="cy" values="240;70" dur="9s" repeatCount="indefinite" begin="-6s"/>
          <animate attributeName="opacity" values="0;0.65;0" dur="9s" repeatCount="indefinite" begin="-6s"/>
        </circle>
      `);
    }
  };

  function byId(id) {
    const fn = STAGES[id] || STAGES.redsea;
    return fn();
  }

  return { byId };
})();

if (typeof module !== "undefined") module.exports = Stages;
