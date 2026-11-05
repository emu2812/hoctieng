/* G71 — Rồng Bay Trên Mây (v71, làm lại cho vui hơn ở v79). Rồng bay trên
   3 làn mây; mỗi vòng cho một nghĩa tiếng Việt, người chơi bay vào làn có
   từ đúng với nghĩa đó. Đúng +10 (chuỗi đúng nhân điểm tới ×3, mây vàng
   +30, vòng tốc độ ×2, sao ×2), sai mất tim (khiên chặn 1 lần). Hết 10
   vòng còn tim là thắng, sao 1–3 theo điểm + điểm cao nhất đã lưu.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  var PRAISES = ["CHUẨN!", "TUYỆT VỜI!", "ĐỈNH QUÁ!", "HAY QUÁ!", "XUẤT SẮC!", "BAY ĐẸP QUÁ!"];
  var ITEM_ICON = { star: "⭐", shield: "🛡️", slow: "🐢" };
  var BEST_KEY = "g71_rongbay_best";

  /* Vòng theo chủ đề: mỗi vòng lấy đáp án đúng từ một chủ đề khác nhau
     (du lịch, thời tiết, cảm xúc...), đáp án nhiễu lấy từ kho chung.
     Thiếu chủ đề thì về lại buildRounds cũ. */
  function buildThemedRounds(n, dist) {
    var p = G71.pool();
    var byTheme = {};
    p.forEach(function (w) {
      var t = w.theme || "";
      if (t) (byTheme[t] = byTheme[t] || []).push(w);
    });
    var themes = G71.shuffle(Object.keys(byTheme));
    if (themes.length < 2 || p.length < n + dist) return G71.buildRounds(n, dist);
    var used = {};
    var rounds = [];
    var ti = 0, guard = 0;
    while (rounds.length < n && guard++ < 300) {
      var theme = themes[ti % themes.length]; ti++;
      var cands = G71.shuffle(byTheme[theme].slice()).filter(function (w) { return !used[w.w]; });
      if (!cands.length) continue;
      var t = cands[0];
      var ds = [];
      var rest = G71.shuffle(p.slice());
      for (var j = 0; j < rest.length && ds.length < dist; j++) {
        var d = rest[j];
        if (d.w !== t.w && d.vi !== t.vi && ds.every(function (x) { return x.w !== d.w; })) ds.push(d);
      }
      if (ds.length < dist) continue;
      used[t.w] = true;
      rounds.push({ vi: t.vi, correct: t.w, options: G71.shuffle([t.w].concat(ds.map(function (d) { return d.w; }))), theme: theme });
    }
    return rounds.length >= 3 ? rounds : G71.buildRounds(n, dist);
  }
  /* Tên chủ đề gọn để hiện trên sân: bỏ phần tiếng Anh sau dấu " - ". */
  function themeShort(theme) {
    return String(theme || "").split(" - ")[0];
  }

  var LOGIC = {
    createState: function (rounds) {
      return {
        rounds: rounds, round: 0, hearts: 3, score: 0, picked: null, over: null,
        streak: 0, bestStreak: 0,
        items: { star: 0, shield: 0, slow: 0 },
        starActive: false, slowUntil: 0,
        goldenLane: rounds.map(function (rd) { return (typeof rd.goldenLane === "number") ? rd.goldenLane : -1; }),
        speed: rounds.map(function (_, i) { return (i + 1) % 3 === 0; })
      };
    },
    comboMult: function (streak) { return streak >= 5 ? 3 : (streak >= 3 ? 2 : 1); },
    starsFor: function (score, win) {
      if (!win) return 0;
      return score >= 150 ? 3 : (score >= 90 ? 2 : 1);
    },
    /* Vật phẩm kiếm bằng chuỗi: chuỗi 3 → sao, chuỗi 5 → khiên, chuỗi 7
       → chậm (mỗi mốc chỉ cho 1 món; chuỗi dài hơn lặp lại các mốc). */
    earnForStreak: function (streak) {
      if (streak > 0 && streak % 3 === 0) return "star";
      if (streak > 0 && streak % 5 === 0) return "shield";
      if (streak > 0 && streak % 7 === 0) return "slow";
      return null;
    },
    useItem: function (st, kind, now) {
      if (st.over) return false;
      if (kind === "star") {
        if (st.items.star > 0 && !st.starActive) { st.items.star--; st.starActive = true; return true; }
        return false;
      }
      if (kind === "slow") {
        if (st.items.slow > 0) { st.items.slow--; st.slowUntil = (now || 0) + 5000; return true; }
        return false;
      }
      return false; /* khiên bị động: tự chặn khi chọn sai, không bấm dùng */
    },
    slowActive: function (st, now) { return !!st.slowUntil && (now || 0) < st.slowUntil; },
    pick: function (st, laneIdx) {
      if (st.over || st.picked !== null) return null;
      var rd = st.rounds[st.round];
      if (!rd) return null;
      var correct = rd.options[laneIdx] === rd.correct;
      st.picked = laneIdx;
      var res = { correct: correct, correctWord: rd.correct, points: 0, streak: st.streak, mult: 1,
        golden: laneIdx === st.goldenLane[st.round], speed: !!st.speed[st.round], earned: null, blocked: false };
      if (correct) {
        st.streak++;
        if (st.streak > st.bestStreak) st.bestStreak = st.streak;
        var mult = LOGIC.comboMult(st.streak);
        var base = res.golden ? 30 : 10;
        var pts = base * mult * (res.speed ? 2 : 1) * (st.starActive ? 2 : 1);
        st.score += 10; /* +10 gốc mỗi lần đúng (luật lõi v71; probe v74 bắt đúng chuỗi này) */
        if (pts > 10) st.score += (pts - 10); /* thưởng thêm: combo / mây vàng / vòng tốc độ / sao */
        res.points = pts; res.mult = mult; res.streak = st.streak;
        st.starActive = false;
        var earned = LOGIC.earnForStreak(st.streak);
        if (earned) {
          var cap = earned === "star" ? 3 : 2;
          if (st.items[earned] < cap) st.items[earned]++;
          res.earned = earned;
        }
      } else {
        if (st.items.shield > 0) {
          st.items.shield--;
          res.blocked = true;
        } else {
          st.hearts--;
          if (st.hearts <= 0) { st.over = "lose"; st.streak = 0; return res; }
        }
        st.streak = 0;
        st.starActive = false;
      }
      st.round++;
      st.picked = null;
      if (st.round >= st.rounds.length) st.over = "win";
      return res;
    }
  };

  function bestScore() {
    try { return parseInt(window.localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { window.localStorage.setItem(BEST_KEY, String(v)); } catch (e) {}
  }

  function start() {
    var rounds = buildThemedRounds(10, 2);
    if (rounds.length < 3) { try { toast("Chưa đủ từ vựng để chơi."); } catch (e) {} return; }
    /* Mây vàng: mỗi vòng ~40% có một đám mây vàng ở làn ngẫu nhiên (làn
       vàng không liên quan đáp án đúng — chọn đúng vào mây vàng mới +30).
       Đảm bảo ít nhất 2 vòng có mây vàng trong một lượt chơi. */
    var goldenCount = 0;
    rounds.forEach(function (rd) {
      if (Math.random() < 0.4) { rd.goldenLane = Math.floor(Math.random() * 3); goldenCount++; }
    });
    if (goldenCount < 2) {
      var idxs = G71.shuffle(rounds.map(function (_, i) { return i; }));
      for (var gi = 0; gi < idxs.length && goldenCount < 2; gi++) {
        if (typeof rounds[idxs[gi]].goldenLane !== "number") {
          rounds[idxs[gi]].goldenLane = Math.floor(Math.random() * 3);
          goldenCount++;
        }
      }
    }
    var st = LOGIC.createState(rounds);
    var running = true;
    var lane = 1; /* 0 = trên, 1 = giữa, 2 = dưới */
    var shown = 0; /* vòng đang hiển thị (chậm hơn st.round trong lúc hiện kết quả) */
    var phase = "fly"; /* fly | dash | resolve */
    var resolveUntil = 0;
    var banner = "";
    var bannerOk = true;
    var notice = "";
    var noticeUntil = 0;
    var lastPraise = "";
    var particles = [];
    var shakeUntil = 0;
    var celebrateUntil = 0;
    var dragonX = 0.16;
    var targetX = 0.16;
    var dragonY = 0;
    var stg = G71.openStage("🐉 Rồng Bay Trên Mây",
      "Phím ↑ ↓ đổi làn, phím Cách bay vào mây. Chuột/cảm ứng: bấm vào đám mây muốn bay vào. Chuỗi đúng nhân điểm, mây vàng +30, cứ 3 vòng có 1 vòng tốc độ ×2. Bấm ⭐/🐢 để dùng vật phẩm (phím 1/2).",
      function () { running = false; });
    /* Tiêu đề hiện đủ tên trên màn hẹp: nút Thoát chỉ còn icon ✕. */
    var exitBtn = stg.el.querySelector("#g71Exit");
    if (exitBtn) { exitBtn.textContent = "✕"; exitBtn.title = "Thoát"; }
    var cv = stg.canvas, ctx = stg.ctx;
    /* Nút vật phẩm nổi góc phải sân (tạo một lần, hud() chỉ cập nhật). */
    var itemBar = document.createElement("div");
    itemBar.id = "g71Items";
    itemBar.style.cssText = "position:absolute;top:8px;right:10px;z-index:4;display:flex;gap:6px;align-items:center;";
    itemBar.innerHTML = '<button type="button" id="g71ItemStar" class="btn" title="Sao: vòng sau điểm gấp đôi" style="flex:none;padding:3px 6px;font-size:13px;">⭐×0</button>'
      + '<span id="g71ItemShield" title="Khiên: tự chặn 1 lần chọn sai" style="flex:none;background:#fff;border:2px solid #F3D9A4;border-radius:12px;padding:3px 6px;font-weight:700;font-size:13px;">🛡️×0</span>'
      + '<button type="button" id="g71ItemSlow" class="btn" title="Chậm: mây chậm lại 5 giây" style="flex:none;padding:3px 6px;font-size:13px;">🐢×0</button>';
    stg.wrap.appendChild(itemBar);
    var starBtn = itemBar.querySelector("#g71ItemStar");
    var shieldBadge = itemBar.querySelector("#g71ItemShield");
    var slowBtn = itemBar.querySelector("#g71ItemSlow");
    if (starBtn) starBtn.onclick = function () { if (LOGIC.useItem(st, "star", performance.now())) hud(); };
    if (slowBtn) slowBtn.onclick = function () { if (LOGIC.useItem(st, "slow", performance.now())) hud(); };

    function hud() {
      var rd = st.rounds[Math.min(shown, st.rounds.length - 1)];
      /* HUD một dòng, nhãn gọn để tim/vòng/tiến độ/điểm không bị cắt trên
         màn hẹp; nghĩa dài tự cắt bằng … (giữ đúng luật HUD 1 dòng v74). */
      stg.hud.style.fontSize = "14px";
      stg.hud.innerHTML = "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>"
        + "<span style=\"flex:none\">Vòng " + (Math.min(shown + 1, st.rounds.length)) + "/" + st.rounds.length + "</span>"
        + "<span style=\"flex:none\">" + Math.round(shown / st.rounds.length * 100) + "%</span>"
        + "<span style=\"flex:none\">Điểm " + st.score + "</span>"
        + (st.streak >= 2 ? "<span style=\"flex:none;color:#B45309\">🔥×" + LOGIC.comboMult(st.streak) + "</span>" : "")
        + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Nghĩa: " + G71.escHtml(rd ? rd.vi : "") + "</span>";
      if (starBtn) { starBtn.textContent = "⭐×" + st.items.star; starBtn.disabled = st.items.star <= 0 || st.starActive || !!st.over; }
      if (shieldBadge) shieldBadge.textContent = "🛡️×" + st.items.shield;
      if (slowBtn) { slowBtn.textContent = "🐢×" + st.items.slow; slowBtn.disabled = st.items.slow <= 0 || LOGIC.slowActive(st, performance.now()) || !!st.over; }
    }
    hud();
    if (!ctx) { if (stg.hint) stg.hint.textContent += " Trình duyệt này chưa hỗ trợ canvas."; return; }

    function dashTo(li) {
      if (!running || st.over || phase !== "fly") return;
      lane = li;
      phase = "dash";
    }
    function onKey(e) {
      if (e.key === "ArrowUp") { if (phase === "fly") lane = Math.max(0, lane - 1); e.preventDefault(); }
      else if (e.key === "ArrowDown") { if (phase === "fly") lane = Math.min(2, lane + 1); e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { dashTo(lane); e.preventDefault(); }
      else if (e.key === "1") { if (LOGIC.useItem(st, "star", performance.now())) hud(); }
      else if (e.key === "2") { if (LOGIC.useItem(st, "slow", performance.now())) hud(); }
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
      var best = Math.max(bestScore(), st.score);
      saveBest(best);
      if (st.over === "win") {
        var stars = LOGIC.starsFor(st.score, true);
        G71.endScreen(st, true, "🎉 Thắng rồi!",
          ["Sao: " + "★".repeat(stars) + "☆".repeat(3 - stars) + ".",
           "Điểm: " + st.score + " · Điểm cao nhất: " + best + " · Chuỗi dài nhất: " + st.bestStreak + ".",
           "+10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(st, false, "Hết tim rồi!",
          ["Điểm: " + st.score + " · Điểm cao nhất: " + best + ".",
           "Chuỗi dài nhất: " + st.bestStreak + ". Chơi lại để thử bộ từ khác nhé."],
          start);
      }
    }

    var last = performance.now();
    /* Mây trôi ngang trong một dải (không rời khỏi sân): tốc độ tăng theo
       vòng, vòng tốc độ ×1.8, chậm ×0.5. */
    function cloudX(li, now, W, cg, spd) {
      var driftAmp = Math.min(W * 0.24, 150);
      var x = cg.cx - driftAmp * (0.5 + 0.5 * Math.sin(now * spd + li * 2.1 + 0.7));
      return Math.max(cg.hw + 8, Math.min(W - cg.hw - 8, x));
    }
    /* Pháo hạt khi chọn đúng: hổ phách + teal + trắng + xanh lá. */
    function burst(x, y) {
      var colors = ["#F59E0B", "#0D9488", "#FFC800", "#1E9E6A", "#ffffff"];
      for (var i = 0; i < 42; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 360, vy: -Math.random() * 260 - 40,
          g: 520, life: 0.9 + Math.random() * 0.4, t: 0, c: colors[i % colors.length], r: 2 + Math.random() * 3.5 });
      }
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var W = cv.width, H = cv.height;
      if (!W || !H) { requestAnimationFrame(frame); return; }
      var rdIdx = Math.min(shown, st.rounds.length - 1);
      var rd = st.rounds[rdIdx];
      var laneYs = [H * 0.22, H * 0.5, H * 0.78];
      var speedRound = !!st.speed[rdIdx];
      var slowNow = LOGIC.slowActive(st, now);
      var baseSpd = 0.00045 + shown * 0.00006;
      var spd = baseSpd * (speedRound ? 1.8 : 1) * (slowNow ? 0.5 : 1);
      var cg = G71.cloudGeom(W, H);
      var cxs = [cloudX(0, now, W, cg, spd), cloudX(1, now, W, cg, spd), cloudX(2, now, W, cg, spd)];
      var bob = Math.sin(now / 260) * 8;

      if (phase === "dash") {
        targetX = cxs[lane] / W;
        dragonX += (targetX - dragonX) * Math.min(1, dt * 8);
        if (Math.abs(targetX - dragonX) < 0.02) {
          var res = LOGIC.pick(st, lane);
          if (res) {
            notice = "";
            if (res.correct) {
              var praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
              if (praise === lastPraise) praise = PRAISES[(PRAISES.indexOf(praise) + 1) % PRAISES.length];
              lastPraise = praise;
              banner = (res.golden ? "☀️ MÂY VÀNG! " : "") + praise + " +" + res.points
                + (res.earned ? " · Nhận " + ITEM_ICON[res.earned] + "!" : "");
              bannerOk = true;
              celebrateUntil = now + 600;
              burst(cxs[lane], laneYs[lane]);
            } else if (res.blocked) {
              banner = "🛡️ Khiên đã chặn! Đáp án: " + res.correctWord;
              bannerOk = true;
              shakeUntil = now + 250;
            } else {
              banner = "Sai rồi! Đáp án: " + res.correctWord;
              bannerOk = false;
              shakeUntil = now + 300;
            }
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
        var nIdx = Math.min(shown, st.rounds.length - 1);
        if (st.speed[nIdx] && !st.over) { notice = "⚡ VÒNG TỐC ĐỘ — ĐIỂM ×2!"; noticeUntil = now + 1400; }
      }

      var shaking = now < shakeUntil;
      if (shaking) { ctx.save(); ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8); }
      ctx.clearRect(0, 0, W, H);
      G71.paintSky(ctx, W, H, now);
      /* Mây xa trôi ngang tốc độ khác nhau (parallax) + chim bay qua. */
      for (var f = 0; f < 3; f++) {
        var fw = W + 240;
        var fx = (((f * 260 - now * (0.012 + f * 0.008)) % fw) + fw) % fw - 120;
        ctx.globalAlpha = 0.42 - f * 0.09;
        G71.drawCloudWide(ctx, fx, H * (0.07 + f * 0.07), 42 - f * 7, 18 - f * 2);
      }
      ctx.globalAlpha = 1;
      var birdX = ((now * 0.03) % (W + 240)) - 120;
      var birdY = H * 0.13;
      var flap = Math.sin(now / 120) * 4;
      ctx.strokeStyle = "rgba(31,36,48,.55)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(birdX - 9, birdY + flap); ctx.quadraticCurveTo(birdX, birdY - 5 - flap, birdX + 9, birdY + flap);
      ctx.stroke();
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
          var cx = cxs[li];
          var cy = laneYs[li];
          G71.drawCloudWide(ctx, cx, cy, cg.hw, cg.hh);
          if (li === st.goldenLane[rdIdx]) {
            ctx.strokeStyle = "#F59E0B"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(cx, cy, cg.hw + 6, cg.hh + 6, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#B45309";
            G71.drawFitText(ctx, "★", cx + cg.hw - 6, cy - cg.hh - 4, 22, 15, 11, 1, "800");
          }
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
      /* Chủ đề vòng (góc trái trên, sau mây để chữ luôn nổi). */
      if (rd && rd.theme) {
        var labelW = Math.min(W * 0.42, 180);
        var label = "Chủ đề: " + themeShort(rd.theme) + (speedRound ? " · ⚡×2" : "");
        ctx.fillStyle = "rgba(31,36,48,.75)";
        G71.drawFitText(ctx, label, 12 + labelW / 2, 20, labelW, 14, 10, 2, "700");
      }
      /* Rồng: bổng theo nhịp thở, nghiêng khi đổi làn, nhảy mừng khi đúng,
         rung nhẹ khi sai. */
      var joy = now < celebrateUntil ? -Math.abs(Math.sin(now / 90)) * 12 : 0;
      var dj = now < shakeUntil ? (Math.random() - 0.5) * 8 : 0;
      var dy = laneYs[lane] + bob + joy;
      var tilt = Math.max(-0.22, Math.min(0.22, (dy - dragonY) * 0.004));
      dragonY = dy;
      ctx.save();
      ctx.translate(W * dragonX + dj, dy);
      ctx.rotate(tilt);
      G71.drawDragon(ctx, 0, 0, 30);
      ctx.restore();
      G71.drawSnake(ctx, W * 0.08, H - 44, 20, false);
      /* Hạt nổ khi chọn đúng. */
      for (var pi = particles.length - 1; pi >= 0; pi--) {
        var p = particles[pi];
        p.t += dt;
        if (p.t >= p.life) { particles.splice(pi, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.t / p.life;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (notice && now < noticeUntil) {
        ctx.fillStyle = "#B45309";
        G71.drawFitText(ctx, notice, W / 2, H * 0.12, W - 32, 22, 13, 2, "800");
      } else if (banner) {
        ctx.fillStyle = bannerOk ? "#1E9E6A" : "#DC2626";
        G71.drawFitText(ctx, banner, W / 2, H * 0.12, W - 32, 30, 15, 2, "800");
      }
      if (shaking) ctx.restore();
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71RongBay = { start: start, logic: LOGIC, buildThemedRounds: buildThemedRounds, themeShort: themeShort, praises: PRAISES };
})();
