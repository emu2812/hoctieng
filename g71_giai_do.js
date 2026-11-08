/* G71 — Giải Đố (v116, thay Đấu Bài theo lệnh Bùi 16:50 08/11).
   Luật lõi: máy đưa ra câu hỏi, người học GÕ đáp án (ô nhập thật =
   bàn phím gốc trên điện thoại, bàn phím vật lý trên máy tính; KHÔNG
   vẽ bàn phím). Câu hỏi lấy từ kho từ/câu THẬT theo track đang học:
   (a) cho nghĩa Việt → gõ từ; (b) cho câu thiếu từ → gõ từ còn thiếu.
   Cách nhập theo hệ chữ: EN/TC gõ chữ cái, ZH gõ pinyin (không dấu,
   như bước gõ từ vựng), TP chạm/bấm các âm tiết Hangul theo thứ tự.
   Game thật: đúng +10 điểm (chuỗi đúng từ 3 câu trở lên +15), sai mất
   1 tim, 3 tim, hết tim thua; một lượt 10 câu, có màn thắng/thua, XP
   cộng chung web qua endScreen (+10 khi thắng). Từ trả lời sai vào
   Sổ lỗi sai qua recordGameMiss như Luyện Gõ.
   Logic thuần (không cần canvas) để probe kiểm tra được. */
(function () {
  "use strict";

  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  /* Câu ví dụ có chứa đúng từ mục tiêu không (để làm câu thiếu từ)?
     EN/TC: khớp nguyên từ (ranh giới từ, không phân biệt hoa thường).
     ZH: câu chứa đúng chữ Hán; TP: câu chứa đúng từ Hangul. */
  function sentenceHasWord(ex, wd, track) {
    if (!ex) return false;
    if (track === "zh" || track === "tp") return ex.indexOf(wd.w) >= 0;
    try {
      var re = new RegExp("\\b" + escapeRegExp(wd.w) + "\\b", "i");
      return re.test(ex);
    } catch (e) { return false; }
  }
  /* Che đúng từ mục tiêu trong câu ví dụ bằng "______" (chỉ chỗ đầu tiên). */
  function blankWord(ex, wd, track) {
    if (track === "zh" || track === "tp") return String(ex).replace(wd.w, "______");
    try {
      var re = new RegExp("\\b" + escapeRegExp(wd.w) + "\\b", "i");
      return String(ex).replace(re, "______");
    } catch (e) { return String(ex); }
  }
  /* Chuẩn hoá đáp án để so sánh: chữ thường, gọn khoảng trắng; ZH bỏ
     dấu thanh điệu (gõ "nv" hay "nǚ" đều khớp "nv"); EN/TC bỏ dấu câu
     cuối. Hai vế (đáp án gõ + đáp án đúng) đều qua hàm này. */
  function normalizeAnswer(raw, track) {
    var s = String(raw || "").trim().toLowerCase();
    if (track === "zh") {
      try { s = G71.pinyinPlain(s); } catch (e) {}
      s = s.replace(/\s+/g, "");
    } else if (track === "tp") {
      s = s.replace(/\s+/g, "");
    } else {
      s = s.replace(/\s+/g, " ").replace(/[.,!?;:]+$/g, "");
    }
    return s;
  }
  /* Tách từ Hangul thành từng âm tiết (mỗi âm tiết là 1 ký tự BMP). */
  function syllablesOf(w) { return String(w || "").split(""); }

  /* Xây 10 câu hỏi từ kho thật của track đang học. Tối đa 5 câu thiếu
     từ (chỉ khi câu ví dụ chứa đúng từ mục tiêu), còn lại là câu hỏi
     nghĩa. Trả về mảng câu hỏi; kho thiếu thì trả ít hơn, hết kho thì []. */
  function buildQuestions() {
    var track = "en";
    try { track = (typeof G71 !== "undefined" && G71.trackKey) ? (G71.trackKey() || "en") : "en"; } catch (e) {}
    var got = { words: [], theme: "" };
    try { got = G71.pickTypingWords(30) || got; } catch (e) {}
    var words = G71.shuffle((got.words || []).slice());
    var qs = [], gaps = 0;
    for (var i = 0; i < words.length && qs.length < 10; i++) {
      var wd = words[i];
      if (!wd || !wd.w || !wd.vi) continue;
      var gapOk = sentenceHasWord(wd.ex || "", wd, track);
      var kind = (gapOk && gaps < 5) ? "gap" : "meaning";
      if (kind === "gap") gaps++;
      var q = { kind: kind, w: wd.w, vi: wd.vi, type: wd.type || wd.w, py: wd.py || "",
        col: wd.col || "", ex: wd.ex || "", theme: got.theme || "" };
      /* Đáp án đúng (dạng gõ/bấm): EN/TC = từ; ZH = pinyin không dấu;
         TP = từ Hangul (ghép từ các âm tiết). */
      q.answer = (track === "tp") ? q.w : q.type;
      q.prompt = (kind === "gap") ? blankWord(q.ex, wd, track) : q.vi;
      /* Cách hiển thị đáp án đúng khi sửa sai: ZH kèm pinyin có dấu. */
      q.display = (track === "zh" && q.py) ? (q.w + " (" + q.py + ")") : q.w;
      qs.push(q);
    }
    return qs;
  }

  /* v117 P3a + v117b L2: CHAP NHAN BIEN THE DUNG NGHIA. Hai co che, ca
     hai deu kiem chung duoc tu du lieu that, khong doan:
     (1) BANG BIEN SOAN (cap doi da gap that khi kiem render — chi them
         cap khi gap that tren ban that): guidebook<->guide,
         excursion<->trip, secondhand<->used (Bui gap 08/11: go "used"
         cho cau secondhand bi cham sai), happy<->glad, journey<->trip.
         Dap an go dung nghia nhung khac tu chuan van duoc tinh dung,
         kem ghi chu dap an chuan.
     (2) CUNG NGHIA VIET TRONG KHO (acceptFn do start() xay tu TOAN BO
         kho cua track — v117b: truoc day chi xay tu 30 tu cua luot
         choi nen tu dung nghia nam ngoai luot khong bao gio duoc chap
         nhan): tu go nam trong kho va co nghia Viet Y HET nghia cua
         cau hoi thi duoc tinh dung.
     Khong chap nhan: tu ngoai kho, tu gan dung chinh ta, tu khac nghia. */
  var SYN_PAIRS = [["guidebook", "guide"], ["excursion", "trip"], ["secondhand", "used"], ["happy", "glad"], ["journey", "trip"]];
  function synonymOf(ans, given, track) {
    var a = normalizeAnswer(ans, track), g = normalizeAnswer(given, track);
    if (!a || !g || a === g) return false;
    for (var i = 0; i < SYN_PAIRS.length; i++) {
      var p0 = normalizeAnswer(SYN_PAIRS[i][0], track), p1 = normalizeAnswer(SYN_PAIRS[i][1], track);
      if ((p0 === a && p1 === g) || (p1 === a && p0 === g)) return true;
    }
    return false;
  }

  var LOGIC = {
    TOTAL: 10,
    createState: function (qs) {
      return { qs: qs || [], idx: 0, hearts: 3, score: 0, combo: 0, bestCombo: 0,
        correct: 0, answered: 0, over: null, phase: "ask",
        last: null, missed: [] };
    },
    current: function (st) { return st.qs[st.idx] || null; },
    normalizeAnswer: normalizeAnswer,
    syllablesOf: syllablesOf,
    /* Nộp đáp án cho câu hiện tại. Đúng +10 (chuỗi đúng >= 3 thì +15);
       sai mất 1 tim, hết tim thua ngay (màn thua hiện sau khi xem sửa
       sai). Trả về {ok, correct}; chỉ nhận khi đang ở phase "ask". */
    submit: function (st, raw, track, acceptFn) {
      if (!st || st.over || st.phase !== "ask") return { ok: false };
      var q = st.qs[st.idx];
      if (!q) return { ok: false };
      var given = normalizeAnswer(raw, track);
      var want = normalizeAnswer(q.answer, track);
      var correct = given.length > 0 && given === want;
      var viaSyn = false;
      if (!correct && given.length > 0) {
        if (synonymOf(q.answer, raw, track)) { correct = true; viaSyn = true; }
        else if (typeof acceptFn === "function") {
          try { if (acceptFn(given, want, q)) { correct = true; viaSyn = true; } } catch (e) {}
        }
      }
      st.answered++;
      if (correct) {
        st.correct++;
        st.combo++;
        if (st.combo > st.bestCombo) st.bestCombo = st.combo;
        st.score += (st.combo >= 3 ? 15 : 10);
      } else {
        st.combo = 0;
        st.hearts--;
        st.missed.push(q.w);
        if (st.hearts <= 0) st.over = "lose";
      }
      st.phase = "feedback";
      st.last = { correct: correct, given: String(raw == null ? "" : raw), answer: q.answer, display: q.display, viaSynonym: viaSyn };
      return { ok: true, correct: correct, viaSynonym: viaSyn };
    },
    /* Sang câu tiếp sau khi đã xem sửa sai. Hết 10 câu mà còn tim thì
       thắng. Trả về true nếu đã sang câu mới, false nếu trận đã kết thúc. */
    next: function (st) {
      if (!st || st.over) return false;
      if (st.phase !== "feedback") return false;
      if (st.idx + 1 >= st.qs.length) { st.over = "win"; return false; }
      st.idx++;
      st.phase = "ask";
      st.last = null;
      return true;
    }
  };

  function start() {
    var qs = buildQuestions();
    if (!qs.length) { try { toast("Chưa có từ vựng để chơi."); } catch (e) {} return; }
    var st = LOGIC.createState(qs);
    window.G71GiaiDo._st = st; /* trạng thái trận đang chạy (cho probe kiểm tra) */
    var running = true;
    var advTimer = null;
    var track = "en";
    try { track = (typeof G71 !== "undefined" && G71.trackKey) ? (G71.trackKey() || "en") : "en"; } catch (e) {}
    var isTp = (track === "tp");
    var stg = G71.openStage("❓ Giải Đố", function () {
      running = false;
      if (advTimer) { try { clearTimeout(advTimer); } catch (e) {} advTimer = null; }
    }, "Máy đưa ra câu hỏi, bạn gõ đáp án. Câu hỏi từ kho từ/câu thật theo bài đang học: cho nghĩa Việt thì gõ từ, cho câu thiếu từ thì gõ từ còn thiếu. Đúng +10 điểm (chuỗi đúng từ 3 câu trở lên +15), sai mất 1 tim, hết 3 tim là thua. Dưới mỗi câu có gợi ý độ dài từ + chữ cái đầu.");
    var cv = stg.canvas, ctx = stg.ctx;
    if (!ctx) { stg.hud.innerHTML = "<p>Trình duyệt này chưa hỗ trợ canvas.</p>"; return; }

    /* ---- Thẻ câu hỏi (DOM trên nền trời vẽ canvas) ---- */
    var card = document.createElement("div");
    card.id = "gdCard";
    card.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;z-index:2;";
    card.innerHTML = '<div style="background:#fff;border:2px solid #F3D9A4;border-radius:20px;box-shadow:0 8px 30px rgba(4,6,15,.18);padding:22px 20px;max-width:560px;width:100%;">'
      + '<p class="eyebrow" id="gdEyebrow" style="margin:0 0 8px;"></p>'
      + '<div id="gdPrompt" style="font-size:22px;line-height:1.5;font-weight:700;color:#1E1B4B;"></div>'
      + '<div id="gdHint" class="mut" style="margin-top:6px;font-size:15px;"></div>'
      + '<div id="gdInputRow" style="margin-top:16px;"></div>'
      + '<div id="gdFeedback" style="margin-top:14px;"></div>'
      + '</div>';
    stg.wrap.appendChild(card);
    var eyebrowEl = card.querySelector("#gdEyebrow");
    var promptEl = card.querySelector("#gdPrompt");
    var hintEl = card.querySelector("#gdHint");
    var inputRow = card.querySelector("#gdInputRow");
    var feedbackEl = card.querySelector("#gdFeedback");

    /* Ô nhập thật (EN/TC/ZH): lang + inputmode theo track để bàn phím
       gốc mở đúng ngôn ngữ, như Luyện Gõ v101/v113. TP dùng chip âm
       tiết thay cho ô nhập. */
    var typeInput = null, submitBtn = null;
    var chips = [], placed = []; /* TP: chips = [{ch, idx, used}], placed = [chipIdx...] */
    var chipsBox = null, chipsAns = null;
    if (!isTp) {
      typeInput = document.createElement("input");
      typeInput.id = "gdAnswer";
      typeInput.setAttribute("lang", track === "zh" ? "zh-Latn" : "en");
      typeInput.setAttribute("inputmode", "latin");
      typeInput.setAttribute("autocapitalize", "off");
      typeInput.setAttribute("autocorrect", "off");
      typeInput.setAttribute("autocomplete", "off");
      typeInput.setAttribute("spellcheck", "false");
      typeInput.setAttribute("placeholder", "Gõ đáp án rồi bấm Trả lời");
      typeInput.style.cssText = "display:block;width:100%;padding:10px 14px;font-size:17px;color:#1E1B4B;background:#fff;border:2px solid #C7D2FE;border-radius:20px;outline:none;box-sizing:border-box;";
      submitBtn = document.createElement("button");
      submitBtn.id = "gdSubmit";
      submitBtn.className = "btn btn-primary";
      submitBtn.textContent = "Trả lời →";
      submitBtn.style.cssText = "margin-top:10px;";
      inputRow.appendChild(typeInput);
      inputRow.appendChild(submitBtn);
      typeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); doSubmit(); }
      });
      submitBtn.onclick = doSubmit;
    } else {
      chipsBox = document.createElement("div");
      chipsBox.id = "gdChips";
      chipsAns = document.createElement("div");
      chipsAns.id = "gdAssembled";
      chipsAns.style.cssText = "min-height:48px;font-size:26px;font-weight:700;color:#1E1B4B;text-align:center;border-bottom:2px dashed #C7D2FE;padding:4px 0 8px;margin-bottom:10px;";
      submitBtn = document.createElement("button");
      submitBtn.id = "gdSubmit";
      submitBtn.className = "btn btn-primary";
      submitBtn.textContent = "Trả lời ✓";
      submitBtn.style.cssText = "margin-top:10px;";
      submitBtn.disabled = true;
      inputRow.appendChild(chipsAns);
      inputRow.appendChild(chipsBox);
      inputRow.appendChild(submitBtn);
      submitBtn.onclick = doSubmit;
    }

    var lastHud = { idx: -1, hearts: -1, score: -1, combo: -1 };
    function hud() {
      if (st.idx === lastHud.idx && st.hearts === lastHud.hearts && st.score === lastHud.score && st.combo === lastHud.combo) return;
      lastHud.idx = st.idx; lastHud.hearts = st.hearts; lastHud.score = st.score; lastHud.combo = st.combo;
      stg.hud.innerHTML = "<span style=\"flex:none\">Câu " + (st.idx + 1) + "/" + st.qs.length + "</span>"
        + "<span style=\"flex:none\">Điểm: " + st.score + "</span>"
        + (st.combo >= 2 ? "<span style=\"flex:none\">Combo ×" + st.combo + "</span>" : "")
        + "<span style=\"flex:1\"></span>"
        + "<span style=\"flex:none\">" + G71.hearts(st.hearts) + "</span>";
    }
    hud();

    function renderQuestion() {
      var q = LOGIC.current(st);
      if (!q) return;
      eyebrowEl.textContent = "CÂU " + (st.idx + 1) + "/" + st.qs.length
        + (q.theme ? " · " + q.theme : "")
        + (q.kind === "gap" ? " · Điền từ còn thiếu" : " · Nghĩa là gì?");
      /* v117 P3a: goi y do dai + chu dau de khong phai doan mo — dap an
         la chuoi go/bam (EN/TC: tu; ZH: pinyin; TP: am tiet Hangul). */
      var __ans = q.answer || "";
      var __n = __ans.length, __first = __ans.charAt(0);
      var __unit = (track === "tp") ? "âm tiết" : (track === "zh" ? "chữ cái pinyin" : "chữ cái");
      var __hint = "Gợi ý: từ có " + __n + " " + __unit + ", bắt đầu bằng '" + __first + "'.";
      if (q.kind === "gap") {
        promptEl.textContent = q.prompt;
        hintEl.textContent = "Điền từ còn thiếu vào chỗ trống. " + __hint;
      } else if (track === "zh") {
        /* ZH: hiện chữ Hán to + nghĩa Việt — đáp án cần gõ là pinyin. */
        promptEl.innerHTML = '<span style="font-size:44px;">' + G71.escHtml(q.w) + '</span>'
          + '<span style="display:block;font-size:20px;margin-top:4px;">' + G71.escHtml(q.vi) + '</span>';
        hintEl.textContent = "Gõ pinyin của chữ Hán trên (không dấu). " + __hint;
      } else {
        promptEl.textContent = q.vi;
        hintEl.textContent = "Gõ từ có nghĩa trên. " + __hint;
      }
      feedbackEl.innerHTML = "";
      if (!isTp) {
        typeInput.value = "";
        typeInput.disabled = false;
        submitBtn.disabled = false;
        try { typeInput.focus(); } catch (e) {}
      } else {
        /* TP: xáo các âm tiết của từ đáp án thành chip để bấm theo thứ tự. */
        var syls = LOGIC.syllablesOf(q.answer);
        chips = G71.shuffle(syls.map(function (ch, i) { return { ch: ch, idx: i, used: false }; }));
        placed = [];
        renderChips();
        submitBtn.disabled = true;
      }
      hud();
    }
    function renderChips() {
      if (!chipsBox) return;
      chipsAns.textContent = placed.map(function (ci) { return chips[ci].ch; }).join("") || " ";
      chipsBox.innerHTML = "";
      chips.forEach(function (c, ci) {
        var b = document.createElement("button");
        b.className = "btn";
        b.setAttribute("data-gd-chip", String(ci));
        b.textContent = c.ch;
        b.disabled = c.used;
        b.style.cssText = "min-width:52px;font-size:22px;padding:8px 10px;margin:4px;"
          + (c.used ? "background:#FDE68A;border-color:#F59E0B;" : "background:#fff;border-color:#C7D2FE;");
        b.onclick = function () {
          if (st.phase !== "ask" || c.used) return;
          c.used = true;
          placed.push(ci);
          renderChips();
          if (placed.length >= chips.length) submitBtn.disabled = false;
        };
        chipsBox.appendChild(b);
      });
      /* Bấm vào đáp án đã ghép để gỡ âm tiết cuối (sửa thứ tự). */
      chipsAns.style.cursor = placed.length ? "pointer" : "default";
      chipsAns.onclick = function () {
        if (st.phase !== "ask" || !placed.length) return;
        var last = placed.pop();
        chips[last].used = false;
        renderChips();
        submitBtn.disabled = true;
      };
    }
    function assembledAnswer() {
      return placed.map(function (ci) { return chips[ci].ch; }).join("");
    }

    /* v117b L2: acceptFn — tu go la tu trong TOAN BO kho cua track
       (G71.pool) va co nghia Viet Y HET nghia cua cau hoi thi tinh
       dung. v117 chi xay tu 30 tu cua luot nen tu dung nghia nam
       ngoai luot (vd "used" cho cau secondhand) khong bao gio duoc
       chap nhan. Roi ve 30 tu neu pool khong co (moi truong probe cu). */
    var byVi = {};
    (function () {
      try {
        var all = null;
        try { all = (typeof G71.pool === "function") ? G71.pool() : null; } catch (e) {}
        var list = (all && all.length) ? all : ((G71.pickTypingWords(30) || { words: [] }).words || []);
        list.forEach(function (wd) {
          var k = String(wd.vi || "").trim();
          if (!k) return;
          (byVi[k] = byVi[k] || []).push(wd);
        });
      } catch (e) {}
    })();
    function acceptFn(given, want, q) {
      var cands = byVi[String(q.vi || "").trim()] || [];
      for (var i = 0; i < cands.length; i++) {
        if (normalizeAnswer(cands[i].type || cands[i].w, track) === given) return true;
      }
      return false;
    }
    window.G71GiaiDo._acceptFn = acceptFn; /* v117b L2: cho probe kiem tra bang dong nghia that */
    function doSubmit() {
      if (!running || st.over || st.phase !== "ask") return;
      var raw = isTp ? assembledAnswer() : (typeInput ? typeInput.value : "");
      if (!isTp && !String(raw || "").trim()) { try { typeInput.focus(); } catch (e) {} return; }
      if (isTp && placed.length < chips.length) return;
      var r = LOGIC.submit(st, raw, track, acceptFn);
      if (!r.ok) return;
      if (!isTp) { typeInput.disabled = true; submitBtn.disabled = true; }
      else submitBtn.disabled = true;
      showFeedback(r.correct);
      hud();
      if (r.correct && !st.over) {
        /* Đúng: hiện "Đúng rồi" rồi tự sang câu tiếp sau 900ms. */
        if (advTimer) { try { clearTimeout(advTimer); } catch (e) {} }
        advTimer = setTimeout(function () {
          advTimer = null;
          if (!running || st.phase !== "feedback") return;
          advance();
        }, 900);
      }
    }
    function showFeedback(correct) {
      var q = LOGIC.current(st);
      var last = st.last || {};
      var html = "";
      if (correct) {
        var pts = (st.combo >= 3 ? 15 : 10);
        html = '<div style="background:#ECFDF5;border:2px solid #0D9488;border-radius:16px;padding:12px 14px;">'
          + '<b style="color:#0D9488;">✅ Đúng rồi! +' + pts + ' điểm'
          + (st.combo >= 3 ? ' · Combo ×' + st.combo : '') + '</b>'
          + (last.viaSynonym ? '<div style="margin-top:4px;">Bạn gõ \'' + G71.escHtml(last.given) + '\' — cũng đúng nghĩa; đáp án chuẩn là <b>' + G71.escHtml(last.display || q.answer) + '</b>.</div>' : '')
          + '</div>';
      } else {
        html = '<div style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:16px;padding:12px 14px;">'
          + '<b style="color:#92400E;">❌ Chưa đúng.</b> Đáp án: <b>' + G71.escHtml(last.display || q.answer) + '</b>'
          + ' — ' + G71.escHtml(q.vi);
        if (q.kind === "gap" && q.ex) {
          html += '<div style="margin-top:6px;">Câu đầy đủ: ' + G71.escHtml(q.ex) + '</div>';
        }
        html += '</div>';
      }
      var isLast = st.over || st.idx >= st.qs.length - 1;
      html += '<div class="row" style="margin-top:10px;"><button class="btn btn-primary" id="gdNext">'
        + (isLast ? "Xem kết quả →" : "Câu tiếp →") + '</button></div>';
      feedbackEl.innerHTML = html;
      var nb = feedbackEl.querySelector("#gdNext");
      if (nb) nb.onclick = function () {
        if (advTimer) { try { clearTimeout(advTimer); } catch (e) {} advTimer = null; }
        advance();
      };
    }
    function advance() {
      if (!running) return;
      if (st.over) { maybeEnd(); return; }
      if (LOGIC.next(st)) renderQuestion();
      else maybeEnd();
    }

    var ended = false;
    function maybeEnd() {
      if (ended || !st.over) return;
      ended = true;
      running = false;
      if (advTimer) { try { clearTimeout(advTimer); } catch (e) {} advTimer = null; }
      /* Từ trả lời sai vào Sổ lỗi sai (như Luyện Gõ ghi từ rơi). */
      try {
        if (typeof recordGameMiss === "function") {
          (st.missed || []).forEach(function (wd) { recordGameMiss(wd, "giai-do"); });
        }
      } catch (e) {}
      var lines = ["Đúng " + st.correct + "/" + st.qs.length + " câu · Điểm: " + st.score + ".",
        "Combo cao nhất: ×" + st.bestCombo + "."];
      if (st.over === "win") {
        G71.endScreen(stg, true, "🎉 Thắng rồi!", lines, start);
      } else {
        G71.endScreen(stg, false, "Hết tim rồi!", lines, start);
      }
    }

    renderQuestion();

    var t0 = 0;
    function frame(now) {
      if (!running) return;
      var W = cv.width, H = cv.height;
      if (W && H) {
        var t = now || 0;
        ctx.clearRect(0, 0, W, H);
        G71.paintSky(ctx, W, H, t);
        /* Rồng linh vật bay lượn nhẹ ở góc trên (trang trí, không che thẻ). */
        var bob = Math.sin(t / 900) * 6;
        var dx = W * 0.12 + Math.sin(t / 2600) * 8;
        G71.drawDragon(ctx, dx, H * 0.16 + bob, Math.max(18, Math.min(30, W * 0.05)));
        /* Mây trôi chậm (trang trí, xa mờ). */
        ctx.globalAlpha = 0.5;
        G71.drawCloudWide(ctx, ((t / 90) % (W + 240)) - 120, H * 0.82, 42, 18);
        G71.drawCloudWide(ctx, W - (((t / 120) % (W + 240)) - 120), H * 0.9, 34, 15);
        ctx.globalAlpha = 1;
      }
      if (running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    void t0;
  }

  window.G71GiaiDo = { start: start, logic: LOGIC, buildQuestions: buildQuestions };
})();
