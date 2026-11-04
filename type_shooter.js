/* ---------- BẮN TỪ RƠI — TYPING SHOOTER (nháp, chưa gắn hub) ----------
   Game mới theo chuẩn tối thiểu Bùi chốt 19:15 04/11: cảnh chơi toàn màn
   hình thật sự có HUD (điểm, mốc level, 3 tim, nút tạm dừng/âm thanh) +
   cơ chế chơi rõ (từ rơi, gõ để bắn). Chỉ học CẤU TRÚC của ảnh tham khảo
   (HUD + từ rơi + súng ở đáy), KHÔNG chép hình/chim linh vật/chữ của
   game nào: cảnh vũ trụ tự vẽ bằng canvas, nhân vật dẫn đường là chân
   dung đã duyệt dùng chung với 2 game v64.
   Luật: từ rơi từ trên xuống, lấy từ bank gốc CONTENT.vocab qua adapter
   (chỉ đọc, không copy bank; từ tiếng Anh 3–8 chữ cái). Gõ đúng hết một
   từ thì bắn rơi từ đó và cộng điểm. Từ chạm đất thì mất 1 tim. Hết
   3 tim thì thua (thua trong game không trừ gì ở phần học). Qua hết
   danh sách từ thì thắng và nhận sao. Đây là KHU GAME nên có thắng thua
   và mất mạng theo đúng luật Bùi chốt 06:56 04/11.
   Âm thanh: chỉ giọng đọc trình duyệt khi bắn trúng (ghi rõ là giọng
   tổng hợp), có nút tắt tiếng, không tự phát trước khi người chơi hành
   động. Ảnh nhân vật lỗi thì tự ẩn, game không bao giờ vỡ. */
var TS_IMG_GUIDE = "assets/media-generation-npc-guide-portrait-0-91c329a7-065e-4e04-801e-63b953c59598.webp";
var TS_W = 360, TS_H = 480;
var TS_GROUND_Y = TS_H - 60;
var TS_WORDS_PER_LEVEL = 8;
var TS_LEVELS = 3;
var TS_BASE_SPEED = 32;
var TS_SPEED_PER_LEVEL = 10;
var TS_SPAWN_MS = 2200;
var TS_MAX_FALLING = 3;

/* ---------- Ảnh + hàm dùng chung (cùng kiểu word_adventure.js) ---------- */
var tsImgCache = {};
function tsImg(src) {
  if (tsImgCache[src]) return tsImgCache[src];
  var img = null;
  try { img = new Image(); img.src = src; } catch (e) { img = null; }
  tsImgCache[src] = img;
  return img;
}
function tsImgReady(img) { try { return !!(img && img.complete && img.naturalWidth > 0); } catch (e) { return false; } }
function tsGuideImgHTML(size) {
  var s = size || 96;
  return '<img src="' + TS_IMG_GUIDE + '" alt="Nhân vật dẫn đường" style="width:' + s + 'px;height:' + s + 'px;object-fit:cover;border-radius:50%;border:3px solid #D97706;flex:none" onerror="this.style.display=\'none\'">';
}
function tsEsc(t) {
  if (typeof esc === "function") return esc(t);
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function tsShuffle(a) {
  if (typeof gameShuffle === "function") return gameShuffle(a);
  var x = a.slice();
  for (var i = x.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = x[i]; x[i] = x[j]; x[j] = t; }
  return x;
}
function tsStarsFor(score) {
  if (typeof gameStarsFor === "function") { try { return gameStarsFor(score / 120); } catch (e) {} }
  if (score >= 200) return 3;
  if (score >= 100) return 2;
  if (score > 0) return 1;
  return 0;
}
/* Màn thưởng: luôn hiện đủ 3 ô sao để thấy thang 3 sao, rồi lấp từng sao
   một theo nhịp rõ ràng — cùng cách xử lý với 2 game v64. */
function tsRewardStarsHTML(stars) {
  var n = stars || 0;
  var out = '<p class="rw-stars" data-ts-stars-earned="' + n + '"><span class="mut">Thang 3 sao: </span>';
  for (var i = 0; i < 3; i++) out += '<span class="rw-star-slot" data-ts-star-slot="' + (i + 1) + '" style="font-size:34px">☆</span>';
  out += ' <span class="rw-star-count">' + n + '/3 sao</span></p>';
  return out;
}
function tsAnimateRewardStars() {
  var box = null;
  try { box = document.querySelector("[data-ts-stars-earned]"); } catch (e) { box = null; }
  if (!box) return;
  var earned = parseInt(box.getAttribute("data-ts-stars-earned"), 10) || 0;
  var slots = box.querySelectorAll("[data-ts-star-slot]");
  function fill(k) { for (var i = 0; i < slots.length; i++) if (i < k) slots[i].textContent = "⭐"; }
  for (var j = 0; j < earned; j++) (function (k) { setTimeout(function () { fill(k); }, 450 * k); })(j + 1);
  setTimeout(function () { fill(earned); }, 450 * earned + 200);
}

/* ---------- Content Adapter (chỉ đọc bank gốc, không copy) ---------- */
function tsAdapterItems(setIdx) {
  var s = (typeof CONTENT !== "undefined" && CONTENT.vocab) ? CONTENT.vocab[setIdx] : null;
  if (!s) return [];
  var out = [];
  (s.cards || []).forEach(function (c, i) {
    if (!c.w || !c.vi) return;
    out.push({
      content_id: "en-vocab-" + setIdx + "-" + i,
      language: "en",
      topic: s.topic || "",
      level: s.band || "",
      content_type: "vocab",
      source_text: c.w,
      translation_vi: c.vi,
      pronunciation: c.ipa || "",
      pinyin: "",
      romanization: "",
      audio_url: "",
      image_url: "",
      example: c.ex || "",
      explanation_vi: c.vi,
      source_url: "tab Luyện tập · bộ từ: " + (s.topic || ""),
      source_id: "vocab:" + setIdx
    });
  });
  return out;
}
function tsWordOk(w) { return /^[a-z]{3,8}$/.test(String(w || "").toLowerCase()); }
function tsSetCards(setIdx) {
  if (typeof vocabSetCards === "function") { try { return vocabSetCards(setIdx) || []; } catch (e) {} }
  var s = (typeof CONTENT !== "undefined" && CONTENT.vocab) ? CONTENT.vocab[setIdx] : null;
  return s ? (s.cards || []) : [];
}
function tsPickSets() {
  if (typeof CONTENT === "undefined" || !CONTENT.vocab) return [];
  var elig = [];
  for (var i = 0; i < CONTENT.vocab.length; i++) {
    var cards = tsSetCards(i);
    var nOk = 0;
    for (var j = 0; j < cards.length; j++) if (tsWordOk(cards[j].w)) nOk++;
    if (cards.length >= 12 && nOk >= TS_WORDS_PER_LEVEL) elig.push(i);
  }
  if (!elig.length) return elig;
  var out = [];
  var cur = -1;
  if (typeof gameCurrentVocabSet === "function") { try { cur = gameCurrentVocabSet(); } catch (e) { cur = -1; } }
  if (elig.indexOf(cur) >= 0) out.push(cur);
  var rest = tsShuffle(elig.filter(function (x) { return out.indexOf(x) < 0; }));
  for (var k = 0; k < rest.length && out.length < 3; k++) out.push(rest[k]);
  return out;
}

/* ---------- Trạng thái game ---------- */
function tsNewGame(l, setIdx) {
  var items = tsAdapterItems(setIdx).filter(function (it) { return tsWordOk(it.source_text); });
  var pool = tsShuffle(items).slice(0, TS_WORDS_PER_LEVEL * TS_LEVELS);
  var levels = Math.max(1, Math.ceil(pool.length / TS_WORDS_PER_LEVEL));
  l.ts = {
    phase: "intro",
    setIdx: setIdx,
    setTopic: (typeof CONTENT !== "undefined" && CONTENT.vocab && CONTENT.vocab[setIdx]) ? (CONTENT.vocab[setIdx].topic || "") : "",
    level: 1,
    levels: levels,
    lives: 3,
    score: 0,
    wordList: pool,
    levelWords: pool.slice(0, TS_WORDS_PER_LEVEL),
    queue: pool.slice(0, TS_WORDS_PER_LEVEL),
    falling: [],
    typed: "",
    spawnT: 0,
    shot: [],
    fallen: [],
    wrongCount: 0,
    rightList: [],
    wrongList: [],
    wrongKeys: [],
    shotFlash: 0,
    shotFlashX: 0,
    shotFlashY: 0,
    stars: 0,
    finalScore: 0,
    soundOn: true,
    loopOn: false,
    raf: 0,
    keyHandler: null,
    failReason: "",
    starsBg: null
  };
}
function tsSpeed(level) { return TS_BASE_SPEED + (level - 1) * TS_SPEED_PER_LEVEL; }
function tsBanner(l, msg) { var b = null; try { b = document.getElementById("tsBanner"); } catch (e) {} if (b) b.textContent = msg; }
function tsUpdateHud(l) {
  var s = l.ts; if (!s) return;
  var set = function (id, txt) { var el = null; try { el = document.getElementById(id); } catch (e) {} if (el) el.textContent = txt; };
  set("tsHudScore", "🏆 " + s.score);
  set("tsHudLevel", "🚩 Mốc " + s.level + "/" + s.levels);
  set("tsHudLives", "❤️ ".repeat(Math.max(0, s.lives)).trim() || "—");
}
function tsStopLoop(l) {
  if (!l || !l.ts) return;
  l.ts.loopOn = false;
  try { if (l.ts.raf) { if (window.cancelAnimationFrame) window.cancelAnimationFrame(l.ts.raf); else clearTimeout(l.ts.raf); } } catch (e) {}
  l.ts.raf = 0;
  if (l.ts.keyHandler) { try { document.removeEventListener("keydown", l.ts.keyHandler); } catch (e) {} l.ts.keyHandler = null; }
}
function tsStartLoop(l) {
  if (!l || !l.ts || l.ts.loopOn) return;
  l.ts.loopOn = true;
  var raf = window.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 32); };
  var last = Date.now();
  var tick = function (now) {
    if (!l.ts || !l.ts.loopOn) return;
    if (typeof curLesson !== "undefined" && curLesson !== l) { tsStopLoop(l); return; }
    var dt = Math.min(100, Math.max(0, (now || Date.now()) - last)); last = now || Date.now();
    if (l.ts.phase === "play") { tsStep(l, dt); tsDraw(l); }
    else { tsStopLoop(l); return; }
    l.ts.raf = raf(tick);
  };
  l.ts.raf = raf(tick);
}
function tsStartGame(l) {
  var s = l.ts; if (!s) return;
  s.phase = "play";
  s.spawnT = 0;
  if (typeof saveState === "function") { try { saveState(); } catch (e) {} }
  if (typeof render === "function") { try { render(); } catch (e) {} }
}
function tsSpawnWord(l) {
  var s = l.ts; if (!s || !s.queue.length) return null;
  if (s.falling.length >= TS_MAX_FALLING) return null;
  var item = s.queue.shift();
  var w = String(item.source_text).toLowerCase();
  var fw = {
    id: Date.now() + "" + Math.floor(Math.random() * 100000),
    word: w,
    vi: item.translation_vi,
    item: item,
    x: 50 + Math.random() * (TS_W - 130),
    y: -20,
    speed: tsSpeed(s.level)
  };
  s.falling.push(fw);
  return fw;
}
function tsStep(l, dt) {
  var s = l.ts; if (!s || s.phase !== "play") return;
  var dtMs = Math.max(0, dt || 0);
  if (s.shotFlash > 0) s.shotFlash -= dtMs;
  if (s.queue.length && s.falling.length < TS_MAX_FALLING) {
    s.spawnT -= dtMs;
    if (s.spawnT <= 0) { tsSpawnWord(l); s.spawnT = TS_SPAWN_MS; }
  }
  var i = 0;
  while (i < s.falling.length) {
    var fw = s.falling[i];
    fw.y += fw.speed * dtMs / 1000;
    if (fw.y >= TS_GROUND_Y) {
      s.falling.splice(i, 1);
      s.fallen.push(fw);
      s.lives--;
      if (s.typed && fw.word.indexOf(s.typed) === 0) s.typed = "";
      if (typeof gameWordWrong === "function") {
        try {
          var key = gameWordWrong("typeshooter", fw.word, fw.vi, "en");
          s.wrongKeys.push(key);
        } catch (e) {}
      }
      s.wrongList.push({ w: fw.word, vi: fw.vi });
      tsBanner(l, "💥 Từ “" + fw.word + "” (" + fw.vi + ") chạm đất! Còn " + Math.max(0, s.lives) + " ❤️ — từ này đã vào Sổ lỗi sai để ôn lại.");
      tsUpdateHud(l);
      if (s.lives <= 0) { tsToFail(l, "Hết 3 tim rồi!"); return; }
      continue;
    }
    i++;
  }
  if (!s.queue.length && !s.falling.length) {
    if (s.level < s.levels) {
      s.level++;
      s.score += 20;
      var start = (s.level - 1) * TS_WORDS_PER_LEVEL;
      s.levelWords = s.wordList.slice(start, start + TS_WORDS_PER_LEVEL);
      s.queue = s.levelWords.slice();
      s.typed = "";
      s.spawnT = 0;
      tsBanner(l, "🎉 Qua mốc " + (s.level - 1) + "! Sang mốc " + s.level + "/" + s.levels + " — từ rơi nhanh hơn một chút, cộng 20 điểm.");
      tsUpdateHud(l);
    } else {
      tsFinish(l);
    }
    return;
  }
  tsUpdateHud(l);
}
function tsTypeChar(l, ch) {
  var s = l.ts; if (!s || s.phase !== "play") return;
  if (ch === "Backspace") { s.typed = s.typed.slice(0, -1); return; }
  var c = String(ch || "").toLowerCase();
  if (!/^[a-z]$/.test(c)) return;
  var next = s.typed + c;
  var match = null, anyPrefix = false;
  for (var i = 0; i < s.falling.length; i++) {
    var w = s.falling[i].word;
    if (w === next) { match = s.falling[i]; break; }
    if (w.indexOf(next) === 0) anyPrefix = true;
  }
  if (match) {
    s.falling.splice(s.falling.indexOf(match), 1);
    s.score += 10 + match.word.length;
    s.shot.push(match);
    s.rightList.push({ w: match.word, vi: match.vi });
    s.shotFlash = 180; s.shotFlashX = match.x; s.shotFlashY = match.y;
    s.typed = "";
    if (typeof gameWordRight === "function") { try { gameWordRight(match.word, match.vi, "en", true); } catch (e) {} }
    if (s.soundOn && typeof speak === "function") { try { speak(match.word, 0.9); } catch (e) {} }
    tsBanner(l, "🎯 Bắn trúng “" + match.word + "” — " + match.vi + "!");
    tsUpdateHud(l);
    return;
  }
  if (anyPrefix) { s.typed = next; return; }
  s.typed = "";
}
function tsPauseToggle(l) {
  var s = l.ts; if (!s) return;
  if (s.phase === "play") { s.phase = "pause"; tsStopLoop(l); tsBanner(l, "⏸ Đang tạm dừng — bấm Tiếp tục để chơi tiếp."); }
  else if (s.phase === "pause") { s.phase = "play"; tsStartLoop(l); tsBanner(l, "▶ Chơi tiếp nào!"); }
}
function tsSoundToggle(l) {
  var s = l.ts; if (!s) return;
  s.soundOn = !s.soundOn;
  tsBanner(l, s.soundOn ? "🔊 Đã bật âm thanh (giọng tổng hợp khi bắn trúng)." : "🔇 Đã tắt âm thanh.");
}
function tsFinish(l) {
  var s = l.ts; if (!s) return;
  tsStopLoop(l);
  s.score = Math.max(0, s.score + s.lives * 10);
  var stars = tsStarsFor(s.score);
  if (typeof awardXp === "function") { try { awardXp(10); } catch (e) {} }
  if (typeof gameSaveBest === "function") { try { gameSaveBest("typeshooter", s.score, stars, "en"); } catch (e) {} }
  s.finalScore = s.score; s.finalStars = stars; s.stars = stars;
  s.phase = "end";
  if (typeof saveState === "function") { try { saveState(); } catch (e) {} }
  if (typeof render === "function") { try { render(); } catch (e) {} }
}
function tsToFail(l, reason) {
  var s = l.ts; if (!s) return;
  tsStopLoop(l);
  s.failReason = reason || "";
  s.phase = "fail";
  if (typeof saveState === "function") { try { saveState(); } catch (e) {} }
  if (typeof render === "function") { try { render(); } catch (e) {} }
}
function tsRetry(l) {
  var si = l.ts ? l.ts.setIdx : 0;
  tsNewGame(l, si);
  l.ts.phase = "play";
  if (typeof render === "function") { try { render(); } catch (e) {} }
}
function tsResetToPick(l) {
  tsStopLoop(l);
  l.ts = null;
  if (typeof render === "function") { try { render(); } catch (e) {} }
}
function tsDedupWords(list) {
  var seen = {}, out = [];
  list.forEach(function (r) { var k = String(r.w).toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(r); } });
  return out;
}

/* ---------- Vẽ cảnh vũ trụ bằng canvas (không dùng ảnh ngoài) ---------- */
function tsDraw(l) {
  var s = l.ts; if (!s) return;
  var cv = null;
  try { cv = document.getElementById("tsCanvas"); } catch (e) { cv = null; }
  if (!cv) return;
  var ctx = null;
  try { ctx = cv.getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx) return;
  var W = TS_W, H = TS_H;
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1e1b4b"); g.addColorStop(0.6, "#312e81"); g.addColorStop(1, "#0f172a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!s.starsBg) {
    s.starsBg = [];
    for (var i = 0; i < 70; i++) s.starsBg.push({ x: Math.random() * W, y: Math.random() * (H - 80), r: Math.random() * 1.6 + 0.4, p: Math.random() * Math.PI * 2 });
  }
  var tw = (Date.now() / 500) % (Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  s.starsBg.forEach(function (st) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(tw + st.p));
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.arc(W - 52, 62, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(W - 52, 62, 44, 10, -0.35, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = "#ef4444"; ctx.fillRect(0, TS_GROUND_Y, W, 3);
  var rx = W / 2, ry = H - 34;
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath(); ctx.moveTo(rx - 12, ry); ctx.lineTo(rx, ry - 34); ctx.lineTo(rx + 12, ry); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.arc(rx, ry - 22, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.moveTo(rx - 6, ry + 2); ctx.lineTo(rx, ry + 14 + Math.random() * 6); ctx.lineTo(rx + 6, ry + 2); ctx.closePath(); ctx.fill();
  if (s.shotFlash > 0) {
    ctx.strokeStyle = "rgba(250,204,21," + (s.shotFlash / 180).toFixed(2) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx, ry - 34); ctx.lineTo(s.shotFlashX, s.shotFlashY); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.textAlign = "center";
  s.falling.forEach(function (fw) {
    ctx.font = "bold 19px sans-serif";
    var twd = ctx.measureText(fw.word).width;
    var x0 = fw.x - twd / 2;
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0 - 8, fw.y - 22, twd + 16, 30, 15); else ctx.rect(x0 - 8, fw.y - 22, twd + 16, 30);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(fw.word, x0, fw.y);
    var m = 0;
    while (m < s.typed.length && m < fw.word.length && fw.word[m] === s.typed[m]) m++;
    if (m > 0) { ctx.fillStyle = "#facc15"; ctx.fillText(fw.word.slice(0, m), x0, fw.y); }
    ctx.textAlign = "center";
  });
}

/* ---------- Màn hình ---------- */
function renderTypeShooter(app, l) {
  var head = "";
  if (typeof lessonHead === "function") {
    try { head = lessonHead({ title: "🚀 Bắn từ rơi", type: "typeshooter" }, "Gõ đúng từ đang rơi để bắn hạ trước khi từ chạm đất. Thắng thua và mất mạng chỉ trong game, không chạm phần học. Sai ngôn ngữ vào Sổ lỗi sai, không trừ mạng."); } catch (e) { head = ""; }
  }
  function backBtn() {
    if (typeof wireBack === "function") { try { wireBack(); } catch (e) {} }
    var bb = null;
    try { bb = document.getElementById("btnBack"); } catch (e) {}
    if (bb) bb.onclick = function () { tsStopLoop(l); if (typeof backFromLesson === "function") { try { backFromLesson(); } catch (e) {} } };
  }
  if (!l.ts) {
    var sets = tsPickSets();
    var best = null;
    if (typeof gameBest === "function") { try { best = gameBest("typeshooter", "en"); } catch (e) { best = null; } }
    var cur = -1;
    if (typeof gameCurrentVocabSet === "function") { try { cur = gameCurrentVocabSet(); } catch (e) { cur = -1; } }
    var body = '<div class="qblock"><h3>🚀 Chọn bộ từ để bắn</h3><p class="mut">Mỗi bộ là từ thật của web. Từ rơi từ trên xuống — gõ đúng hết từ thì bắn hạ, từ chạm đất thì mất 1 tim. Qua hết danh sách thì thắng, hết 3 tim thì thua và chơi lại.</p><p class="mut">' + (best ? "Kỷ lục của bạn: 🏆 " + best.score + " điểm" + (best.stars ? " · " + "⭐".repeat(best.stars) : "") : "Chưa có kỷ lục — chơi ván đầu để lập kỷ lục.") + "</p>";
    if (!sets.length) body += "<p>Chưa có bộ từ nào đủ 12 thẻ và 8 từ 3–8 chữ cái — quay lại sau nhé.</p>";
    else body += '<div class="row">' + sets.map(function (si) {
      var st = (typeof CONTENT !== "undefined" && CONTENT.vocab) ? CONTENT.vocab[si] : {};
      return '<button class="btn btn-primary" data-tspick="' + si + '">🚀 ' + tsEsc(st.topic || "") + (st.band ? " · " + tsEsc(st.band) : "") + " · " + tsSetCards(si).length + " từ" + (si === cur ? " · ⭐ Gợi ý: bộ bạn đang học" : "") + "</button>";
    }).join("") + "</div>";
    body += "</div>";
    app.innerHTML = head + body;
    backBtn();
    app.querySelectorAll("[data-tspick]").forEach(function (b) { b.onclick = function () { tsNewGame(l, +b.dataset.tspick); render(); }; });
    return;
  }
  var s = l.ts;
  if (s.phase === "intro") {
    app.innerHTML = head + '<div class="game-hud"><p id="tsBanner" class="mut">Nhân vật dẫn đường đón bạn ở trạm vũ trụ.</p></div>'
      + '<div class="qblock"><div class="row" style="align-items:flex-start">' + tsGuideImgHTML(96)
      + '<div style="flex:1;background:#FFF8E1;border:2px solid #D97706;border-radius:16px;padding:10px 12px"><p style="margin:0 0 6px"><b>Nhân vật dẫn đường:</b></p><p style="margin:0">“Chào bạn! Nhìn lên trời kìa — các từ đang rơi xuống! Gõ đúng hết một từ để bắn hạ nó trước khi nó chạm đất. Giữ đủ 3 tim, qua hết các mốc là thắng nhé!”</p></div></div>'
      + '<div class="row" style="margin-top:10px"><button class="btn btn-primary" id="tsIntroGo" style="flex:1;padding:14px;font-size:18px">🚀 Bắt đầu bắn!</button></div>'
      + '<p class="mut">Trên điện thoại: bấm vào ô nhập bên dưới rồi gõ bằng bàn phím. Trên máy tính: gõ trực tiếp sau khi bấm vào ô nhập.</p></div>';
    backBtn();
    document.getElementById("tsIntroGo").onclick = function () { tsStartGame(l); };
    return;
  }
  if (s.phase === "play" || s.phase === "pause") {
    app.innerHTML = head + '<div class="ts-world"><div class="game-hud" style="display:flex;justify-content:space-between;gap:8px"><span id="tsHudScore"></span><span id="tsHudLevel"></span><span id="tsHudLives"></span></div>'
      + '<div class="qblock"><p id="tsBanner" class="mut">Gõ từ đang rơi để bắn hạ!</p>'
      + '<canvas id="tsCanvas" width="360" height="480" style="width:100%;max-width:480px;border:2px solid #D97706;border-radius:20px;background:#1e1b4b;display:block"></canvas>'
      + '<div class="row" style="margin-top:8px"><input id="tsInput" type="text" autocomplete="off" autocapitalize="off" placeholder="Gõ từ đang rơi vào đây…" style="flex:1;padding:12px;font-size:18px;border:2px solid #D97706;border-radius:12px">'
      + '<button class="btn btn-primary" id="tsPause">⏸ Tạm dừng</button><button class="btn" id="tsSound">🔊 Âm thanh</button></div>'
      + '<p class="mut">Gõ đúng hết một từ thì bắn hạ. Từ chạm vạch đỏ dưới cùng thì mất 1 tim.</p></div></div>';
    backBtn();
    tsUpdateHud(l);
    var inp = document.getElementById("tsInput");
    var prevLen = 0;
    if (inp) {
      inp.focus();
      inp.addEventListener("input", function () {
        var v = inp.value || "";
        if (v.length < prevLen) tsTypeChar(l, "Backspace");
        else if (v.length > prevLen) tsTypeChar(l, v.slice(-1));
        prevLen = (l.ts ? l.ts.typed.length : 0);
        inp.value = l.ts ? l.ts.typed : "";
        tsDraw(l);
      });
      inp.addEventListener("click", function () { tsDraw(l); });
    }
    var pb = document.getElementById("tsPause");
    if (pb) pb.onclick = function () { tsPauseToggle(l); pb.textContent = (l.ts && l.ts.phase === "pause") ? "▶ Tiếp tục" : "⏸ Tạm dừng"; tsDraw(l); };
    var sb = document.getElementById("tsSound");
    if (sb) sb.onclick = function () { tsSoundToggle(l); sb.textContent = (l.ts && l.ts.soundOn) ? "🔊 Âm thanh" : "🔇 Âm thanh"; };
    tsDraw(l);
    if (s.phase === "play") tsStartLoop(l);
    return;
  }
  if (s.phase === "end") {
    var rightD = tsDedupWords(s.rightList), wrongD = tsDedupWords(s.wrongList);
    var shotHtml = s.shot.map(function (f) { return tsEsc(f.word) + " — " + tsEsc(f.vi); }).join("; ") || "chưa có";
    var sumHtml = "";
    if (typeof gameSummaryHTML === "function") { try { sumHtml = gameSummaryHTML(rightD, wrongD); } catch (e) { sumHtml = ""; } }
    var badge = "";
    if (typeof summaryBadgeSVG === "function") { try { badge = summaryBadgeSVG(); } catch (e) { badge = ""; } }
    app.innerHTML = head + '<div class="reward-frame">' + badge + '<h2>🏆 Thắng rồi!</h2><p>Điểm: <b>' + s.finalScore + '</b> · Mốc: ' + s.level + '/' + s.levels + ' · Còn ' + s.lives + ' ❤️</p>' + tsRewardStarsHTML(s.finalStars) + '<p>Từ đã bắn hạ: ' + shotHtml + '</p>'
      + sumHtml
      + '<div class="row"><button class="btn btn-primary" id="tsAgain">🔁 Chơi lại</button><button class="btn" id="tsHub">Về Luyện tập</button></div></div>';
    backBtn();
    tsAnimateRewardStars();
    document.getElementById("tsAgain").onclick = function () { tsResetToPick(l); };
    document.getElementById("tsHub").onclick = function () { tsStopLoop(l); if (typeof backFromLesson === "function") { try { backFromLesson(); } catch (e) {} } if (typeof go === "function") { try { go("practice"); } catch (e) {} } };
    var rw = null;
    try { rw = document.getElementById("gmReviewWrong"); } catch (e) {}
    if (rw) rw.onclick = function () { l.wrongKeys = s.wrongKeys; if (typeof gameReviewWrongNow === "function") { try { gameReviewWrongNow(l); } catch (e) {} } };
    return;
  }
  if (s.phase === "fail") {
    app.innerHTML = head + '<div class="summarybox"><h2>💪 Chưa qua ván này!</h2><p>' + tsEsc(s.failReason || "") + '</p><p class="mut">Thua trong game không trừ gì ở phần học. Từ rơi xuống đất (nếu có) đã vào Sổ lỗi sai để ôn lại.</p>'
      + '<div class="row"><button class="btn btn-primary" id="tsAgain">🔁 Chơi lại</button><button class="btn" id="tsHub">Về Luyện tập</button></div></div>';
    backBtn();
    document.getElementById("tsAgain").onclick = function () { tsRetry(l); };
    document.getElementById("tsHub").onclick = function () { tsStopLoop(l); if (typeof backFromLesson === "function") { try { backFromLesson(); } catch (e) {} } if (typeof go === "function") { try { go("practice"); } catch (e) {} } };
    return;
  }
  app.innerHTML = head + '<div class="qblock"><p>Trạng thái game không rõ — bấm Chơi lại để bắt đầu ván mới.</p><div class="row"><button class="btn btn-primary" id="tsAgain">🔁 Chơi lại</button></div></div>';
  backBtn();
  document.getElementById("tsAgain").onclick = function () { tsResetToPick(l); };
}

/* API dùng chung cho UI và probe kiểm chứng. */
window.TypeShooter = {
  adapter: tsAdapterItems,
  pickSets: tsPickSets,
  wordOk: tsWordOk,
  newGame: tsNewGame,
  startGame: tsStartGame,
  spawnWord: tsSpawnWord,
  step: tsStep,
  typeChar: tsTypeChar,
  pauseToggle: tsPauseToggle,
  soundToggle: tsSoundToggle,
  stopLoop: tsStopLoop,
  finish: tsFinish,
  toFail: tsToFail,
  retry: tsRetry,
  resetToPick: tsResetToPick,
  draw: tsDraw,
  speedFor: tsSpeed,
  rewardStarsHTML: tsRewardStarsHTML,
  animateStars: tsAnimateRewardStars,
  canvasW: TS_W,
  canvasH: TS_H,
  wordsPerLevel: TS_WORDS_PER_LEVEL
};
