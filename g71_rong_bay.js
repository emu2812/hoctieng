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
      stg.hud.innerHTML = "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>"
        + "<span style=\"flex:none\">Vòng: " + (Math.min(shown + 1, st.rounds.length)) + "/" + st.rounds.length + "</span>"
        + "<span style=\"flex:none\">Tiến độ: " + Math.round(shown / st.rounds.length * 100) + "%</span>"
        + "<span style=\"flex:none\">Điểm: " + st.score + "</span>"
        + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Nghĩa: " + G71.escHtml(rd ? rd.vi : "") + "</span>";
    }
    hud();

    var cloudFrac = 0.72; /* cập nhật mỗi khung hình theo cloudGeom */
    function dashTo(li) {
      if (!running || st.over || phase !== "fly") return;
      lane = li;
      targetX = cloudFrac;
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
      G71.paintSky(ctx, W, H, now);
      var cg = G71.cloudGeom(W, H);
      cloudFrac = cg.cx / W;
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 12]);
      laneYs.forEach(function (ly) {
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
      });
      ctx.setLineDash([]);
      if (rd) {
        rd.options.forEach(function (opt, li) {
          /* Mây rộng neo mép phải: từ dài ngắt 2 dòng + thu nhỏ, không
             bao giờ tràn khỏi mây hay khỏi mép màn hình. */
          var cx = cg.cx + Math.sin(now / 900 + li * 2) * 6;
          var cy = laneYs[li];
          cx = Math.max(cg.hw + 8, Math.min(W - cg.hw - 8, cx));
          G71.drawCloudWide(ctx, cx, cy, cg.hw, cg.hh);
          if (phase === "resolve") {
            if (opt === rd.correct) {
              ctx.strokeStyle = "#1E9E6A"; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.ellipse(cx, cy, cg.hw + 5, cg.hh + 5, 0, 0, Math.PI * 2); ctx.stroke();
            } else if (li === lane && !bannerOk) {
              ctx.strokeStyle = "#DC2626"; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.ellipse(cx, cy, cg.hw + 5, cg.hh + 5, 0, 0, Math.PI * 2); ctx.stroke();
            }
          }
          ctx.fillStyle = "#1F2430";
          G71.drawFitText(ctx, opt, cx, cy, cg.hw * 2 - 24, 18, 11, 2, "700");
        });
      }
      G71.drawDragon(ctx, W * dragonX, laneYs[lane] + bob, 30);
      G71.drawSnake(ctx, W * 0.08, H - 44, 20, false);
      if (banner) {
        ctx.fillStyle = bannerOk ? "#1E9E6A" : "#DC2626";
        G71.drawFitText(ctx, banner, W / 2, H * 0.12, W - 32, 30, 15, 2, "800");
      }
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71RongBay = { start: start, logic: LOGIC };
})();
