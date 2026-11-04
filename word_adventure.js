/* ---------- BIỆT ĐỘI SĂN TỪ — WORD ADVENTURE, VÒNG MOBILE 1 (v60) ----------
   Vertical slice game mobile theo MASTER PROMPT (Bùi gửi 09:54 04/11/2026) +
   báo cáo khảo sát giai đoạn 1 (04/11/2026). Chỉ 1 vòng tiếng Anh, chơi bằng
   1 ngón tay cái, 60–90 giây. Nguyên tắc: nội dung học LÀ nước đi thắng —
   ngọc thu được chính là từ dùng cho mật mã và boss; sai ngôn ngữ không trừ
   mạng mà vào Sổ lỗi sai + trừ điểm thưởng (đúng luật game Bùi chốt).
   Nội dung chỉ đọc từ bank gốc CONTENT.vocab qua adapter dưới đây, KHÔNG
   copy bank sang bản riêng; thiếu dữ liệu dạng nào thì bỏ dạng đó, không bịa.
   Đồ họa tự vẽ bằng canvas, không lấy hình/màu/linh vật của game nào.
   Âm thanh: chỉ giọng đọc trình duyệt (ghi rõ là giọng tổng hợp khi phát),
   không tự động phát trước khi người chơi bấm nút nghe. */
var WA_RUN_LENGTH = 2400;
var WA_RUN_SPEED = 100;
var WA_PLAYER_X = 90;

/* ---------- Cảnh minh họa đã duyệt (phong cách truyện tranh) ----------
   Chỉ đổi lớp vỏ, không đổi luật/điểm/mạng/kho từ. Ảnh phố làm nền đoạn
   chạy, chân dung nhân vật dẫn đường dùng cho mọi hộp thoại. Ảnh nào lỗi
   thì tự rơi về hình vẽ bằng code cũ, game không bao giờ vỡ. */
var WA_IMG_TOWN = "assets/media-generation-town-mobile-scene-0-0b9a4b60-108c-41fb-85af-ebf80e551244.webp";
var WA_IMG_GUIDE = "assets/media-generation-npc-guide-portrait-0-91c329a7-065e-4e04-801e-63b953c59598.webp";
var waImgCache = {};
function waImg(src) {
  if (waImgCache[src]) return waImgCache[src];
  var img = null;
  try { img = new Image(); img.src = src; } catch (e) { img = null; }
  waImgCache[src] = img;
  return img;
}
function waImgReady(img) { try { return !!(img && img.complete && img.naturalWidth > 0); } catch (e) { return false; } }
function waGuideImgHTML(size) {
  var s = size || 96;
  return '<img src="' + WA_IMG_GUIDE + '" alt="Nhân vật dẫn đường" style="width:' + s + 'px;height:' + s + 'px;object-fit:cover;border-radius:50%;border:3px solid #D97706;flex:none" onerror="this.style.display=\'none\'">';
}
/* Màn thưởng: luôn hiện đủ 3 ô sao để thấy thang 3 sao, rồi lấp từng sao
   một theo nhịp rõ ràng. Trước đây chỉ vẽ đúng số sao đạt được nên sao
   thứ 3 biến mất hẳn ở mobile. */
function waRewardStarsHTML(stars) {
  var n = stars || 0;
  var out = '<p class="rw-stars" data-stars-earned="' + n + '"><span class="mut">Thang 3 sao: </span>';
  for (var i = 0; i < 3; i++) out += '<span class="rw-star-slot" data-star-slot="' + (i + 1) + '" style="font-size:34px">☆</span>';
  out += ' <span class="rw-star-count">' + n + '/3 sao</span></p>';
  return out;
}
function waAnimateRewardStars() {
  var box = document.querySelector("[data-stars-earned]");
  if (!box) return;
  var earned = parseInt(box.getAttribute("data-stars-earned"), 10) || 0;
  var slots = box.querySelectorAll("[data-star-slot]");
  function fill(k) { for (var i = 0; i < slots.length; i++) if (i < k) slots[i].textContent = "⭐"; }
  for (var j = 0; j < earned; j++) (function (k) { setTimeout(function () { fill(k); }, 450 * k); })(j + 1);
  setTimeout(function () { fill(earned); }, 450 * earned + 200);
}

/* Content Adapter (chỉ đọc bank gốc, không copy): ánh xạ thẻ thật sang
   trường chuẩn của MASTER PROMPT. source_url là vị trí bài học trong web
   (SPA nên ghi dạng tab + bộ, không bịa URL http). */
function waAdapterItems(setIdx) {
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
function waCipherOk(w) { return /^[a-z]{3,8}$/.test(String(w || "").toLowerCase()); }
function waPickIslands() {
  var elig = [];
  if (typeof CONTENT === "undefined" || !CONTENT.vocab) return elig;
  for (var i = 0; i < CONTENT.vocab.length; i++) {
    var cards = vocabSetCards(i);
    var nCipher = 0;
    for (var j = 0; j < cards.length; j++) if (waCipherOk(cards[j].w)) nCipher++;
    if (cards.length >= 12 && nCipher >= 3) elig.push(i);
  }
  if (!elig.length) return elig;
  var cur = gameCurrentVocabSet();
  var out = [];
  if (elig.indexOf(cur) >= 0) out.push(cur);
  var rest = gameShuffle(elig.filter(function (x) { return out.indexOf(x) < 0; }));
  for (var k = 0; k < rest.length && out.length < 3; k++) out.push(rest[k]);
  return out;
}
function waNewLoop(l, setIdx) {
  var items = waAdapterItems(setIdx);
  var cipherPool = gameShuffle(items.filter(function (it) { return waCipherOk(it.source_text); }));
  var gems = [];
  for (var i = 0; i < Math.min(3, cipherPool.length); i++) gems.push({ x: [380, 1180, 1880][i], got: false, word: cipherPool[i] });
  l.wa = {
    phase: "run",
    setIdx: setIdx,
    setTopic: (CONTENT.vocab[setIdx] || {}).topic || "",
    lives: 3,
    score: 0,
    dist: 0,
    jumpT: 0,
    slideT: 0,
    invulnT: 0,
    gems: gems,
    collected: [],
    obstacles: [
      { x: 750, type: "rock", done: false },
      { x: 1520, type: "vine", done: false },
      { x: 2200, type: "rock", done: false }
    ],
    cipher: null,
    boss: null,
    playerX: 180,
    checkpoint: 1,
    hits: 0,
    wrongCount: 0,
    rightList: [],
    wrongList: [],
    wrongKeys: [],
    usedChallenge: [],
    loopOn: false,
    keyHandler: null,
    raf: 0,
    introSeen: false
  };
}
function waBanner(l, msg) { var b = document.getElementById("waBanner"); if (b) b.textContent = msg; }
function waUpdateHud(l) {
  var s = l.wa; if (!s) return;
  var h = document.getElementById("waHud");
  if (h) h.textContent = "❤️ ".repeat(Math.max(0, s.lives)) + " · Điểm: " + s.score + (s.phase === "run" ? " · Đường: " + Math.min(100, Math.round(s.dist / WA_RUN_LENGTH * 100)) + "%" : (s.phase === "boss" ? " · Boss giai đoạn " + (s.boss ? s.boss.phase : 1) + "/3" : ""));
}
function waStopLoop(l) {
  if (!l || !l.wa) return;
  l.wa.loopOn = false;
  try { if (l.wa.raf) { if (window.cancelAnimationFrame) window.cancelAnimationFrame(l.wa.raf); else clearTimeout(l.wa.raf); } } catch (e) {}
  l.wa.raf = 0;
  if (l.wa.keyHandler) { try { document.removeEventListener("keydown", l.wa.keyHandler); } catch (e) {} l.wa.keyHandler = null; }
}
function waStartLoop(l) {
  if (!l || !l.wa || l.wa.loopOn) return;
  l.wa.loopOn = true;
  var raf = window.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 32); };
  var last = Date.now();
  var tick = function (now) {
    if (!l.wa || !l.wa.loopOn) return;
    if (typeof curLesson === "undefined" || curLesson !== l) { waStopLoop(l); return; }
    var dt = Math.min(100, Math.max(0, (now || Date.now()) - last)); last = now || Date.now();
    if (l.wa.phase === "run") { waRunStep(l, dt); waDrawRun(l); }
    else if (l.wa.phase === "boss") { waBossStep(l, dt); waDrawBoss(l); }
    else { waStopLoop(l); return; }
    l.wa.raf = raf(tick);
  };
  l.wa.raf = raf(tick);
  var kh = function (e) {
    if (!l.wa) return;
    if (l.wa.phase === "run") {
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); waJump(l); }
      else if (e.key === "ArrowDown") { e.preventDefault(); waSlide(l); }
    } else if (l.wa.phase === "boss") {
      if (e.key === "ArrowLeft") waMoveBoss(l, -1);
      else if (e.key === "ArrowRight") waMoveBoss(l, 1);
    }
  };
  l.wa.keyHandler = kh;
  document.addEventListener("keydown", kh);
}
function waJump(l) { var s = l.wa; if (!s || s.phase !== "run") return; if (s.jumpT <= 0) s.jumpT = 900; }
function waSlide(l) { var s = l.wa; if (!s || s.phase !== "run") return; if (s.slideT <= 0) s.slideT = 800; }
function waRunStep(l, dt) {
  var s = l.wa; if (!s || s.phase !== "run") return;
  var dtMs = Math.max(0, dt || 0);
  if (s.jumpT > 0) s.jumpT -= dtMs;
  if (s.slideT > 0) s.slideT -= dtMs;
  if (s.invulnT > 0) s.invulnT -= dtMs;
  s.dist += WA_RUN_SPEED * dtMs / 1000;
  for (var i = 0; i < s.gems.length; i++) {
    var g = s.gems[i]; if (g.got) continue;
    var gx = g.x - s.dist + WA_PLAYER_X;
    if (gx <= 112 && gx >= 40) {
      g.got = true; s.collected.push(g.word); s.score += 10;
      waBanner(l, "💎 Thu được ngọc: " + g.word.source_text + " — " + g.word.translation_vi);
    }
  }
  for (var j = 0; j < s.obstacles.length; j++) {
    var o = s.obstacles[j]; if (o.done) continue;
    var ox = o.x - s.dist + WA_PLAYER_X;
    if (ox < 40) { o.done = true; continue; }
    if (Math.abs(ox - WA_PLAYER_X) < 34) {
      var evaded = (o.type === "rock" && s.jumpT > 0) || (o.type === "vine" && s.slideT > 0);
      if (!evaded && s.invulnT <= 0) {
        s.lives--; s.invulnT = 1000;
        waBanner(l, "💥 Vấp chướng ngại! Còn " + Math.max(0, s.lives) + " ❤️");
        waUpdateHud(l);
        if (s.lives <= 0) { waToFail(l, "Hết mạng ở đoạn chạy!"); return; }
      }
      o.done = true;
    }
  }
  if (s.dist >= WA_RUN_LENGTH) { waStartCipher(l); return; }
  waUpdateHud(l);
}
function waDrawRun(l) {
  var s = l.wa; if (!s) return;
  var cv = document.getElementById("waCanvas"); if (!cv) return;
  var ctx = null; try { ctx = cv.getContext("2d"); } catch (e) {} if (!ctx) return;
  var W = 360, H = 240, groundY = 190;
  var townImg = waImg(WA_IMG_TOWN);
  if (waImgReady(townImg)) {
    var sc = Math.max(W / townImg.naturalWidth, H / townImg.naturalHeight);
    var dw = townImg.naturalWidth * sc, dh = townImg.naturalHeight * sc;
    ctx.drawImage(townImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(255,251,235,0.30)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(111,179,94,0.45)"; ctx.fillRect(0, groundY, W, H - groundY);
  } else {
    ctx.fillStyle = "#bfe8ff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff7cc"; ctx.beginPath(); ctx.arc(310, 32, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    [[50, 30], [150, 22], [240, 38]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], 14, 0, Math.PI * 2); ctx.arc(c[0] + 14, c[1] + 4, 11, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#8fce7e"; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#6db35e"; ctx.fillRect(0, groundY, W, 6);
  }
  var jumpY = 0;
  if (s.jumpT > 0) jumpY = Math.sin((900 - s.jumpT) / 900 * Math.PI) * 46;
  var px = WA_PLAYER_X, py = groundY - jumpY;
  var blink = (s.invulnT > 0 && Math.floor(s.invulnT / 200) % 2 === 0);
  if (!blink) {
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(px - 10, py - 34, 20, s.slideT > 0 ? 16 : 30);
    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(px, py - (s.slideT > 0 ? 24 : 42), 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b45309"; ctx.fillRect(px - 12, py - (s.slideT > 0 ? 34 : 52), 24, 5);
  }
  s.gems.forEach(function (g, i) {
    if (g.got) return;
    var gx = g.x - s.dist + WA_PLAYER_X;
    if (gx < -20 || gx > W + 20) return;
    ctx.save(); ctx.translate(gx, 120); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = ["#22d3ee", "#e879f9", "#facc15"][i % 3]; ctx.fillRect(-10, -10, 20, 20); ctx.restore();
    ctx.fillStyle = "#1f2937"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(g.word.source_text, gx, 100);
  });
  s.obstacles.forEach(function (o) {
    if (o.done) return;
    var ox = o.x - s.dist + WA_PLAYER_X;
    if (ox < -30 || ox > W + 30) return;
    if (o.type === "rock") { ctx.fillStyle = "#9ca3af"; ctx.beginPath(); ctx.moveTo(ox - 18, groundY); ctx.lineTo(ox - 8, groundY - 26); ctx.lineTo(ox + 8, groundY - 30); ctx.lineTo(ox + 18, groundY); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = "#16a34a"; ctx.fillRect(ox - 16, 60, 32, 74); ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(ox - 16, 134, 10, 0, Math.PI * 2); ctx.arc(ox + 16, 134, 10, 0, Math.PI * 2); ctx.fill(); }
  });
  ctx.fillStyle = "#1f2937"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Đường: " + Math.min(100, Math.round(s.dist / WA_RUN_LENGTH * 100)) + "%", 8, 16);
}

/* ---------- Mật mã nghe–đánh vần ---------- */
function waStartCipher(l) {
  var s = l.wa; if (!s) return;
  waStopLoop(l);
  if (!s.collected.length) { waToFail(l, "Chưa thu được ngọc nào nên không mở được mật mã."); return; }
  var w = String(s.collected[0].source_text).toLowerCase();
  var letters = w.split("");
  var pool = "abcdefghijklmnopqrstuvwxyz".split("").filter(function (ch) { return letters.indexOf(ch) < 0; });
  pool = gameShuffle(pool).slice(0, 3);
  var tabs = gameShuffle(letters.concat(pool)).map(function (ch) { return { ch: ch, used: false }; });
  s.cipher = { word: w, wordItem: s.collected[0], tabs: tabs, pos: 0, wrongAtPos: 0, wordWrong: false, hintIdx: -1 };
  s.phase = "cipher";
  saveState();
  render();
}
function waCipherSpeak(l) {
  var s = l.wa; if (!s || !s.cipher) return;
  try { speak(s.cipher.word.split("").join(" "), 0.7); } catch (e) {}
  waBanner(l, "Đang đọc đánh vần bằng giọng tổng hợp — nghe rồi bấm đúng thứ tự các phiến đá.");
}
function waTapCipher(l, idx) {
  var s = l.wa; if (!s || s.phase !== "cipher" || !s.cipher) return;
  var c = s.cipher; var tab = c.tabs[idx]; if (!tab || tab.used) return;
  if (tab.ch === c.word[c.pos]) {
    tab.used = true; c.pos++; c.wrongAtPos = 0; c.hintIdx = -1;
    if (c.pos >= c.word.length) {
      if (!c.wordWrong) { gameWordRight(c.wordItem.source_text, c.wordItem.translation_vi, "en", true); s.rightList.push({ w: c.wordItem.source_text, vi: c.wordItem.translation_vi }); }
      waStartBoss(l);
      return;
    }
    waRenderCipherTabs(l);
  } else {
    c.wrongAtPos++; s.wrongCount++;
    if (!c.wordWrong) {
      c.wordWrong = true;
      var key = gameWordWrong("wordadv", c.wordItem.source_text, c.wordItem.translation_vi, "en");
      s.wrongKeys.push(key); s.wrongList.push({ w: c.wordItem.source_text, vi: c.wordItem.translation_vi });
    }
    if (c.wrongAtPos >= 2) {
      for (var i = 0; i < c.tabs.length; i++) if (!c.tabs[i].used && c.tabs[i].ch === c.word[c.pos]) { c.hintIdx = i; break; }
    }
    waBanner(l, "Chưa đúng — nghe lại rồi thử tiếp nhé. Từ này đã vào Sổ lỗi sai để ôn lại.");
    waRenderCipherTabs(l);
  }
}
function waRenderCipherTabs(l) {
  var s = l.wa; if (!s || !s.cipher) return;
  var box = document.getElementById("waCipherTabs"); if (!box) return;
  var c = s.cipher;
  box.innerHTML = c.tabs.map(function (t, i) {
    var st = t.used ? "background:#86efac" : (i === c.hintIdx ? "outline:3px solid #f59e0b;background:#fef3c7" : "background:#fff");
    return '<button class="btn" data-ci="' + i + '" style="' + st + ';min-width:44px;font-size:20px">' + esc(t.ch.toUpperCase()) + "</button>";
  }).join("");
  box.querySelectorAll("[data-ci]").forEach(function (b) { b.onclick = function () { waTapCipher(l, +b.dataset.ci); }; });
  var prog = document.getElementById("waCipherProg");
  if (prog) prog.textContent = "Đã xếp: " + c.pos + "/" + c.word.length + " chữ cái";
}

/* ---------- Boss 3 giai đoạn ---------- */
function waBossArena(phase) {
  if (phase === 2) return [40, 320];
  if (phase >= 3) return [60, 300];
  return [20, 340];
}
function waBossTeleMs(phase) { return phase === 1 ? 1400 : (phase === 2 ? 1100 : 900); }
function waBossDangerMs(phase) { return phase === 1 ? 900 : (phase === 2 ? 800 : 700); }
function waBossZones(phase, arena) {
  var a0 = arena[0], a1 = arena[1];
  if (phase === 1) {
    var c = a0 + 35 + Math.random() * (a1 - a0 - 70);
    return [{ x0: c - 35, x1: c + 35 }];
  }
  for (var t = 0; t < 30; t++) {
    var c1 = a0 + 30 + Math.random() * (a1 - a0 - 60);
    var c2 = a0 + 30 + Math.random() * (a1 - a0 - 60);
    if (Math.abs(c1 - c2) >= 130) return [{ x0: c1 - 30, x1: c1 + 30 }, { x0: c2 - 30, x1: c2 + 30 }];
  }
  return [{ x0: a0, x1: a0 + 60 }, { x0: a1 - 60, x1: a1 }];
}
function waStartBoss(l) {
  var s = l.wa; if (!s) return;
  waStopLoop(l);
  s.phase = "boss";
  s.boss = { phase: 1, hp: 3, mode: "tele", clock: waBossTeleMs(1), dangerMs: waBossDangerMs(1), zones: waBossZones(1, waBossArena(1)), stunT: 0, q: null };
  s.playerX = 180;
  saveState();
  render();
}
function waBossNextTele(l) {
  var s = l.wa, b = s.boss; if (!s || !b) return;
  b.mode = "tele"; b.clock = waBossTeleMs(b.phase); b.dangerMs = waBossDangerMs(b.phase);
  b.zones = waBossZones(b.phase, waBossArena(b.phase)); b.stunT = 0; b.q = null;
  var qbox = document.getElementById("waBossQ"); if (qbox) qbox.innerHTML = "";
}
function waBossStep(l, dt) {
  var s = l.wa; if (!s || s.phase !== "boss" || !s.boss) return;
  var b = s.boss;
  if (s.invulnT > 0) s.invulnT -= dt;
  if (b.mode === "stun") {
    b.stunT += dt;
    if (b.stunT > 15000) waBossNextTele(l);
    return;
  }
  b.clock -= dt;
  if (b.clock <= 0) {
    if (b.mode === "tele") { b.mode = "danger"; b.clock = b.dangerMs; }
    else if (b.mode === "danger") waBossResolveDanger(l);
  }
}
function waBossResolveDanger(l) {
  var s = l.wa, b = s.boss; if (!s || !b) return;
  var hit = false;
  for (var i = 0; i < b.zones.length; i++) if (s.playerX >= b.zones[i].x0 && s.playerX <= b.zones[i].x1) hit = true;
  if (hit && s.invulnT <= 0) {
    s.lives--; s.invulnT = 1200;
    waBanner(l, "💥 Dính đòn boss! Còn " + Math.max(0, s.lives) + " ❤️");
    waUpdateHud(l);
    if (s.lives <= 0) { waToFail(l, "Hết mạng trong trận boss!"); return; }
  }
  waBossStartStun(l);
}
function waBossStartStun(l) {
  var s = l.wa, b = s.boss; if (!s || !b) return;
  b.mode = "stun"; b.stunT = 0;
  var pool = gameShuffle(vocabSetCards(s.setIdx).filter(function (c) { return c.w && c.vi; }));
  var pick = null;
  for (var i = 0; i < pool.length; i++) if (s.usedChallenge.indexOf(pool[i].w) < 0) { pick = pool[i]; break; }
  if (!pick) pick = pool[0];
  if (!pick) { waBossNextTele(l); return; }
  s.usedChallenge.push(pick.w);
  var nOpt = b.phase === 2 ? 3 : 2;
  var opts = gameShuffle([pick.w].concat(gameWordDistractors(pick.w, pick.vi, "en", nOpt)));
  b.q = { word: pick.w, vi: pick.vi, opts: opts, a: opts.indexOf(pick.w) };
  if (b.phase === 3) { try { speak(pick.w, 0.8); } catch (e) {} }
  waRenderBossQ(l);
}
function waRenderBossQ(l) {
  var s = l.wa, b = s.boss; if (!s || !b || !b.q) return;
  var box = document.getElementById("waBossQ"); if (!box) return;
  var prompt = b.phase === 3
    ? "Boss choáng! Nghe từ vừa đọc (giọng tổng hợp) rồi chọn đúng từ để đánh trả."
    : "Boss choáng! Chọn đúng từ cho nghĩa: “" + b.q.vi + "” để đánh trả.";
  box.innerHTML = "<p><b>" + prompt + "</b>" + (b.phase === 3 ? ' <button class="btn" id="waBossHear">🔊 Nghe lại</button>' : "") + "</p><div class=\"row\">" +
    b.q.opts.map(function (o, i) { return '<button class="btn" data-bq="' + i + '">' + esc(o) + "</button>"; }).join("") + "</div>";
  box.querySelectorAll("[data-bq]").forEach(function (btn) { btn.onclick = function () { waAnswerBoss(l, +btn.dataset.bq); }; });
  var hb = document.getElementById("waBossHear");
  if (hb) hb.onclick = function () { try { speak(b.q.word, 0.8); } catch (e) {} };
}
function waAnswerBoss(l, idx) {
  var s = l.wa, b = s.boss; if (!s || !b || !b.q) return;
  var q = b.q;
  if (idx === q.a) {
    gameWordRight(q.word, q.vi, "en", true);
    s.rightList.push({ w: q.word, vi: q.vi });
    s.hits++; s.score += 20; b.hp--;
    waBanner(l, "⭐ Đánh trúng! Boss còn " + Math.max(0, b.hp) + " lượt choáng nữa.");
    if (b.hp <= 0) { waFinish(l); return; }
    b.phase++; s.checkpoint = b.phase;
    waBossNextTele(l);
    waUpdateHud(l);
    saveState();
    render();
  } else {
    s.wrongCount++;
    var key = gameWordWrong("wordadv", q.word, q.vi, "en");
    s.wrongKeys.push(key); s.wrongList.push({ w: q.word, vi: q.vi });
    waBanner(l, "Chưa đúng — từ này đã vào Sổ lỗi sai. Boss tỉnh lại rồi, né đòn tiếp nhé!");
    waBossNextTele(l);
  }
}
function waMoveBoss(l, dir) {
  var s = l.wa, b = s.boss; if (!s || !b) return;
  var arena = waBossArena(b.phase);
  s.playerX = Math.max(arena[0], Math.min(arena[1], s.playerX + dir * 28));
  waDrawBoss(l);
}
function waDrawBoss(l) {
  var s = l.wa, b = s.boss; if (!s || !b) return;
  var cv = document.getElementById("waCanvas"); if (!cv) return;
  var ctx = null; try { ctx = cv.getContext("2d"); } catch (e) {} if (!ctx) return;
  var W = 360, H = 240, groundY = 190;
  ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#374151"; ctx.fillRect(0, groundY, W, H - groundY);
  var arena = waBossArena(b.phase);
  ctx.strokeStyle = "#facc15"; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(arena[0], 30); ctx.lineTo(arena[0], groundY); ctx.moveTo(arena[1], 30); ctx.lineTo(arena[1], groundY); ctx.stroke();
  ctx.setLineDash([]);
  if (b.mode === "tele" || b.mode === "danger") {
    ctx.fillStyle = b.mode === "tele" ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.65)";
    b.zones.forEach(function (z) { ctx.fillRect(z.x0, 60, z.x1 - z.x0, groundY - 60); });
    if (b.mode === "tele") { ctx.fillStyle = "#fde047"; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", 180, 52); }
  }
  var blink = (s.invulnT > 0 && Math.floor(s.invulnT / 200) % 2 === 0);
  if (!blink) {
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(s.playerX - 10, groundY - 30, 20, 30);
    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(s.playerX, groundY - 42, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b45309"; ctx.fillRect(s.playerX - 12, groundY - 52, 24, 5);
  }
  var bx = 180, by = 110;
  ctx.fillStyle = b.mode === "stun" ? "#a8a29e" : "#78716c";
  ctx.beginPath(); ctx.arc(bx, by, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.arc(bx - 26, by + 34, 14, 0, Math.PI * 2); ctx.arc(bx + 26, by + 34, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fefce8";
  ctx.beginPath(); ctx.arc(bx - 16, by - 8, 10, 0, Math.PI * 2); ctx.arc(bx + 16, by - 8, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1f2937";
  if (b.mode === "stun") { ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("× ×", bx - 16, by - 4); ctx.fillText("× ×", bx + 16, by - 4); ctx.fillStyle = "#fde047"; ctx.fillText("✦ ✦ ✦", bx, by - 52); }
  else { ctx.beginPath(); ctx.arc(bx - 16, by - 8, 4, 0, Math.PI * 2); ctx.arc(bx + 16, by - 8, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#fefce8"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Quái Đá · Giai đoạn " + b.phase + "/3", bx, 20);
  ctx.fillStyle = "#fde047"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Boss còn " + b.hp + " lượt choáng", 8, 16);
}

/* ---------- Kết thúc / thua ---------- */
function waFinish(l) {
  var s = l.wa; if (!s) return;
  waStopLoop(l);
  s.score = Math.max(0, s.collected.length * 10 + s.hits * 20 + s.lives * 10 - s.wrongCount * 5);
  var stars = gameStarsFor(s.score / 120);
  awardXp(10);
  gameSaveBest("wordadv", s.score, stars, "en");
  s.finalScore = s.score; s.finalStars = stars;
  s.phase = "end";
  saveState();
  render();
}
function waToFail(l, reason) {
  var s = l.wa; if (!s) return;
  waStopLoop(l);
  s.failReason = reason;
  s.phase = "fail";
  saveState();
  render();
}
function waResetToIsland(l) {
  waStopLoop(l);
  l.wa = null;
  render();
}
function waResumeCheckpoint(l) {
  var s = l.wa; if (!s) return;
  var p = Math.max(2, s.checkpoint || 2);
  s.lives = 2;
  s.phase = "boss";
  s.boss = { phase: p, hp: 4 - p, mode: "tele", clock: waBossTeleMs(p), dangerMs: waBossDangerMs(p), zones: waBossZones(p, waBossArena(p)), stunT: 0, q: null };
  saveState();
  render();
}
function waDedupWords(list) {
  var seen = {}, out = [];
  list.forEach(function (r) { var k = String(r.w).toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(r); } });
  return out;
}

/* ---------- Màn hình ---------- */
function renderWordAdv(app, l) {
  var head = lessonHead({ title: "🏝️ Biệt đội Săn Từ — Vòng 1", type: "wordadv" }, "Chơi bằng bộ từ tiếng Anh của web · Thắng thua và mất mạng chỉ trong game, không chạm phần học. Sai ngôn ngữ vào Sổ lỗi sai, không trừ mạng.");
  if (!l.wa) {
    var islands = waPickIslands();
    var waBest = null; try { waBest = gameBest("wordadv", "en"); } catch (e) { waBest = null; }
    var waCur = gameCurrentVocabSet();
    var body = '<div class="qblock"><h3>🏝️ Chọn đảo khởi đầu</h3><p class="mut">Mỗi đảo là một bộ từ thật của web. Vòng này: chạy nhảy né bẫy bằng một ngón tay, thu 3 ngọc từ, giải mật mã nghe–đánh vần, rồi vượt boss 3 giai đoạn. Cả vòng khoảng 60–90 giây.</p><p class="mut">' + (waBest ? "Kỷ lục của bạn: 🏆 " + waBest.score + " điểm" + (waBest.stars ? " · " + "⭐".repeat(waBest.stars) : "") : "Chưa có kỷ lục — chơi vòng đầu để lập kỷ lục.") + '</p>';
    if (!islands.length) body += '<p>Chưa có bộ từ nào đủ 12 thẻ và 3 từ đánh vần được — quay lại sau nhé.</p>';
    else body += '<div class="row">' + islands.map(function (si) {
      var st = CONTENT.vocab[si];
      return '<button class="btn btn-primary" data-waisle="' + si + '">🏝️ ' + esc(st.topic || "") + (st.band ? " · " + esc(st.band) : "") + " · " + vocabSetCards(si).length + " từ" + (si === waCur ? " · ⭐ Gợi ý: bộ bạn đang học" : "") + "</button>";
    }).join("") + "</div>";
    body += "</div>";
    app.innerHTML = head + body;
    wireBack();
    app.querySelectorAll("[data-waisle]").forEach(function (b) { b.onclick = function () { waNewLoop(l, +b.dataset.waisle); render(); }; });
    return;
  }
  var s = l.wa;
  if (s.phase === "run") {
    if (!s.introSeen) {
      app.innerHTML = head + '<div class="game-hud"><p id="waHud"></p><p id="waBanner" class="mut">Nhân vật dẫn đường đón bạn ở đầu phố.</p></div>'
        + '<div class="qblock"><img src="' + WA_IMG_TOWN + '" alt="Phố của Biệt đội Săn Từ" style="width:100%;max-width:480px;border-radius:20px;border:2px solid #D97706;display:block" onerror="this.style.display=\'none\'">'
        + '<div class="row" style="margin-top:10px;align-items:flex-start">' + waGuideImgHTML(96)
        + '<div style="flex:1;background:#FFF8E1;border:2px solid #D97706;border-radius:16px;padding:10px 12px"><p style="margin:0 0 6px"><b>Nhân vật dẫn đường:</b></p><p style="margin:0">“Chào bạn! Mình là người dẫn đường của Biệt đội Săn Từ. Phố này có 3 viên ngọc từ đang chờ bạn — chạy nhảy né bẫy, thu đủ ngọc rồi giải mật mã và đánh bại Quái Đá nhé!”</p></div></div>'
        + '<div class="row" style="margin-top:10px"><button class="btn btn-primary" id="waIntroGo" style="flex:1;padding:14px;font-size:18px">🏃 Bắt đầu chạy!</button></div>'
        + '<p class="mut">Chạm vào màn hình cũng nhảy. Trên máy tính: phím Cách/↑ = nhảy, ↓ = trượt.</p></div>';
      wireBack();
      var bb0 = document.getElementById("btnBack");
      if (bb0) bb0.onclick = function () { waStopLoop(l); backFromLesson(); };
      waUpdateHud(l);
      document.getElementById("waIntroGo").onclick = function () { s.introSeen = true; render(); };
      return;
    }
    app.innerHTML = head + '<div class="game-hud"><p id="waHud"></p><p id="waBanner" class="mut">Chạy thôi! Nhảy qua đá, trượt qua dây leo, chạm vào ngọc để thu thập.</p></div>'
      + '<div class="qblock"><canvas id="waCanvas" width="360" height="240" style="width:100%;max-width:480px;border:2px solid #D97706;border-radius:20px;background:#FDEFC8;display:block"></canvas>'
      + '<div class="row" style="margin-top:8px"><button class="btn btn-primary" id="waJump" style="flex:1;padding:14px;font-size:18px">🦘 NHẢY</button><button class="btn btn-primary" id="waSlide" style="flex:1;padding:14px;font-size:18px">🐍 TRƯỢT</button></div>'
      + '<p class="mut">Chạm vào màn hình cũng nhảy. Trên máy tính: phím Cách/↑ = nhảy, ↓ = trượt.</p></div>';
    wireBack();
    var bb = document.getElementById("btnBack");
    if (bb) bb.onclick = function () { waStopLoop(l); backFromLesson(); };
    waUpdateHud(l);
    document.getElementById("waJump").onclick = function () { waJump(l); };
    document.getElementById("waSlide").onclick = function () { waSlide(l); };
    document.getElementById("waCanvas").onclick = function () { waJump(l); };
    waDrawRun(l);
    waStartLoop(l);
    return;
  }
  if (s.phase === "cipher") {
    var c = s.cipher;
    app.innerHTML = head + '<div class="qblock"><h3>🔐 Mật mã nghe–đánh vần</h3><p>Cánh cửa đá chỉ mở khi xếp đúng thứ tự các chữ cái của từ ngọc đầu tiên: <b>' + esc(c.wordItem.translation_vi) + '</b>. Bấm Nghe để nghe giọng tổng hợp đánh vần, rồi bấm các phiến đá đúng thứ tự.</p>'
      + '<p><button class="btn btn-primary" id="waHear">🔊 Nghe đánh vần</button> <span id="waCipherProg"></span></p>'
      + '<div class="row" id="waCipherTabs"></div><p class="mut">Bấm sai không trừ mạng — từ vào Sổ lỗi sai. Bấm sai 2 lần ở cùng một vị trí thì phiến đúng sẽ viền vàng gợi ý.</p></div>';
    wireBack();
    document.getElementById("waHear").onclick = function () { waCipherSpeak(l); };
    waRenderCipherTabs(l);
    return;
  }
  if (s.phase === "boss") {
    app.innerHTML = head + '<div class="game-hud"><p id="waHud"></p><p id="waBanner" class="mut">Quái Đá sắp tấn công — vùng đỏ là vùng nguy hiểm, chạy ra khỏi vùng đỏ trước khi đá rơi! Khi boss choáng (dấu ✦) thì trả lời đúng để đánh trả.</p></div>'
      + '<div class="qblock"><canvas id="waCanvas" width="360" height="240" style="width:100%;max-width:480px;border:2px solid #D97706;border-radius:20px;background:#1f2937;display:block"></canvas>'
      + '<div class="row" style="margin-top:8px"><button class="btn btn-primary" id="waLeft" style="flex:1;padding:14px;font-size:18px">◀ Chạy trái</button><button class="btn btn-primary" id="waRight" style="flex:1;padding:14px;font-size:18px">Chạy phải ▶</button></div>'
      + '<div id="waBossQ" style="margin-top:8px"></div>'
      + '<p class="mut">Trên máy tính: phím ← → để di chuyển. Checkpoint: qua mỗi giai đoạn sẽ lưu lại — thua trong trận boss thì chơi lại từ giai đoạn gần nhất.</p></div>';
    wireBack();
    var bb2 = document.getElementById("btnBack");
    if (bb2) bb2.onclick = function () { waStopLoop(l); backFromLesson(); };
    waUpdateHud(l);
    document.getElementById("waLeft").onclick = function () { waMoveBoss(l, -1); };
    document.getElementById("waRight").onclick = function () { waMoveBoss(l, 1); };
    document.getElementById("waCanvas").onclick = function () { };
    waDrawBoss(l);
    if (s.boss && s.boss.mode === "stun") waRenderBossQ(l);
    waStartLoop(l);
    return;
  }
  if (s.phase === "end") {
    var rightD = waDedupWords(s.rightList), wrongD = waDedupWords(s.wrongList);
    var gemsHtml = s.collected.map(function (g) { return esc(g.source_text) + " — " + esc(g.translation_vi); }).join("; ") || "chưa có";
    app.innerHTML = head + '<div class="reward-frame">' + summaryBadgeSVG() + '<h2>🏁 Thắng boss rồi!</h2><p>Điểm: <b>' + s.finalScore + '</b></p>' + waRewardStarsHTML(s.finalStars) + '<p>Ngọc đã thu: ' + gemsHtml + '</p><p class="mut">Boss mệt rồi, ngồi xuống và tặng rương — không có bạo lực, chỉ có kiến thức thắng.</p>'
      + gameSummaryHTML(rightD, wrongD)
      + '<div class="row"><button class="btn btn-primary" id="waAgain">🔁 Chơi lại vòng mới</button><button class="btn" id="waHub">Về Luyện tập</button></div></div>';
    wireBack();
    waAnimateRewardStars();
    document.getElementById("waAgain").onclick = function () { waResetToIsland(l); };
    document.getElementById("waHub").onclick = function () { waStopLoop(l); backFromLesson(); go("practice"); };
    var rw = document.getElementById("gmReviewWrong");
    if (rw) rw.onclick = function () { l.wrongKeys = s.wrongKeys; gameReviewWrongNow(l); };
    return;
  }
  if (s.phase === "fail") {
    var btns = "";
    if (s.checkpoint >= 2 && s.boss) btns += '<button class="btn btn-primary" id="waRetryCp">↩️ Chơi lại từ checkpoint (giai đoạn ' + s.checkpoint + ")</button>";
    app.innerHTML = head + '<div class="summarybox"><h2>💪 Chưa qua vòng này!</h2><p>' + esc(s.failReason || "") + '</p><p class="mut">Thua trong game không trừ gì ở phần học. Từ sai (nếu có) đã vào Sổ lỗi sai để ôn lại.</p>'
      + '<div class="row">' + btns + '<button class="btn btn-primary" id="waAgain">🔁 Chơi lại từ đầu</button><button class="btn" id="waHub">Về Luyện tập</button></div></div>';
    wireBack();
    var rc = document.getElementById("waRetryCp");
    if (rc) rc.onclick = function () { waResumeCheckpoint(l); };
    document.getElementById("waAgain").onclick = function () { waResetToIsland(l); };
    document.getElementById("waHub").onclick = function () { waStopLoop(l); backFromLesson(); go("practice"); };
    return;
  }
  app.innerHTML = head + '<div class="qblock"><p>Trạng thái vòng chơi không rõ — bấm Chơi lại để bắt đầu vòng mới.</p><div class="row"><button class="btn btn-primary" id="waAgain">🔁 Chơi lại</button></div></div>';
  wireBack();
  document.getElementById("waAgain").onclick = function () { waResetToIsland(l); };
}

/* API dùng chung cho UI và probe kiểm chứng. */
window.WordAdv = {
  pickIslands: waPickIslands,
  adapter: waAdapterItems,
  bankHas: function (setIdx, w, vi) {
    var s = (typeof CONTENT !== "undefined" && CONTENT.vocab) ? CONTENT.vocab[setIdx] : null;
    if (!s) return false;
    for (var i = 0; i < (s.cards || []).length; i++) if (s.cards[i].w === w && s.cards[i].vi === vi) return true;
    return false;
  },
  vocabTopic: function (setIdx) {
    var s = (typeof CONTENT !== "undefined" && CONTENT.vocab) ? CONTENT.vocab[setIdx] : null;
    return s ? (s.topic || "") : "";
  },
  newLoop: waNewLoop,
  startIsland: function (l, si) { waNewLoop(l, si); },
  stepRun: waRunStep,
  stepBoss: waBossStep,
  tapCipher: waTapCipher,
  answerBoss: waAnswerBoss,
  moveBoss: waMoveBoss,
  jump: waJump,
  slide: waSlide,
  startLoop: waStartLoop,
  stopLoop: waStopLoop,
  startCipher: waStartCipher,
  startBoss: waStartBoss,
  finish: waFinish,
  toFail: waToFail,
  resumeCheckpoint: waResumeCheckpoint,
  drawRun: waDrawRun,
  drawBoss: waDrawBoss,
  rewardStarsHTML: waRewardStarsHTML,
  animateStars: waAnimateRewardStars
};
