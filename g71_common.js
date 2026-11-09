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
  /* v91: kho tu theo track dang hoc. Tu game lay tu kho that cua track
     (EN = CONTENT.vocab, ZH = zhSets(), TC = TC_VOCAB, TP = TP_VOCAB),
     khong bia tu. Moi tu co them:
     - w: tu hien thi (tu tieng Anh / chu Han / tu Hangul)
     - type: chuoi de go/bam (EN/TC = chinh tu; ZH = pinyin KHONG dau;
       TP = chinh tu Hangul, moi am tiet la 1 ky tu de bam theo thu tu)
     - py: pinyin co dau thanh (chi ZH, de hien goi y) */
  function trackKey() {
    try { return (typeof state !== "undefined" && state && state.track) || "en"; }
    catch (e) { return "en"; }
  }
  function pinyinPlain(py) {
    var m = { "\u0101": "a", "\u00e1": "a", "\u01ce": "a", "\u00e0": "a",
      "\u0113": "e", "\u00e9": "e", "\u011b": "e", "\u00e8": "e",
      "\u012b": "i", "\u00ed": "i", "\u01d0": "i", "\u00ec": "i",
      "\u014d": "o", "\u00f3": "o", "\u01d2": "o", "\u00f2": "o",
      "\u016b": "u", "\u00fa": "u", "\u01d4": "u", "\u00f9": "u",
      "\u01d6": "v", "\u01d8": "v", "\u01da": "v", "\u01dc": "v",
      "\u00fc": "v" };
    return String(py || "").replace(/[\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9\u01d6\u01d8\u01da\u01dc\u00fc]/g,
      function (ch) { return m[ch] || ch; });
  }
  function trackSets() {
    var t = trackKey(), out = [];
    try {
      if (t === "zh" && typeof zhSets === "function") {
        zhSets().forEach(function (d) {
          var set = d && d.set;
          if (!set || !set.cards) return;
          out.push({ theme: set.topic || set.title || "",
            cards: set.cards.filter(function (c) { return c && c.han && c.vi && c.pinyin; })
              .map(function (c) { return { w: String(c.han), vi: String(c.vi),
                type: pinyinPlain(c.pinyin), py: String(c.pinyin),
                col: String(c.col || ""), ex: String(c.ex || "") }; }) });
        });
        return out.filter(function (x) { return x.cards.length; });
      }
      if (t === "tc" && typeof TC_VOCAB !== "undefined") {
        (TC_VOCAB || []).forEach(function (set) {
          if (!set || !set.cards) return;
          out.push({ theme: set.topic || "",
            cards: set.cards.filter(function (c) { return c && c.w && c.vi; })
              .map(function (c) { return { w: String(c.w), vi: String(c.vi), type: String(c.w),
                col: String(c.col || ""), ex: String(c.ex || "") }; }) });
        });
        return out.filter(function (x) { return x.cards.length; });
      }
      if (t === "tp" && typeof TP_VOCAB !== "undefined") {
        (TP_VOCAB || []).forEach(function (set) {
          if (!set || !set.cards) return;
          out.push({ theme: set.topic || "",
            cards: set.cards.filter(function (c) { return c && c.w && c.vi; })
              .map(function (c) { return { w: String(c.w), vi: String(c.vi), type: String(c.w),
                col: String(c.col || ""), ex: String(c.ex || "") }; }) });
        });
        return out.filter(function (x) { return x.cards.length; });
      }
    } catch (e) {}
    return out;
  }
  /* Mot tu co go/bam duoc khong: chuoi type la chu cai Latin (EN/TC/ZH
     pinyin khong dau) hoac toan am tiet Hangul (TP). */
  function isTypeable(wd) {
    var t = wd && (wd.type || wd.w);
    if (!t) return false;
    if (/^[A-Za-z]+$/.test(t)) return true;
    return /^[\uAC00-\uD7A3]+$/.test(t);
  }
  /* v102 (Rong Lua) — v105 mo rong ra diem choke chung: chuoi go la 1
     chu cai Latin duy nhat ("V", "R" o bo 26 chu cai EN, pinyin "a")
     thi khong lam muc tieu game — go 1 phim la chet, khong hoc duoc
     gi. CHI loc chu cai Latin: tu Han 1 am tiet (물), chu Han 1 chu
     (pinyin dai hon 1 phim) giu nguyen. */
  function isSingleLetter(wd) {
    var t = wd && (wd.type || wd.w);
    return !!t && /^[A-Za-z]$/.test(String(t));
  }
  /* Bo dau tieng Viet: dung NFD nhu normSearch o index.html. */
  function stripDiacritics(s) {
    try { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D"); }
    catch (e) { return String(s || ""); }
  }
  /* v105: dang hien thi cua mot the tu. Tu vay tieng Viet trong kho EN
     viet khong dau ("banh mi") nhung nghia tieng Viet co dau ("bánh
     mì") — hien dang co dau cho dung tieng Viet, nguoi hoc van go
     chuoi Latin khong dau nhu cu. Chi doi khi nghia (bo dau, thuong
     hoa) trung khop hoan toan voi tu — tu Anh thuong ("dirty"),
     chu Han, tu Hangul khong doi. Chuoi go (type) khong doi. */
  function displayWord(wd) {
    var w = wd && (wd.w != null ? String(wd.w) : "");
    var vi = wd && (wd.vi != null ? String(wd.vi) : "");
    if (!w || !vi) return w;
    if (stripDiacritics(vi).toLowerCase().trim() === w.toLowerCase().trim()) return vi;
    return w;
  }
  /* Kho từ phẳng theo track: [{w, vi, theme, type, py}]. EN dung kho
     CONTENT.vocab cu; ZH/TC/TP dung kho that cua track do. */
  function pool() {
    var t = trackKey();
    if (t !== "en") {
      var sets = trackSets(), out = [];
      sets.forEach(function (set) {
        set.cards.forEach(function (c) {
          out.push({ w: c.w, vi: c.vi, theme: set.theme, type: c.type, py: c.py || "",
            col: c.col || "", ex: c.ex || "" });
        });
      });
      if (out.length) return out;
    }
    var outEn = [];
    try {
      (CONTENT.vocab || []).forEach(function (set) {
        var theme = set.theme || set.topic || "";
        (set.cards || []).forEach(function (c) {
          if (c && c.w && c.vi) outEn.push({ w: String(c.w), vi: String(c.vi), theme: theme,
            type: String(c.w), col: String(c.col || ""), ex: String(c.ex || "") });
        });
      });
    } catch (e) {}
    return outEn;
  }
  /* Một chủ đề ngẫu nhiên, tối đa n từ; thiếu thì bù từ kho chung
     (kho cua track dang hoc). */
  function pickSetWords(n) {
    var sets = [], t = trackKey();
    try {
      if (t !== "en") sets = trackSets();
      if (!sets.length) sets = (CONTENT.vocab || []).filter(function (s) { return s && s.cards && s.cards.length; });
    } catch (e) {}
    if (!sets.length) return { theme: "", words: [] };
    var set = sets[Math.floor(Math.random() * sets.length)];
    var theme = set.theme || set.topic || "";
    var cards = shuffle(set.cards.slice()).filter(function (c) { return c && (c.w || c.han) && c.vi; });
    var words = cards.slice(0, n).map(function (c) {
      if (c.han) return { w: String(c.han), vi: String(c.vi), type: pinyinPlain(c.pinyin), py: String(c.pinyin || ""),
        col: String(c.col || ""), ex: String(c.ex || "") };
      return { w: String(c.w), vi: String(c.vi), type: String(c.type || c.w),
        col: String(c.col || ""), ex: String(c.ex || "") };
    });
    if (words.length < n) {
      var rest = shuffle(pool()).filter(function (p) {
        return words.every(function (x) { return x.w !== p.w; });
      });
      while (words.length < n && rest.length) { var p = rest.pop(); words.push({ w: p.w, vi: p.vi, type: p.type || p.w, py: p.py || "", col: p.col || "", ex: p.ex || "" }); }
    }
    return { theme: theme, words: words };
  }
  /* Riêng game go chu: chi lay tu go/bam duoc tron ven theo he chu cua
     track — EN/TC: tu mot chu cai a-z; ZH: pinyin khong dau (chu cai a-z);
     TP: tu Hangul (bam tung am tiet). */
  function pickTypingWords(n) {
    var got = pickSetWords(n * 3);
    var words = got.words.filter(function (wd) { return isTypeable(wd) && !isSingleLetter(wd); }).slice(0, n);
    if (words.length < n) {
      var rest = shuffle(pool()).filter(function (p) {
        return isTypeable(p) && !isSingleLetter(p) && words.every(function (x) { return x.w !== p.w; });
      });
      while (words.length < n && rest.length) { var p = rest.pop(); words.push({ w: p.w, vi: p.vi, type: p.type || p.w, py: p.py || "", col: p.col || "", ex: p.ex || "" }); }
    }
    return { theme: got.theme, words: words };
  }
  /* Vòng chơi: mỗi vòng 1 đáp án đúng + dist từ lạ (khác từ, khác nghĩa). */
  function buildRounds(n, dist) {
    var p = shuffle(pool());
    var rounds = [];
    for (var i = 0; i < p.length && rounds.length < n; i++) {
      var t = p[i];
      if (isSingleLetter(t)) continue; /* v105: chu cai don khong lam dap an */
      var ds = [];
      for (var j = 0; j < p.length && ds.length < dist; j++) {
        var d = p[j];
        if (!isSingleLetter(d) && d.w !== t.w && d.vi !== t.vi && ds.every(function (x) { return x.w !== d.w; })) ds.push(d);
      }
      if (ds.length < dist) continue;
      var opts = shuffle([t.w].concat(ds.map(function (d) { return d.w; })));
      /* v105: ban do hien thi cua moi lua chon (vd "banh mi" -> "bánh
         mì") de game ve dung dang co dau; so sanh dap an van dung
         chuoi goc (options). */
      var dm = {};
      dm[t.w] = displayWord(t);
      ds.forEach(function (d) { dm[d.w] = displayWord(d); });
      rounds.push({ vi: t.vi, correct: t.w, options: opts, disp: dm });
    }
    return rounds;
  }
  /* Tim thống nhất cho cả 3 game — v101: tim vector SVG hổ phách (sống)
     / xám (mất) theo ART_DIRECTION.md §9; KHÔNG dùng ký tự ♥ (font
     Android render thành emoji đỏ, lệch hệ màu). Cùng path tim với
     Rồng Lửa (heartsSvg trong g71_rong_lua.js). */
  function hearts(n) {
    var s = "", i, fill;
    for (i = 0; i < 3; i++) {
      fill = (i < n) ? "#F59E0B" : "#9CA3AF";
      s += '<svg width="18" height="17" viewBox="0 0 24 22" style="vertical-align:-3px"><path d="M12 21 C5 15 2 11 2 7.5 C2 4.5 4.5 2 7.5 2 C9.5 2 11 3.5 12 5 C13 3.5 14.5 2 16.5 2 C19.5 2 22 4.5 22 7.5 C22 11 19 15 12 21Z" fill="' + fill + '"/></svg>';
    }
    return s;
  }

  /* ---- Sân khấu toàn màn hình ---- */
  var stage = null;
  function closeStage() {
    if (stage) { try { stage.close(); } catch (e) {} }
  }
  /* v117 P3b: nut "?" mo hop thoai huong dan TAI CHO (khung phu tren
     san), khong roi game, khong mat van — thay hanh vi cu v113 (thoat
     san roi mo tab Huong dan). Game thoi gian thuc TAM DUNG khi hop
     thoai mo (stage.paused — vong frame cua game tu kiem tra); game
     theo luot (Giai Do) khong can tam dung. Hop thoai nam trong khung
     canvas (khong phu thanh tieu de/nut "?"/nut Thoat). Nhan "Xem day
     du" moi thoat san sang tab Huong dan (hanh vi cu, gio phai chon
     chu dong). helpText: tom tat luat rieng cua tung game; khong co
     thi hien dong chung. */
  function openStage(title, onClose, helpText) {
    closeStage();
    var ov = document.createElement("div");
    ov.id = "g71Stage";
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:#FFF7E8;display:flex;flex-direction:column;";
    /* HUD một dòng duy nhất: không xuống dòng, phần dài (chủ đề/nghĩa)
       tự cắt bằng dấu … để sân canvas giữ được chiều cao trên điện thoại
       dọc. Sân không còn thanh gợi ý — luật game đầy đủ nằm ở tab Hướng
       dẫn; nút "?" mở hộp thoại tóm tắt tại chỗ (v117 P3b). */
    ov.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border-bottom:2px solid #F3D9A4;">'
      + '<h2 style="margin:0;font-size:18px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(title) + '</h2>'
      + '<button id="g71Help" class="btn" title="Hướng dẫn" style="flex:none;">?</button>'
      + '<button id="g71Exit" class="btn" style="flex:none;">✕ Thoát</button></div>'
      + '<div id="g71Hud" style="display:flex;gap:10px;align-items:center;padding:7px 12px;font-weight:700;white-space:nowrap;overflow:hidden;"></div>'
      + '<div id="g71CanvasWrap" style="flex:1;min-height:0;position:relative;overflow:hidden;"><canvas id="g71Canvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas></div>';
    document.body.appendChild(ov);
    /* v121: CSS che do gon khi viewport thap (ban phim goc dang mo —
       layout viewport co lai nho interactive-widget=resizes-content):
       thu hep tieu de / HUD / o nhap de khu game giu duoc chieu cao
       nhin thay; the cau hoi Giai Do cuon doc duoc thay vi bi cat.
       Tiem 1 lan cho ca web (guard theo id). */
    try {
      if (!document.getElementById("g71StageKbCss")) {
        var kbCss = document.createElement("style");
        kbCss.id = "g71StageKbCss";
        kbCss.textContent = "#g71Stage.g71-kb > div:first-child{padding:5px 10px !important;}"
          + "#g71Stage.g71-kb > div:first-child h2{font-size:16px !important;}"
          + "#g71Stage.g71-kb #g71Hud{padding:4px 10px !important;}"
          + "#g71Stage.g71-kb #g71TypeInput{margin:5px auto !important;padding:8px 12px !important;}"
          + "#g71Stage.g71-kb #rlTypeInput{margin:4px auto !important;padding:7px 12px !important;}"
          + "#g71Stage.g71-kb #rlElBar{padding:4px 8px !important;}"
          + "#g71Stage.g71-kb #gdCard{padding:8px !important;}"
          + "#g71Stage.g71-kb #gdCard>div{padding:14px !important;}";
        document.head.appendChild(kbCss);
      }
    } catch (e) {}
    var cv = ov.querySelector("#g71Canvas");
    var ctx = null;
    try { ctx = cv.getContext("2d"); } catch (e) {}
    var helpBtn = ov.querySelector("#g71Help");
    var helpBox = null;
    /* Hop thoai huong dan tai cho (v117 P3b): nam trong khung canvas,
       khong phu thanh tieu de. Mo thi stage.paused = true. */
    function openHelp() {
      if (helpBox) return;
      api.paused = true; api.helpOpen = true;
      helpBox = document.createElement("div");
      helpBox.id = "g71HelpBox";
      helpBox.style.cssText = "position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:rgba(4,6,15,.55);padding:16px;";
      var body = helpText || "Luật chơi đầy đủ nằm ở tab Hướng dẫn.";
      helpBox.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:22px 20px;max-width:520px;width:100%;">'
        + '<h2 style="margin:0 0 8px;">❓ Hướng dẫn — ' + escHtml(title) + '</h2>'
        + '<p style="margin:6px 0;line-height:1.6;">' + escHtml(body) + '</p>'
        + '<div class="row" style="justify-content:center;margin-top:12px;"><button class="btn btn-primary" id="g71HelpClose">Đóng — quay lại game</button>'
        + '<button class="btn" id="g71HelpFull">Xem đầy đủ ở tab Hướng dẫn</button></div></div>';
      var wrap = ov.querySelector("#g71CanvasWrap");
      if (wrap) wrap.appendChild(helpBox); else ov.appendChild(helpBox);
      var cb = helpBox.querySelector("#g71HelpClose");
      if (cb) cb.onclick = closeHelp;
      var fb = helpBox.querySelector("#g71HelpFull");
      if (fb) fb.onclick = function () { close(); if (typeof go === "function") go("guide"); };
    }
    function closeHelp() {
      if (!helpBox) return;
      if (helpBox.parentNode) helpBox.parentNode.removeChild(helpBox);
      helpBox = null;
      if (api) { api.paused = false; api.helpOpen = false; }
    }
    /* Nút "?" (v117 P3b): mở hộp thoại tại chỗ, không rời game.
       Gắn bằng event delegation trên khung sân khấu để nút vẫn bấm được
       dù tiêu đề được vẽ lại. */
    ov.addEventListener("click", function (e) {
      var t = e && e.target;
      if (t && t.closest && t.closest("#g71Help")) { openHelp(); }
    });
    function resize() {
      try {
        /* v121: viewport thap (< 560px — ban phim goc dang mo tren dien
           thoai, layout viewport da co lai) thi bat che do gon de khu
           game khong bi bop het; viewport cao tro lai thi tat. */
        var shortH = false;
        try { shortH = (typeof window !== "undefined" && window.innerHeight && window.innerHeight < 560); } catch (e) {}
        if (ov.classList) ov.classList.toggle("g71-kb", !!shortH);
      } catch (e) {}
      try {
        var w = cv.clientWidth, h = cv.clientHeight;
        if (w && h && (cv.width !== w || cv.height !== h)) {
          /* Giữ khung hình cuối khi đổi cỡ canvas (v100 B2): gán
             cv.width/cv.height XÓA canvas — khi thua/thắng, sân khấu
             ẩn bàn phím + thanh hệ làm khung canvas đổi cỡ, khung hình
             cuối mất, nền mờ phía sau hộp thoại thành trang xám phẳng.
             Chụp nhanh khung hình ra canvas phụ rồi vẽ lại sau khi đổi cỡ. */
          var snap = null, sw = 0, sh = 0;
          try {
            if (ctx && cv.width > 0 && cv.height > 0) {
              snap = document.createElement("canvas");
              snap.width = cv.width; snap.height = cv.height;
              var sctx = snap.getContext("2d");
              if (sctx) { sctx.drawImage(cv, 0, 0); sw = cv.width; sh = cv.height; }
              else snap = null;
            }
          } catch (e) { snap = null; }
          cv.width = w; cv.height = h;
          if (snap && ctx) {
            try { ctx.drawImage(snap, 0, 0, sw, sh, 0, 0, w, h); } catch (e) {}
          }
        }
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
    /* v121: visualViewport co lai khi ban phim mo (ca khi window resize
       khong ban tren mot so may) — cung goi resize() de bat/tat che do gon. */
    var vv = null;
    try {
      if (typeof window !== "undefined" && window.visualViewport && window.visualViewport.addEventListener) {
        vv = window.visualViewport;
        vv.addEventListener("resize", resize);
      }
    } catch (e) {}
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      if (helpBox) { try { if (helpBox.parentNode) helpBox.parentNode.removeChild(helpBox); } catch (e) {} helpBox = null; }
      window.removeEventListener("resize", resize);
      try { if (vv) vv.removeEventListener("resize", resize); } catch (e) {}
      try { if (ro) ro.disconnect(); } catch (e) {}
      document.removeEventListener("keydown", onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (stage === api) stage = null;
      if (onClose) { try { onClose(); } catch (e) {} }
    }
    function onKey(e) { if (e.key === "Escape") { if (helpBox) { closeHelp(); return; } close(); } }
    document.addEventListener("keydown", onKey);
    var exitBtn = ov.querySelector("#g71Exit");
    if (exitBtn) exitBtn.onclick = close;
    var api = { el: ov, canvas: cv, ctx: ctx, hud: ov.querySelector("#g71Hud"),
      wrap: ov.querySelector("#g71CanvasWrap"), helpBtn: helpBtn,
      resize: resize, close: close,
      paused: false, helpOpen: false, openHelp: openHelp, closeHelp: closeHelp };
    stage = api;
    return api;
  }
  /* Màn hình kết thúc — v121: là MỘT MÀN RIÊNG trong sân khấu, KHÔNG
     còn là hộp phủ lên khung game đang chạy. Trước đây hộp kết thúc phủ
     tuyệt đối (inset:0) lên #g71CanvasWrap, che mất chip từ / thanh
     Nghĩa / viên quái phía sau, lại thêm ô nhập vẫn focus nên bàn phím
     vẫn mở, kẹp khung game thành dải mỏng (ảnh Bùi gửi 12:12 09/11:
     "Gõ đúng 0/20 từ" che mất từ "complaint"). Nay: ẩn khung canvas +
     mọi ô nhập (blur trước để bàn phím tự tắt), hiện thẻ kết thúc trong
     luồng cuộn riêng (flex:1, overflow-y:auto) — thẻ dài hơn màn thì
     cuộn được, không bị cắt; nút Chơi lại / Về khu Trò chơi như cũ.
     Gọi 2 lần chỉ hiện 1 thẻ (chốt #g71EndScreen). */
  function endScreen(st, win, title, lines, onReplay) {
    try {
      if (st && st.el && st.el.querySelector("#g71EndScreen")) return;
    } catch (e) {}
    /* v121: blur TRUOC khi an — o nhap trong khung canvas (Giai Do) chi
       blur duoc khi con thay duoc; an khung truoc roi blur thi trinh
       duyet co the bo qua (phat hien o probe: activeElement van la
       #gdAnswer neu an truoc, blur sau). */
    try {
      if (st && st.el) {
        var ins0 = st.el.querySelectorAll("input");
        for (var i0 = 0; i0 < ins0.length; i0++) {
          try { ins0[i0].blur(); } catch (e2) {}
        }
      }
    } catch (e) {}
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    try { if (st && st.wrap) st.wrap.style.display = "none"; } catch (e) {}
    try {
      if (st && st.el) {
        var ins = st.el.querySelectorAll("input");
        for (var ii = 0; ii < ins.length; ii++) {
          ins[ii].style.display = "none";
        }
        var eb = st.el.querySelector("#rlElBar");
        if (eb) eb.style.display = "none";
      }
    } catch (e) {}
    /* v121: blur lan nua sau khi an — o nhap nao van giu focus (vd o
       nhap Giai Do da disabled sau khi nop bai) thi thu blur them lan
       nua; tren may that, o nhap an + disabled thi ban phim tu tat. */
    try {
      if (st && st.el && document.activeElement && st.el.contains(document.activeElement)
        && document.activeElement.blur) document.activeElement.blur();
    } catch (e) {}
    var box = document.createElement("div");
    box.id = "g71EndScreen";
    box.style.cssText = "flex:1;min-height:0;overflow-y:auto;display:flex;align-items:center;justify-content:center;padding:16px;background:#FFF7E8;";
    var lis = lines.map(function (l) { return "<p style=\"margin:6px 0;\">" + escHtml(l) + "</p>"; }).join("");
    box.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:28px 24px;text-align:center;max-width:520px;width:100%;margin:auto;">'
      + '<h2 style="margin-top:0;">' + escHtml(title) + "</h2>" + lis
      + '<div class="row" style="justify-content:center;"><button class="btn btn-primary" id="g71Replay">Chơi lại</button>'
      + '<button class="btn" id="g71Back">Về khu Trò chơi</button></div></div>';
    if (st && st.el) st.el.appendChild(box);
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
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.quadraticCurveTo(-s * 2.0, -s * 0.5, -s * 2.2, s * 0.2);
    ctx.quadraticCurveTo(-s * 1.4, s * 0.3, -s * 0.9, s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#F59E0B";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.9, -s * 1.4, -s * 0.2, -s * 1.7);
    ctx.quadraticCurveTo(s * 0.3, -s * 1.2, s * 0.2, -s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#312E81";
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.42, s * 0.45, s * 0.16, -0.3, 0, Math.PI * 2); ctx.fill(); /* v114: điểm sáng trên-trái */
    ctx.fillStyle = "#FDE68A";
    ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.2, s * 0.65, s * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#312E81";
    ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.55, s * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 1.05); ctx.lineTo(s * 0.75, -s * 1.55); ctx.lineTo(s * 0.95, -s * 1.0); ctx.closePath();
    ctx.moveTo(s * 1.05, -s * 1.05); ctx.lineTo(s * 1.25, -s * 1.5); ctx.lineTo(s * 1.4, -s * 0.95); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#FDE68A";
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
  /* Nền vũ trụ tranh màu nước theo ART_DIRECTION.md (v101, làm lại giao
     diện Luyện Gõ theo phán quyết của Bùi 06/11): CHỈ dùng màu trong hệ
     chàm + hổ phách + teal — không còn #7DD3FC/#A78BFA/#F472B6, hành
     tinh nâu #C98A5B hay hành tinh xám; gradient 4 điểm toàn chàm,
     quầng chân trời teal + dải hổ phách, tinh vân đốm nhỏ alpha thấp,
     sao dịu lại, 2 hành tinh đúng bảng (chàm + hổ phách đậm) có vành
     hổ phách, bóng lưỡi liềm, điểm sáng trắng trên-trái. */
  function paintSpace(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04060F"); g.addColorStop(0.45, "#0B1030");
    g.addColorStop(0.8, "#1E1B4B"); g.addColorStop(1, "#312E81");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Quầng chân trời teal + dải hổ phách ấm (ánh sáng trên-trái,
       chiều sâu: xa mờ, gần rõ). */
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#0D9488";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.94, W * 0.55, H * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.97, W * 0.42, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    /* Tinh vân: đốm nhỏ mềm, CHỈ màu trong bảng hệ (chàm nhạt / teal /
       hổ phách / vàng nhạt) — watercolor vẽ ở alpha 0.16. */
    watercolor(ctx, W, H, [
      { x: 0.16, y: 0.18, rx: 0.07, ry: 0.05, c: "#A5B4FC" },
      { x: 0.3, y: 0.42, rx: 0.05, ry: 0.04, c: "#0D9488" },
      { x: 0.62, y: 0.12, rx: 0.06, ry: 0.04, c: "#F59E0B" },
      { x: 0.78, y: 0.55, rx: 0.08, ry: 0.05, c: "#0D9488" },
      { x: 0.45, y: 0.72, rx: 0.06, ry: 0.04, c: "#C7D2FE" },
      { x: 0.9, y: 0.85, rx: 0.05, ry: 0.04, c: "#FBBF24" },
      { x: 0.08, y: 0.88, rx: 0.06, ry: 0.04, c: "#A5B4FC" },
      { x: 0.55, y: 0.35, rx: 0.04, ry: 0.03, c: "#FDE68A" }
    ]);
    /* Sao trôi chậm xuống (cảm giác bay về phía trước) + sao lớn lấp lánh.
       Sao dịu lại so với v83 để không át viên từ. */
    ctx.fillStyle = "#fff";
    for (var s = 0; s < 70; s++) {
      var sx = (s * 97) % W, sy = ((s * 57) + (t || 0) * 0.004) % H;
      var big = (s % 7 === 0);
      ctx.globalAlpha = big ? 0.85 : 0.25 + ((s * 13) % 10) / 25;
      var sz = big ? 2.5 : 1.5;
      ctx.fillRect(sx, sy, sz, sz);
      if (big) { /* tia sáng chữ thập cho sao lớn */
        ctx.globalAlpha = 0.45;
        ctx.fillRect(sx - 3, sy + 1, 8, 1);
        ctx.fillRect(sx + 1, sy - 3, 1, 8);
      }
    }
    ctx.globalAlpha = 1;
    /* v102: BỎ hẳn hai hành tinh có vành — kiểm render v101 vẫn đọc
       chúng là clip-art (hình vành Thổ Tinh) dù đã đổi đúng màu hệ;
       chiều sâu giữ bằng gradient + quầng chân trời + tinh vân + sao. */
  }
  function paintSky(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#C7D2FE"); g.addColorStop(1, "#FFFBEB");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Mặt trời + quầng sáng. */
    ctx.fillStyle = "rgba(253,230,138,.35)";
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.12, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.12, 26, 0, Math.PI * 2); ctx.fill();
    /* Mây xa mờ. */
    ctx.globalAlpha = 0.55;
    drawCloudWide(ctx, W * 0.22, H * 0.1, 46, 20);
    drawCloudWide(ctx, W * 0.6, H * 0.06, 36, 16);
    ctx.globalAlpha = 1;
    /* Núi xa 2 lớp ở chân trời. */
    ctx.fillStyle = "rgba(165,180,252,.55)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 24) ctx.lineTo(x, H * 0.88 + Math.sin(x / 60) * H * 0.03);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(13,148,136,.35)";
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
  /* v105: bien sau co chieu sau that (xa — giua — gan), dung he mau
     chàm + hổ phách + teal cua ART_DIRECTION.md cho san hô/rong bien/
     cá, xanh bien chi o gradient nuoc: mat nuoc sang tren, day bien
     chàm đậm duoi; tia sang, da xa mo, ca nhieu lop, san hô + rong
     bien tien canh o hai goc day, cat + soi, bot khi noi. Vi tri
     xac dinh theo chi so (khong random moi khung) de khong nhap nhay. */
  function paintSea(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4A90C2"); g.addColorStop(0.45, "#2A6BA0");
    g.addColorStop(0.75, "#1D4E89"); g.addColorStop(1, "#0B1B3A");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Lop xa: da + san hô mo o chan troi (xa mo, gan ro). */
    ctx.fillStyle = "rgba(11,27,58,.35)";
    [[0.08, 0.3, 0.16], [0.3, 0.22, 0.12], [0.55, 0.34, 0.18], [0.78, 0.26, 0.13], [0.94, 0.3, 0.1]].forEach(function (r) {
      ctx.beginPath();
      ctx.ellipse(W * r[0], H * 0.86, W * r[2], H * r[1] * 0.5, 0, Math.PI, 0);
      ctx.fill();
    });
    /* Tia sang tu mat nuoc — rong, mem, lac nhe. */
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
    ctx.fillStyle = "rgba(253,230,138,.07)";
    ctx.beginPath();
    ctx.moveTo(W * 0.34 + Math.sin(t / 2000) * 8 - 12, 0);
    ctx.lineTo(W * 0.34 + Math.sin(t / 2000) * 8 + 12, 0);
    ctx.lineTo(W * 0.34 + Math.sin(t / 2000) * 8 + 30, H * 0.4);
    ctx.lineTo(W * 0.34 + Math.sin(t / 2000) * 8 - 2, H * 0.4);
    ctx.closePath(); ctx.fill();
    /* Ca nhieu lop: xa nho mo, gan to ro — boi ngang, lac nhe. */
    function fish(fx, fy, len, alpha, dir, wob) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(fx, fy + Math.sin(t / 1300 + wob) * 4);
      ctx.scale(dir, 1);
      ctx.fillStyle = "#0B1030";
      ctx.beginPath(); ctx.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-len * 0.85, 0); ctx.lineTo(-len * 1.4, -len * 0.5); ctx.lineTo(-len * 1.4, len * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath(); ctx.arc(len * 0.45, -len * 0.08, len * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    fish(W * 0.3 + Math.sin(t / 2600) * 14, H * 0.28, 9, 0.35, 1, 0);
    fish(W * 0.68 - Math.sin(t / 2400 + 2) * 14, H * 0.42, 11, 0.45, -1, 2);
    fish(W * 0.82 + Math.sin(t / 3000 + 4) * 18, H * 0.2, 8, 0.3, -1, 4);
    fish(W * 0.16 + Math.sin(t / 2200 + 1) * 16, H * 0.55, 15, 0.65, 1, 1);
    fish(W * 0.58 - Math.sin(t / 2800 + 3) * 12, H * 0.62, 13, 0.55, -1, 3);
    /* Hat phu du troi. */
    ctx.fillStyle = "rgba(255,255,255,.35)";
    for (var pd = 0; pd < 14; pd++) {
      var px = (pd * 67 + 20) % W, py = ((pd * 53) + (t || 0) * 0.006) % H;
      ctx.beginPath(); ctx.arc(px, py, pd % 3 === 0 ? 2 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
    /* Day bien: cat + bong mo + soi. */
    ctx.fillStyle = "#E7C98B";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H + 18, W * 0.62, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(11,27,58,.18)";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H + 6, W * 0.5, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(30,27,75,.35)";
    [[0.3, 0.93], [0.62, 0.95], [0.45, 0.97]].forEach(function (sp) {
      ctx.beginPath(); ctx.ellipse(W * sp[0], H * sp[1], 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    });
    /* Tien canh: san hô ho phach + teal o hai goc day, rong bien teal
       dung dua giua cac khe — khung canh, khong che bong bong. */
    function coral(bx, base, s, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = "round";
      [-1, -0.4, 0.3, 1].forEach(function (k, i) {
        var sway2 = Math.sin(t / 1100 + i * 1.7 + bx) * 5;
        ctx.beginPath();
        ctx.moveTo(bx, base);
        ctx.quadraticCurveTo(bx + k * 8 + sway2, base - s * 0.5, bx + k * 16 + sway2 * 1.5, base - s * (0.7 + (i % 2) * 0.25));
        ctx.stroke();
      });
    }
    coral(W * 0.06, H - 6, 52, "#F59E0B");
    coral(W * 0.13, H - 4, 38, "#0D9488");
    coral(W * 0.94, H - 6, 56, "#0D9488");
    coral(W * 0.87, H - 4, 40, "#F59E0B");
    ctx.strokeStyle = "#0D9488"; ctx.lineWidth = 5; ctx.lineCap = "round";
    [0.22, 0.78].forEach(function (sx, i) {
      var sway3 = Math.sin(t / 1100 + i * 1.7) * 8;
      var base = H - 8;
      ctx.beginPath();
      ctx.moveTo(W * sx, base);
      ctx.quadraticCurveTo(W * sx + sway3, base - 40, W * sx + sway3 * 1.6, base - 74 - (i % 2) * 14);
      ctx.stroke();
    });
    /* Bot khi nho noi len. */
    ctx.fillStyle = "rgba(255,255,255,.5)";
    for (var b = 0; b < 10; b++) {
      var by = H - ((t / 22 + b * 90) % H);
      ctx.beginPath(); ctx.arc(W * (0.1 + b * 0.09), by, b % 3 === 0 ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  window.G71 = {
    escHtml: escHtml, shuffle: shuffle, pool: pool,
    trackKey: trackKey, pinyinPlain: pinyinPlain, trackSets: trackSets,
    trackPool: pool, isTypeable: isTypeable,
    isSingleLetter: isSingleLetter, stripDiacritics: stripDiacritics, displayWord: displayWord,
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
