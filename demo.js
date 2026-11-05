/* The desktop you can try on the demo page. */
(function () {
  "use strict";

  function startClock(clockEl, dateEl) {
    function tick() {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, "0");
      var mm = String(now.getMinutes()).padStart(2, "0");
      if (clockEl) clockEl.textContent = hh + ":" + mm;
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString(undefined,
          { weekday: "long", day: "numeric", month: "long" });
      }
    }
    tick();
    setInterval(tick, 10000);
  }

  function makeRing(host, opts) {
    var STAGE = 400;      
    var RADIUS = 152;     
    var stageEl = host.querySelector("[data-stage]");
    var corner = host.querySelector(".demo-corner");
    var order = [];
    var held = null;

    function tell(words) { if (opts.tell) opts.tell(words); }

    function fit() {
      if (!stageEl) return;
      var side = opts.side();
      stageEl.style.transform =
        "translate(-50%, -50%) scale(" + (side / STAGE).toFixed(4) + ")";
      if (opts.sized) opts.sized(side);
    }

    function place() {
      order.forEach(function (slot, i) {
        var a = (i / order.length) * Math.PI * 2 - Math.PI / 2;
        slot.style.setProperty("--x", (Math.cos(a) * RADIUS).toFixed(1) + "px");
        slot.style.setProperty("--y", (Math.sin(a) * RADIUS).toFixed(1) + "px");
      });
    }

    function use(list) { order = [].slice.call(list); place(); }

    function isOpen() { return host.classList.contains("is-open"); }

    function open(yes) {
      host.classList.toggle("is-open", yes);
      if (corner) corner.setAttribute("aria-expanded", yes ? "true" : "false");
      if (yes) { fit(); place(); }
      if (opts.opened) opts.opened(yes);
    }

    function opensRing(el) {
      el.addEventListener("click", function (ev) { if (ev.detail === 0) open(!isOpen()); });
      el.addEventListener("dblclick", function () { open(!isOpen()); });
    }

    if (corner) opensRing(corner);

    document.addEventListener("click", function (ev) {
      if (!isOpen()) return;
      if (!host.contains(ev.target)) open(false);
    });
    host.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { open(false); if (corner) corner.focus(); }
    });

    host.querySelectorAll(".app, .tray-btn").forEach(function (b) {
      b.addEventListener("mouseenter", function () { tell(b.dataset.name); });
      b.addEventListener("focus", function () { tell(b.dataset.name); });
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        if (opts.pick) opts.pick(b.dataset.name, b);
        else tell(b.dataset.name + " would open here.");
      });
    });

    host.addEventListener("keydown", function (ev) {
      var slot = ev.target.closest ? ev.target.closest(".slot") : null;
      if (!slot || order.indexOf(slot) < 0) return;
      var step = 0;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") step = 1;
      if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") step = -1;
      if (!step) return;
      ev.preventDefault();
      var at = order.indexOf(slot);
      var to = (at + step + order.length) % order.length;
      if (ev.shiftKey) {
        order.splice(at, 1);
        order.splice(to, 0, slot);
        place();
        tell(slot.querySelector(".app").dataset.name + " moved to place " + (to + 1) + ".");
      } else {
        order[to].querySelector(".app").focus();
      }
    });

    host.addEventListener("pointerdown", function (ev) {
      var btn = ev.target.closest ? ev.target.closest(".app") : null;
      if (!btn || !isOpen()) return;
      held = btn.parentNode;
      if (order.indexOf(held) < 0) { held = null; return; }
      held.classList.add("is-held");
      btn.setPointerCapture(ev.pointerId);
      tell("Moving " + btn.dataset.name + ".");
    });
    host.addEventListener("pointermove", function (ev) {
      if (!held || !stageEl) return;
      ev.preventDefault();
      var box = stageEl.getBoundingClientRect();
      var a = Math.atan2(ev.clientY - (box.top + box.height / 2),
                         ev.clientX - (box.left + box.width / 2)) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      var want = Math.round(a / (Math.PI * 2) * order.length) % order.length;
      var at = order.indexOf(held);
      if (want !== at) {
        order.splice(at, 1);
        order.splice(want, 0, held);
        place();
      }
    });
    function drop() {
      if (!held) return;
      held.classList.remove("is-held");
      tell(held.querySelector(".app").dataset.name + " is now in place " +
           (order.indexOf(held) + 1) + ".");
      held = null;
    }
    host.addEventListener("pointerup", drop);
    host.addEventListener("pointercancel", drop);

    window.addEventListener("resize", function () { fit(); place(); }, { passive: true });

    return { open: open, isOpen: isOpen, use: use, fit: fit, place: place, tell: tell };
  }

  var desk = document.querySelector("[data-desk]");
  if (desk) {
    var deskSay = document.querySelector("[data-desk-say]");
    var area = desk.querySelector(".desk-area");
    var paper = desk.querySelector("[data-paper]");
    var ringEl = desk.querySelector(".demo-ring");
    var allBtn = desk.querySelector("[data-all]");
    var windowsEl = desk.querySelector("[data-windows]");
    var tasksEl = desk.querySelector("[data-tasks]");
    var emptyEl = desk.querySelector("[data-empty]");
    var lists = [].slice.call(desk.querySelectorAll(".demo-apps"));
    var favorites = desk.querySelector('[data-list="favorites"]');
    var kinds = desk.querySelector('[data-list="kinds"]');
    var view = "favorites";
    var open = [];      
    var top = 10;

    var shots = {
      "Settings": ["img/settings-appearance.jpg", "The Appearance page of Trindle's Settings"],
      "Apps": ["img/apps-move-your-apps.jpg", "The Move your apps page of Trindle's Apps"],
      "Snapshots": ["img/settings-snapshots.jpg", "The Snapshots page of Trindle's Settings"]
    };

    function deskTell(words) { if (deskSay) deskSay.textContent = words; }

    var ring = makeRing(desk, {
      tell: deskTell,
      side: function () {
        var w = area.clientWidth, h = area.clientHeight;
        return Math.max(190, Math.min(w, h) * 0.96);
      },
      opened: function (yes) {
        if (!yes) { showList(favorites, "favorites"); }
        deskTell(yes
          ? "Pick an app to open it, or drag an icon round the circle."
          : "The ring is shut. Double-click the corner or the wallpaper to open it.");
      },
      pick: function (name, btn) {
        if (btn.classList.contains("tray-btn")) {
          deskTell(name + " is only a picture here.");
          return;
        }
        if (btn.dataset.kind) { showKind(btn.dataset.kind); return; }
        openWindow(name);
      }
    });

    function showList(list, which) {
      lists.forEach(function (el) { el.hidden = el !== list; });
      view = which;
      if (allBtn) allBtn.setAttribute("aria-pressed", which === "favorites" ? "false" : "true");
      ring.use(list.querySelectorAll(".slot"));
    }

    function showKind(kind) {
      var list = desk.querySelector('[data-in="' + kind + '"]');
      if (!list) return;
      showList(list, kind);
      deskTell(kind + ": pick an app, or press All apps to go back.");
    }

    if (allBtn) {
      allBtn.addEventListener("click", function () {
        if (view === "favorites") {
          showList(kinds, "kinds");
          deskTell("All apps. Pick a kind of app.");
        } else {
          showList(favorites, "favorites");
          deskTell("Back to your favourites.");
        }
      });
    }

    if (paper) {
      paper.addEventListener("click", function (ev) { if (ev.detail === 0) ring.open(!ring.isOpen()); });
      paper.addEventListener("dblclick", function () { ring.open(!ring.isOpen()); });
    }
    if (ringEl) {
      ringEl.addEventListener("click", function (ev) {
        if (ev.target.closest(".app, .tray-btn, .center-btn")) return;
        ring.open(false);
      });
    }

    function raise(win) {
      win.hidden = false;
      win.style.zIndex = ++top;
      drawBar();
    }

    function openWindow(name) {
      ring.open(false);
      var already = open.filter(function (w) { return w.dataset.app === name; })[0];
      if (already) { raise(already); deskTell(name + " is already open."); return; }

      var win = document.createElement("div");
      win.className = "desk-window";
      win.dataset.app = name;
      win.setAttribute("role", "group");
      win.setAttribute("aria-label", name);
      win.style.setProperty("--n", String(open.length % 4));

      var shot = shots[name];
      var inside = shot
        ? '<img src="' + shot[0] + '" alt="' + shot[1] + '" loading="lazy">'
        : '<p class="desk-plain">' + name + ' is not part of this demonstration.</p>';

      win.innerHTML =
        '<div class="desk-window-bar"><span class="desk-window-name"></span>' +
        '<div class="desk-window-btns">' +
        '<button class="win-btn" type="button" data-act="min" aria-label="Put ' + name + ' away" title="Put away">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 9h12l-6 8z"/></svg></button>' +
        '<button class="win-btn" type="button" data-act="max" aria-label="Fill the screen with ' + name + '" title="Fill the screen">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 15h12l-6-8z"/></svg></button>' +
        '<button class="win-btn" type="button" data-act="close" aria-label="Close ' + name + '" title="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/></svg></button>' +
        '</div></div><div class="desk-window-body">' + inside + '</div>';
      win.querySelector(".desk-window-name").textContent = name;

      win.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-act]") : null;
        if (!btn) { raise(win); return; }
        if (btn.dataset.act === "close") {
          open = open.filter(function (w) { return w !== win; });
          win.remove();
          deskTell(name + " is closed.");
        } else if (btn.dataset.act === "min") {
          win.hidden = true;
          deskTell(name + " is put away. It is still in the strip.");
        } else {
          win.classList.toggle("is-max");
          deskTell(win.classList.contains("is-max")
            ? name + " fills the screen." : name + " is back to its size.");
        }
        drawBar();
      });

      windowsEl.appendChild(win);
      open.push(win);
      raise(win);
      deskTell(shot
        ? name + " is open. The picture inside it is a screenshot."
        : name + " is open. It is not part of this demonstration.");
    }

    function frontWindow() {
      var best = null;
      open.forEach(function (w) {
        if (w.hidden) return;
        if (!best || Number(w.style.zIndex) > Number(best.style.zIndex)) best = w;
      });
      return best;
    }

    function drawBar() {
      var front = frontWindow();
      tasksEl.textContent = "";
      emptyEl.hidden = open.length > 0;
      open.forEach(function (w) {
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "desk-task" + (w === front ? " is-front" : "") + (w.hidden ? " is-away" : "");
        btn.textContent = w.dataset.app;
        btn.addEventListener("click", function () {
          if (w.hidden || w !== frontWindow()) { raise(w); }
          else { w.hidden = true; drawBar(); }
        });
        li.appendChild(btn);
        tasksEl.appendChild(li);
      });
    }

    showList(favorites, "favorites");
    startClock(desk.querySelector("[data-clock]"), desk.querySelector("[data-date]"));
    ring.fit();
    ring.place();
    drawBar();
  }
})();
