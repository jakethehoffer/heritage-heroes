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

  return { colors, hpBar, callout, escapeXml, escapeHtml };
})();

if (typeof module !== "undefined") module.exports = Render;
