const Main = (function () {
  function boot() {
    const root = document.getElementById("root");
    root.innerHTML = '<h1>Jewish Heroes</h1><p>Scaffold OK. Implementation in progress.</p>';
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }

  return { boot };
})();

if (typeof module !== "undefined") module.exports = Main;
