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
   và tên lửa to hơn. v101 (phán quyết của Bùi 06/11): làm lại giao
   diện theo ART_DIRECTION.md (một tên lửa duy nhất, bỏ rồng cưỡi
   tên lửa) + ô nhập thật mở bàn phím gốc điện thoại trên cảm ứng.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  var LOGIC = {
    createState: function (words, theme) {
      var ws = words.map(function (wd, i) {
        return { w: wd.w, vi: wd.vi, type: wd.type || wd.w, status: "falling", progress: 0,
          x: 0.12 + Math.random() * 0.76, y: -0.12 - i * 0.22,
          speed: 0.075 + Math.random() * 0.03 };
      });
      return { theme: theme, total: words.length, words: ws, active: null,
        hearts: 3, score: 0, cleared: 0, resolved: 0, over: null, graceUntil: 0,
        typingShield: 0, /* Chang 10: giay con lai cua khien go — dang go dung thi tu roi cham lai */
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
    /* Từ mục tiêu hiện tại (v101): từ đang khóa nếu còn rơi VÀ đã vào
       màn (y >= 0), nếu không thì từ rơi thấp nhất ĐÃ VÀO màn. Dùng
       cho thanh Nghĩa + bàn phím, để Nghĩa luôn khớp đúng từ người
       chơi đang thấy — trước đây typeLetter tự khóa cả từ còn ở trên
       mép màn (y < 0), nên Nghĩa có thể hiện nghĩa của từ chưa nhìn
       thấy (ảnh Bùi gửi 06/11: "lớn tuổi" trong khi các từ thấy được
       là sanitise/medicine/pottery). v105b: minY (mặc định 0) — ngưỡng
       "vào màn" theo chân dung vẽ thật (viên chỉ hiện trọn khi
       y >= 28/H); code live truyền visY(), probe cũ gọi không tham
       số vẫn giữ hành vi y>=0. */
    targetWord: function (st, minY) {
      var minYv = (typeof minY === "number") ? minY : 0;
      if (st.active !== null && st.words[st.active]
          && st.words[st.active].status === "falling" && st.words[st.active].y >= minYv) {
        return st.words[st.active];
      }
      var low = null;
      st.words.forEach(function (wd) {
        if (wd.status === "falling" && wd.y >= minYv && (!low || wd.y > low.y)) low = wd;
      });
      return low;
    },
    /* Gõ sai (v83): chỉ gõ lại, KHÔNG mất tim — thua vì chậm tay / né
       dở, không phải vì trả lời sai. */
    typeLetter: function (st, ch, now, minY) {
      if (st.over) return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1) return { ok: false };
      if (now < st.graceUntil) return { ok: false, grace: true };
      var minYv = (typeof minY === "number") ? minY : 0;
      var w = null;
      if (st.active !== null && st.words[st.active] && st.words[st.active].status === "falling") {
        w = st.words[st.active];
      } else {
        var best = null;
        st.words.forEach(function (wd, i) {
          if (wd.status !== "falling" || wd.y < minYv) return;
          var tg = wd.type || wd.w;
          if (tg.charAt(wd.progress).toLowerCase() !== ch) return;
          if (best === null || wd.y > st.words[best].y) best = i;
        });
        if (best === null) return { ok: false, wrong: true };
        st.active = best;
        w = st.words[best];
      }
      var tgt = w.type || w.w;
      if (tgt.charAt(w.progress).toLowerCase() === ch) {
        w.progress++;
        st.typingShield = 0.8; /* Chang 10: vua go dung -> tu roi cham lai mot nua trong 0,8 giay */
        if (w.progress >= tgt.length) {
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
    lockWord: function (st, idx, minY) {
      if (st.over) return;
      /* v101: chỉ khóa từ đã vào màn (y >= 0) — từ chưa nhìn thấy thì
         chạm/gõ cũng không khóa được, thanh Nghĩa không lệch. v105b:
         minY (mặc định 0) — code live truyền visY() để chỉ khóa từ
         đã hiện trọn viên. */
      var minYv = (typeof minY === "number") ? minY : 0;
      if (st.words[idx] && st.words[idx].status === "falling" && st.words[idx].y >= minYv) st.active = idx;
    },
    /* Chân dung vẽ thật của viên (v105b): thân + chữ như vòng vẽ —
       đo theo pixel vẽ thật, không đo hộp logic (bài học tách quái
       v102). W/H mặc định 360×500 khi chưa có canvas (frame() ghi
       st.canvasW/H trước khi tick). Trả về rect pixel (tâm x kẹp mép
       như vòng vẽ): rộng ≈ dài chữ*10+28, cao 34px (1 dòng) / 54px
       (2 dòng ZH/TP: chữ Hán/Hangul trên, pinyin/phiên âm dưới). */
    pillRect: function (st, wd) {
      var W = (st && st.canvasW) || 360, H = (st && st.canvasH) || 500;
      var wdType = wd.type || wd.w;
      var dispW = wd.w;
      try { if (typeof G71 !== "undefined" && G71.displayWord) dispW = G71.displayWord(wd); } catch (e) {}
      var dispType = (dispW.length === wdType.length) ? dispW : wdType;
      var twoLine = wdType !== wd.w;
      var wide = (dispW.length >= dispType.length) ? dispW : dispType;
      var tw = Math.max(60, wide.length * 10 + 28);
      var halfH = twoLine ? 28 : 18;
      var px = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, wd.x * W));
      var py = wd.y * H;
      return { x0: px - tw / 2, y0: py - halfH, x1: px + tw / 2, y1: py + halfH, w: tw, h: halfH * 2 };
    },
    /* Thiên thạch hiện trọn (v105c): đỉnh đa giác vẽ thật cao nhất cách
       tâm 1,15×bán kính (+1px viền 2px) — chỉ vẽ khi đỉnh đó đã xuống
       dưới mép trên canvas. W/H lấy theo canvas thật (frame() ghi
       st.canvasW/H trước khi tick); mặc định 360×500 khi chưa có. */
    rockVisible: function (st, rk, W, H) {
      var w = W || (st && st.canvasW) || 360, h = H || (st && st.canvasH) || 500;
      return rk.y * h - rk.r * w * 1.15 - 2 >= 0;
    },
    tick: function (st, dt, now) {
      if (st.over) return;
      var boost = 1 + st.resolved * 0.02;
      if (st.typingShield > 0) st.typingShield = Math.max(0, st.typingShield - dt);
      var fallMul = (st.typingShield > 0) ? 0.5 : 1; /* Chang 10: dang go dung thi tu roi cham lai mot nua — nguoi go cham van kip; thien thach van roi nhanh nhu cu */
      st.words.forEach(function (wd) {
        if (wd.status !== "falling") return;
        wd.y += wd.speed * boost * fallMul * dt;
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
      /* v105b: tách viên khi chồng (như tách quái Rồng Lửa v102) —
         đo theo CHÂN DUNG VẼ THẬT của viên (pillRect: thân + chữ,
         tâm x kẹp mép như vòng vẽ), không đo hộp logic; tách theo
         trục chồng ít nhất (theo px); dọc chỉ đẩy viên THẤP hơn
         xuống, không bao giờ đẩy lên, và chỉ đẩy khi viên đó đã vào
         màn (trên màn đã thấy thì tách ngang thay cho tách dọc). */
      (function () {
        var Wd = (st.canvasW) || 360, Hd = (st.canvasH) || 500;
        var fall = st.words.filter(function (wd) { return wd.status === "falling"; });
        for (var a = 0; a < fall.length; a++) {
          for (var b = a + 1; b < fall.length; b++) {
            var A = fall[a], B = fall[b];
            var ra = LOGIC.pillRect(st, A), rb = LOGIC.pillRect(st, B);
            var ox = Math.min(ra.x1, rb.x1) - Math.max(ra.x0, rb.x0);
            var oy = Math.min(ra.y1, rb.y1) - Math.max(ra.y0, rb.y0);
            if (ox <= 0 || oy <= 0) continue;
            if (ox <= oy) {
              var push = (ox / 2 + 2) / Wd;
              var dir = (A.x <= B.x) ? -1 : 1;
              A.x = Math.max(0.06, Math.min(0.94, A.x + dir * push));
              B.x = Math.max(0.06, Math.min(0.94, B.x - dir * push));
            } else {
              var low = (A.y >= B.y) ? A : B;
              if (low.y * Hd >= 18 && low.y < 0.98) {
                low.y = Math.min(0.98, low.y + (oy / 2 + 2) / Hd);
              } else {
                var push2 = (ox / 2 + 2) / Wd;
                var dir2 = (A.x <= B.x) ? -1 : 1;
                A.x = Math.max(0.06, Math.min(0.94, A.x + dir2 * push2));
                B.x = Math.max(0.06, Math.min(0.94, B.x - dir2 * push2));
              }
            }
          }
        }
      })();
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
    ctx.fillStyle = "#1E1B4B";
    ctx.strokeStyle = "#A5B4FC";
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

  /* Tàu của người chơi (v101): MỘT tên lửa duy nhất theo ART_DIRECTION.md
     — thân kem, mũi + cánh hổ phách đậm, cửa sổ teal, lửa hổ phách;
     bỏ hẳn con rồng xanh lá cưỡi tên lửa (nhìn trẻ con, lệch hệ).
     Vẽ theo tâm (x, y), mũi hướng lên, cao ~2s; lửa nhấp nháy theo flick. */
  function drawShip(ctx, x, y, s, flick) {
    var f = (flick === undefined) ? 1 : flick;
    ctx.save();
    ctx.translate(x, y);
    /* Bóng ellipse mờ dưới tàu (chiều sâu). */
    ctx.fillStyle = "rgba(4,6,15,.35)";
    ctx.beginPath(); ctx.ellipse(0, s * 1.05, s * 0.7, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    /* Lửa: ngoài hổ phách, trong vàng nhạt, nhấp nháy theo flick. */
    var fl = s * (0.55 + 0.25 * f);
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, s * 0.85);
    ctx.quadraticCurveTo(0, s * 0.85 + fl, s * 0.28, s * 0.85);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FDE68A";
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, s * 0.85);
    ctx.quadraticCurveTo(0, s * 0.85 + fl * 0.6, s * 0.14, s * 0.85);
    ctx.closePath(); ctx.fill();
    /* Cánh trái/phải hổ phách đậm. */
    ctx.fillStyle = "#B45309";
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.35);
    ctx.lineTo(-s * 0.62, s * 0.95);
    ctx.lineTo(-s * 0.3, s * 0.9);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.35);
    ctx.lineTo(s * 0.62, s * 0.95);
    ctx.lineTo(s * 0.3, s * 0.9);
    ctx.closePath(); ctx.fill();
    /* Thân kem, viền chàm 2px. */
    ctx.fillStyle = "#FFFBEB";
    ctx.strokeStyle = "#1E1B4B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.34, -s * 0.55, s * 0.3, s * 0.1);
    ctx.lineTo(s * 0.3, s * 0.85);
    ctx.lineTo(-s * 0.3, s * 0.85);
    ctx.lineTo(-s * 0.3, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.34, -s * 0.55, 0, -s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* Mũi hổ phách đậm. */
    ctx.fillStyle = "#B45309";
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.34, -s * 0.55, s * 0.3, -s * 0.28);
    ctx.lineTo(-s * 0.3, -s * 0.28);
    ctx.quadraticCurveTo(-s * 0.34, -s * 0.55, 0, -s);
    ctx.closePath(); ctx.fill();
    /* Cửa sổ teal, viền chàm, chấm sáng trắng trên-trái. */
    ctx.fillStyle = "#0D9488";
    ctx.strokeStyle = "#1E1B4B";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.12, s * 0.06, 0, Math.PI * 2); ctx.fill();
    /* Vệt sáng dọc thân trái (ánh sáng trên-trái). */
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.beginPath(); ctx.ellipse(-s * 0.18, s * 0.2, s * 0.05, s * 0.42, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function start() {
    var set = G71.pickTypingWords(20);
    if (!set.words.length) { try { toast("Chưa có từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(set.words, set.theme);
    window.G71LuyenGo._st = st; /* trạng thái trận đang chạy (cho probe kiểm tra) */
    var running = true;
    var flashes = [];
    var parts = [];
    var keys = { left: false, right: false };
    var drawShipX = 0.5;
    /* v101: tiêu đề ngắn "⌨️ Luyện Gõ" (không kèm chủ đề — chủ đề vẫn ở
       HUD) để không bị cắt dở trên điện thoại như ảnh Bùi gửi 06/11.
       Cảm ứng = con trỏ thô (pointer: coarse). Chỉ dùng matchMedia,
       KHÔNG dùng "ontouchstart" in window (nhiều desktop cũng có thuộc
       tính này, và jsdom cũng có — sẽ nhận nhầm desktop thành cảm ứng). */
    var isTouch = false;
    try { isTouch = !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) {}
    var stg = G71.openStage("⌨️ Luyện Gõ",
      isTouch
        ? "Chạm vào ô gõ để mở bàn phím điện thoại; gõ đúng từ để bắn hạ. Kéo để lái tàu né thiên thạch. Gõ sai chỉ gõ lại, không mất tim. Để từ rơi xuống đáy hoặc đâm phải thiên thạch là mất tim."
        : "Phím ← → (hoặc kéo chuột) lái tàu né thiên thạch; gõ chữ để bắn hạ từ. Gõ sai chỉ gõ lại, không mất tim. Để từ rơi xuống đáy hoặc đâm phải thiên thạch là mất tim.",
      function () { running = false; });
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }
    /* v105b: ngưỡng "vào màn" theo chân dung vẽ thật — viên chỉ hiện
       trọn khi tâm viên cách mép trên ít nhất nửa chiều cao viên
       (28px cho viên 2 dòng, 18px cho viên 1 dòng; lấy 28px cho cả
       hai để Nghĩa/bàn phím/khóa từ luôn chỉ từ đã thấy trọn). Mọi
       chỗ đọc từ mục tiêu trong trận đều truyền visY() vào LOGIC. */
    function visY() { return 28 / ((cv && cv.height) || 500); }

    var lastHud = { hearts: -1, score: -1, cleared: -1 };
    function hud() {
      /* v103-fix: tim chỉ được vẽ lại ở start() và feed() nên tim mất do
         từ rơi khỏi màn / thiên thạch đâm tàu (trừ trong tick) không bao
         giờ hiện lên HUD — kiểm render v103 bắt được: hết tim rồi mà HUD
         vẫn 3 tim hổ phách. Nay hud() có chốt chống vẽ thừa và được gọi
         mỗi frame sau tick (như Rồng Bay), nên tim xám dần đúng lúc mất. */
      if (st.hearts === lastHud.hearts && st.score === lastHud.score && st.cleared === lastHud.cleared) return;
      lastHud.hearts = st.hearts; lastHud.score = st.score; lastHud.cleared = st.cleared;
      /* HUD một dòng: các số liệu giữ nguyên, chủ đề co lại bằng dấu … */
      stg.hud.innerHTML = "<span style=\"flex:none\">Điểm: " + st.score + "</span>"
        + "<span style=\"flex:none\">Mốc: " + st.cleared + "/" + st.total + "</span>"
        + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Chủ đề: " + G71.escHtml(st.theme || "Từ vựng") + "</span>"
        + "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>";
    }
    hud();

    /* Bàn phím (v101): cảm ứng → BỎ bàn phím tự vẽ, dùng ô nhập thật để
       mở BÀN PHÍM GỐC của điện thoại (lang + inputmode theo track);
       desktop → giữ bàn phím trên màn hình như cũ.
       v91: track tiếng Hàn (TP) thì bàn phím là các âm tiết Hangul của từ
       đang khóa (bấm theo thứ tự để ghép thành từ); các track khác gõ
       chữ cái như cũ (tiếng Trung gõ pinyin bằng chữ cái Latin). */
    var kb = null, kbToggle = null, typeInput = null, composing = false;
    var kbSig = "";
    /* v105c: bàn phím vẽ tự ẩn khi gõ phím thật (Bùi 21:56 06/11: bàn
       phím A–Z vẫn hiện dù đã gõ bằng bàn phím thật — Bùi chê nó chiếm
       chỗ từ 14:07 06/11). Mặc định mở ván vẫn hiện như cũ để người
       dùng chuột thấy được; chỉ ẩn sau khi gõ phím chữ thật. Ẩn/hiện
       không đổi luật chơi — chỉ display, sân canvas tự rộng ra nhờ
       flex + ResizeObserver của openStage. */
    var kbShown = true;
    function setKbVisible(v) {
      if (!kb) return;
      kbShown = !!v;
      kb.style.display = kbShown ? "flex" : "none";
      if (kbToggle) kbToggle.textContent = kbShown ? "⌨️ Ẩn bàn phím" : "⌨️ Bàn phím";
      if (stg.resize) stg.resize();
    }
    function refreshKb() {
      if (!kb) return;
      var isTp = false;
      try { isTp = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
      var act = LOGIC.targetWord(st, visY());
      var sig = (isTp ? "tp:" : "az:") + (act ? (act.type || act.w) : "") + "|" + st.resolved;
      if (sig === kbSig) return;
      kbSig = sig;
      kb.innerHTML = "";
      /* v102: track TP chưa có từ nào trên màn thì KHÔNG hiện bàn A–Z
         (chữ Latin vô nghĩa với tiếng Hàn — kiểm render v101 thấy bàn
         A–Z lúc mới mở ván); hiện dòng chờ thay cho bàn phím. */
      if (isTp && !act) {
        var ph = document.createElement("div");
        ph.style.cssText = "padding:10px 8px;color:#6B7280;font-size:14px;text-align:center;width:100%;";
        ph.textContent = "⏳ Chờ từ rơi xuống…";
        kb.appendChild(ph);
        return;
      }
      var keys = isTp && act ? String(act.type || act.w).split("") : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      keys.forEach(function (L) {
        var b = document.createElement("button");
        b.className = "btn";
        b.textContent = L;
        b.style.cssText = "padding:6px 4px;min-width:30px;font-size:15px;";
        b.onclick = function () { feed(L); };
        kb.appendChild(b);
      });
    }
    if (isTouch) {
      /* Ô nhập thật (v101): lang + inputmode theo track đang học để bàn
         phím gốc mở đúng ngôn ngữ — EN/TC: bàn Latin (en); ZH: gõ
         pinyin bằng chữ Latin không dấu (zh-Latn); TP: bàn Hangul
         (ko-KR). KHÔNG có keyword "hangul"/"korean" trong chuẩn
         WHATWG inputmode nên TP dùng inputmode="text" + lang="ko-KR"
         (Gboard/iOS chọn bàn phím theo lang của ô nhập). */
      var tk = "en";
      try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? (G71.trackKey() || "en") : "en"; } catch (e) {}
      typeInput = document.createElement("input");
      typeInput.id = "g71TypeInput";
      typeInput.setAttribute("lang", tk === "tp" ? "ko-KR" : (tk === "zh" ? "zh-Latn" : "en"));
      typeInput.setAttribute("inputmode", tk === "tp" ? "text" : "latin");
      typeInput.setAttribute("autocapitalize", "off");
      typeInput.setAttribute("autocorrect", "off");
      typeInput.setAttribute("autocomplete", "off");
      typeInput.setAttribute("spellcheck", "false");
      typeInput.setAttribute("placeholder", "⌨️ Chạm để gõ");
      typeInput.style.cssText = "display:block;width:calc(100% - 24px);margin:8px auto;padding:10px 14px;font-size:17px;color:#1E1B4B;background:#fff;border:2px solid #C7D2FE;border-radius:20px;outline:none;box-sizing:border-box;";
      /* v102: nhiều bàn phím Android (Samsung, TECNO...) gõ theo kiểu
         composition — từng phím chỉ đổi chữ đang ghép, compositionend
         chỉ tới khi bấm dấu cách/enter; mà từ trong game không có dấu
         cách nên game bỏ qua toàn bộ phím đang ghép (Bùi báo 15:02
         06/11: "Chạm để gõ nhưng có gõ được đâu"). Sửa: track
         Latin/pinyin (EN/TC/ZH) xử lý ngay cả khi đang ghép (chữ đang
         ghép là chữ cái hoàn chỉnh); riêng TP (Hangul) vẫn chờ
         compositionend vì chữ đang ghép là jamo dở (ㅎ chưa thành 한),
         xử lý sớm sẽ xóa mất chữ đang ghép. */
      var isTpTrack = (tk === "tp");
      typeInput.addEventListener("compositionstart", function () { composing = true; });
      typeInput.addEventListener("compositionend", function () { composing = false; processInput(); });
      typeInput.addEventListener("input", function () { if (!composing || !isTpTrack) processInput(); });
      stg.el.appendChild(typeInput);
    } else {
      kb = document.createElement("div");
      kb.id = "g71Kb";
      kb.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:6px 8px;background:#fff;border-top:2px solid #F3D9A4;touch-action:manipulation;";
      refreshKb();
      stg.el.appendChild(kb);
      /* v105c: nút mở lại bàn phím vẽ — nhỏ gọn một dòng dưới bàn phím,
         chỉ có trên desktop (cảm ứng dùng bàn phím gốc nên không có kb
         vẽ, cũng không có nút này). */
      kbToggle = document.createElement("button");
      kbToggle.id = "g71KbToggle";
      kbToggle.className = "btn";
      kbToggle.style.cssText = "display:block;margin:6px auto;padding:4px 12px;font-size:13px;";
      kbToggle.textContent = "⌨️ Ẩn bàn phím";
      kbToggle.onclick = function () { setKbVisible(kb.style.display === "none"); };
      stg.el.appendChild(kbToggle);
    }
    if (stg.resize) stg.resize();
    /* Mở bàn phím gốc ngay khi trận bắt đầu (đang trong luồng bấm nút
       mở game — cử chỉ người dùng — nên iOS cho mở bàn phím). */
    if (typeInput) { try { typeInput.focus(); } catch (e) {} }

    function feed(ch) {
      if (!running || st.over) return;
      var before = st.cleared;
      var actBefore = st.active;
      var r = LOGIC.typeLetter(st, ch, Date.now(), visY());
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
    /* Đọc chữ gõ từ ô nhập gốc (v101, chỉ cảm ứng): xử lý qua sự kiện
       input để IME ghép đúng (Hangul ghép vần thành âm tiết, pinyin
       gõ Latin). Chỉ cho từng ký tự VƯỢT QUA tiền tố đã gõ đúng của từ
       mục tiêu qua feed() — ký tự sai bị loại ngay khi gõ, không mất
       lượt; đang ghép dở (composition) thì không xử lý gì. */
    function processInput() {
      if (!typeInput || !running || st.over) return;
      var guard = 0;
      while (guard++ < 40) {
        var tw = LOGIC.targetWord(st, visY());
        if (!tw) { typeInput.value = ""; return; }
        var tgt = tw.type || tw.w;
        var done = tgt.slice(0, tw.progress);
        var val = typeInput.value || "";
        if (val === done) return; /* chưa gõ thêm gì */
        if (val.indexOf(done) !== 0) { typeInput.value = done; return; } /* sửa giữa chuỗi: trả lại tiền tố đúng */
        var rest = val.slice(done.length);
        var ch = rest.charAt(0);
        var progBefore = 0;
        st.words.forEach(function (wd) { progBefore += wd.progress; });
        var twWas = tw;
        feed(ch);
        if (st.over) { typeInput.value = ""; return; }
        var progAfter = 0;
        st.words.forEach(function (wd) { progAfter += wd.progress; });
        if (progAfter === progBefore) { typeInput.value = done; return; } /* ký tự sai: loại, dừng */
        if (twWas.status !== "falling") { typeInput.value = ""; return; } /* từ vừa xong: dừng, không gộp ký tự thừa sang từ mới */
        /* Ký tự đúng, từ chưa xong: bỏ ký tự đã tiêu thụ rồi lặp để xử
           lý tiếp phần thừa (dán nhiều ký tự / IME chốt một âm tiết). */
        var tw2 = LOGIC.targetWord(st, visY());
        var done2 = tw2 ? (tw2.type || tw2.w).slice(0, tw2.progress) : "";
        typeInput.value = done2 + rest.slice(1);
      }
    }
    /* Giữ ô nhập luôn hiện đúng tiền tố đã gõ của từ mục tiêu (v101):
       khi người chơi gõ bằng phím vật lý / đổi từ đang khóa thì ô nhập
       đồng bộ theo; viền hổ phách khi có từ đang khóa. */
    function syncInput() {
      if (!typeInput) return;
      var tw = LOGIC.targetWord(st, visY());
      var done = tw ? (tw.type || tw.w).slice(0, tw.progress) : "";
      /* v102: lưới an toàn — bàn phím nào không bắn sự kiện input đáng
         tin thì mỗi khung hình đọc thẳng giá trị ô nhập và cho qua
         tiền tố đúng (processInput xử lý chênh lệch rồi trả ô nhập về
         đúng tiền tố). Riêng TP đang ghép thì chờ compositionend như cũ
         (jamo dở chưa thành âm tiết, xử lý sớm sẽ xóa mất). */
      if ((typeInput.value || "") !== done && (!composing || !isTpTrack)) {
        processInput();
        tw = LOGIC.targetWord(st, visY());
        done = tw ? (tw.type || tw.w).slice(0, tw.progress) : "";
        if (typeInput.value !== done && (!composing || !isTpTrack)) typeInput.value = done;
      }
      var locked = (st.active !== null && st.words[st.active] && st.words[st.active].status === "falling");
      typeInput.style.borderColor = locked ? "#F59E0B" : "#C7D2FE";
    }
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") { keys.left = true; e.preventDefault(); return; }
      if (e.key === "ArrowRight") { keys.right = true; e.preventDefault(); return; }
      var isTpKey = false;
      try { isTpKey = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
      if (e.key && e.key.length === 1 && (isTpKey || /[a-zA-Z]/.test(e.key))) {
        /* v105c: gõ phím chữ thật thì ẩn bàn phím vẽ (người gõ phím thật
           không cần bàn phím vẽ nữa — phím mũi tên lái tàu thì không ẩn,
           người dùng chuột vẫn cần bàn phím vẽ để bấm chữ); bấm nút
           "⌨️ Bàn phím" để mở lại. */
        if (kbShown) setKbVisible(false);
        feed(e.key);
      }
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
      if (best !== null && bd < 0.25) LOGIC.lockWord(st, best, visY());
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
      /* v103 P2.8: tu de roi (status "missed") vao hang doi on SRS — chi
         tu roi khoi man moi tinh lo; tu con dang roi khi het tim thi
         khong ghi (chua he thay thi chua tinh lo). */
      try {
        if (typeof recordGameMiss === "function") {
          (st.words || []).forEach(function (wd) {
            if (wd.status === "missed") recordGameMiss(wd.w, "luyen-go");
          });
        }
      } catch (e) {}
      if (st.over === "win") {
        G71.endScreen(stg, true, "🎉 Thắng rồi!",
          ["Gõ đúng " + st.cleared + "/" + st.total + " từ.", "Điểm: " + st.score + " · +10 XP đã cộng vào tiến trình."],
          start);
      } else {
        G71.endScreen(stg, false, "Hết tim rồi!",
          ["Gõ đúng " + st.cleared + "/" + st.total + " từ.", "Chơi lại để thử chủ đề khác nhé."],
          start);
      }
    }

    var last = performance.now();
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      syncInput();
      /* Lái tàu bằng phím mũi tên giữ (0,55 đơn vị/giây — qua sân ~1,8 giây). */
      if (keys.left) LOGIC.moveShip(st, -0.55 * dt);
      if (keys.right) LOGIC.moveShip(st, 0.55 * dt);
      drawShipX += (st.ship.x - drawShipX) * Math.min(1, dt * 12);
      /* v105b: ghi kích thước canvas thật cho tick() trước khi tick —
         tách viên (pillRect) đo theo canvas thật. */
      st.canvasW = cv.width; st.canvasH = cv.height;
      LOGIC.tick(st, dt, now);
      /* v102-fix: refreshKb PHẢI chạy SAU tick — trước đây nó chạy trước
         tick nên bàn phím đọc trạng thái trước-tick còn thanh Nghĩa (vẽ
         sau tick) đọc trạng thái sau-tick; khung hình nào tick đổi từ
         mục tiêu (từ rơi khỏi màn / từ khác vượt lên) thì bàn phím hiện
         âm tiết của từ cũ trong khi Nghĩa hiện từ mới — kiểm render v101
         và v102 đều bắt được (bàn phím hiện từ không còn trên màn, bấm
         viên mục tiêu cũng không đổi bàn phím ngay). Sau tick thì bàn
         phím, thanh Nghĩa, viền mục tiêu và syncInput luôn đọc cùng một
         trạng thái, ở mọi tốc độ khung hình. */
      refreshKb();
      hud(); /* v103-fix: vẽ lại HUD sau tick để tim mất trong tick hiện ngay (xem hud()). */
      var W = cv.width, H = cv.height;
      if (!W || !H) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      G71.paintSpace(ctx, W, H, now);
      /* Thiên thạch rơi — v105c: chỉ vẽ khi hiện TRỌN (như viên từ
         v105b): trước đây vẽ từ lúc tâm còn trên mép nên chỉ ló nửa
         dưới, nửa trên khuất sau thanh thông tin (kiểm render v105b:
         3/4 ván). Va chạm trong tick() không đổi — đá chưa hiện vẫn
         rơi bình thường, chỉ chưa vẽ. */
      st.rocks.forEach(function (rk) {
        if (!LOGIC.rockVisible(st, rk, W, H)) return;
        drawRock(ctx, rk.x * W, rk.y * H, rk.r * W, rk.rot);
      });
      /* v102: tô sáng TỪ MỤC TIÊU (không chỉ từ đang khóa) — thanh Nghĩa,
         bàn phím và viên từ luôn chỉ cùng một từ, người chơi biết ngay
         từ nào cần gõ (kiểm render v101: không có viền khóa nên không
         biết từ nào là từ cần gõ). targetWord ưu tiên từ đang khóa nên
         một luật này bao cả hai. */
      var targetW = LOGIC.targetWord(st, visY());
      st.words.forEach(function (wd, i) {
        if (wd.status !== "falling") return;
        var py = wd.y * H;
        var wdType = wd.type || wd.w;
        var dispW = G71.displayWord(wd);
        var dispType = (dispW.length === wdType.length) ? dispW : wdType;
        var twoLine = wdType !== wd.w;
        /* v105b: viên chỉ vẽ khi đã hiện TRỌN (tâm cách mép trên ít
           nhất nửa chiều cao viên — 28px viên 2 dòng, 18px viên 1
           dòng); trước đây vẽ từ py >= -30 nên viên mới ló nửa viên
           dưới thanh thông tin (kiểm render v105: "scalability",
           "withdraw" chỉ ló nửa viên). */
        var halfH = twoLine ? 28 : 18;
        if (py < halfH || py > H + 30) return;
        var isHl = (st.active === i) || (targetW === wd);
        /* v91: track tieng Trung hien 2 dong — chu Han o tren, pinyin
           (chuoi go) o duoi co to mau tien trinh; cac track khac 1 dong.
           v105: vien hien dang co dau cua tu vay tieng Viet ("banh mi"
           -> "bánh mì"); chuoi go van la Latin khong dau. Dang hien
           thi dai bang chuoi go theo tung ky tu (dau tieng Viet khong
           doi do dai) nen to mau tien trinh theo chi so van dung. */
        ctx.font = "700 17px system-ui, sans-serif";
        var wide = (ctx.measureText(dispW).width >= ctx.measureText(dispType).width) ? dispW : dispType;
        G71.fitFont(ctx, wide, Math.max(60, W - 32), 17, 12, "700");
        var tw = Math.max(ctx.measureText(dispW).width, ctx.measureText(dispType).width) + 28;
        var px = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, wd.x * W));
        /* v101: viên chàm đậm; đang khóa thì viền hổ phách + quầng sáng
           hổ phách nhịp, chưa khóa viền chàm nhạt. */
        ctx.fillStyle = "#1E1B4B";
        if (twoLine) {
          if (isHl) { ctx.shadowColor = "rgba(245,158,11,.55)"; ctx.shadowBlur = 16; }
          G71.rr(ctx, px - tw / 2, py - 28, tw, 54, 17);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = isHl ? "#F59E0B" : "#C7D2FE";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = "700 16px system-ui, sans-serif";
          ctx.fillStyle = "#fff";
          ctx.fillText(dispW, px - ctx.measureText(dispW).width / 2, py - 6);
          var done = wdType.slice(0, wd.progress), rest = wdType.slice(wd.progress);
          ctx.font = "700 13px system-ui, sans-serif";
          var x0 = px - ctx.measureText(wdType).width / 2;
          ctx.fillStyle = "#FDE68A";
          ctx.fillText(done, x0, py + 14);
          ctx.fillStyle = "#fff";
          ctx.fillText(rest, x0 + ctx.measureText(done).width, py + 14);
        } else {
          if (isHl) { ctx.shadowColor = "rgba(245,158,11,.55)"; ctx.shadowBlur = 16; }
          G71.rr(ctx, px - tw / 2, py - 18, tw, 34, 17);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = isHl ? "#F59E0B" : "#C7D2FE";
          ctx.lineWidth = 2;
          ctx.stroke();
          var done2 = dispType.slice(0, wd.progress), rest2 = dispType.slice(wd.progress);
          var x02 = px - ctx.measureText(dispType).width / 2;
          ctx.fillStyle = "#FDE68A";
          ctx.fillText(done2, x02, py + 6);
          ctx.fillStyle = "#fff";
          ctx.fillText(rest2, x02 + ctx.measureText(done2).width, py + 6);
        }
      });
      /* Tàu ở vị trí lái được; tia bắn đi từ mũi tàu, không còn từ giữa sân. */
      var rocketY = Math.max(110, H - 86);
      var shipPx = drawShipX * W;
      flashes = flashes.filter(function (f) { return (f.ttl -= dt) > 0; });
      flashes.forEach(function (f) {
        ctx.strokeStyle = "rgba(253,230,138,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(shipPx, rocketY - 42);
        ctx.lineTo(f.x * W, f.y * H);
        ctx.stroke();
      });
      parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
      parts.forEach(function (p) {
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect((p.x + p.vx * (0.6 - p.ttl)) * W, (p.y + p.vy * (0.6 - p.ttl)) * H, 5, 5);
      });
      var flick = 0.5 + 0.5 * Math.sin(now / 90);
      drawShip(ctx, shipPx, rocketY, 40, flick);
      var meanWord = LOGIC.targetWord(st, visY());
      if (meanWord) {
        /* Bảng nghĩa (v101): luôn là nghĩa của TỪ MỤC TIÊU hiện tại
           (targetWord — từ đang khóa đã vào màn, hoặc từ rơi thấp nhất
           đã vào màn); nền chàm đậm mờ + viền hổ phách, không cắt mép. */
        var meanText = "Nghĩa: " + meanWord.vi;
        ctx.font = "700 15px system-ui, sans-serif";
        var mw = Math.min(W - 16, ctx.measureText(meanText).width + 28);
        ctx.fillStyle = "rgba(30,27,75,.85)";
        G71.rr(ctx, W / 2 - mw / 2, H - 38, mw, 34, 15);
        ctx.fill();
        ctx.strokeStyle = "#FBBF24";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.95)";
        G71.drawFitText(ctx, meanText, W / 2, H - 21, W - 40, 15, 11, 2, "700");
      }
      maybeEnd();
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.G71LuyenGo = { start: start, logic: LOGIC, drawRock: drawRock, drawShip: drawShip };
})();