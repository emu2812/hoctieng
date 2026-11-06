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

  /* Súng đặt trên bệ (v105b: bệ thang chàm đậm, nòng dày, đầu nòng hổ
     phách, đế hổ phách + tâm kem + chấm teal — đọc ra là SÚNG).
     v105c: nòng dày 17px (cả đoạn chàm lẫn đầu nòng) + CỔ SÚNG — đĩa
     chàm đậm tại gốc nòng, chồng lên cả đế lẫn nòng, vẽ sau đế và
     trước tâm kem: trước đây nòng 13px chỉ chạm đế qua một điểm nên
     ngắm chéo trông tách rời khỏi thân, có khe hở nhìn thấy được
     (ngắm thẳng lên thì nối liền); cổ súng hàn nòng vào thân ở mọi
     góc ngắm. Đạn xuất phát từ đầu nòng (62px theo hướng ngắm). */
  function drawGun(ctx, W, H, aim) {
    var cx0 = W / 2, cy0 = H - 64;
    var tipX = cx0 + Math.cos(aim) * 62, tipY = cy0 + Math.sin(aim) * 62;
    var midX = cx0 + Math.cos(aim) * 50, midY = cy0 + Math.sin(aim) * 50;
    ctx.fillStyle = "#1E1B4B";
    ctx.beginPath();
    ctx.moveTo(cx0 - 16, cy0 + 12);
    ctx.lineTo(cx0 + 16, cy0 + 12);
    ctx.lineTo(cx0 + 27, H - 4);
    ctx.lineTo(cx0 - 27, H - 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#F59E0B"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx0 - 16, cy0 + 12); ctx.lineTo(cx0 + 16, cy0 + 12); ctx.stroke();
    ctx.strokeStyle = "#1E1B4B"; ctx.lineWidth = 17; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx0, cy0);
    ctx.lineTo(midX, midY); ctx.stroke();
    ctx.strokeStyle = "#F59E0B"; ctx.lineWidth = 17; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(midX, midY);
    ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath(); ctx.arc(cx0, cy0, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#B45309"; ctx.lineWidth = 2; ctx.stroke();
    var colX = cx0 + Math.cos(aim) * 18, colY = cy0 + Math.sin(aim) * 18;
    ctx.fillStyle = "#1E1B4B";
    ctx.beginPath(); ctx.arc(colX, colY, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFFBEB";
    ctx.beginPath(); ctx.arc(cx0, cy0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0D9488";
    ctx.beginPath(); ctx.arc(cx0, cy0, 4.5, 0, Math.PI * 2); ctx.fill();
  }

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

    /* Mỗi bong bóng giữ một khe riêng (4 khe chia đều bề ngang) nên
       không chồng nhau; y xuất phát so le nhau để không dồn dưới đáy. */
    var SLOTS = 4;
    function radiusFor(word) {
      var W = cv.width || 360;
      return G71.bubbleRadius(word, W / SLOTS);
    }
    /* Giới hạn khe: bong bóng luôn nằm trọn trong khe của nó (cộng lề
       4px ở hai mép màn hình) nên các bong bóng không thể chạm nhau. */
    function slotBounds(W, slot, r) {
      var sw = W / SLOTS;
      var lo = Math.max(slot * sw + r, r + 4);
      var hi = Math.min((slot + 1) * sw - r, W - r - 4);
      if (hi < lo) { lo = r + 4; hi = W - r - 4; }
      return [lo, hi];
    }
    /* v105b: bong bóng luôn nằm TRỌN trong màn ngay khi sinh — y so le
       theo khe nhưng kẹp trong [r, H-r] (trước đây sinh dưới đáy
       H+40+slot*70 nên ló nửa viên dưới cát, và trôi khỏi mép trên
       rồi mới nổi lại — kiểm render v105 bắt được). */
    function spawnBubble(word, slot, disp) {
      var W = cv.width || 360, H = cv.height || 480;
      var r = radiusFor(disp || word);
      var cx = G71.bubbleSlotX(W, SLOTS, slot);
      var bd = slotBounds(W, slot, r);
      var x = Math.max(bd[0], Math.min(bd[1], cx + (Math.random() - 0.5) * 16));
      var stag = Math.min(70, Math.max(20, (H - 2 * r) / SLOTS));
      var y = Math.max(r, H - r - slot * stag);
      return { word: word, disp: disp || word, slot: slot,
        x: x, y: y,
        r: r, vy: 26 + Math.random() * 22, ph: Math.random() * 6.28 };
    }
    function loadRound() {
      var rd = st.rounds[st.round];
      if (!rd) return;
      bubbles = rd.options.map(function (opt, i) { return spawnBubble(opt, i, rd.disp && rd.disp[opt]); });
    }
    function hud() {
      var rd = st.rounds[Math.min(st.round, st.rounds.length - 1)];
      stg.hud.innerHTML = "<span style=\"flex:none\">Điểm: " + st.score + "/99</span>"
        + "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>"
        + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Nghĩa: " + G71.escHtml(rd ? rd.vi : "") + "</span>";
    }
    loadRound();
    hud();

    function fire() {
      if (!running || st.over) return;
      var W = cv.width, H = cv.height;
      /* v105b: đạn xuất phát từ đầu nòng (62px theo hướng ngắm),
         không phải từ tâm đế — đạn bay ra khỏi nòng trông như bắn. */
      bullets.push({ x: W / 2 + Math.cos(aim) * 62, y: H - 64 + Math.sin(aim) * 62, vx: Math.cos(aim) * 620, vy: Math.sin(aim) * 620 });
    }
    function aimAt(cx, cy) {
      var r = cv.getBoundingClientRect();
      var px = cx - r.left, py = cy - r.top;
      var W = cv.width, H = cv.height;
      aim = Math.atan2(py - (H - 64), px - W / 2);
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
        G71.endScreen(stg, true, "🎉 Thắng rồi!",
          ["Đủ 99 điểm!", "Điểm: " + st.score + " · +10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(stg, false, "Hết tim rồi!",
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
        /* Giữ bong bóng trong khe, không tràn mép màn hình. */
        var bd2 = slotBounds(W, b.slot, b.r);
        b.x = Math.max(bd2[0], Math.min(bd2[1], b.x));
        if (b.y - b.r <= 0) {
          /* v105b: chạm mép trên thì nổi lại từ đáy — luôn trọn trong
             màn (trước đây trôi khỏi mép trên hẳn rồi mới xuất hiện
             lại từ dưới đáy H+40, nửa chìm dưới cát). */
          b.y = H - b.r;
          b.x = Math.max(bd2[0], Math.min(bd2[1],
            G71.bubbleSlotX(W, SLOTS, b.slot) + (Math.random() - 0.5) * 16));
        }
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
            /* v103 P2.8: ban nham thi tu dung vao hang doi on. */
            try { if (typeof recordGameMiss === "function") recordGameMiss(res.correctWord, "ban-bong-bong"); } catch (e) {}
            var freedSlot = bub.slot;
            bubbles.splice(hit.u, 1);
            var rd = st.rounds[st.round];
            if (rd) {
              var taken = bubbles.map(function (x) { return x.word; });
              taken.push(rd.correct);
              var cand = G71.pool().filter(function (p) { return taken.indexOf(p.w) < 0 && !G71.isSingleLetter(p); });
              if (cand.length) {
                var pick = cand[Math.floor(Math.random() * cand.length)];
                bubbles.push(spawnBubble(pick.w, freedSlot, G71.displayWord(pick)));
              }
            }
          }
          hud();
        }
      }
      parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; });

      ctx.clearRect(0, 0, W, H);
      G71.paintSea(ctx, W, H, now);
      bubbles.forEach(function (b) {
        /* v105: bong bóng co gradient + diem sang + vien sang — nhin
           la bong bóng that, khong phai hinh tron phang; chu doc ro
           tren nen trang mo, hien dang co dau cua tu vay tieng Viet. */
        var bg = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        bg.addColorStop(0, "rgba(255,255,255,.92)");
        bg.addColorStop(0.55, "rgba(255,255,255,.55)");
        bg.addColorStop(1, "rgba(199,210,254,.35)");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(245,158,11,.45)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.95)";
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.28, b.r * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0F172A";
        G71.drawFitText(ctx, b.disp || b.word, b.x, b.y, b.r * 2 - 16, 16, 10, 3, "700", "rgba(255,255,255,.9)");
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
      drawGun(ctx, W, H, aim);
      G71.drawSnake(ctx, W - 56, H - 36, 18, true);
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71BanBongBong = { start: start, logic: LOGIC, drawGun: drawGun };
})();
