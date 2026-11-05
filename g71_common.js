/* G71 — Dùng chung cho 3 trò chơi mới v71 (Luyện Gõ, Rồng Bay Trên Mây,
   Bắn Bong Bóng). Từ vựng lấy từ kho có sẵn CONTENT.vocab (cùng kho quiz /
   flashcard dùng), không bịa danh sách từ. Linh vật Rồng + Rắn vẽ bằng code
   theo màu của web (xanh lá, bụng vàng, cam san hô), không chép hình/màu/
   linh vật của web khác. File này chỉ định nghĩa, không chạy DOM khi nạp. */
(function () {
  "use strict";

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  /* Kho từ phẳng từ CONTENT.vocab: [{w, vi, theme}]. */
  function pool() {
    var out = [];
    try {
      (CONTENT.vocab || []).forEach(function (set) {
        var theme = set.theme || set.topic || "";
        (set.cards || []).forEach(function (c) {
          if (c && c.w && c.vi) out.push({ w: String(c.w), vi: String(c.vi), theme: theme });
        });
      });
    } catch (e) {}
    return out;
  }
  /* Một chủ đề ngẫu nhiên, tối đa n từ; thiếu thì bù từ kho chung. */
  function pickSetWords(n) {
    var sets = [];
    try { sets = (CONTENT.vocab || []).filter(function (s) { return s && s.cards && s.cards.length; }); } catch (e) {}
    if (!sets.length) return { theme: "", words: [] };
    var set = sets[Math.floor(Math.random() * sets.length)];
    var theme = set.theme || set.topic || "";
    var cards = shuffle(set.cards.slice()).filter(function (c) { return c && c.w && c.vi; });
    var words = cards.slice(0, n).map(function (c) { return { w: String(c.w), vi: String(c.vi) }; });
    if (words.length < n) {
      var rest = shuffle(pool()).filter(function (p) {
        return words.every(function (x) { return x.w !== p.w; });
      });
      while (words.length < n && rest.length) { var p = rest.pop(); words.push({ w: p.w, vi: p.vi }); }
    }
    return { theme: theme, words: words };
  }
  /* Riêng Luyện Gõ: chỉ lấy từ một chữ cái a-z (không khoảng trắng, không
     dấu gạch nối) để gõ phím được trọn vẹn. */
  function pickTypingWords(n) {
    var got = pickSetWords(n * 3);
    var words = got.words.filter(function (wd) { return /^[A-Za-z]+$/.test(wd.w); }).slice(0, n);
    if (words.length < n) {
      var rest = shuffle(pool()).filter(function (p) {
        return /^[A-Za-z]+$/.test(p.w) && words.every(function (x) { return x.w !== p.w; });
      });
      while (words.length < n && rest.length) { var p = rest.pop(); words.push({ w: p.w, vi: p.vi }); }
    }
    return { theme: got.theme, words: words };
  }
  /* Vòng chơi: mỗi vòng 1 đáp án đúng + dist từ lạ (khác từ, khác nghĩa). */
  function buildRounds(n, dist) {
    var p = shuffle(pool());
    var rounds = [];
    for (var i = 0; i < p.length && rounds.length < n; i++) {
      var t = p[i];
      var ds = [];
      for (var j = 0; j < p.length && ds.length < dist; j++) {
        var d = p[j];
        if (d.w !== t.w && d.vi !== t.vi && ds.every(function (x) { return x.w !== d.w; })) ds.push(d);
      }
      if (ds.length < dist) continue;
      var opts = shuffle([t.w].concat(ds.map(function (d) { return d.w; })));
      rounds.push({ vi: t.vi, correct: t.w, options: opts });
    }
    return rounds;
  }
  function hearts(n) {
    var s = "";
    for (var i = 0; i < 3; i++) s += (i < n ? "❤" : "♡");
    return s;
  }

  /* ---- Sân khấu toàn màn hình ---- */
  var stage = null;
  function closeStage() {
    if (stage) { try { stage.close(); } catch (e) {} }
  }
  function openStage(title, hint, onClose) {
    closeStage();
    var ov = document.createElement("div");
    ov.id = "g71Stage";
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:#FFF7E8;display:flex;flex-direction:column;";
    ov.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;border-bottom:2px solid #F3D9A4;">'
      + '<h2 style="margin:0;font-size:20px;flex:1;">' + escHtml(title) + '</h2>'
      + '<button id="g71Exit" class="btn">✕ Thoát</button></div>'
      + '<div id="g71Hud" style="display:flex;gap:8px 18px;flex-wrap:wrap;align-items:center;padding:8px 14px;font-weight:700;"></div>'
      + '<div id="g71CanvasWrap" style="flex:1;min-height:0;position:relative;"><canvas id="g71Canvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas></div>'
      + '<p style="margin:0;padding:8px 14px;color:#6B7280;font-size:14px;">' + escHtml(hint) + '</p>';
    document.body.appendChild(ov);
    var cv = ov.querySelector("#g71Canvas");
    var ctx = null;
    try { ctx = cv.getContext("2d"); } catch (e) {}
    function resize() { try { cv.width = cv.clientWidth; cv.height = cv.clientHeight; } catch (e) {} }
    resize();
    window.addEventListener("resize", resize);
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (stage === api) stage = null;
      if (onClose) { try { onClose(); } catch (e) {} }
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    var exitBtn = ov.querySelector("#g71Exit");
    if (exitBtn) exitBtn.onclick = close;
    var api = { el: ov, canvas: cv, ctx: ctx, hud: ov.querySelector("#g71Hud"),
      wrap: ov.querySelector("#g71CanvasWrap"), close: close };
    stage = api;
    return api;
  }
  /* Màn hình kết thúc: thắng thì +10 XP bằng hàm sẵn có của web. */
  function endScreen(st, win, title, lines, onReplay) {
    var box = document.createElement("div");
    box.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,247,232,.93);z-index:5;padding:16px;";
    var lis = lines.map(function (l) { return "<p style=\"margin:6px 0;\">" + escHtml(l) + "</p>"; }).join("");
    box.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:28px 24px;text-align:center;max-width:520px;width:100%;">'
      + '<h2 style="margin-top:0;">' + escHtml(title) + "</h2>" + lis
      + '<div class="row" style="justify-content:center;"><button class="btn btn-primary" id="g71Replay">Chơi lại</button>'
      + '<button class="btn" id="g71Back">Về khu Trò chơi</button></div></div>';
    st.wrap.appendChild(box);
    if (win) { try { if (typeof awardXp === "function") awardXp(10); } catch (e) {} }
    var rb = box.querySelector("#g71Replay");
    if (rb) rb.onclick = function () { st.close(); if (onReplay) onReplay(); };
    var bb = box.querySelector("#g71Back");
    if (bb) bb.onclick = function () { st.close(); };
  }

  /* ---- Vẽ bằng code (phong cách tranh màu nước + nét truyện tranh mềm) ---- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function watercolor(ctx, w, h, blobs) {
    blobs.forEach(function (b) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.ellipse(b.x * w, b.y * h, b.rx * w, b.ry * h, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  /* Rồng xanh lá, bụng vàng, sừng + cánh cam — nhìn sang phải. */
  function drawDragon(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#FF6B4A";
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.quadraticCurveTo(-s * 2.0, -s * 0.5, -s * 2.2, s * 0.2);
    ctx.quadraticCurveTo(-s * 1.4, s * 0.3, -s * 0.9, s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FF6B4A";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.9, -s * 1.4, -s * 0.2, -s * 1.7);
    ctx.quadraticCurveTo(s * 0.3, -s * 1.2, s * 0.2, -s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1E9E6A";
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFC800";
    ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.2, s * 0.65, s * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1E9E6A";
    ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.55, s * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFB800";
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 1.05); ctx.lineTo(s * 0.75, -s * 1.55); ctx.lineTo(s * 0.95, -s * 1.0); ctx.closePath();
    ctx.moveTo(s * 1.05, -s * 1.05); ctx.lineTo(s * 1.25, -s * 1.5); ctx.lineTo(s * 1.4, -s * 0.95); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#FFC800";
    ctx.beginPath(); ctx.ellipse(s * 1.45, -s * 0.45, s * 0.32, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1F2430";
    ctx.beginPath(); ctx.arc(s * 1.05, -s * 0.7, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s * 1.09, -s * 0.74, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1F2430"; ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath(); ctx.arc(s * 1.35, -s * 0.3, s * 0.16, 0.15, Math.PI - 0.4); ctx.stroke();
    ctx.restore();
  }
  /* Rắn xanh lá cuộn tròn, đầu ngẩng, lưỡi chẻ đỏ; fire=true thì phun lửa. */
  function drawSnake(ctx, x, y, s, fire) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#1E9E6A";
    ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 1.05, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.72, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFC800";
    ctx.beginPath(); ctx.arc(-s * 0.35, s * 0.45, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, s * 0.5, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1E9E6A"; ctx.lineWidth = s * 0.42; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.1); ctx.quadraticCurveTo(s * 0.9, -s * 0.5, s * 0.75, -s * 1.0); ctx.stroke();
    ctx.fillStyle = "#1E9E6A";
    ctx.beginPath(); ctx.arc(s * 0.75, -s * 1.15, s * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFC800";
    ctx.beginPath(); ctx.ellipse(s * 1.05, -s * 1.05, s * 0.26, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1F2430";
    ctx.beginPath(); ctx.arc(s * 0.7, -s * 1.25, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s * 0.74, -s * 1.29, s * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#FF6B4A"; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s * 1.3, -s * 1.05); ctx.lineTo(s * 1.7, -s * 1.05);
    ctx.moveTo(s * 1.7, -s * 1.05); ctx.lineTo(s * 1.9, -s * 1.2);
    ctx.moveTo(s * 1.7, -s * 1.05); ctx.lineTo(s * 1.9, -s * 0.9);
    ctx.stroke();
    if (fire) {
      ctx.fillStyle = "#F05A28";
      ctx.beginPath();
      ctx.moveTo(s * 1.95, -s * 1.05);
      ctx.quadraticCurveTo(s * 2.5, -s * 1.5, s * 2.7, -s * 1.05);
      ctx.quadraticCurveTo(s * 2.5, -s * 0.6, s * 1.95, -s * 1.05);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#FFC800";
      ctx.beginPath();
      ctx.moveTo(s * 2.0, -s * 1.05);
      ctx.quadraticCurveTo(s * 2.3, -s * 1.3, s * 2.45, -s * 1.05);
      ctx.quadraticCurveTo(s * 2.3, -s * 0.8, s * 2.0, -s * 1.05);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  /* Tên lửa bay lên: thân trắng, mũi + cánh cam san hô, cửa sổ xanh. */
  function drawRocket(ctx, x, y, s, flick) {
    ctx.save();
    ctx.translate(x, y);
    var f = 1 + (flick || 0) * 0.3;
    ctx.fillStyle = "#F05A28";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9 * f);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.5 * f, s * 0.35, 0);
    ctx.quadraticCurveTo(s * 0.15, s * 0.3 * f, 0, s * 0.5 * f);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.3 * f, -s * 0.35, 0);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.5 * f, 0, -s * 0.9 * f);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.7);
    ctx.quadraticCurveTo(s * 0.42, -s * 1.1, s * 0.35, -s * 0.5);
    ctx.lineTo(-s * 0.35, -s * 0.5);
    ctx.quadraticCurveTo(-s * 0.42, -s * 1.1, 0, -s * 1.7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#F05A28";
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.2); ctx.lineTo(-s * 0.85, s * 0.5); ctx.lineTo(-s * 0.35, s * 0.5); ctx.closePath();
    ctx.moveTo(s * 0.35, -s * 0.2); ctx.lineTo(s * 0.85, s * 0.5); ctx.lineTo(s * 0.35, s * 0.5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7DD3FC";
    ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1F2430"; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 0.22, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawCloud(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-s * 0.55, s * 0.1, s * 0.45, 0, Math.PI * 2);
    ctx.arc(0, -s * 0.15, s * 0.6, 0, Math.PI * 2);
    ctx.arc(s * 0.55, s * 0.1, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-s * 1.0, s * 0.05, s * 2.0, s * 0.4);
    ctx.restore();
  }

  window.G71 = {
    escHtml: escHtml, shuffle: shuffle, pool: pool,
    pickSetWords: pickSetWords, pickTypingWords: pickTypingWords,
    buildRounds: buildRounds, hearts: hearts,
    openStage: openStage, closeStage: closeStage, endScreen: endScreen,
    rr: rr, watercolor: watercolor,
    drawDragon: drawDragon, drawSnake: drawSnake,
    drawRocket: drawRocket, drawCloud: drawCloud
  };
})();
