/* ---------- THÀNH PHỐ NGÔN NGỮ — LANGUAGE QUEST, CHƯƠNG 1 (v61) ----------
   Vertical slice game PC theo MASTER PROMPT (Bùi gửi 09:54 04/11/2026) +
   báo cáo khảo sát giai đoạn 1 (04/11/2026). Chỉ 1 chương tiếng Anh, chơi
   bằng WASD/phím mũi tên/chuột trên PC. Nhịp chương: khám phá → gặp 2 NPC
   (hội thoại phân nhánh hub-and-spoke + cờ trạng thái) → thu đúng 3 manh
   mối → bảng điều tra nối manh mối → kết luận + bằng chứng → mở khóa
   chương sau → lưu tiến trình (dùng chung hệ XP/kỷ lục/SRS/Sổ lỗi sai với
   vòng mobile v60, không viết lại bản khác).
   Nguyên tắc: nội dung học LÀ nước đi thắng — nhiệm vụ dịch bảng hiệu,
   bảng nối nghĩa và kết luận đều giải bằng kiến thức ngôn ngữ, không phải
   trắc nghiệm dán giữa hai đoạn đi lại; sai ngôn ngữ vào Sổ lỗi sai, không
   trừ mạng, không khóa tiến trình sau trả phí. Nội dung chỉ đọc từ bank gốc
   CONTENT.vocab qua adapter dưới đây, KHÔNG copy bank sang bản riêng; thiếu
   dữ liệu dạng nào thì bỏ dạng đó, không bịa từ/phiên âm. Hội thoại do web
   tự soạn và kiểm tra như nội dung học; câu tiếng Anh trong game đều ngắn
   và đúng ngữ pháp. Đồ họa tự vẽ bằng canvas, không lấy hình/màu/linh vật
   của game nào. */
var LQ_W = 640, LQ_H = 400, LQ_SPEED = 150, LQ_NEAR = 62;
var LQ_NPCS = {
  librarian: { name: "Thủ thư", x: 125, y: 158, color: "#7c3aed" },
  merchant: { name: "Người bán hàng", x: 515, y: 158, color: "#059669" }
};
var LQ_CHEST = { x: 515, y: 262 };
var LQ_CLUE_SPOTS = [
  { place: "Thư viện", witness: "Thủ thư", prefix: "Thủ thư cho biết", giver: "librarian" },
  { place: "Chợ", witness: "Người bán hàng", prefix: "Người bán hàng cho biết", giver: "merchant" },
  { place: "Cổng Học viện", witness: "Tấm bảng ở cổng", prefix: "Tấm bảng ở cổng ghi", giver: "chest" }
];

/* ---------- Cảnh minh họa đã duyệt (phong cách truyện tranh) ----------
   Chỉ đổi lớp vỏ, không đổi luật/điểm/kho từ. Ảnh bản đồ đảo làm nền
   thành phố, ảnh sách phép mở đầu chương, chân dung nhân vật dẫn đường
   dùng cho mọi hộp thoại (một nhân vật xuyên suốt). Ảnh nào lỗi thì tự
   rơi về hình vẽ bằng code cũ, game không bao giờ vỡ. */
var LQ_IMG_MAP = "assets/media-generation-world-map-0-ba0b452e-b805-4eea-812a-a738d83297ab.webp";
var LQ_IMG_BOOK = "assets/media-generation-magic-book-opening-0-5d1589d4-da6a-4117-8438-7d7b8e4614c9.webp";
var LQ_IMG_GUIDE = "assets/media-generation-npc-guide-portrait-0-91c329a7-065e-4e04-801e-63b953c59598.webp";
var lqImgCache = {};
function lqImg(src) {
  if (lqImgCache[src]) return lqImgCache[src];
  var img = null;
  try { img = new Image(); img.src = src; } catch (e) { img = null; }
  lqImgCache[src] = img;
  return img;
}
function lqImgReady(img) { try { return !!(img && img.complete && img.naturalWidth > 0); } catch (e) { return false; } }
/* ---------- Chuyển động thật (đợt vẽ 2D): chu trình đi + hạt + nhấp nháy --
   Bản đồ đảo là bảng cố định (điểm bấm phải khớp vị trí vẽ) nên ảnh bản đồ
   KHÔNG dịch chuyển (dịch sẽ làm điểm bấm lệch khỏi tòa nhà vẽ trên ảnh);
   chuyển động đến từ: mây trôi trên bản đồ, vòng nhấp nháy quanh điểm bấm
   gần nhất, chu trình chân đi + nhún thở của nhân vật, hạt bụi bước chân.
   Hạt dùng lại (pool cố định), không cấp phát trong vòng lặp, không dùng
   shadowBlur/filter blur. */
function lqMod(v, m) { return ((v % m) + m) % m; }
var LQ_PARTICLE_MAX = 20;
function lqParticlesInit(s) {
  if (s.particles && s.particles.length === LQ_PARTICLE_MAX) return;
  s.particles = [];
  for (var i = 0; i < LQ_PARTICLE_MAX; i++) s.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2 });
}
function lqParticleSpawn(s, x, y, kind) {
  lqParticlesInit(s);
  for (var i = 0; i < s.particles.length; i++) {
    var p = s.particles[i];
    if (p.life <= 0) {
      p.x = x; p.y = y;
      p.vx = Math.random() * 40 - 50;
      p.vy = Math.random() * -30 - 10;
      p.life = p.max = 700;
      p.size = 2;
      return;
    }
  }
}
function lqParticlesStep(s, dt) {
  lqParticlesInit(s);
  for (var i = 0; i < s.particles.length; i++) {
    var p = s.particles[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.vy += 40 * dt / 1000;
  }
}
function lqDrawParticles(ctx, s) {
  if (!s.particles) return;
  for (var i = 0; i < s.particles.length; i++) {
    var p = s.particles[i];
    if (p.life <= 0) continue;
    var a = Math.max(0, p.life / p.max);
    ctx.fillStyle = "rgba(214,182,140," + (a * 0.7).toFixed(2) + ")";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
}
function lqCharPose(moving, animT) {
  if (moving) { var sw = Math.sin(animT * 0.02); return { legSwing: sw * 6, bob: Math.abs(sw) * 2 }; }
  return { legSwing: 0, bob: Math.sin(animT * 0.002) * 1.5 };
}
function lqDrawChar(ctx, px, py, pose) {
  var y = py - pose.bob;
  ctx.fillStyle = "#f59e0b"; ctx.fillRect(px - 10, y - 28, 20, 28);
  ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(px, y - 36, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b45309"; ctx.fillRect(px - 12, y - 46, 24, 5);
  ctx.fillStyle = "#92400e";
  var sw = pose.legSwing;
  ctx.fillRect(px - 8 + Math.min(0, sw) * 0.4, y - 14, 6, 14 - Math.max(0, sw) * 0.3);
  ctx.fillRect(px + 2 + Math.max(0, sw) * 0.4, y - 14, 6, 14 - Math.max(0, -sw) * 0.3);
}
function lqPulseR(animT) { return 30 + Math.sin(animT * 0.005) * 4; }
function lqDrawClouds(ctx, W, animT) {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  var bases = [80, 300, 500];
  for (var i = 0; i < 3; i++) {
    var cx = lqMod(bases[i] + animT * 0.005 + i * 60, W + 120) - 60;
    var cy = 30 + i * 18;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.arc(cx + 20, cy + 5, 15, 0, Math.PI * 2); ctx.arc(cx - 20, cy + 6, 13, 0, Math.PI * 2); ctx.fill();
  }
}
function lqGuideImgHTML(size) {
  var s = size || 96;
  return '<img src="' + LQ_IMG_GUIDE + '" alt="Nhân vật dẫn đường" style="width:' + s + 'px;height:' + s + 'px;object-fit:cover;border-radius:50%;border:3px solid #D97706;flex:none" onerror="this.style.display=\'none\'">';
}
/* Màn thưởng: luôn hiện đủ 3 ô sao để thấy thang 3 sao, rồi lấp từng sao
   một theo nhịp rõ ràng, giống hệt vòng mobile. Trước đây sao lấp có độ
   trễ khó hiểu và không nhất quán với mobile. */
function lqRewardStarsHTML(stars) {
  var n = stars || 0;
  var out = '<p class="rw-stars" data-stars-earned="' + n + '"><span class="mut">Thang 3 sao: </span>';
  for (var i = 0; i < 3; i++) out += '<span class="rw-star-slot" data-star-slot="' + (i + 1) + '" style="font-size:34px">☆</span>';
  out += ' <span class="rw-star-count">' + n + '/3 sao</span></p>';
  return out;
}
function lqAnimateRewardStars() {
  var box = document.querySelector("[data-stars-earned]");
  if (!box) return;
  var earned = parseInt(box.getAttribute("data-stars-earned"), 10) || 0;
  var slots = box.querySelectorAll("[data-star-slot]");
  function fill(k) { for (var i = 0; i < slots.length; i++) if (i < k) slots[i].textContent = "⭐"; }
  for (var j = 0; j < earned; j++) (function (k) { setTimeout(function () { fill(k); }, 450 * k); })(j + 1);
  setTimeout(function () { fill(earned); }, 450 * earned + 200);
}
/* Bấm vào khu vực tòa nhà thì đi tới đúng nhân vật/rương của khu đó, thay
   vì chỉ bấm trúng chấm nhỏ mới đi. Trước đây bấm vào tòa nhà thì nhân
   vật đi tới giữa tòa nhà rồi vẫn đứng xa nhân vật, không nói chuyện được. */
function lqSnapTarget(x, y) {
  if (x >= 10 && x <= 240 && y >= 5 && y <= 185) return [LQ_NPCS.librarian.x, LQ_NPCS.librarian.y];
  if (x >= 400 && x <= 630 && y >= 5 && y <= 185) return [LQ_NPCS.merchant.x, LQ_NPCS.merchant.y];
  if (x >= 400 && x <= 630 && y >= 240 && y <= 395) return [LQ_CHEST.x, LQ_CHEST.y];
  return null;
}

/* Content Adapter (chỉ đọc bank gốc, không copy): ánh xạ thẻ thật sang
   trường chuẩn của MASTER PROMPT, cùng kiểu với vòng mobile v60. */
function lqAdapterItems(setIdx) {
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
function lqPickSet() {
  if (typeof CONTENT === "undefined" || !CONTENT.vocab) return -1;
  var best = -1, bestN = 0;
  for (var i = 0; i < CONTENT.vocab.length; i++) {
    var n = vocabSetCards(i).length;
    if (n > bestN) { bestN = n; best = i; }
  }
  var cur = gameCurrentVocabSet();
  if (vocabSetCards(cur).length >= 6) return cur;
  return bestN >= 6 ? best : -1;
}
function lqNewChapter(l) {
  var setIdx = lqPickSet();
  if (setIdx < 0) { l.lq = { noSet: true }; return; }
  var cards = gameShuffle(vocabSetCards(setIdx));
  var clues = cards.slice(0, 3).map(function (c, i) {
    return { word: c.w, vi: c.vi, ex: c.ex || "", place: LQ_CLUE_SPOTS[i].place, witness: LQ_CLUE_SPOTS[i].witness, prefix: LQ_CLUE_SPOTS[i].prefix, giver: LQ_CLUE_SPOTS[i].giver };
  });
  var taskWords = cards.slice(3, 6).map(function (c) { return { word: c.w, vi: c.vi }; });
  l.lq = {
    phase: "city",
    setIdx: setIdx,
    setTopic: (CONTENT.vocab[setIdx] || {}).topic || "",
    px: 320, py: 215, tx: -1, ty: -1, keys: {},
    flags: { askedTransfer: false, helpedMerchant: false, hasKey: false, gateHint: false, merchantHint: false },
    clueWords: clues,
    taskWords: taskWords,
    found: [false, false, false],
    talkNpc: null, talkView: "hub", talkLines: [],
    taskQi: 0, taskCur: null, taskAnswered: false, taskFirstTry: 0, taskTried: [false, false, false],
    statements: [], links: {}, boardDone: false, boardBonus: false, showNotes: false, boardMsg: "",
    concChoice: -1, concEv: [], concMsg: "",
    score: 0, wrongCount: 0, rightList: [], wrongList: [], wrongKeys: [],
    loopOn: false, raf: 0, keyHandler: null, keyUpHandler: null,
    animT: 0, dustClock: 0, particles: null, moving: false,
    finalScore: 0, finalStars: 0
  };
}
function lqClueCount(l) { var s = l.lq; if (!s) return 0; var n = 0; for (var i = 0; i < 3; i++) if (s.found[i]) n++; return n; }
function lqDist(x1, y1, x2, y2) { var dx = x1 - x2, dy = y1 - y2; return Math.sqrt(dx * dx + dy * dy); }
function lqNear(l, x, y) { return lqDist(l.lq.px, l.lq.py, x, y) <= LQ_NEAR; }
function lqObjective(l) {
  var s = l.lq; if (!s) return "";
  if (s.phase === "end") return "Đã phá xong vụ án Chương 1!";
  var n = lqClueCount(l);
  if (n === 0) return "Mục tiêu: tới Thư viện (góc trên bên trái) nói chuyện với Thủ thư.";
  if (n === 1 && !s.flags.helpedMerchant) return "Mục tiêu: tới Chợ (góc trên bên phải) nói chuyện với Người bán hàng.";
  if (n === 1) return "Mục tiêu: hỏi Người bán hàng về trang từ điển để lấy trang thứ hai.";
  if (n === 2 && !s.flags.hasKey) return "Mục tiêu: giúp Người bán hàng dịch bảng hiệu để lấy chìa khóa cổng Học viện.";
  if (n === 2) return "Mục tiêu: tới Cổng Học viện (góc dưới bên phải) mở rương lấy trang cuối.";
  if (n === 3 && !s.boardDone) return "Mục tiêu: mở bảng điều tra, nối mỗi trang với đúng lời khai.";
  if (s.boardDone) return "Mục tiêu: trình bày kết luận cuối chương.";
  return "";
}

/* ---------- Vòng lặp di chuyển ---------- */
function lqStopLoop(l) {
  if (!l || !l.lq) return;
  l.lq.loopOn = false;
  try { if (l.lq.raf) { if (window.cancelAnimationFrame) window.cancelAnimationFrame(l.lq.raf); else clearTimeout(l.lq.raf); } } catch (e) {}
  l.lq.raf = 0;
  if (l.lq.keyHandler) { try { document.removeEventListener("keydown", l.lq.keyHandler); } catch (e) {} l.lq.keyHandler = null; }
  if (l.lq.keyUpHandler) { try { document.removeEventListener("keyup", l.lq.keyUpHandler); } catch (e) {} l.lq.keyUpHandler = null; }
}
function lqStartLoop(l) {
  if (!l || !l.lq || l.lq.loopOn || l.lq.phase !== "city") return;
  l.lq.loopOn = true;
  var raf = window.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 32); };
  var last = Date.now();
  var tick = function (now) {
    if (!l.lq || !l.lq.loopOn) return;
    if (typeof curLesson === "undefined" || curLesson !== l) { lqStopLoop(l); return; }
    var dt = Math.min(100, Math.max(0, (now || Date.now()) - last)); last = now || Date.now();
    if (l.lq.phase === "city") { lqStep(l, dt); lqDrawCity(l); lqUpdateCityUI(l); }
    else { lqStopLoop(l); return; }
    l.lq.raf = raf(tick);
  };
  l.lq.raf = raf(tick);
  var kh = function (e) {
    if (!l.lq || l.lq.phase !== "city") return;
    var k = e.key;
    if (k === "w" || k === "W" || k === "ArrowUp") { e.preventDefault(); l.lq.keys.up = true; l.lq.tx = -1; }
    else if (k === "s" || k === "S" || k === "ArrowDown") { e.preventDefault(); l.lq.keys.down = true; l.lq.tx = -1; }
    else if (k === "a" || k === "A" || k === "ArrowLeft") { e.preventDefault(); l.lq.keys.left = true; l.lq.tx = -1; }
    else if (k === "d" || k === "D" || k === "ArrowRight") { e.preventDefault(); l.lq.keys.right = true; l.lq.tx = -1; }
  };
  var ku = function (e) {
    if (!l.lq) return;
    var k = e.key;
    if (k === "w" || k === "W" || k === "ArrowUp") l.lq.keys.up = false;
    else if (k === "s" || k === "S" || k === "ArrowDown") l.lq.keys.down = false;
    else if (k === "a" || k === "A" || k === "ArrowLeft") l.lq.keys.left = false;
    else if (k === "d" || k === "D" || k === "ArrowRight") l.lq.keys.right = false;
  };
  l.lq.keyHandler = kh; l.lq.keyUpHandler = ku;
  document.addEventListener("keydown", kh);
  document.addEventListener("keyup", ku);
}
function lqStep(l, dt) {
  var s = l.lq; if (!s || s.phase !== "city") return;
  var dx = 0, dy = 0;
  if (s.keys.left) dx -= 1; if (s.keys.right) dx += 1; if (s.keys.up) dy -= 1; if (s.keys.down) dy += 1;
  var movingNow = !!(dx || dy || (s.tx >= 0 && s.ty >= 0));
  if (dx || dy) {
    s.tx = -1; s.ty = -1;
    var len = Math.sqrt(dx * dx + dy * dy);
    s.px += dx / len * LQ_SPEED * dt / 1000;
    s.py += dy / len * LQ_SPEED * dt / 1000;
  } else if (s.tx >= 0 && s.ty >= 0) {
    var vx = s.tx - s.px, vy = s.ty - s.py, d = Math.sqrt(vx * vx + vy * vy);
    var step = LQ_SPEED * dt / 1000;
    if (d <= step) { s.px = s.tx; s.py = s.ty; s.tx = -1; s.ty = -1; }
    else { s.px += vx / d * step; s.py += vy / d * step; }
  }
  s.px = Math.max(16, Math.min(LQ_W - 16, s.px));
  s.py = Math.max(16, Math.min(LQ_H - 16, s.py));
  s.moving = movingNow;
  s.animT = (s.animT || 0) + dt;
  lqParticlesStep(s, dt);
  if (movingNow) {
    s.dustClock = (s.dustClock || 0) + dt;
    if (s.dustClock >= 160) { s.dustClock = 0; lqParticleSpawn(s, s.px - 4, s.py - 2, 0); }
  }
}
function lqUpdateCityUI(l) {
  var s = l.lq; if (!s || s.phase !== "city") return;
  var hud = document.getElementById("lqHud");
  if (hud) hud.textContent = "📄 Trang đã tìm: " + lqClueCount(l) + "/3 · Điểm: " + s.score;
  var obj = document.getElementById("lqObj");
  if (obj) obj.textContent = lqObjective(l);
  var b1 = document.getElementById("lqTalkLibrarian");
  if (b1) b1.disabled = !lqNear(l, LQ_NPCS.librarian.x, LQ_NPCS.librarian.y);
  var b2 = document.getElementById("lqTalkMerchant");
  if (b2) b2.disabled = !lqNear(l, LQ_NPCS.merchant.x, LQ_NPCS.merchant.y);
  var b3 = document.getElementById("lqOpenChest");
  if (b3) b3.disabled = !(lqNear(l, LQ_CHEST.x, LQ_CHEST.y) && s.flags.hasKey);
  var b4 = document.getElementById("lqOpenBoard");
  if (b4) b4.disabled = lqClueCount(l) < 3;
  var b5 = document.getElementById("lqOpenConc");
  if (b5) b5.disabled = !s.boardDone;
}
function lqDrawCity(l) {
  var s = l.lq; if (!s) return;
  var cv = document.getElementById("lqCanvas"); if (!cv) return;
  var ctx = null; try { ctx = cv.getContext("2d"); } catch (e) {} if (!ctx) return;
  var W = LQ_W, H = LQ_H;
  var mapImg = lqImg(LQ_IMG_MAP);
  if (lqImgReady(mapImg)) {
    var sc = Math.max(W / mapImg.naturalWidth, H / mapImg.naturalHeight);
    var dw = mapImg.naturalWidth * sc, dh = mapImg.naturalHeight * sc;
    ctx.drawImage(mapImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(255,251,235,0.18)"; ctx.fillRect(0, 0, W, H);
    lqDrawClouds(ctx, W, s.animT || 0);
    function plate(x, y, label) {
      ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
      var tw = ctx.measureText(label).width + 20;
      ctx.fillStyle = "rgba(31,41,55,0.78)";
      ctx.fillRect(x - tw / 2, y - 16, tw, 22);
      ctx.fillStyle = "#fff"; ctx.fillText(label, x, y);
    }
    function marker(x, y, color, label) {
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("●", x, y + 5);
      plate(x, y + 46, label);
    }
    marker(LQ_NPCS.librarian.x, LQ_NPCS.librarian.y, "#7c3aed", "📚 Thư viện · Thủ thư");
    marker(LQ_NPCS.merchant.x, LQ_NPCS.merchant.y, "#059669", "🛍️ Chợ · Người bán hàng");
    if (!s.found[2]) marker(LQ_CHEST.x, LQ_CHEST.y, "#b45309", "📦 Rương ở Cổng Học viện");
    if (lqNear(l, LQ_NPCS.librarian.x, LQ_NPCS.librarian.y)) { ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", LQ_NPCS.librarian.x, LQ_NPCS.librarian.y - 34); }
    if (lqNear(l, LQ_NPCS.merchant.x, LQ_NPCS.merchant.y)) { ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", LQ_NPCS.merchant.x, LQ_NPCS.merchant.y - 34); }
    if (!s.found[2] && lqNear(l, LQ_CHEST.x, LQ_CHEST.y)) { ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", LQ_CHEST.x, LQ_CHEST.y - 34); }
    var pr = lqPulseR(s.animT || 0);
    ctx.strokeStyle = "rgba(245,158,11,0.8)"; ctx.lineWidth = 3;
    if (lqNear(l, LQ_NPCS.librarian.x, LQ_NPCS.librarian.y)) { ctx.beginPath(); ctx.arc(LQ_NPCS.librarian.x, LQ_NPCS.librarian.y, pr, 0, Math.PI * 2); ctx.stroke(); }
    if (lqNear(l, LQ_NPCS.merchant.x, LQ_NPCS.merchant.y)) { ctx.beginPath(); ctx.arc(LQ_NPCS.merchant.x, LQ_NPCS.merchant.y, pr, 0, Math.PI * 2); ctx.stroke(); }
    if (!s.found[2] && lqNear(l, LQ_CHEST.x, LQ_CHEST.y)) { ctx.beginPath(); ctx.arc(LQ_CHEST.x, LQ_CHEST.y, pr, 0, Math.PI * 2); ctx.stroke(); }
    lqDrawChar(ctx, s.px, s.py, lqCharPose(!!s.moving, s.animT || 0));
    lqDrawParticles(ctx, s);
    var veil = Math.max(0, 0.45 - (s.animT || 0) / 900);
    if (veil > 0) { ctx.fillStyle = "rgba(255,248,225," + veil.toFixed(2) + ")"; ctx.fillRect(0, 0, W, H); }
    return;
  }
  ctx.fillStyle = "#dcfce7"; ctx.fillRect(0, 0, W, H);
  lqDrawClouds(ctx, W, s.animT || 0);
  ctx.fillStyle = "#fef9c3"; ctx.beginPath(); ctx.arc(W - 40, 210, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fef3c7"; ctx.fillRect(190, 180, 260, 90);
  ctx.fillStyle = "#1f2937"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Quảng trường", 320, 228);
  function building(x, y, w, h, fill, label) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#1f2937"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  }
  building(30, 25, 190, 100, "#ddd6fe", "📚 Thư viện");
  building(420, 25, 190, 100, "#fde68a", "🛍️ Chợ");
  building(420, 275, 190, 100, "#bfdbfe", "🎓 Học viện");
  ctx.fillStyle = "#16a34a";
  [[60, 320], [110, 345], [170, 315]].forEach(function (t) { ctx.beginPath(); ctx.arc(t[0], t[1], 20, 0, Math.PI * 2); ctx.fill(); });
  function npc(n) {
    ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(n.x, n.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("●", n.x, n.y + 5);
    ctx.fillStyle = "#1f2937"; ctx.font = "12px sans-serif";
    ctx.fillText(n.name, n.x, n.y + 32);
    if (lqNear(l, n.x, n.y)) { ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px sans-serif"; ctx.fillText("!", n.x, n.y - 24); ctx.strokeStyle = "rgba(245,158,11,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, lqPulseR(l.lq.animT || 0) - 10, 0, Math.PI * 2); ctx.stroke(); }
  }
  npc(LQ_NPCS.librarian); npc(LQ_NPCS.merchant);
  if (!s.found[2]) {
    ctx.fillStyle = "#b45309"; ctx.fillRect(LQ_CHEST.x - 14, LQ_CHEST.y - 8, 28, 18);
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(LQ_CHEST.x - 14, LQ_CHEST.y - 12, 28, 6);
    ctx.fillStyle = "#1f2937"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Rương", LQ_CHEST.x, LQ_CHEST.y + 28);
    if (lqNear(l, LQ_CHEST.x, LQ_CHEST.y)) { ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px sans-serif"; ctx.fillText("!", LQ_CHEST.x, LQ_CHEST.y - 24); ctx.strokeStyle = "rgba(245,158,11,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(LQ_CHEST.x, LQ_CHEST.y, lqPulseR(l.lq.animT || 0) - 10, 0, Math.PI * 2); ctx.stroke(); }
  }
  lqDrawChar(ctx, s.px, s.py, lqCharPose(!!s.moving, s.animT || 0));
  lqDrawParticles(ctx, s);
  var veil2 = Math.max(0, 0.45 - (s.animT || 0) / 900);
  if (veil2 > 0) { ctx.fillStyle = "rgba(255,248,225," + veil2.toFixed(2) + ")"; ctx.fillRect(0, 0, W, H); }
}

/* ---------- Màn hình ---------- */
function lqBackToCity(l) {
  var s = l.lq; if (!s) return;
  s.phase = "city"; s.talkNpc = null; s.talkView = "hub"; s.talkLines = [];
  render();
}
function lqTalkOptions(l, npc) {
  var s = l.lq, opts = [];
  if (npc === "librarian") {
    opts.push({ id: "pages", label: "Hỏi về các trang từ điển bị mất" });
    opts.push({ id: "transfer", label: "Hỏi về việc chuyển sách sáng nay" });
    opts.push({ id: "gate", label: "Hỏi về cánh cửa Học viện bị khóa" });
  } else {
    opts.push({ id: "task", label: "Giúp dịch bảng hiệu của quán" });
    opts.push({ id: "ask", label: "Hỏi thẳng về trang từ điển" });
    if (s.flags.askedTransfer) opts.push({ id: "transfer", label: "Hỏi về người chuyển sách đi qua Chợ" });
  }
  opts.push({ id: "bye", label: "Tạm biệt, hẹn gặp lại" });
  return opts;
}
function lqChooseOpt(l, npc, id) {
  var s = l.lq; if (!s) return;
  if (id === "bye") { lqBackToCity(l); return; }
  if (npc === "librarian") {
    if (id === "pages") {
      if (s.found[0]) s.talkLines = ["Trang ở Thư viện bạn đã cầm rồi — còn " + (3 - lqClueCount(l)) + " trang nữa. Cố lên nhé!"];
      else {
        s.found[0] = true; s.score += 10;
        var c = s.clueWords[0];
        s.talkLines = ["May quá! Trang đầu tiên tôi để quên ngay ở Thư viện — đây này.", "📄 Trang 1: “" + c.word + "” — " + c.vi + " (tìm thấy ở Thư viện)."];
      }
    } else if (id === "transfer") {
      s.flags.askedTransfer = true;
      s.talkLines = ["Sáng nay tôi chuyển một chồng trang từ điển từ Thư viện sang Học viện, đi qua Chợ rồi tới Cổng Học viện. Trên đường đi gió rất to, giấy bay tứ tung.", "“I carried the pages from the library to the academy.” — Tôi chuyển các trang từ thư viện sang học viện."];
    } else if (id === "gate") {
      if (s.flags.hasKey) {
        s.flags.gateHint = true;
        s.talkLines = ["Cổng Học viện khóa bằng ổ khóa cũ — chìa khóa của người bán hàng mở được đấy. Rương ở cổng có trang cuối cùng, bạn ra đó mở đi."];
      } else {
        s.talkLines = ["Cổng Học viện vẫn khóa bằng ổ khóa cũ. Người bán hàng giữ chìa khóa — bạn hỏi ông ấy xem sao."];
      }
    }
  } else {
    if (id === "task") {
      if (s.flags.helpedMerchant) { s.talkLines = ["Cảm ơn bạn, bảng hiệu dịch xong rồi! Khách đọc hiểu hết rồi đấy."]; }
      else { s.phase = "task"; s.taskQi = 0; s.taskAnswered = false; lqBuildTaskQ(l); render(); return; }
    } else if (id === "ask") {
      if (!s.flags.helpedMerchant) {
        s.talkLines = ["Tôi đang bận với bảng hiệu lắm — bạn dịch giúp tôi trước đã, rồi tôi kể cho nghe chuyện sáng nay."];
      } else if (s.found[1]) {
        s.talkLines = ["Trang ở Chợ bạn đã cầm rồi. Còn trang cuối ở Cổng Học viện — nhớ mang chìa khóa nhé!"];
      } else {
        s.found[1] = true; s.score += 10;
        var c2 = s.clueWords[1];
        s.talkLines = ["Sáng nay tôi nhặt được một trang ở Chợ — của bạn đây.", "📄 Trang 2: “" + c2.word + "” — " + c2.vi + " (tìm thấy ở Chợ)."];
      }
    } else if (id === "transfer") {
      s.flags.merchantHint = true;
      s.talkLines = ["À, sáng nay tôi thấy thủ thư đi qua Chợ, gió thổi tung cả chồng giấy. Có trang bay về phía Cổng Học viện đấy!", "“The wind blew the pages away.” — Gió đã thổi bay các trang đi."];
    }
  }
  s.talkView = "lines";
  saveState();
  render();
}
function lqBuildTaskQ(l) {
  var s = l.lq;
  var tw = s.taskWords[s.taskQi];
  if (!tw) { s.taskCur = null; return; }
  var opts = gameShuffle([tw.vi].concat(gameWordDistractors(tw.word, tw.vi, "en", 3)));
  s.taskCur = { word: tw.word, vi: tw.vi, opts: opts, a: opts.indexOf(tw.vi) };
  s.taskAnswered = false;
}
function lqAnswerTask(l, idx) {
  var s = l.lq; if (!s || !s.taskCur || s.taskAnswered) return;
  var q = s.taskCur;
  s.taskAnswered = true;
  if (idx === q.a) {
    if (!s.taskTried[s.taskQi]) { gameWordRight(q.word, q.vi, "en", true); s.rightList.push({ w: q.word, vi: q.vi }); s.taskFirstTry++; s.score += 10; }
    s.taskMsg = "Đúng rồi! “" + q.word + "” nghĩa là “" + q.vi + "”.";
  } else {
    s.wrongCount++;
    var key = gameWordWrong("langquest", q.word, q.vi, "en");
    s.wrongKeys.push(key); s.wrongList.push({ w: q.word, vi: q.vi });
    s.taskMsg = "Chưa đúng — từ đúng là “" + q.word + "” nghĩa là “" + q.vi + "”. Từ này đã vào Sổ lỗi sai để ôn lại.";
  }
  s.taskTried[s.taskQi] = true;
  render();
}
function lqTaskNext(l) {
  var s = l.lq; if (!s) return;
  s.taskQi++;
  if (s.taskQi >= 3) {
    s.flags.helpedMerchant = true; s.flags.hasKey = true;
    s.phase = "talk"; s.talkNpc = "merchant"; s.talkView = "lines";
    s.talkLines = ["Cảm ơn bạn nhiều! Bảng hiệu dịch xong rồi, khách đọc hiểu hết.", "Đây là chìa khóa cũ mở cổng Học viện — bạn cầm lấy. Sáng nay tôi nhặt được một trang ở Chợ, bạn hỏi tôi về trang đó nhé."];
    saveState();
    render();
    return;
  }
  lqBuildTaskQ(l);
  render();
}
function renderLangQuestIntro(app, l) {
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1: Bước chân vào Thành phố", type: "langquest" }, "Phiêu lưu PC: đi bộ quanh thành phố, nói chuyện, tìm manh mối, phá án bằng kiến thức. Thắng thua chỉ trong game, không chạm phần học. Sai ngôn ngữ vào Sổ lỗi sai, không trừ mạng.");
  var setIdx = lqPickSet();
  var body = '<div class="qblock"><h3>🏙️ Bước chân vào Thành phố Ngôn Ngữ</h3><img src="' + LQ_IMG_BOOK + '" alt="Sách phép mở ra thành phố" style="width:100%;max-width:640px;border-radius:20px;border:2px solid #D97706;display:block" onerror="this.style.display=\'none\'"><p class="mut">Mở sách phép ra, cả thành phố hiện lên!</p><p>Sáng nay, một sự cố bí ẩn làm thất lạc các trang từ điển của thành phố. Thủ thư chuyển sách từ Thư viện sang Học viện thì gió thổi bay mất mấy trang. Bạn hãy vào thành phố, nói chuyện với người dân, tìm lại 3 trang, nối manh mối trên bảng điều tra rồi trình bày kết luận.</p>';
  var best = gameBest("langquest", "en");
  if (best) body += '<p class="mut">Kỷ lục của bạn: ' + best.score + ' điểm · ' + "⭐".repeat(best.stars || 0) + '</p>';
  if (setIdx < 0) body += '<p>Chưa có bộ từ nào đủ 6 thẻ để chơi chương này — bạn học thêm vài thẻ rồi quay lại nhé.</p>';
  else {
    var st = CONTENT.vocab[setIdx];
    body += '<p class="mut">Chơi bằng bộ từ: ' + esc(st.topic || "") + ' · ' + vocabSetCards(setIdx).length + ' từ.</p>';
    body += '<p><button class="btn btn-primary" id="lqBegin">🏙️ Bắt đầu Chương 1</button></p>';
    body += '<p class="mut">Điều khiển: WASD hoặc phím mũi tên để đi, bấm vào bản đồ để đi tới đó. Đứng gần người dân hoặc rương rồi bấm nút hành động.</p>';
    var done = state.lqCh1 && state.lqCh1.done;
    body += '<p class="mut">Chương 2: Bí mật trong Thư viện Cổ — ' + (done ? 'đã mở trong hồ sơ của bạn, nội dung sẽ có ở bản sau.' : 'chưa mở — phá xong Chương 1 sẽ mở.') + '</p>';
  }
  body += '</div>';
  app.innerHTML = head + body;
  wireBack();
  var bb = document.getElementById("lqBegin");
  if (bb) bb.onclick = function () { lqNewChapter(l); render(); };
}
function renderLangQuestCity(app, l) {
  var s = l.lq;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Đi bộ quanh thành phố, nói chuyện với người dân, tìm 3 trang từ điển.");
  var chestHint = (!s.flags.hasKey && lqNear(l, LQ_CHEST.x, LQ_CHEST.y)) ? '<p class="mut">Rương ở Cổng Học viện đang khóa — cần chìa khóa của người bán hàng.</p>' : '';
  var boardBtn = s.boardDone
    ? '<button class="btn btn-primary" id="lqOpenConc">📋 Trình bày kết luận</button>'
    : '<button class="btn btn-primary" id="lqOpenBoard">🔍 Mở bảng điều tra</button>';
  app.innerHTML = head + '<div class="game-hud"><p id="lqHud"></p><p id="lqObj" class="mut"></p><p id="lqBanner" class="mut">Chào mừng tới thành phố! Đi tới Thư viện (góc trên bên trái) gặp Thủ thư nhé.</p></div>'
    + '<div class="qblock"><canvas id="lqCanvas" width="640" height="400" style="width:100%;max-width:720px;border:2px solid #D97706;border-radius:20px;background:#FFF8E1;display:block"></canvas>'
    + '<div class="row" style="margin-top:8px"><button class="btn" id="lqTalkLibrarian">💬 Nói chuyện với Thủ thư</button><button class="btn" id="lqTalkMerchant">💬 Nói chuyện với Người bán hàng</button><button class="btn" id="lqOpenChest">📦 Mở rương ở Cổng Học viện</button>' + boardBtn + '</div>'
    + chestHint
    + '<p class="mut">WASD / phím mũi tên để đi, bấm vào bản đồ để đi tới đó — bấm vào khu vực tòa nhà nào thì nhân vật đi thẳng tới người dân hoặc rương ở khu đó. Đứng gần người dân hoặc rương thì nút hành động mới bấm được.</p></div>';
  wireBack();
  var bb = document.getElementById("btnBack");
  if (bb) bb.onclick = function () { lqStopLoop(l); backFromLesson(); };
  document.getElementById("lqTalkLibrarian").onclick = function () { if (!lqNear(l, LQ_NPCS.librarian.x, LQ_NPCS.librarian.y)) return; lqStopLoop(l); s.phase = "talk"; s.talkNpc = "librarian"; s.talkView = "hub"; render(); };
  document.getElementById("lqTalkMerchant").onclick = function () { if (!lqNear(l, LQ_NPCS.merchant.x, LQ_NPCS.merchant.y)) return; lqStopLoop(l); s.phase = "talk"; s.talkNpc = "merchant"; s.talkView = "hub"; render(); };
  document.getElementById("lqOpenChest").onclick = function () {
    if (!lqNear(l, LQ_CHEST.x, LQ_CHEST.y) || !s.flags.hasKey || s.found[2]) return;
    s.found[2] = true; s.score += 10;
    var c = s.clueWords[2];
    var bn = document.getElementById("lqBanner");
    if (bn) bn.textContent = "📦 Mở rương! Trang cuối cùng: “" + c.word + "” — " + c.vi + " (tìm thấy ở Cổng Học viện). Đủ 3 trang rồi — mở bảng điều tra thôi!";
    saveState();
    lqUpdateCityUI(l); lqDrawCity(l);
  };
  var ob = document.getElementById("lqOpenBoard");
  if (ob) ob.onclick = function () { if (lqClueCount(l) < 3) return; lqStopLoop(l); lqOpenBoard(l); render(); };
  var oc = document.getElementById("lqOpenConc");
  if (oc) oc.onclick = function () { if (!s.boardDone) return; lqStopLoop(l); s.phase = "conclusion"; render(); };
  var cv = document.getElementById("lqCanvas");
  if (cv) cv.onclick = function (e) {
    var x = (typeof e.offsetX === "number") ? e.offsetX : null;
    var y = (typeof e.offsetY === "number") ? e.offsetY : null;
    if (x === null) return;
    var r = cv.getBoundingClientRect ? cv.getBoundingClientRect() : null;
    if (r && r.width) { x = x / r.width * LQ_W; y = y / r.height * LQ_H; }
    var snap = lqSnapTarget(x, y);
    if (snap) { s.tx = snap[0]; s.ty = snap[1]; }
    else { s.tx = x; s.ty = y; }
  };
  lqUpdateCityUI(l);
  lqDrawCity(l);
  lqStartLoop(l);
}
function renderLangQuestTalk(app, l) {
  var s = l.lq;
  var npc = LQ_NPCS[s.talkNpc] || LQ_NPCS.librarian;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Đang nói chuyện với " + npc.name + ".");
  var body = '';
  if (s.talkView === "lines") {
    body += s.talkLines.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    body += '<div class="row"><button class="btn btn-primary" id="lqTalkBack">← Quay lại nói chuyện</button></div>';
  } else {
    if (s.talkNpc === "librarian" && !s.flags.askedTransfer && lqClueCount(l) === 0) body += '<p><i>“Oh no! The dictionary pages are gone!”</i><br>Ôi không! Các trang từ điển biến mất rồi! Sáng nay tôi chuyển sách thì gió thổi bay mất mấy trang. Bạn giúp tôi tìm lại nhé?</p>';
    else if (s.talkNpc === "merchant" && !s.flags.helpedMerchant) body += '<p><i>“Hello! Can you help me?”</i><br>Chào bạn! Bảng hiệu của quán tôi viết bằng tiếng Anh mà khách không hiểu. Bạn dịch giúp tôi 3 từ nhé, rồi tôi kể cho nghe chuyện sáng nay.</p>';
    else body += '<p class="mut">Bạn muốn hỏi gì ' + esc(npc.name) + '?</p>';
    body += '<div class="row">' + lqTalkOptions(l, s.talkNpc).map(function (o) {
      return '<button class="btn" data-lqopt="' + o.id + '">' + esc(o.label) + '</button>';
    }).join("") + '</div>';
  }
  app.innerHTML = head + '<div class="qblock"><h3>' + esc(npc.name) + '</h3><div class="row" style="align-items:flex-start">' + lqGuideImgHTML(96) + '<div style="flex:1;background:#FFF8E1;border:2px solid #D97706;border-radius:16px;padding:10px 12px">' + body + '</div></div></div>';
  wireBack();
  var bb = document.getElementById("btnBack");
  if (bb) bb.onclick = function () { lqBackToCity(l); };
  var back = document.getElementById("lqTalkBack");
  if (back) back.onclick = function () { s.talkView = "hub"; render(); };
  app.querySelectorAll("[data-lqopt]").forEach(function (b) { b.onclick = function () { lqChooseOpt(l, s.talkNpc, b.dataset.lqopt); }; });
}
function renderLangQuestTask(app, l) {
  var s = l.lq, q = s.taskCur;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Dịch bảng hiệu giúp Người bán hàng.");
  var body = '<div class="qblock"><h3>🛍️ Dịch bảng hiệu — từ ' + (s.taskQi + 1) + '/3</h3>';
  if (!q) body += '<p>Không còn từ nào — quay lại nói chuyện nhé.</p>';
  else {
    body += '<p>“' + esc(q.word) + '” nghĩa là gì?</p><div class="row">' + q.opts.map(function (o, i) {
      return '<button class="btn" data-lqans="' + i + '"' + (s.taskAnswered ? ' disabled' : '') + '>' + esc(o) + '</button>';
    }).join("") + '</div>';
    if (s.taskAnswered) body += '<p>' + esc(s.taskMsg || "") + '</p><div class="row"><button class="btn btn-primary" id="lqTaskNext">' + (s.taskQi >= 2 ? 'Nhận chìa khóa' : 'Từ tiếp theo') + '</button></div>';
    else body += '<p class="mut">Trả lời sai không sao — từ sẽ vào Sổ lỗi sai để ôn lại, quán vẫn dịch xong.</p>';
  }
  body += '</div>';
  app.innerHTML = head + body;
  wireBack();
  var bb = document.getElementById("btnBack");
  if (bb) bb.onclick = function () { lqBackToCity(l); };
  app.querySelectorAll("[data-lqans]").forEach(function (b) { b.onclick = function () { lqAnswerTask(l, +b.dataset.lqans); }; });
  var nx = document.getElementById("lqTaskNext");
  if (nx) nx.onclick = function () { lqTaskNext(l); };
}

/* ---------- Bảng điều tra ---------- */
function lqOpenBoard(l) {
  var s = l.lq; if (!s) return;
  if (!s.statements.length) {
    s.statements = gameShuffle([0, 1, 2].map(function (i) {
      var c = s.clueWords[i];
      return { clue: i, text: c.prefix + ": “Một trang về “" + c.vi + "” ở " + c.place + ".”" };
    }));
  }
  s.phase = "board";
}
function lqLink(l, ci, si) {
  var s = l.lq; if (!s || s.phase !== "board" || s.boardDone) return;
  s.links[ci] = si;
  render();
}
function lqCheckBoard(l) {
  var s = l.lq; if (!s || s.phase !== "board") return;
  var msgs = [], wrong = 0, correct = 0;
  for (var i = 0; i < 3; i++) {
    var si = s.links[i];
    if (si === undefined || si === null) { msgs.push("Trang “" + s.clueWords[i].word + "” chưa nối với lời khai nào."); continue; }
    var st = s.statements[si];
    if (st && st.clue === i) { correct++; }
    else {
      wrong++;
      var viWord = s.clueWords[i].vi;
      var viStmt = st ? s.clueWords[st.clue].vi : "?";
      msgs.push("Nối “" + s.clueWords[i].word + "” với lời khai nói về “" + viStmt + "” là chưa khớp — “" + s.clueWords[i].word + "” nghĩa là “" + viWord + "”, khác nhau đấy. Thử lại nhé.");
      delete s.links[i];
    }
  }
  if (wrong > 0) s.wrongCount += wrong;
  if (correct === 3) {
    if (!s.boardDone) { s.boardDone = true; s.score += 30; }
    s.boardMsg = "Bảng đã khớp cả 3! Giờ trình bày kết luận cuối chương thôi.";
  } else if (msgs.length) {
    s.boardMsg = msgs.join(" ");
  } else {
    s.boardMsg = "";
  }
  saveState();
  render();
}
function renderLangQuestBoard(app, l) {
  var s = l.lq;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Bảng điều tra: nối mỗi trang từ điển với đúng lời khai.");
  var body = '<div class="qblock"><h3>🔍 Bảng điều tra</h3><p class="mut">Bấm vào một trang, rồi bấm vào lời khai nói về đúng trang đó. Nối sai sẽ có giải thích vì sao mâu thuẫn, không trừ điểm oan — chỉ trừ điểm thưởng.</p>';
  body += '<p><button class="btn" id="lqBoardNotes">' + (s.showNotes ? 'Ẩn nghĩa các từ' : 'Xem lại nghĩa các từ (sổ tay)') + '</button></p>';
  body += '<div class="row"><div style="flex:1"><h4>Trang từ điển</h4>' + [0, 1, 2].map(function (i) {
    var c = s.clueWords[i];
    var linked = s.links[i] !== undefined && s.links[i] !== null;
    var st = linked ? 'background:#EAF7F0' : (s.boardSel === i ? 'outline:3px solid #D97706;background:#FFF8E1' : 'background:#fff');
    return '<p><button class="btn" data-lqclue="' + i + '" style="' + st + ';width:100%;text-align:left">📄 ' + esc(c.word) + (s.showNotes ? ' — ' + esc(c.vi) : '') + (linked ? ' → lời khai ' + (s.links[i] + 1) : '') + '</button></p>';
  }).join("") + '</div><div style="flex:1"><h4>Lời khai</h4>' + s.statements.map(function (st, j) {
    var usedBy = -1;
    for (var i = 0; i < 3; i++) if (s.links[i] === j) usedBy = i;
    var stl = usedBy >= 0 ? 'background:#EAF7F0' : 'background:#fff';
    return '<p><button class="btn" data-lqstmt="' + j + '" style="' + stl + ';width:100%;text-align:left">' + (j + 1) + '. ' + esc(st.text) + (usedBy >= 0 ? ' ← trang “' + esc(s.clueWords[usedBy].word) + '”' : '') + '</button></p>';
  }).join("") + '</div></div>';
  if (s.boardMsg) body += '<p>' + esc(s.boardMsg) + '</p>';
  if (s.boardDone) body += '<div class="row"><button class="btn btn-primary" id="lqToConc">📋 Trình bày kết luận</button></div>';
  else body += '<div class="row"><button class="btn btn-primary" id="lqBoardCheck">✓ Kiểm tra bảng</button></div>';
  body += '</div>';
  app.innerHTML = head + body;
  wireBack();
  var bb = document.getElementById("btnBack");
  if (bb) bb.onclick = function () { lqBackToCity(l); };
  var nb = document.getElementById("lqBoardNotes");
  if (nb) nb.onclick = function () { s.showNotes = !s.showNotes; render(); };
  app.querySelectorAll("[data-lqclue]").forEach(function (b) { b.onclick = function () { if (s.boardDone) return; s.boardSel = +b.dataset.lqclue; render(); }; });
  app.querySelectorAll("[data-lqstmt]").forEach(function (b) { b.onclick = function () { if (s.boardDone || s.boardSel < 0) return; lqLink(l, s.boardSel, +b.dataset.lqstmt); }; });
  var ck = document.getElementById("lqBoardCheck");
  if (ck) ck.onclick = function () { lqCheckBoard(l); };
  var tc = document.getElementById("lqToConc");
  if (tc) tc.onclick = function () { s.phase = "conclusion"; render(); };
}

/* ---------- Kết luận ---------- */
var LQ_CONC_OPTIONS = [
  { text: "Người bán hàng đã lấy các trang.", why: "Người bán hàng đã giúp bạn dịch bảng hiệu và tự tay đưa lại trang ông nhặt được ở Chợ — không có bằng chứng nào cho thấy ông lấy trộm." },
  { text: "Gió thổi bay các trang lúc thủ thư chuyển chúng từ Thư viện sang Học viện.", why: "" },
  { text: "Học viên giấu các trang để trêu thủ thư.", why: "Không có lời khai hay dấu vết nào nhắc tới học viên giấu trang — đừng kết tội khi không có bằng chứng nhé." }
];
function lqSubmitConc(l) {
  var s = l.lq; if (!s || s.phase !== "conclusion") return;
  if (s.concChoice < 0) { s.concMsg = "Bạn chưa chọn kết luận nào — chọn một kết luận rồi trình bày nhé."; render(); return; }
  if (s.concChoice !== 1) {
    s.wrongCount++;
    s.concMsg = "Kết luận này mâu thuẫn với bằng chứng: " + LQ_CONC_OPTIONS[s.concChoice].why + " Thử lại nhé.";
    render(); return;
  }
  var hasDistractor = s.concEv.indexOf(4) >= 0;
  if (hasDistractor) {
    s.wrongCount++;
    s.concMsg = "“Dấu chân lạ ở Chợ” không có lời khai nào nhắc tới và không nằm trên đường đi của các trang — bỏ nó ra khỏi bằng chứng nhé.";
    render(); return;
  }
  var supporting = s.concEv.filter(function (e) { return e >= 0 && e <= 3; }).length;
  if (supporting < 2) {
    s.wrongCount++;
    s.concMsg = "Cần ít nhất 2 bằng chứng ủng hộ kết luận — chọn thêm trang từ điển hoặc ghi chép của thủ thư nhé.";
    render(); return;
  }
  s.score = s.score + 30;
  s.finalScore = Math.max(0, s.score - s.wrongCount * 5);
  s.finalStars = gameStarsFor(s.finalScore / 120);
  awardXp(10);
  gameSaveBest("langquest", s.finalScore, s.finalStars, "en");
  try {
    state.lqCh1 = { done: true, score: s.finalScore, stars: s.finalStars, at: Date.now() };
    state.lqUnlocked = 2;
  } catch (e) {}
  s.phase = "end";
  saveState();
  render();
}
function renderLangQuestConc(app, l) {
  var s = l.lq;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Trình bày kết luận cuối chương.");
  var recap = '<p class="mut">Tóm tắt vụ án: thủ thư chuyển sách từ Thư viện sang Học viện, đi qua Chợ rồi tới Cổng Học viện, gió rất to. 3 trang được tìm thấy ở Thư viện, Chợ và Cổng Học viện.' + (s.flags.merchantHint ? ' Người bán hàng cũng thấy gió thổi tung chồng giấy ở Chợ.' : '') + '</p>';
  var evLabels = [0, 1, 2].map(function (i) {
    var c = s.clueWords[i];
    return "Trang từ điển: “" + c.word + "” — " + c.vi + " (tìm thấy ở " + c.place + ")";
  });
  evLabels.push("Ghi chép của thủ thư: chuyển sách từ Thư viện sang Học viện, gió rất to");
  evLabels.push("Dấu chân lạ ở Chợ");
  var body = '<div class="qblock"><h3>📋 Kết luận cuối chương</h3>' + recap + '<p><b>Chuyện gì đã xảy ra với các trang từ điển?</b></p>';
  body += LQ_CONC_OPTIONS.map(function (o, i) {
    return '<p><label><input type="radio" name="lqConc" value="' + i + '"' + (s.concChoice === i ? ' checked' : '') + '> ' + esc(o.text) + '</label></p>';
  }).join("");
  body += '<p><b>Chọn 2–4 bằng chứng ủng hộ kết luận:</b></p>';
  body += evLabels.map(function (t, i) {
    return '<p><label><input type="checkbox" data-lqev="' + i + '"' + (s.concEv.indexOf(i) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label></p>';
  }).join("");
  if (s.concMsg) body += '<p>' + esc(s.concMsg) + '</p>';
  body += '<div class="row"><button class="btn btn-primary" id="lqSubmitConc">✓ Trình bày kết luận</button></div></div>';
  app.innerHTML = head + body;
  wireBack();
  var bb = document.getElementById("btnBack");
  if (bb) bb.onclick = function () { lqBackToCity(l); };
  app.querySelectorAll('input[name="lqConc"]').forEach(function (r) { r.onchange = function () { s.concChoice = +r.value; }; });
  app.querySelectorAll("[data-lqev]").forEach(function (c) { c.onchange = function () { var v = +c.dataset.lqev; if (c.checked) { if (s.concEv.indexOf(v) < 0) s.concEv.push(v); } else { s.concEv = s.concEv.filter(function (e) { return e !== v; }); } }; });
  document.getElementById("lqSubmitConc").onclick = function () { lqSubmitConc(l); };
}
function renderLangQuestEnd(app, l) {
  var s = l.lq;
  var head = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "Phá án xong! Chương 2 đã mở trong hồ sơ của bạn.");
  function dedup(list) { var seen = {}, out = []; list.forEach(function (r) { var k = String(r.w).toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(r); } }); return out; }
  var rightD = dedup(s.rightList), wrongD = dedup(s.wrongList);
  app.innerHTML = head + '<div class="reward-frame">' + summaryBadgeSVG() + '<h2>🎉 Phá án thành công!</h2><p>Đúng rồi! Các trang bị gió thổi bay trên đường chuyển sách và rơi rải rác ở Thư viện, Chợ và Cổng Học viện — bạn đã nối đủ bằng chứng.</p><p>Điểm: <b>' + s.finalScore + '</b></p>' + lqRewardStarsHTML(s.finalStars) + '<p class="mut">Chương 2: Bí mật trong Thư viện Cổ đã mở trong hồ sơ của bạn, nội dung sẽ có ở bản sau.</p>'
    + gameSummaryHTML(rightD, wrongD)
    + '<div class="row"><button class="btn btn-primary" id="lqAgain">🔁 Chơi lại Chương 1</button><button class="btn" id="lqHub">Về Luyện tập</button></div></div>';
  wireBack();
  lqAnimateRewardStars();
  document.getElementById("lqAgain").onclick = function () { l.lq = null; render(); };
  document.getElementById("lqHub").onclick = function () { lqStopLoop(l); backFromLesson(); go("practice"); };
  var rw = document.getElementById("gmReviewWrong");
  if (rw) rw.onclick = function () { l.wrongKeys = s.wrongKeys; gameReviewWrongNow(l); };
}
function renderLangQuest(app, l) {
  if (!l.lq) { renderLangQuestIntro(app, l); return; }
  var s = l.lq;
  if (s.noSet) {
    var head0 = lessonHead({ title: "🏙️ Thành phố Ngôn Ngữ — Chương 1", type: "langquest" }, "");
    app.innerHTML = head0 + '<div class="qblock"><p>Chưa có bộ từ nào đủ 6 thẻ để chơi chương này — bạn học thêm vài thẻ rồi quay lại nhé.</p></div>';
    wireBack();
    return;
  }
  if (s.phase === "city") renderLangQuestCity(app, l);
  else if (s.phase === "talk") renderLangQuestTalk(app, l);
  else if (s.phase === "task") renderLangQuestTask(app, l);
  else if (s.phase === "board") renderLangQuestBoard(app, l);
  else if (s.phase === "conclusion") renderLangQuestConc(app, l);
  else if (s.phase === "end") renderLangQuestEnd(app, l);
  else renderLangQuestIntro(app, l);
}

/* API dùng chung cho UI và probe kiểm chứng. */
window.LangQuest = {
  pickSet: lqPickSet,
  adapter: lqAdapterItems,
  newChapter: lqNewChapter,
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
  setPos: function (l, x, y) { if (!l.lq) return; l.lq.px = x; l.lq.py = y; lqUpdateCityUI(l); lqDrawCity(l); },
  setTarget: function (l, x, y) { if (!l.lq) return; l.lq.tx = x; l.lq.ty = y; },
  step: lqStep,
  drawCity: lqDrawCity,
  updateCityUI: lqUpdateCityUI,
  talk: function (l, npc) { if (!l.lq) return; lqStopLoop(l); l.lq.phase = "talk"; l.lq.talkNpc = npc; l.lq.talkView = "hub"; render(); },
  choose: lqChooseOpt,
  answerTask: lqAnswerTask,
  taskNext: lqTaskNext,
  openBoard: lqOpenBoard,
  link: lqLink,
  checkBoard: lqCheckBoard,
  submitConc: lqSubmitConc,
  backToCity: lqBackToCity,
  startLoop: lqStartLoop,
  stopLoop: lqStopLoop,
  getState: function (l) { return l.lq; },
  near: lqNear,
  clueCount: lqClueCount,
  objective: lqObjective,
  rewardStarsHTML: lqRewardStarsHTML,
  animateStars: lqAnimateRewardStars,
  snapTarget: lqSnapTarget
};
