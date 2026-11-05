/* G71 — Luyện Gõ (v83: chơi thời gian thực — né và bắn).
   Bùi phán 18:21 05/11: cách chơi cũ vẫn là "trả bài mới được đi tiếp",
   không giống chơi game. Cách chơi mới: rồng/tên lửa LÁI ĐƯỢC (phím
   ← → / kéo chuột / kéo chạm) để né thiên thạch rơi; từ rơi như viên
   thuốc, gõ đúng chữ để bắn hạ. Gõ sai CHỈ gõ lại, KHÔNG mất tim —
   mất tim chỉ khi: từ rơi xuống đáy (gõ chậm) hoặc đâm phải thiên
   thạch (né dở). Tốc độ + thiên thạch dày dần theo mốc.
   Giữ luật lõi v71: 20 từ/lượt, 3 tim, +10/từ, chủ đề theo vòng,
   bàn phím màn hình + chạm khóa, ân hạn 500ms sau mỗi lần mất tim.
   Hình v83: nền vũ trụ tranh màu nước sâu hơn (paintSpace mới), rồng
   và tên lửa to hơn. Logic thuần (không cần canvas) để probe kiểm
   tra được. */
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
        hearts: 3, score: 0, cleared: 0, resolved: 0, over: null, graceUntil: 0,
        ship: { x: 0.5, y: 0.86 }, rocks: [], rockTimer: 2.0 };
    },
    /* Lái tàu: dx theo đơn vị chuẩn (0..1), kẹp trong sân. */
    moveShip: function (st, dx) {
      if (st.over) return;
      st.ship.x = Math.max(0.06, Math.min(0.94, st.ship.x + dx));
    },
    setShipX: function (st, x) {
      if (st.over) return;
      st.ship.x = Math.max(0.06, Math.min(0.94, x));
    },
    loseHeart: function (st, now) {
      st.hearts--;
      st.graceUntil = now + 500;
      if (st.hearts <= 0) { st.over = "lose"; st.active = null; }
      return { ok: false, lostHeart: true };
    },
    /* Gõ sai (v83): chỉ gõ lại, KHÔNG mất tim — thua vì chậm tay / né
       dở, không phải vì trả lời sai. */
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
        if (best === null) return { ok: false, wrong: true };
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
      return { ok: false, wrong: true };
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
      if (st.over) return;
      /* Thiên thạch: rơi nhanh hơn từ, không bắn được — chỉ né. Càng
         về sau càng dày (tối thiểu mỗi 1,4 giây một hòn). */
      st.rockTimer -= dt;
      if (st.rockTimer <= 0) {
        st.rocks.push({ x: 0.08 + Math.random() * 0.84, y: -0.08,
          speed: 0.10 + Math.random() * 0.06,
          r: 0.028 + Math.random() * 0.02, rot: Math.random() * 6.28 });
        st.rockTimer = Math.max(1.4, 2.2 - st.resolved * 0.05);
      }
      for (var i = st.rocks.length - 1; i >= 0; i--) {
        var rk = st.rocks[i];
        rk.y += rk.speed * dt;
        rk.rot += dt * 0.6;
        if (rk.y > 1.06) { st.rocks.splice(i, 1); continue; }
        if (Math.abs(rk.x - st.ship.x) < 0.05 && Math.abs(rk.y - st.ship.y) < 0.07) {
          st.rocks.splice(i, 1);
          if (now >= st.graceUntil && st.hearts > 0) {
            st.hearts--;
            st.graceUntil = now + 500;
            if (st.hearts <= 0) { st.over = "lose"; st.active = null; }
          }
        }
      }
      if (!st.over && st.resolved >= st.total) st.over = "win";
    }
  };

  /* Thiên thạch: đa giác lởm chởm + miệng hố, xoay chậm — nhìn là biết
     đá, không phải vệt mờ. */
  function drawRock(ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = "#78716C";
    ctx.strokeStyle = "#44403C";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      var rr = r * (0.85 + 0.3 * Math.abs(Math.sin(i * 2.7 + 1)));
      var vx = Math.cos(a) * rr, vy = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.45, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function start() {
    var set = G71.pickTypingWords(20);
    if (!set.words.length) { try { toast("Chưa có từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(set.words, set.theme);
    var running = true;
    var flashes = [];
    var parts = [];
    var keys = { left: false, right: false };
    var drawShipX = 0.5;
    var stg = G71.openStage("⌨️ Luyện Gõ" + (set.theme ? " — " + set.theme : ""),
      "Phím ← → (hoặc kéo chuột/chạm) lái tên lửa né thiên thạch; gõ chữ để bắn hạ từ. Gõ sai chỉ gõ lại, không mất tim. Để từ rơi xuống đáy hoặc đâm phải thiên thạch là mất tim.",
      function () { running = false; });
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }

    function hud() {
      /* HUD một dòng: các số liệu giữ nguyên, chủ đề co lại bằng dấu … */
      stg.hud.innerHTML = "<span style=\"flex:none\">Điểm: " + st.score + "</span>"
        + "<span style=\"flex:none\">Mốc: " + st.cleared + "/" + st.total + "</span>"
        + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Chủ đề: " + G71.escHtml(st.theme || "Từ vựng") + "</span>"
        + "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>";
    }
    hud();

    /* Bàn phím trên màn hình cho chuột + cảm ứng. */
    /* Bàn phím gọn: 3 hàng thấp để sân vũ trụ giữ được chiều cao. */
    var kb = document.createElement("div");
    kb.id = "g71Kb";
    kb.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:6px 8px;background:#fff;border-top:2px solid #F3D9A4;touch-action:manipulation;";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (L) {
      var b = document.createElement("button");
      b.className = "btn";
      b.textContent = L;
      b.style.cssText = "padding:6px 4px;min-width:30px;font-size:15px;";
      b.onclick = function () { feed(L); };
      kb.appendChild(b);
    });
    stg.el.appendChild(kb);
    if (stg.resize) stg.resize();

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
      if (e.key === "ArrowLeft") { keys.left = true; e.preventDefault(); return; }
      if (e.key === "ArrowRight") { keys.right = true; e.preventDefault(); return; }
      if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) feed(e.key);
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") keys.left = false;
      if (e.key === "ArrowRight") keys.right = false;
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
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
    /* Kéo chuột/chạm trên sân để lái tàu (pointer events bao cả chuột
       lẫn cảm ứng; click vẫn khóa từ như cũ). */
    cv.addEventListener("pointermove", function (e) {
      if (!running || st.over) return;
      if (!(e.buttons & 1) && e.pointerType === "mouse") return;
      var r = cv.getBoundingClientRect();
      if (!r.width) return;
      LOGIC.setShipX(st, (e.clientX - r.left) / r.width);
    });

    var ended = false;
    function maybeEnd() {
      if (ended || !st.over) return;
      ended = true;
      running = false;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
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
      /* Lái tàu bằng phím mũi tên giữ (0,55 đơn vị/giây — qua sân ~1,8 giây). */
      if (keys.left) LOGIC.moveShip(st, -0.55 * dt);
      if (keys.right) LOGIC.moveShip(st, 0.55 * dt);
      drawShipX += (st.ship.x - drawShipX) * Math.min(1, dt * 12);
      LOGIC.tick(st, dt, now);
      var W = cv.width, H = cv.height;
      if (!W || !H) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      G71.paintSpace(ctx, W, H, now);
      /* Thiên thạch rơi. */
      st.rocks.forEach(function (rk) {
        drawRock(ctx, rk.x * W, rk.y * H, rk.r * W, rk.rot);
      });
      st.words.forEach(function (wd, i) {
        if (wd.status !== "falling") return;
        var py = wd.y * H;
        if (py < -30 || py > H + 30) return;
        var isAct = (st.active === i);
        /* Chữ tự thu nhỏ theo bề ngang sân để viên thuốc không tràn mép. */
        G71.fitFont(ctx, wd.w, Math.max(60, W - 32), 17, 12, "700");
        var tw = ctx.measureText(wd.w).width + 28;
        var px = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, wd.x * W));
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
      /* Tàu ở vị trí lái được; tia bắn đi từ mũi tàu, không còn từ giữa sân. */
      var rocketY = Math.max(110, H - 86);
      var dragonY = rocketY - 62;
      var shipPx = drawShipX * W;
      flashes = flashes.filter(function (f) { return (f.ttl -= dt) > 0; });
      flashes.forEach(function (f) {
        ctx.strokeStyle = "rgba(253,230,138,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(shipPx, rocketY - 45);
        ctx.lineTo(f.x * W, f.y * H);
        ctx.stroke();
      });
      parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
      parts.forEach(function (p) {
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect((p.x + p.vx * (0.6 - p.ttl)) * W, (p.y + p.vy * (0.6 - p.ttl)) * H, 5, 5);
      });
      var flick = 0.5 + 0.5 * Math.sin(now / 90);
      G71.drawRocket(ctx, shipPx, rocketY, 40, flick);
      G71.drawDragon(ctx, shipPx, dragonY, 26);
      if (st.active !== null && st.words[st.active]) {
        /* Bảng nghĩa: nền tối mờ + chữ tự thu/ngắt 2 dòng, không cắt mép. */
        var meanText = "Nghĩa: " + st.words[st.active].vi;
        ctx.font = "700 15px system-ui, sans-serif";
        var mw = Math.min(W - 16, ctx.measureText(meanText).width + 28);
        ctx.fillStyle = "rgba(15,23,42,.72)";
        G71.rr(ctx, W / 2 - mw / 2, H - 38, mw, 34, 15);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.95)";
        G71.drawFitText(ctx, meanText, W / 2, H - 21, W - 40, 15, 11, 2, "700");
      }
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71LuyenGo = { start: start, logic: LOGIC, drawRock: drawRock };
})();