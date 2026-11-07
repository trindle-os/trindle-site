// The page stage: the ring leans towards the pointer, one button stops all the movement, and the tour's chapter rail marks where you are.
(() => {
  const stage = document.querySelector(".stage");
  const orb = document.getElementById("orb") || document.createElement("div");
  const btn = document.querySelector(".stage-pause");
  if (!stage || !btn) return;
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)");
  const set = (on) => {
    stage.dataset.motion = on ? "on" : "off";
    btn.setAttribute("aria-pressed", on ? "false" : "true");
    btn.textContent = on ? "Pause movement" : "Play movement";
    if (!on) { orb.style.setProperty("--rx", "0deg"); orb.style.setProperty("--ry", "0deg"); }
  };
  btn.hidden = false;
  set(!quiet.matches);
  btn.addEventListener("click", () => set(stage.dataset.motion === "off"));
  stage.addEventListener("pointermove", (e) => {
    if (stage.dataset.motion === "off") return;
    const r = orb.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    orb.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
    orb.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
  });
})();

(() => {
  const rail = document.querySelector(".rail");
  const row = rail && rail.querySelector(".rail-in");
  if (!row) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const make = (dir, label, d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rail-arrow";
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    b.addEventListener("click", () => row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: calm ? "auto" : "smooth" }));
    return b;
  };
  const left = make(-1, "Show earlier chapters", "M15 6l-6 6 6 6");
  const right = make(1, "Show later chapters", "M9 6l6 6-6 6");
  rail.classList.add("has-arrows");
  rail.prepend(left);
  rail.append(right);
  const sync = () => {
    left.disabled = row.scrollLeft < 2;
    right.disabled = row.scrollLeft + row.clientWidth > row.scrollWidth - 2;
  };
  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
})();

(() => {
  const links = [...document.querySelectorAll(".rail a")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const seen = new Set();
  const mark = () => {
    const first = [...byId.keys()].find((id) => seen.has(id));
    links.forEach((a) => a.removeAttribute("aria-current"));
    const on = first && byId.get(first);
    if (on) { on.setAttribute("aria-current", "true"); on.scrollIntoView({ block: "nearest", inline: "center" }); }
  };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id)));
    mark();
  }, { rootMargin: "-30% 0px -60% 0px" });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
})();

(() => {
  const hero = document.querySelector("section.hero");
  const h1 = hero && hero.querySelector("h1");
  if (!h1 || h1.children.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const words = h1.textContent.trim().split(/\s+/);
  h1.textContent = "";
  words.forEach((w, i) => {
    const o = document.createElement("span");
    const n = document.createElement("span");
    o.className = i === words.length - 1 ? "w hot" : "w";
    n.textContent = w;
    n.style.setProperty("--i", i);
    o.append(n);
    h1.append(o, i < words.length - 1 ? " " : "");
  });
  hero.classList.add("live");
})();
