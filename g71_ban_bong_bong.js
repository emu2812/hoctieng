/* G71 — Bắn Bong Bóng (v71). Cho một nghĩa tiếng Việt; bong bóng mang từ
   tiếng Anh nổi dưới nước. Ngắm pháo bằng chuột/cảm ứng/phím, bắn vỡ đúng
   bong bóng. Mỗi lần đúng +9 điểm; đủ 99 điểm là thắng; bắn nhầm mất tim.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  var LOGIC = {
    createState: function (rounds) {
      return { rounds: rounds, round: 0, hearts: 3, score: 0, over: null };
    },
    pop: function (st, word) {
      if (st.over) return null;
      var rd = st.rounds[st.round];
      if (!rd) return null;
      var correct = word === rd.correct;
      var res = { correct: correct, correctWord: rd.correct };
      if (correct) {
        st.score += 9;
        st.round++;
        if (st.score >= 99) { st.over = "win"; return res; }
        if (st.round >= st.rounds.length) st.over = "win";
      } else {
        st.hearts--;
        if (st.hearts <= 0) st.over = "lose";
      }
      return res;
    }
  };

  function start() {
    var rounds = G71.buildRounds(15, 3);
    if (rounds.length < 11) { try { toast("Chưa đủ từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(rounds);
    var running = true;
    var aim = -Math.PI / 2;
    var bullets = [];
    var parts = [];
    var bubbles = [];
    var stg = G71.openStage("🫧 Bắn Bong Bóng",
      "Di chuột/ngón tay để ngắm, bấm để bắn. Phím ← → ngắm, phím Cách bắn. Bắn đúng +9 điểm, đủ 99 là thắng; bắn nhầm mất tim; bong bóng trôi khỏi mặt nước sẽ nổi lại, không trừ điểm.",
      function () { running = false; });
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }

    function radiusFor(word) {
      return Math.min(64, 30 + String(word).length * 4);
    }
    function spawnBubble(word, top) {
      var W = cv.width || 360, H = cv.height || 480;
      return { word: word, x: 40 + Math.random() * Math.max(60, W - 80),
        y: top ? -60 : H + 40 + Math.random() * 120,
        r: radiusFor(word), vy: 26 + Math.random() * 22, ph: Math.random() * 6.28 };
    }
    function loadRound() {
      var rd = st.rounds[st.round];
      if (!rd) return;
      bubbles = rd.options.map(function (opt) { return spawnBubble(opt, false); });
    }
    function hud() {
      var rd = st.rounds[Math.min(st.round, st.rounds.length - 1)];
      stg.hud.innerHTML = "<span>Điểm: " + st.score + "/99</span>"
        + "<span>" + G71.hearts(st.hearts) + "</span>"
        + "<span style=\"flex:1 1 220px;\">Nghĩa: " + G71.escHtml(rd ? rd.vi : "") + "</span>";
    }
    loadRound();
    hud();

    function fire() {
      if (!running || st.over) return;
      var W = cv.width, H = cv.height;
      bullets.push({ x: W / 2, y: H - 70, vx: Math.cos(aim) * 620, vy: Math.sin(aim) * 620 });
    }
    function aimAt(cx, cy) {
      var r = cv.getBoundingClientRect();
      var px = cx - r.left, py = cy - r.top;
      var W = cv.width, H = cv.height;
      aim = Math.atan2(py - (H - 70), px - W / 2);
      if (aim > -0.15) aim = -0.15;
      if (aim < -Math.PI + 0.15) aim = -Math.PI + 0.15;
    }
    cv.addEventListener("mousemove", function (e) { aimAt(e.clientX, e.clientY); });
    cv.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) { aimAt(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
    }, { passive: false });
    cv.addEventListener("click", function (e) { aimAt(e.clientX, e.clientY); fire(); });
    function onKey(e) {
      if (e.key === "ArrowLeft") { aim = Math.max(-Math.PI + 0.15, aim - 0.12); e.preventDefault(); }
      else if (e.key === "ArrowRight") { aim = Math.min(-0.15, aim + 0.12); e.preventDefault(); }
      else if (e.key === " ") { fire(); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);

    var ended = false;
    function maybeEnd() {
      if (ended || !st.over) return;
      ended = true;
      running = false;
      document.removeEventListener("keydown", onKey);
      if (st.over === "win") {
        G71.endScreen(st, true, "🎉 Thắng rồi!",
          ["Đủ 99 điểm!", "Điểm: " + st.score + " · +10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(st, false, "Hết tim rồi!",
          ["Điểm: " + st.score + "/99.", "Chơi lại để thử bộ từ khác nhé."],
          start);
      }
    }

    var last = performance.now();
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var W = cv.width, H = cv.height;
      if (!W || !H) { requestAnimationFrame(frame); return; }
      var t = now / 1000;

      bubbles.forEach(function (b) {
        b.y -= b.vy * dt;
        b.x += Math.sin(t * 1.5 + b.ph) * 14 * dt;
        b.x = Math.max(b.r + 2, Math.min(W - b.r - 2, b.x));
        if (b.y < -b.r - 10) { b.y = H + 40; b.x = 40 + Math.random() * Math.max(60, W - 80); }
      });
      bullets.forEach(function (bl) { bl.x += bl.vx * dt; bl.y += bl.vy * dt; });
      bullets = bullets.filter(function (bl) {
        return bl.x > -20 && bl.x < W + 20 && bl.y > -20 && bl.y < H + 20;
      });
      var hit = null;
      outer:
      for (var bi = 0; bi < bullets.length; bi++) {
        for (var ui = 0; ui < bubbles.length; ui++) {
          var dx = bullets[bi].x - bubbles[ui].x, dy = bullets[bi].y - bubbles[ui].y;
          if (dx * dx + dy * dy < (bubbles[ui].r + 6) * (bubbles[ui].r + 6)) { hit = { b: bi, u: ui }; break outer; }
        }
      }
      if (hit) {
        var bub = bubbles[hit.u];
        bullets.splice(hit.b, 1);
        var res = LOGIC.pop(st, bub.word);
        if (res) {
          for (var i = 0; i < 12; i++) parts.push({ x: bub.x, y: bub.y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, ttl: 0.5 });
          if (res.correct) {
            bubbles = [];
            loadRound();
          } else {
            bubbles.splice(hit.u, 1);
            var rd = st.rounds[st.round];
            if (rd) {
              var taken = bubbles.map(function (x) { return x.word; });
              taken.push(rd.correct);
              var cand = G71.pool().filter(function (p) { return taken.indexOf(p.w) < 0; });
              if (cand.length) bubbles.push(spawnBubble(cand[Math.floor(Math.random() * cand.length)].w, false));
            }
          }
          hud();
        }
      }
      parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; });

      ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#7DD3FC"); g.addColorStop(1, "#1D4E89");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      G71.watercolor(ctx, W, H, [
        { x: 0.2, y: 0.3, rx: 0.24, ry: 0.18, c: "#BFDBFE" },
        { x: 0.8, y: 0.6, rx: 0.26, ry: 0.2, c: "#93C5FD" }
      ]);
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 2;
      for (var wv = 0; wv < 4; wv++) {
        ctx.beginPath();
        var wy = H * (0.2 + wv * 0.2) + Math.sin(t * 1.2 + wv) * 6;
        ctx.moveTo(0, wy);
        for (var wx = 0; wx <= W; wx += 24) ctx.lineTo(wx, wy + Math.sin(wx / 40 + t + wv) * 5);
        ctx.stroke();
      }
      bubbles.forEach(function (b) {
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0F172A";
        ctx.font = "700 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.word, b.x, b.y + 6);
        ctx.textAlign = "left";
      });
      parts.forEach(function (p) {
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = "#FDE68A"; ctx.lineWidth = 3;
      bullets.forEach(function (bl) {
        ctx.beginPath(); ctx.arc(bl.x, bl.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#FDE68A"; ctx.fill();
      });
      var cx0 = W / 2, cy0 = H - 70;
      ctx.strokeStyle = "#1F2430"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx0, cy0);
      ctx.lineTo(cx0 + Math.cos(aim) * 44, cy0 + Math.sin(aim) * 44); ctx.stroke();
      ctx.fillStyle = "#F05A28";
      ctx.beginPath(); ctx.arc(cx0, cy0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(cx0, cy0, 9, 0, Math.PI * 2); ctx.fill();
      G71.drawSnake(ctx, W - 52, H - 34, 14, true);
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71BanBongBong = { start: start, logic: LOGIC };
})();
