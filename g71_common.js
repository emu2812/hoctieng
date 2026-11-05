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
  /* Tim thống nhất cho cả 3 game: tim đầy là ♥ đặc màu đỏ, tim mất là
     ♡ rỗng màu xám. Dùng ♥ (U+2665) thay cho ❤ (U+2764) vì ❤ không kèm
     ký tự chọn kiểu có thể hiện thành tim rỗng trên font của một số máy. */
  function hearts(n) {
    var s = "";
    for (var i = 0; i < 3; i++) s += (i < n
      ? '<span style="color:#E11D48">♥</span>'
      : '<span style="color:#9CA3AF">♡</span>');
    return s;
  }

  /* ---- Sân khấu toàn màn hình ---- */
  var stage = null;
  var helpChoice = null; /* null = chưa chọn; true/false = lựa chọn ? của phiên */
  function closeStage() {
    if (stage) { try { stage.close(); } catch (e) {} }
  }
  function openStage(title, hint, onClose) {
    closeStage();
    var ov = document.createElement("div");
    ov.id = "g71Stage";
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:#FFF7E8;display:flex;flex-direction:column;";
    /* HUD một dòng duy nhất: không xuống dòng, phần dài (chủ đề/nghĩa)
       tự cắt bằng dấu … để sân canvas giữ được chiều cao trên điện thoại
       dọc. Nút "?" mở/đóng hướng dẫn; màn hẹp mặc định thu hướng dẫn để
       sân chiếm phần lớn màn hình, màn rộng mặc định hiện hướng dẫn. Lựa
       chọn của người chơi được nhớ trong phiên (helpChoice). */
    ov.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border-bottom:2px solid #F3D9A4;">'
      + '<h2 style="margin:0;font-size:18px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(title) + '</h2>'
      + '<button id="g71Help" class="btn" title="Hướng dẫn" style="flex:none;">?</button>'
      + '<button id="g71Exit" class="btn" style="flex:none;">✕ Thoát</button></div>'
      + '<div id="g71Hud" style="display:flex;gap:10px;align-items:center;padding:7px 12px;font-weight:700;white-space:nowrap;overflow:hidden;"></div>'
      + '<div id="g71CanvasWrap" style="flex:1;min-height:0;position:relative;overflow:hidden;"><canvas id="g71Canvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas></div>'
      + '<p id="g71Hint" style="margin:0;padding:7px 12px;color:#6B7280;font-size:13px;">' + escHtml(hint) + '</p>';
    document.body.appendChild(ov);
    var cv = ov.querySelector("#g71Canvas");
    var ctx = null;
    try { ctx = cv.getContext("2d"); } catch (e) {}
    var hintEl = ov.querySelector("#g71Hint");
    var helpBtn = ov.querySelector("#g71Help");
    function applyHelp() {
      var open = (helpChoice !== null) ? helpChoice
        : (typeof window !== "undefined" && window.innerWidth ? window.innerWidth >= 600 : true);
      if (hintEl) hintEl.style.display = open ? "" : "none";
    }
    applyHelp();
    if (helpBtn) helpBtn.onclick = function () {
      var open = hintEl && hintEl.style.display === "none";
      helpChoice = open;
      applyHelp();
    };
    function resize() {
      try {
        var w = cv.clientWidth, h = cv.clientHeight;
        if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
      } catch (e) {}
    }
    resize();
    window.addEventListener("resize", resize);
    var ro = null;
    try {
      if (typeof ResizeObserver === "function") {
        ro = new ResizeObserver(resize);
        ro.observe(ov.querySelector("#g71CanvasWrap"));
      }
    } catch (e) {}
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      window.removeEventListener("resize", resize);
      try { if (ro) ro.disconnect(); } catch (e) {}
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
      wrap: ov.querySelector("#g71CanvasWrap"), hint: hintEl, helpBtn: helpBtn,
      resize: resize, close: close };
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

  /* ---- Căn chữ vừa vật chứa (chống tràn mép màn hình) ---- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  /* Cỡ chữ lớn nhất để chuỗi vừa maxW theo hàm đo cho trước. */
  function fitSize(measureFn, text, maxW, start, min) {
    var size = start;
    while (size > min && measureFn(text, size) > maxW) size -= 1;
    return size;
  }
  /* Ngắt chuỗi thành dòng theo maxW (tham lam theo từ; từ đơn dài hơn
     maxW giữ nguyên một dòng để fitSize thu nhỏ sau). */
  function wrapLines(measureFn, text, maxW) {
    var words = String(text).split(/\s+/).filter(function (w) { return w.length; });
    if (!words.length) return [""];
    var lines = [], cur = "";
    words.forEach(function (w) {
      var trial = cur ? cur + " " + w : w;
      if (cur && measureFn(trial) > maxW) { lines.push(cur); cur = w; }
      else cur = trial;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  /* Đặt font canvas vừa chuỗi (trả về cỡ chữ đã chọn). */
  function fitFont(ctx, text, maxW, start, min, weight) {
    weight = weight || "700";
    var size = fitSize(function (t, sz) {
      ctx.font = weight + " " + sz + "px system-ui, sans-serif";
      return ctx.measureText(t).width;
    }, text, maxW, start, min);
    ctx.font = weight + " " + size + "px system-ui, sans-serif";
    return size;
  }
  /* Vẽ chuỗi vào giữa (cx, cy), tối đa maxLines dòng: ngắt dòng trước,
     thu chữ sau, dòng cuối cắt bằng … nếu vẫn không vừa. halo (màu viền)
     giúp chữ nổi trên nền trong suốt như bong bóng. Trả về {size, lines}. */
  function drawFitText(ctx, text, cx, cy, maxW, startPx, minPx, maxLines, weight, halo) {
    weight = weight || "700";
    var size = startPx, lines = [String(text)];
    function measure(t, sz) {
      ctx.font = weight + " " + sz + "px system-ui, sans-serif";
      return ctx.measureText(t).width;
    }
    while (size >= minPx) {
      lines = wrapLines(function (t) { return measure(t, size); }, text, maxW);
      var over = lines.some(function (ln) { return measure(ln, size) > maxW; });
      if (lines.length <= maxLines && !over) break;
      size -= 1;
    }
    if (size < minPx) size = minPx;
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[lines.length - 1];
      while (last.length > 1 && measure(last + "…", size) > maxW) last = last.slice(0, -1);
      lines[lines.length - 1] = last + "…";
    }
    ctx.font = weight + " " + size + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    var lh = Math.round(size * 1.25);
    lines.forEach(function (ln, i) {
      var y = cy + (i - (lines.length - 1) / 2) * lh + size * 0.35;
      if (halo) {
        ctx.save();
        ctx.strokeStyle = halo; ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeText(ln, cx, y);
        ctx.restore();
      }
      ctx.fillText(ln, cx, y);
    });
    ctx.textAlign = "left";
    return { size: size, lines: lines };
  }
  /* Mây rộng cho Rồng Bay: đủ chỗ cho từ dài, neo mép phải với lề 12px.
     Trả về {hw, hh, cx} để game + probe cùng dùng một công thức. */
  function cloudGeom(W, H) {
    var hw = clamp(W * 0.26, 52, 110);
    var hh = Math.max(26, Math.min(hw * 0.55, H * 0.12));
    return { hw: hw, hh: hh, cx: W - hw - 12 };
  }
  function drawCloudWide(ctx, cx, cy, hw, hh) {
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.10)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + hh * 0.62, hw * 0.9, hh * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.55, cy + hh * 0.08, hw * 0.45, hh * 0.62, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy - hh * 0.18, hw * 0.6, hh * 0.72, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + hw * 0.55, cy + hh * 0.08, hw * 0.45, hh * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - hw, cy + hh * 0.02, hw * 2, hh * 0.5);
    ctx.restore();
  }
  /* Vị trí + bán kính bong bóng theo khe: mỗi bong bóng một khe riêng nên
     không bao giờ chồng nhau; bán kính không vượt quá nửa khe trừ lề. */
  function bubbleSlotX(W, slots, i) { return (W / slots) * (i + 0.5); }
  function bubbleRadius(word, slotW) {
    var r = Math.min(58, 26 + String(word).length * 2.5, slotW / 2 - 6);
    return Math.max(24, r);
  }
  /* ---- Nền có chiều sâu (3 lớp: xa — giữa — gần) ---- */
  function paintSpace(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0F172A"); g.addColorStop(1, "#274B73");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    watercolor(ctx, W, H, [
      { x: 0.2, y: 0.25, rx: 0.22, ry: 0.16, c: "#7DD3FC" },
      { x: 0.8, y: 0.6, rx: 0.25, ry: 0.18, c: "#F59E0B" },
      { x: 0.5, y: 0.85, rx: 0.28, ry: 0.14, c: "#1E9E6A" }
    ]);
    ctx.fillStyle = "#fff";
    for (var s = 0; s < 70; s++) {
      var sx = (s * 97) % W, sy = (s * 57) % H;
      var big = (s % 7 === 0);
      ctx.globalAlpha = big ? 0.9 : 0.35 + ((s * 13) % 10) / 20;
      var sz = big ? 3 : 2;
      ctx.fillRect(sx, sy, sz, sz);
    }
    ctx.globalAlpha = 1;
    /* 2 hành tinh: một có vành, một nhỏ ở xa. */
    ctx.fillStyle = "#C98A5B";
    ctx.beginPath(); ctx.arc(W * 0.84, H * 0.2, Math.min(26, W * 0.07), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(253,230,138,.8)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(W * 0.84, H * 0.2, Math.min(44, W * 0.12), Math.min(12, W * 0.035), -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#7DD3FC";
    ctx.beginPath(); ctx.arc(W * 0.14, H * 0.68, Math.min(18, W * 0.05), 0, Math.PI * 2); ctx.fill();
  }
  function paintSky(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#BFE6F5"); g.addColorStop(1, "#FFF7E8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Mặt trời + quầng sáng. */
    ctx.fillStyle = "rgba(253,224,71,.25)";
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.12, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FDE047";
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.12, 26, 0, Math.PI * 2); ctx.fill();
    /* Mây xa mờ. */
    ctx.globalAlpha = 0.55;
    drawCloudWide(ctx, W * 0.22, H * 0.1, 46, 20);
    drawCloudWide(ctx, W * 0.6, H * 0.06, 36, 16);
    ctx.globalAlpha = 1;
    /* Núi xa 2 lớp ở chân trời. */
    ctx.fillStyle = "rgba(125,211,252,.5)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 24) ctx.lineTo(x, H * 0.88 + Math.sin(x / 60) * H * 0.03);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(30,158,106,.35)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x2 = 0; x2 <= W; x2 += 24) ctx.lineTo(x2, H * 0.94 + Math.sin(x2 / 45 + 2) * H * 0.02);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    /* Chim bay xa. */
    ctx.strokeStyle = "rgba(31,36,48,.5)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    [[0.3, 0.16], [0.38, 0.12]].forEach(function (bp) {
      var bx = W * bp[0] + Math.sin(t / 900) * 4, by = H * bp[1];
      ctx.beginPath();
      ctx.moveTo(bx - 8, by); ctx.quadraticCurveTo(bx, by - 6, bx + 8, by);
      ctx.stroke();
    });
  }
  function paintSea(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7DD3FC"); g.addColorStop(1, "#1D4E89");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Tia sáng từ mặt nước. */
    ctx.fillStyle = "rgba(255,255,255,.10)";
    [0.18, 0.5, 0.8].forEach(function (rx, i) {
      var sway = Math.sin(t / 1600 + i * 2) * 10;
      ctx.beginPath();
      ctx.moveTo(W * rx + sway - 18, 0);
      ctx.lineTo(W * rx + sway + 18, 0);
      ctx.lineTo(W * rx + sway + 44, H * 0.55);
      ctx.lineTo(W * rx + sway - 8, H * 0.55);
      ctx.closePath(); ctx.fill();
    });
    /* Đáy biển + rong biển đung đưa + cá nhỏ. */
    ctx.fillStyle = "#E7C98B";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H + 18, W * 0.62, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1E9E6A"; ctx.lineWidth = 5; ctx.lineCap = "round";
    [0.1, 0.22, 0.88, 0.95].forEach(function (sx, i) {
      var sway2 = Math.sin(t / 1100 + i * 1.7) * 8;
      var base = H - 8;
      ctx.beginPath();
      ctx.moveTo(W * sx, base);
      ctx.quadraticCurveTo(W * sx + sway2, base - 40, W * sx + sway2 * 1.6, base - 74 - (i % 2) * 14);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(15,23,42,.45)";
    [[0.3, 0.3], [0.68, 0.45]].forEach(function (fp, i) {
      var fx = W * fp[0] + Math.sin(t / 1300 + i * 3) * 12, fy = H * fp[1];
      ctx.beginPath(); ctx.ellipse(fx, fy, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - 12, fy); ctx.lineTo(fx - 20, fy - 6); ctx.lineTo(fx - 20, fy + 6);
      ctx.closePath(); ctx.fill();
    });
    /* Bọt khí nhỏ nổi lên. */
    ctx.fillStyle = "rgba(255,255,255,.5)";
    for (var b = 0; b < 8; b++) {
      var by = H - ((t / 22 + b * 90) % H);
      ctx.beginPath(); ctx.arc(W * (0.12 + b * 0.11), by, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  window.G71 = {
    escHtml: escHtml, shuffle: shuffle, pool: pool,
    pickSetWords: pickSetWords, pickTypingWords: pickTypingWords,
    buildRounds: buildRounds, hearts: hearts,
    openStage: openStage, closeStage: closeStage, endScreen: endScreen,
    rr: rr, watercolor: watercolor,
    drawDragon: drawDragon, drawSnake: drawSnake,
    drawRocket: drawRocket, drawCloud: drawCloud,
    clamp: clamp, fitSize: fitSize, wrapLines: wrapLines,
    fitFont: fitFont, drawFitText: drawFitText,
    cloudGeom: cloudGeom, drawCloudWide: drawCloudWide,
    bubbleSlotX: bubbleSlotX, bubbleRadius: bubbleRadius,
    paintSpace: paintSpace, paintSky: paintSky, paintSea: paintSea
  };
})();
