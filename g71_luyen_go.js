/* G71 — Luyện Gõ (v71). Từ rơi như viên thuốc trong vũ trụ; gõ đúng chữ để
   bắn hạ. Rơi xuống đáy hoặc gõ sai đều mất tim. Gõ hết 20 từ là thắng.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  var LOGIC = {
    createState: function (words, theme) {
      var ws = words.map(function (wd, i) {
        return { w: wd.w, vi: wd.vi, status: "falling", progress: 0,
          x: 0.12 + Math.random() * 0.76, y: -0.12 - i * 0.22,
          speed: 0.075 + Math.random() * 0.03 };
      });
      return { theme: theme, total: words.length, words: ws, active: null,
        hearts: 3, score: 0, cleared: 0, resolved: 0, over: null, graceUntil: 0 };
    },
    loseHeart: function (st, now) {
      st.hearts--;
      st.graceUntil = now + 500;
      if (st.hearts <= 0) { st.over = "lose"; st.active = null; }
      return { ok: false, lostHeart: true };
    },
    typeLetter: function (st, ch, now) {
      if (st.over) return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1 || !/[a-z]/.test(ch)) return { ok: false };
      if (now < st.graceUntil) return { ok: false, grace: true };
      var w = null;
      if (st.active !== null && st.words[st.active] && st.words[st.active].status === "falling") {
        w = st.words[st.active];
      } else {
        var best = null;
        st.words.forEach(function (wd, i) {
          if (wd.status !== "falling") return;
          if (wd.w.charAt(wd.progress).toLowerCase() !== ch) return;
          if (best === null || wd.y > st.words[best].y) best = i;
        });
        if (best === null) return LOGIC.loseHeart(st, now);
        st.active = best;
        w = st.words[best];
      }
      if (w.w.charAt(w.progress).toLowerCase() === ch) {
        w.progress++;
        if (w.progress >= w.w.length) {
          w.status = "done";
          st.cleared++;
          st.score += 10;
          st.resolved++;
          st.active = null;
          if (st.resolved >= st.total) st.over = "win";
          return { ok: true, completed: true };
        }
        return { ok: true };
      }
      return LOGIC.loseHeart(st, now);
    },
    lockWord: function (st, idx) {
      if (st.over) return;
      if (st.words[idx] && st.words[idx].status === "falling") st.active = idx;
    },
    tick: function (st, dt, now) {
      if (st.over) return;
      var boost = 1 + st.resolved * 0.02;
      st.words.forEach(function (wd) {
        if (wd.status !== "falling") return;
        wd.y += wd.speed * boost * dt;
        if (wd.y >= 1.02) {
          wd.status = "missed";
          st.resolved++;
          if (st.active !== null && st.words[st.active] === wd) st.active = null;
          if (st.hearts > 0) {
            st.hearts--;
            st.graceUntil = now + 500;
            if (st.hearts <= 0) st.over = "lose";
          }
        }
      });
      if (!st.over && st.resolved >= st.total) st.over = "win";
    }
  };

  function start() {
    var set = G71.pickTypingWords(20);
    if (!set.words.length) { try { toast("Chưa có từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(set.words, set.theme);
    var running = true;
    var flashes = [];
    var parts = [];
    var stg = G71.openStage("⌨️ Luyện Gõ" + (set.theme ? " — " + set.theme : ""),
      "Gõ chữ trên bàn phím, hoặc bấm vào viên thuốc rồi gõ. Bấm vào nút chữ cái dưới đây cũng được. Gõ sai hoặc để từ rơi xuống đáy là mất tim.",
      function () { running = false; });
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }

    function hud() {
      stg.hud.innerHTML = "<span>Điểm: " + st.score + "</span>"
        + "<span>Mốc: " + st.cleared + "/" + st.total + "</span>"
        + "<span>Chủ đề: " + G71.escHtml(st.theme || "Từ vựng") + "</span>"
        + "<span>" + G71.hearts(st.hearts) + "</span>";
    }
    hud();

    /* Bàn phím trên màn hình cho chuột + cảm ứng. */
    var kb = document.createElement("div");
    kb.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:8px 12px;background:#fff;border-top:2px solid #F3D9A4;";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (L) {
      var b = document.createElement("button");
      b.className = "btn";
      b.textContent = L;
      b.style.cssText = "padding:8px 10px;min-width:34px;";
      b.onclick = function () { feed(L); };
      kb.appendChild(b);
    });
    stg.el.appendChild(kb);

    function feed(ch) {
      if (!running || st.over) return;
      var before = st.cleared;
      var actBefore = st.active;
      var r = LOGIC.typeLetter(st, ch, Date.now());
      if (r.ok && st.active !== null) {
        var wd = st.words[st.active];
        if (wd) flashes.push({ x: wd.x, y: wd.y, ttl: 0.18 });
      }
      if (r.completed && actBefore !== null && st.words[actBefore]) {
        var wd2 = st.words[actBefore];
        for (var i = 0; i < 14; i++) parts.push({ x: wd2.x, y: wd2.y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, ttl: 0.6 });
      }
      if (before !== st.cleared || r.lostHeart) hud();
      maybeEnd();
    }
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) feed(e.key);
    }
    document.addEventListener("keydown", onKey);
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      var best = null, bd = 1e9;
      st.words.forEach(function (wd, i) {
        if (wd.status !== "falling") return;
        var d = Math.abs(wd.x - px) + Math.abs(wd.y - py);
        if (d < bd) { bd = d; best = i; }
      });
      if (best !== null && bd < 0.25) LOGIC.lockWord(st, best);
    });

    var ended = false;
    function maybeEnd() {
      if (ended || !st.over) return;
      ended = true;
      running = false;
      document.removeEventListener("keydown", onKey);
      if (st.over === "win") {
        G71.endScreen(st, true, "🎉 Thắng rồi!",
          ["Gõ đúng " + st.cleared + "/" + st.total + " từ.", "Điểm: " + st.score + " · +10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(st, false, "Hết tim rồi!",
          ["Gõ đúng " + st.cleared + "/" + st.total + " từ.", "Chơi lại để thử chủ đề khác nhé."],
          start);
      }
    }

    var last = performance.now();
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      LOGIC.tick(st, dt, now);
      var W = cv.width, H = cv.height;
      if (!W || !H) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0F172A"); g.addColorStop(1, "#274B73");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      G71.watercolor(ctx, W, H, [
        { x: 0.2, y: 0.25, rx: 0.22, ry: 0.16, c: "#7DD3FC" },
        { x: 0.8, y: 0.6, rx: 0.25, ry: 0.18, c: "#F59E0B" },
        { x: 0.5, y: 0.85, rx: 0.28, ry: 0.14, c: "#1E9E6A" }
      ]);
      ctx.fillStyle = "#fff";
      for (var s = 0; s < 60; s++) {
        var sx = (s * 97) % W, sy = (s * 57) % H;
        ctx.globalAlpha = 0.35 + ((s * 13) % 10) / 20;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      st.words.forEach(function (wd, i) {
        if (wd.status !== "falling") return;
        var py = wd.y * H;
        if (py < -30 || py > H + 30) return;
        var isAct = (st.active === i);
        ctx.font = "700 17px system-ui, sans-serif";
        var tw = ctx.measureText(wd.w).width + 28;
        var px = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, wd.x * W));
        ctx.fillStyle = isAct ? "#F59E0B" : "#1F2430";
        G71.rr(ctx, px - tw / 2, py - 18, tw, 34, 17);
        ctx.fill();
        ctx.strokeStyle = isAct ? "#FBBF24" : "#334155";
        ctx.lineWidth = 2;
        ctx.stroke();
        var done = wd.w.slice(0, wd.progress), rest = wd.w.slice(wd.progress);
        var x0 = px - ctx.measureText(wd.w).width / 2;
        ctx.fillStyle = "#FDE68A";
        ctx.fillText(done, x0, py + 6);
        ctx.fillStyle = "#fff";
        ctx.fillText(rest, x0 + ctx.measureText(done).width, py + 6);
      });
      flashes = flashes.filter(function (f) { return (f.ttl -= dt) > 0; });
      flashes.forEach(function (f) {
        ctx.strokeStyle = "rgba(253,230,138,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W / 2, H - 70);
        ctx.lineTo(f.x * W, f.y * H);
        ctx.stroke();
      });
      parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
      parts.forEach(function (p) {
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect((p.x + p.vx * (0.6 - p.ttl)) * W, (p.y + p.vy * (0.6 - p.ttl)) * H, 5, 5);
      });
      var flick = 0.5 + 0.5 * Math.sin(now / 90);
      G71.drawRocket(ctx, W / 2, H - 46, 30, flick);
      G71.drawDragon(ctx, W / 2, H - 108, 16);
      if (st.active !== null && st.words[st.active]) {
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nghĩa: " + st.words[st.active].vi, W / 2, H - 8);
        ctx.textAlign = "left";
      }
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71LuyenGo = { start: start, logic: LOGIC };
})();
