/* G71 — Rồng Bay Trên Mây (v71). Rồng bay trên 3 làn mây; mỗi vòng cho một
   nghĩa tiếng Việt, người chơi bay vào làn có từ đúng với nghĩa đó. Đúng
   hiện CHUẨN!, sai mất tim. Hết 10 vòng còn tim là thắng.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  var LOGIC = {
    createState: function (rounds) {
      return { rounds: rounds, round: 0, hearts: 3, score: 0, picked: null, over: null };
    },
    pick: function (st, laneIdx) {
      if (st.over || st.picked !== null) return null;
      var rd = st.rounds[st.round];
      if (!rd) return null;
      var correct = rd.options[laneIdx] === rd.correct;
      st.picked = laneIdx;
      var res = { correct: correct, correctWord: rd.correct };
      if (correct) { st.score += 10; } else {
        st.hearts--;
        if (st.hearts <= 0) { st.over = "lose"; return res; }
      }
      st.round++;
      st.picked = null;
      if (st.round >= st.rounds.length) st.over = "win";
      return res;
    }
  };

  function start() {
    var rounds = G71.buildRounds(10, 2);
    if (rounds.length < 3) { try { toast("Chưa đủ từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(rounds);
    var running = true;
    var lane = 1; /* 0 = trên, 1 = giữa, 2 = dưới */
    var shown = 0; /* vòng đang hiển thị (chậm hơn st.round trong lúc hiện kết quả) */
    var phase = "fly"; /* fly | dash | resolve */
    var resolveUntil = 0;
    var banner = "";
    var bannerOk = true;
    var dragonX = 0.16;
    var targetX = 0.16;
    var stg = G71.openStage("🐉 Rồng Bay Trên Mây",
      "Phím ↑ ↓ đổi làn, phím Cách bay vào mây. Chuột/cảm ứng: bấm vào đám mây muốn bay vào. Đúng hiện CHUẨN!, sai mất tim.",
      function () { running = false; });
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }

    function hud() {
      var rd = st.rounds[Math.min(shown, st.rounds.length - 1)];
      stg.hud.innerHTML = "<span>" + G71.hearts(st.hearts) + "</span>"
        + "<span>Vòng: " + (Math.min(shown + 1, st.rounds.length)) + "/" + st.rounds.length + "</span>"
        + "<span>Tiến độ: " + Math.round(shown / st.rounds.length * 100) + "%</span>"
        + "<span>Điểm: " + st.score + "</span>"
        + "<span style=\"flex:1 1 220px;\">Nghĩa: " + G71.escHtml(rd ? rd.vi : "") + "</span>";
    }
    hud();

    function dashTo(li) {
      if (!running || st.over || phase !== "fly") return;
      lane = li;
      targetX = 0.68;
      phase = "dash";
    }
    function onKey(e) {
      if (e.key === "ArrowUp") { if (phase === "fly") lane = Math.max(0, lane - 1); e.preventDefault(); }
      else if (e.key === "ArrowDown") { if (phase === "fly") lane = Math.min(2, lane + 1); e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { dashTo(lane); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      var py = (e.clientY - r.top) / r.height;
      var li = py < 0.33 ? 0 : (py < 0.66 ? 1 : 2);
      dashTo(li);
    });

    var ended = false;
    function maybeEnd() {
      if (ended || !st.over || phase === "resolve") return;
      ended = true;
      running = false;
      document.removeEventListener("keydown", onKey);
      if (st.over === "win") {
        G71.endScreen(st, true, "🎉 Thắng rồi!",
          ["Hoàn thành " + st.rounds.length + " vòng.", "Điểm: " + st.score + " · +10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(st, false, "Hết tim rồi!",
          ["Điểm: " + st.score + ".", "Chơi lại để thử bộ từ khác nhé."],
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
      var rd = st.rounds[Math.min(shown, st.rounds.length - 1)];
      var laneYs = [H * 0.22, H * 0.5, H * 0.78];
      var bob = Math.sin(now / 300) * 6;

      if (phase === "dash") {
        dragonX += (targetX - dragonX) * Math.min(1, dt * 8);
        if (Math.abs(targetX - dragonX) < 0.02) {
          var res = LOGIC.pick(st, lane);
          if (res) {
            banner = res.correct ? "CHUẨN!" : "Sai rồi! Đáp án: " + res.correctWord;
            bannerOk = res.correct;
            phase = "resolve";
            resolveUntil = now + 1200;
            hud();
          } else { phase = "fly"; dragonX = 0.16; targetX = 0.16; }
        }
      }
      if (phase === "resolve" && now >= resolveUntil) {
        phase = "fly";
        dragonX = 0.16;
        targetX = 0.16;
        banner = "";
        shown = st.round;
        hud();
      }

      ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#BFE6F5"); g.addColorStop(1, "#FFF7E8");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      G71.watercolor(ctx, W, H, [
        { x: 0.25, y: 0.2, rx: 0.24, ry: 0.16, c: "#7DD3FC" },
        { x: 0.75, y: 0.75, rx: 0.26, ry: 0.18, c: "#F59E0B" }
      ]);
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 12]);
      laneYs.forEach(function (ly) {
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
      });
      ctx.setLineDash([]);
      if (rd) {
        rd.options.forEach(function (opt, li) {
          var cx = W * 0.72 + Math.sin(now / 900 + li * 2) * 8;
          var cy = laneYs[li];
          G71.drawCloud(ctx, cx, cy, 62);
          if (phase === "resolve") {
            if (opt === rd.correct) {
              ctx.strokeStyle = "#1E9E6A"; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
            } else if (li === lane && !bannerOk) {
              ctx.strokeStyle = "#DC2626"; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
            }
          }
          ctx.fillStyle = "#1F2430";
          ctx.font = "700 18px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(opt, cx, cy + 7);
          ctx.textAlign = "left";
        });
      }
      G71.drawDragon(ctx, W * dragonX, laneYs[lane] + bob, 26);
      G71.drawSnake(ctx, W * 0.06, H - 40, 16, false);
      if (banner) {
        ctx.fillStyle = bannerOk ? "#1E9E6A" : "#DC2626";
        ctx.font = "800 34px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(banner, W / 2, H * 0.12);
        ctx.textAlign = "left";
      }
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71RongBay = { start: start, logic: LOGIC };
})();
