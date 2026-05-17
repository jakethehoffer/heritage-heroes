const Stages = (function () {
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
        <path d="M0,200 Q100,180 200,200 T400,200 T600,200 T${W},200 L${W},220 L0,220Z" fill="${C.navy}" opacity="0.6"/>
        <path d="M0,160 Q200,140 400,160 T${W},160 L${W},200 L0,200Z" fill="${C.navy}" opacity="0.4"/>
      `);
    },
    elah() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#cfe6c5"/>
        <path d="M0,200 L150,120 L300,180 L450,100 L600,170 L800,150 L${W},${H} L0,${H} Z" fill="${C.olive}" />
        <rect y="240" width="${W}" height="60" fill="#a8b97a"/>
        <circle cx="700" cy="60" r="30" fill="${C.gold}"/>
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
      `);
    },
    temple() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#f1e3b3"/>
        <rect y="240" width="${W}" height="60" fill="#d9c187"/>
        <!-- columns -->
        <rect x="100" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="300" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="500" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="660" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="80" y="60" width="640" height="30" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
        <!-- menorah -->
        <path d="M400,180 L380,200 L390,220 L410,220 L420,200 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
      `);
    },
    cordoba() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#fff2d6"/>
        <rect y="240" width="${W}" height="60" fill="#c79c5b"/>
        <path d="M120,240 L120,140 Q180,80 240,140 L240,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M340,240 L340,140 Q400,80 460,140 L460,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M560,240 L560,140 Q620,80 680,140 L680,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
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
      `);
    },
    princeton() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#2b3a55"/>
        <rect x="40" y="40" width="${W - 80}" height="200" fill="${C.ink}" stroke="${C.cream}" stroke-width="4"/>
        <text x="${W / 2}" y="130" font-family="Georgia,serif" font-size="48" fill="${C.cream}" text-anchor="middle">E = m c²</text>
        <text x="${W / 2}" y="190" font-family="Georgia,serif" font-size="22" fill="${C.cream}" opacity="0.7" text-anchor="middle">∇·E = ρ/ε₀</text>
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
