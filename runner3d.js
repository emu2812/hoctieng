/* ---------- CHẠY 3D THỜI GIAN THỰC — RUNNER 3D, LÁT CẮT MOBILE (DRAFT) ----------
   Lát cắt đầu tiên của game mobile "Biệt đội Săn Từ" dựng hình 3D trực tiếp
   lúc chơi bằng Three.js miễn phí (không ảnh dựng sẵn, không model ngoài).
   Chỉ là DRAFT: chưa gắn vào index.html, chưa đẩy live.
   Luật chơi giữ nguyên vòng 2D đã chứng minh (word_adventure.js): chạy 3 làn,
   né chướng ngại, gom ngọc từ vựng thật, 3 mạng, thắng khi gom đủ ngọc.
   Nội dung chỉ đọc từ bank gốc CONTENT.vocab qua adapter dưới đây, KHÔNG
   copy bank sang bản riêng; thiếu dữ liệu dạng nào thì bỏ dạng đó, không bịa.
   Nhân vật là hình khối low-poly tự dựng, chỉ mượn màu khăn cam gợi nhớ
   nhân vật dẫn đường của web, không chép tạo hình của game nào.
   Âm thanh: chỉ giọng đọc trình duyệt (ghi rõ là giọng tổng hợp khi phát),
   không tự động phát trước khi người chơi bấm nút nghe.
   THẾ GIỚI RIÊNG (Bùi chốt 19:28 04/11): trong game là một thế giới riêng,
   không liên quan tới web bên ngoài — khi chơi, game chiếm toàn màn hình,
   KHÔNG thấy header/thanh tab/nội dung web xung quanh; chỉ có từ vựng là
   lấy từ bank chung của web (từ là nội dung chơi). Có một nút Thoát rõ ràng
   để trở về web, bấm là khôi phục lại giao diện web như cũ. */

/* ---------- Ngân sách hiệu năng (CỨNG, máy yếu TECNO) ----------
   - Không shadow map (dùng bóng giả hình tròn dưới chân nhân vật).
   - Không post-processing, không hiệu ứng mờ trong vòng lặp vẽ.
   - Pixel ratio tối đa 1.75, antialias TẮT, vật liệu Lambert rẻ tiền.
   - Hình khối ít đỉnh: hộp, trụ, cầu 8–12 mặt; hình cầu tối đa 8x6 đoạn.
   - Tái dùng geometry/material chung, không tạo mới trong vòng lặp. */
var R3D_PIXEL_RATIO_CAP = 1.75;
var R3D_LANE_X = [-2.2, 0, 2.2];
var R3D_SPEED = 14;            /* đơn vị 3D / giây */
var R3D_JUMP_V = 9.5;
var R3D_GRAVITY = 26;
var R3D_SLIDE_MS = 700;
var R3D_INVULN_MS = 1200;
var R3D_GOAL_GEMS = 8;         /* gom đủ 8 ngọc từ thì thắng */
var R3D_SPAWN_Z = -60;         /* vật thể sinh ra ở xa rồi chạy lại gần */
var R3D_HIT_Z = 2.5;           /* |z| nhỏ hơn ngưỡng này là va chạm */
var R3D_LANE_W = 2.2;

function r3dWordOk(w) { return /^[a-z]{3,8}$/.test(String(w || "").toLowerCase()); }
function r3dShuffle(a) {
  if (typeof gameShuffle === "function") { try { return gameShuffle(a.slice()); } catch (e) {} }
  var x = a.slice();
  for (var i = x.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = x[i]; x[i] = x[j]; x[j] = t; }
  return x;
}

/* Content Adapter (chỉ đọc bank gốc, không copy): cùng mẫu word_adventure. */
function r3dAdapterItems(setIdx) {
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
      example: c.ex || "",
      source_url: "tab Luyện tập · bộ từ: " + (s.topic || ""),
      source_id: "vocab:" + setIdx
    });
  });
  return out;
}
function r3dPickSets() {
  var elig = [];
  if (typeof CONTENT === "undefined" || !CONTENT.vocab) return elig;
  for (var i = 0; i < CONTENT.vocab.length; i++) {
    var cards = (typeof vocabSetCards === "function") ? vocabSetCards(i) : (CONTENT.vocab[i].cards || []);
    var n = 0;
    for (var j = 0; j < cards.length; j++) if (r3dWordOk(cards[j].w)) n++;
    if (cards.length >= 12 && n >= 3) elig.push(i);
  }
  var out = [];
  var cur = -1;
  if (typeof gameCurrentVocabSet === "function") { try { cur = gameCurrentVocabSet(); } catch (e) { cur = -1; } }
  if (elig.indexOf(cur) >= 0) out.push(cur);
  var rest = r3dShuffle(elig.filter(function (x) { return out.indexOf(x) < 0; }));
  for (var k = 0; k < rest.length && out.length < 3; k++) out.push(rest[k]);
  return out;
}

/* ---------- Trạng thái game (logic thuần, không cần WebGL) ---------- */
function r3dNewGame(l, setIdx) {
  var items = r3dAdapterItems(setIdx).filter(function (it) { return r3dWordOk(it.source_text); });
  var pool = r3dShuffle(items).slice(0, R3D_GOAL_GEMS * 2);
  l.r3d = {
    phase: "intro",
    setIdx: setIdx,
    setTopic: (typeof CONTENT !== "undefined" && CONTENT.vocab && CONTENT.vocab[setIdx]) ? (CONTENT.vocab[setIdx].topic || "") : "",
    lane: 1,
    laneX: 0,
    y: 0,
    vy: 0,
    grounded: true,
    slideT: 0,
    invulnT: 0,
    lives: 3,
    score: 0,
    dist: 0,
    speed: R3D_SPEED,
    shakeT: 0,
    fadeOpacity: 0,
    fadeFrom: 0,
    fadeTo: 0,
    fadeT: 0,
    fadeDur: 400,
    pendingEnd: false,
    gemQueue: pool.slice(),
    gems: [],        /* { lane, z, word, vi, got, isTarget } đang bay tới */
    obstacles: [],   /* { lane, z, kind: "low"|"high"|"block", hit } */
    collected: [],
    targetWord: pool.length ? pool[0].source_text : "",
    targetVi: pool.length ? pool[0].translation_vi : "",
    targetCollected: 0,
    wrongList: [],
    spawnT: 0,
    stars: 0,
    finalScore: 0,
    loopOn: false,
    raf: 0,
    paused: false,
    keyHandler: null,
    touchStart: null,
    mouseStart: null,
    mouseMoved: false,
    world: null,     /* tham chiếu thế giới 3D khi đã dựng (browser) */
    three: null,
    renderer: null,
    lastWord: ""
  };
}
function r3dMoveLeft(l) {
  var s = l.r3d; if (!s || s.phase !== "play" || s.paused) return;
  if (s.lane > 0) s.lane--;
}
function r3dMoveRight(l) {
  var s = l.r3d; if (!s || s.phase !== "play" || s.paused) return;
  if (s.lane < 2) s.lane++;
}
function r3dJump(l) {
  var s = l.r3d; if (!s || s.phase !== "play" || s.paused) return;
  if (s.grounded) { s.vy = R3D_JUMP_V; s.grounded = false; s.slideT = 0; }
}
function r3dSlide(l) {
  var s = l.r3d; if (!s || s.phase !== "play" || s.paused) return;
  if (s.grounded) s.slideT = R3D_SLIDE_MS;
}
function r3dPauseToggle(l) {
  var s = l.r3d; if (!s) return;
  if (s.phase === "play" || s.phase === "paused") {
    s.paused = !s.paused;
    s.phase = s.paused ? "paused" : "play";
    r3dUpdateHud(l);
  }
}
function r3dSpawn(l) {
  var s = l.r3d;
  var lane = Math.floor(Math.random() * 3);
  if (s.gemQueue.length && Math.random() < 0.55) {
    var g = s.gemQueue.shift();
    /* Từ mục tiêu: biết từ thì biết phải chạy tới ngọc nào — ngọc mục tiêu
       là vật thể trong thế giới, kỹ năng di chuyển mới lấy được nó. */
    s.gems.push({ lane: lane, z: R3D_SPAWN_Z, word: g.source_text, vi: g.translation_vi, got: false, isTarget: g.source_text === s.targetWord });
  } else {
    var kinds = ["low", "high", "block"];
    s.obstacles.push({ lane: lane, z: R3D_SPAWN_Z, kind: kinds[Math.floor(Math.random() * 3)], hit: false });
  }
}
function r3dStep(l, dtMs) {
  var s = l.r3d; if (!s || s.phase !== "play" || s.paused) return;
  var dt = Math.min(100, Math.max(0, dtMs || 16)) / 1000;
  s.dist += s.speed * dt;
  /* Làn: trượt mượt về vị trí làn đích (không nhảy cục). */
  var targetX = R3D_LANE_X[s.lane];
  s.laneX += (targetX - s.laneX) * Math.min(1, dt * 12);
  if (Math.abs(targetX - s.laneX) < 0.02) s.laneX = targetX;
  /* Nhảy: trọng lực, chạm đất thì grounded. */
  if (!s.grounded) {
    s.vy -= R3D_GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) { s.y = 0; s.vy = 0; s.grounded = true; }
  }
  if (s.slideT > 0) s.slideT -= dtMs;
  if (s.invulnT > 0) s.invulnT -= dtMs;
  /* Sinh vật thể mới mỗi ~0.9 giây. */
  s.spawnT += dtMs;
  if (s.spawnT >= 900) { s.spawnT = 0; r3dSpawn(l); }
  /* Vật thể chạy lại gần người chơi. */
  var dz = s.speed * dt;
  s.gems.forEach(function (g) { g.z += dz; });
  s.obstacles.forEach(function (o) { o.z += dz; });
  s.gems = s.gems.filter(function (g) { return g.z < 8 && !g.got; });
  s.obstacles = s.obstacles.filter(function (o) { return o.z < 8; });
  /* Gom ngọc: cùng làn, tới gần. Ngọc mục tiêu thưởng thêm và đổi mục tiêu. */
  s.gems.forEach(function (g) {
    if (!g.got && g.lane === s.lane && Math.abs(g.z) <= R3D_HIT_Z) {
      g.got = true;
      s.collected.push(g);
      s.score += 10 + g.word.length + (g.isTarget ? 20 : 0);
      s.lastWord = g.word;
      if (g.isTarget) {
        s.targetCollected++;
        s.targetWord = s.gemQueue.length ? s.gemQueue[0].source_text : "";
        s.targetVi = s.gemQueue.length ? s.gemQueue[0].translation_vi : "";
      }
      if (typeof speak === "function") { try { speak(g.word, "en"); } catch (e) {} }
    }
  });
  s.gems = s.gems.filter(function (g) { return !g.got; });
  /* Va chướng ngại: né đúng cách thì qua, sai thì mất 1 mạng. */
  if (s.invulnT <= 0) {
    s.obstacles.forEach(function (o) {
      if (o.hit || o.lane !== s.lane || Math.abs(o.z) > R3D_HIT_Z) return;
      var dodged = (o.kind === "low" && s.slideT > 0) || (o.kind === "high" && s.y > 0.8);
      if (dodged) return;
      o.hit = true;
      s.lives--;
      s.invulnT = R3D_INVULN_MS;
      s.shakeT = 300;   /* rung camera giảm dần — phản hồi va chạm kiểu phim */
      if (typeof gameWordWrong === "function") { try { gameWordWrong("r3d-hit", o.kind); } catch (e) {} }
    });
  }
  /* Thắng / thua. */
  if (s.collected.length >= R3D_GOAL_GEMS) { r3dFinish(l); return; }
  if (s.lives <= 0) { r3dToFail(l); return; }
  r3dUpdateHud(l);
}
function r3dStarsFor(lives) { return lives >= 3 ? 3 : lives === 2 ? 2 : lives === 1 ? 1 : 0; }
function r3dFinish(l) {
  var s = l.r3d; if (!s) return;
  s.phase = "win";
  s.stars = r3dStarsFor(s.lives);
  s.finalScore = s.score;
  if (typeof gameSaveBest === "function") { try { gameSaveBest("r3d", s.setIdx, s.score); } catch (e) {} }
  if (typeof awardXp === "function") { try { awardXp(20); } catch (e) {} }
  if (s.loopOn) { s.pendingEnd = true; r3dStartFade(l, 1, 300); }
  else r3dRenderEnd(l);
}
function r3dToFail(l) {
  var s = l.r3d; if (!s) return;
  s.phase = "lose";
  s.stars = 0;
  s.finalScore = s.score;
  if (s.loopOn) { s.pendingEnd = true; r3dStartFade(l, 1, 300); }
  else r3dRenderEnd(l);
}
function r3dRetry(l) {
  var setIdx = l.r3d ? l.r3d.setIdx : 0;
  r3dNewGame(l, setIdx);
  r3dRenderPlay(l);
}
function r3dUpdateHud(l) {
  var s = l.r3d; if (!s) return;
  var set = function (id, txt) { var el = null; try { el = document.getElementById(id); } catch (e) {} if (el) el.textContent = txt; };
  set("r3dHudScore", "🏆 " + s.score);
  set("r3dHudGoal", "💎 " + s.collected.length + "/" + R3D_GOAL_GEMS);
  set("r3dHudLives", "❤️ ".repeat(Math.max(0, s.lives)).trim() || "—");
  set("r3dHudDist", Math.floor(s.dist) + "m");
  set("r3dHudWord", s.lastWord ? ("Từ vừa gom: " + s.lastWord) : "");
  set("r3dHudTarget", s.targetWord ? ("🎯 Chạy tới: " + s.targetWord.toUpperCase() + (s.targetVi ? " (" + s.targetVi + ")" : "")) : "🎯 Đã hết từ mục tiêu");
}
function r3dRewardStarsHTML(stars) {
  var n = stars || 0;
  var out = '<p class="rw-stars" data-r3d-stars="' + n + '"><span class="mut">Thang 3 sao: </span>';
  for (var i = 0; i < 3; i++) out += '<span class="rw-star-slot" data-star-slot="' + (i + 1) + '" style="font-size:34px">☆</span>';
  out += ' <span class="rw-star-count">' + n + '/3 sao</span></p>';
  return out;
}
function r3dAnimateStars() {
  var box = null;
  try { box = document.querySelector("[data-r3d-stars]"); } catch (e) {}
  if (!box) return;
  var earned = parseInt(box.getAttribute("data-r3d-stars"), 10) || 0;
  var slots = box.querySelectorAll("[data-star-slot]");
  function fill(k) { for (var i = 0; i < slots.length; i++) if (i < k) slots[i].textContent = "⭐"; }
  for (var j = 0; j < earned; j++) (function (k) { setTimeout(function () { fill(k); }, 450 * k); })(j + 1);
  setTimeout(function () { fill(earned); }, 450 * earned + 200);
}

/* ---------- Thế giới 3D (chỉ chạy ở browser có Three.js) ----------
   r3dBuildWorld(THREE) dựng scene + camera + mọi mesh, KHÔNG tạo renderer
   để probe có thể kiểm chứng bằng THREE giả mà không cần WebGL.
   r3dCreateRenderer(THREE, canvas) tách riêng, chỉ gọi ở browser thật. */
function r3dBuildWorld(THREE) {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  var camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 200);
  camera.position.set(0, 4.2, 7.5);
  camera.lookAt(0, 1, -8);
  var mat = function (c) { return new THREE.MeshLambertMaterial({ color: c }); };
  var geoBox = new THREE.BoxGeometry(1, 1, 1);
  var geoHead = new THREE.SphereGeometry(0.42, 8, 6);
  var geoGem = new THREE.OctahedronGeometry(0.45);
  var geoBlob = new THREE.CircleGeometry(0.7, 12);
  function box(w, h, d, color, x, y, z) {
    var m = new THREE.Mesh(geoBox, mat(color));
    m.scale.set(w, h, d); m.position.set(x, y, z);
    scene.add(m); return m;
  }
  /* Đường phố 3 làn + nhà hộp hai bên (lớp gần, cuộn đủ tốc độ) + dãy nhà
     xa mờ (lớp xa, cuộn 0.3 tốc độ) tạo parallax khớp tốc độ nhân vật. */
  var road = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), mat(0x555555));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -50);
  scene.add(road);
  var buildings = [];
  for (var i = 0; i < 10; i++) {
    var side = (i % 2 === 0) ? -1 : 1;
    buildings.push(box(3, 2 + (i % 3), 3, (i % 3 === 0) ? 0xf5deb3 : (i % 3 === 1) ? 0xd2b48c : 0xe8c39e,
      side * 6.5, 1 + (i % 3) * 0.5, -8 - i * 11));
  }
  var farBoxes = [];
  for (var f = 0; f < 5; f++) {
    farBoxes.push(box(10, 6, 4, 0x9db8cc, -20 + f * 10, 3, -60 - f * 12));
  }
  /* Sinh khí cho phim: mây trôi, cây ven đường đung đưa, hạt bụi bay,
     ánh sáng mặt trời nhấp nháy nhẹ — tất cả chuyển động theo thời gian
     tuyệt đối nên vẫn sống cả khi người chơi đứng yên hay tạm dừng. */
  var geoCloud = new THREE.SphereGeometry(1, 8, 6);
  var clouds = [];
  for (var c = 0; c < 6; c++) {
    var cl = new THREE.Group();
    for (var p = 0; p < 3; p++) {
      var puff = new THREE.Mesh(geoCloud, mat(0xffffff));
      puff.scale.set(1.6 - p * 0.3, 0.9, 1);
      puff.position.set(p * 1.4 - 1.4, 0, 0);
      cl.add(puff);
    }
    cl.position.set(-20 + c * 8, 7 + (c % 3), -30 - c * 8);
    scene.add(cl);
    clouds.push({ group: cl, speed: 0.3 + (c % 3) * 0.15 });
  }
  var geoTrunk = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6);
  var geoLeaf = new THREE.SphereGeometry(1, 8, 6);
  var trees = [];
  for (var tr = 0; tr < 8; tr++) {
    var sideT = (tr % 2 === 0) ? -1 : 1;
    var trunk = new THREE.Mesh(geoTrunk, mat(0x8b5a2b));
    trunk.position.set(sideT * 4.8, 0.6, -6 - tr * 13);
    scene.add(trunk);
    var leaf = new THREE.Mesh(geoLeaf, mat(0x3d8b4f));
    leaf.position.set(sideT * 4.8, 1.9, -6 - tr * 13);
    scene.add(leaf);
    trees.push({ foliage: leaf, phase: tr * 0.9 });
  }
  var geoMote = new THREE.SphereGeometry(0.08, 6, 4);
  var particles = [];
  for (var pt = 0; pt < 12; pt++) {
    var mote = new THREE.Mesh(geoMote, mat(0xfff7cc));
    var bx = -3 + (pt % 4) * 2;
    mote.position.set(bx, 0.5 + (pt % 5) * 0.8, -4 - (pt % 6) * 3);
    scene.add(mote);
    particles.push({ mesh: mote, baseX: bx, phase: pt * 0.7 });
  }
  /* Nhân vật low-poly: thân, đầu, tay, chân, khăn cam. */
  var runner = new THREE.Group();
  var body = new THREE.Mesh(geoBox, mat(0x2e7d32)); body.scale.set(0.8, 1.0, 0.45); body.position.y = 1.1; runner.add(body);
  var head = new THREE.Mesh(geoHead, mat(0xffdbac)); head.position.y = 1.95; runner.add(head);
  var scarf = new THREE.Mesh(geoBox, mat(0xf97316)); scarf.scale.set(0.9, 0.28, 0.55); scarf.position.y = 1.62; runner.add(scarf);
  var legL = new THREE.Mesh(geoBox, mat(0x1e3a8a)); legL.scale.set(0.32, 0.6, 0.32); legL.position.set(-0.22, 0.3, 0); runner.add(legL);
  var legR = new THREE.Mesh(geoBox, mat(0x1e3a8a)); legR.scale.set(0.32, 0.6, 0.32); legR.position.set(0.22, 0.3, 0); runner.add(legR);
  var armL = new THREE.Mesh(geoBox, mat(0x2e7d32)); armL.scale.set(0.25, 0.7, 0.25); armL.position.set(-0.55, 1.1, 0); runner.add(armL);
  var armR = new THREE.Mesh(geoBox, mat(0x2e7d32)); armR.scale.set(0.25, 0.7, 0.25); armR.position.set(0.55, 1.1, 0); runner.add(armR);
  runner.position.set(0, 0, 0);
  scene.add(runner);
  /* Bóng giả dưới chân (không shadow map). */
  var blob = new THREE.Mesh(geoBlob, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
  scene.add(blob);
  /* Ngọc + chướng ngại mẫu (vị trí sẽ đồng bộ từ logic mỗi khung). */
  var gemMeshes = [];
  for (var g = 0; g < 6; g++) {
    var gm = new THREE.Mesh(geoGem, mat(0xfbbf24));
    gm.visible = false; scene.add(gm); gemMeshes.push(gm);
  }
  var obsMeshes = [];
  for (var o = 0; o < 6; o++) {
    var om = new THREE.Mesh(geoBox, mat(0xdc2626));
    om.visible = false; scene.add(om); obsMeshes.push(om);
  }
  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(5, 10, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  return { scene: scene, camera: camera, runner: runner, legs: [legL, legR], arms: [armL, armR], blob: blob, gemMeshes: gemMeshes, obsMeshes: obsMeshes, buildings: buildings, farBoxes: farBoxes, clouds: clouds, trees: trees, particles: particles, sun: light };
}
function r3dCreateRenderer(THREE, canvas) {
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R3D_PIXEL_RATIO_CAP));
  renderer.shadowMap.enabled = false;
  return renderer;
}
/* Tốc độ đung đưa chân tỉ lệ thuận với tốc độ chạy thật — hoạt hình khớp
   vận tốc, không chạy nhanh mà chân quay chậm hay ngược lại. */
function r3dSwingAt(speed, nowMs) { return Math.sin((nowMs || 0) / 1000 * speed) * 0.5; }
function r3dSyncWorld(l, dtMs, nowMs) {
  var s = l.r3d; if (!s || !s.world) return;
  var w = s.world;
  var dt = Math.min(100, Math.max(0, dtMs || 16)) / 1000;
  var now = (typeof nowMs === "number") ? nowMs : Date.now();
  var t = now / 1000;
  var playing = (s.phase === "play" && !s.paused);
  w.runner.position.x = s.laneX;
  /* Chạy: chân đung đưa theo đúng tốc độ chạy; đứng yên/tạm dừng: nhân vật
     thở phập phồng nhẹ (idle bob) — không bao giờ là khung hình chết. */
  if (playing) {
    w.runner.position.y = s.y;
    var runSwing = s.grounded && s.slideT <= 0 ? r3dSwingAt(s.speed, now) : 0;
    w.legs[0].rotation.x = runSwing;
    w.legs[1].rotation.x = -runSwing;
    w.arms[0].rotation.z = 0;
    w.arms[1].rotation.z = 0;
  } else {
    w.runner.position.y = s.y + Math.sin(t * 2.2) * 0.06;
    w.legs[0].rotation.x = 0;
    w.legs[1].rotation.x = 0;
    w.arms[0].rotation.z = Math.sin(t * 2.2) * 0.05;
    w.arms[1].rotation.z = -Math.sin(t * 2.2) * 0.05;
  }
  w.runner.scale.y = s.slideT > 0 ? 0.6 : 1;
  w.blob.position.x = s.laneX;
  w.blob.scale.setScalar(s.y > 0 ? Math.max(0.4, 1 - s.y * 0.08) : 1);
  /* Camera điện ảnh: bám theo kiểu lerp mượt (không nhảy), zoom nhẹ theo
     tốc độ, rung giảm dần khi va chạm — không bao giờ cắt cứng. */
  try {
    var cam = w.camera;
    var curX = (typeof cam.position.x === "number") ? cam.position.x : 0;
    var tx = s.laneX * 0.5;
    var k = Math.min(1, dt * 5);
    var nx = curX + (tx - curX) * k;
    var curZ = (typeof cam.position.z === "number") ? cam.position.z : 7.5;
    var tz = 7.5 + s.speed * 0.03;
    var nz = curZ + (tz - curZ) * k;
    if (s.shakeT > 0) {
      var amp = (s.shakeT / 300) * 0.18;
      nx += Math.sin(now * 0.05) * amp;
      s.shakeT = Math.max(0, s.shakeT - (dtMs || 16));
      try { cam.position.y = 4.2 + Math.cos(now * 0.045) * amp; } catch (e) {}
    }
    cam.position.x = nx;
    cam.position.z = nz;
    if (typeof cam.lookAt === "function") cam.lookAt(s.laneX * 0.3, 1, -8);
  } catch (e) {}
  /* Parallax gameplay: chỉ cuộn khi đang chơi (tạm dừng thì phố đứng yên,
     nhưng mây/cây/hạt/ánh sáng vẫn sống — đúng nghĩa tạm dừng game chứ
     không phải đóng băng cả thế giới). */
  if (playing) {
    var dzNear = s.speed * dt;
    (w.buildings || []).forEach(function (b) {
      b.position.z += dzNear;
      if (b.position.z > 12) b.position.z -= 120;
    });
    (w.farBoxes || []).forEach(function (b) {
      b.position.z += dzNear * 0.3;
      if (b.position.z > 12) b.position.z -= 120;
    });
  }
  /* Sinh khí luôn chạy theo thời gian tuyệt đối, kể cả khi đứng yên. */
  (w.clouds || []).forEach(function (c) {
    c.group.position.x += c.speed * dt;
    if (c.group.position.x > 26) c.group.position.x = -26;
  });
  (w.trees || []).forEach(function (tr) {
    tr.foliage.rotation.z = Math.sin(t * 1.5 + tr.phase) * 0.06;
  });
  (w.particles || []).forEach(function (p) {
    p.mesh.position.y += 0.4 * dt;
    if (p.mesh.position.y > 5) p.mesh.position.y = 0.5;
    p.mesh.position.x = p.baseX + Math.sin(t * 0.7 + p.phase) * 0.5;
  });
  try { if (w.sun) w.sun.intensity = 1 + Math.sin(t * 0.8) * 0.08; } catch (e) {}
  w.gemMeshes.forEach(function (m, i) {
    var g = s.gems[i];
    if (g) {
      m.visible = true;
      m.position.set(R3D_LANE_X[g.lane], 1.2 + Math.sin(t * 3 + i) * 0.15, g.z);
      m.rotation.y += 0.03;
      /* Ngọc mục tiêu to hơn + xanh để người chơi ngắm đúng ngọc cần lấy. */
      try { m.scale.setScalar(g.isTarget ? 1.4 : 1); } catch (e) {}
      try { if (m.material && m.material.color && m.material.color.set) m.material.color.set(g.isTarget ? 0x22c55e : 0xfbbf24); } catch (e) {}
      try { m.userData = m.userData || {}; m.userData.isTarget = !!g.isTarget; } catch (e) {}
    }
    else m.visible = false;
  });
  w.obsMeshes.forEach(function (m, i) {
    var o = s.obstacles[i];
    if (o) {
      m.visible = true;
      m.position.set(R3D_LANE_X[o.lane], o.kind === "low" ? 0.5 : o.kind === "high" ? 1.4 : 0.9, o.z);
      m.scale.set(1.6, o.kind === "low" ? 1.0 : o.kind === "high" ? 0.6 : 1.8, 0.8);
    } else m.visible = false;
  });
}
function r3dLoadThree() {
  /* Import động ES module, không cần importmap trong HTML. */
  return import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
}

/* ---------- Thế giới riêng: toàn màn hình, ẩn chrome của web ---------- */
var R3D_CHROME_SELECTORS = ["header", "#tabBar", "#app"];
function r3dWorldOverlay() {
  var el = null;
  try { el = document.getElementById("r3dWorld"); } catch (e) {}
  return el;
}
function r3dEnterWorld(l) {
  var s = l.r3d; if (!s) return null;
  /* Dùng lại overlay đã có (không tạo trùng): một thế giới duy nhất tại một
     thời điểm, trạng thái ẩn chrome lưu trên chính overlay để Thoát luôn
     khôi phục đúng dù game đã reset state giữa chừng. */
  var existing = r3dWorldOverlay();
  if (existing) { s.worldOn = true; return existing; }
  var ov = null;
  try {
    ov = document.createElement("div");
    ov.id = "r3dWorld";
    ov.setAttribute("data-r3d-world", "1");
    ov.style.cssText = "position:fixed;inset:0;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:9999;background:#87ceeb;overflow:auto;";
    ov.innerHTML = '<div id="r3dWorldInner"></div><div id="r3dVeil" style="position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:10000;"></div>';
    document.body.appendChild(ov);
  } catch (e) { return null; }
  /* Ẩn chrome của web (header, thanh tab, khung nội dung) và nhớ lại trạng
     thái cũ để nút Thoát khôi phục đúng như trước khi vào game. */
  ov._r3dChrome = [];
  R3D_CHROME_SELECTORS.forEach(function (sel) {
    var els = [];
    try { els = document.querySelectorAll(sel); } catch (e) {}
    for (var i = 0; i < els.length; i++) {
      ov._r3dChrome.push({ el: els[i], display: els[i].style.display || "" });
      els[i].style.display = "none";
    }
  });
  try { document.body.style.overflow = "hidden"; } catch (e) {}
  s.worldOn = true;
  return ov;
}
function r3dExitWorld(l) {
  var s = l ? l.r3d : null;
  r3dStopLoop(l);
  var ov = r3dWorldOverlay();
  if (ov) {
    var recs = ov._r3dChrome || [];
    recs.forEach(function (rec) { try { rec.el.style.display = rec.display; } catch (e) {} });
    try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
  }
  try { document.body.style.overflow = ""; } catch (e) {}
  if (s) s.worldOn = false;
  /* Trở về web: khôi phục xong thì điều hướng về đúng tab như các game 2D. */
  if (typeof backFromLesson === "function") { try { backFromLesson(); } catch (e) {} }
  if (typeof go === "function") { try { go("entertainment"); } catch (e) {} }
}
function r3dWorldInner() {
  var el = null;
  try { el = document.getElementById("r3dWorldInner"); } catch (e) {}
  return el;
}
function r3dExitButtonHTML() {
  return '<button class="btn" id="r3dExit" data-r3d-exit="1">🚪 Thoát về trang web</button>';
}
function r3dWireExit(l) {
  var b = null;
  try { b = document.getElementById("r3dExit"); } catch (e) {}
  if (b) b.onclick = function () { r3dExitWorld(l); };
}
function r3dWorldOn(l) { return !!(l && l.r3d && l.r3d.worldOn && r3dWorldOverlay()); }

/* ---------- Chuyển cảnh kiểu phim: fade nội suy, không cắt cứng ----------
   Màn đen (veil) phủ trên canvas, độ mờ nội suy smoothstep theo thời gian
   — mỗi bước chỉ đổi một phần nhỏ, không bao giờ nhảy 0→1 trong một bước.
   Vào thế giới: veil bắt đầu mờ đục rồi fade ra. Kết thúc màn: fade vào
   đen rồi mới đổi cảnh, sau đó fade ra. */
function r3dVeilEl() {
  var el = null;
  try { el = document.getElementById("r3dVeil"); } catch (e) {}
  return el;
}
function r3dStartFade(l, to, durMs) {
  var s = l.r3d; if (!s) return;
  s.fadeFrom = (typeof s.fadeOpacity === "number") ? s.fadeOpacity : 0;
  s.fadeTo = to;
  s.fadeT = 0;
  s.fadeDur = Math.max(1, durMs || 400);
}
function r3dStepFade(l, dtMs) {
  var s = l.r3d; if (!s) return s ? s.fadeOpacity : 0;
  if (s.fadeT < s.fadeDur) {
    s.fadeT = Math.min(s.fadeDur, s.fadeT + (dtMs || 16));
    var p = s.fadeT / s.fadeDur;
    var smooth = p * p * (3 - 2 * p);
    s.fadeOpacity = s.fadeFrom + (s.fadeTo - s.fadeFrom) * smooth;
  } else {
    s.fadeOpacity = s.fadeTo;
  }
  var veil = r3dVeilEl();
  if (veil) { try { veil.style.opacity = String(s.fadeOpacity); } catch (e) {} }
  return s.fadeOpacity;
}
function r3dFadeIn(l, durMs) {
  /* Mở màn mới: phủ đen một khung rồi fade ra — cắt cảnh được giấu sau veil. */
  var s = l.r3d; if (!s) return;
  s.fadeOpacity = 1;
  var veil = r3dVeilEl();
  if (veil) { try { veil.style.opacity = "1"; } catch (e) {} }
  r3dStartFade(l, 0, durMs || 400);
}

/* ---------- Phím giữ (held keys): bài học từ v64 ----------
   Chỉ nghe sự kiện keypress rời rạc thì phím bấm chạm (tap) có thể không
   ăn; game này theo dõi trạng thái phím đang giữ và vòng lặp áp dụng liên
   tục: giữ phím là nhân vật vẫn di chuyển, nhả phím mới dừng. */
function r3dKeyDir(key) {
  var k = String(key || "");
  if (k === "ArrowLeft" || k === "a" || k === "A") return "left";
  if (k === "ArrowRight" || k === "d" || k === "D") return "right";
  if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") return "up";
  if (k === "ArrowDown" || k === "s" || k === "S") return "down";
  return null;
}
function r3dApplyHeldDir(l, dir) {
  if (dir === "left") r3dMoveLeft(l);
  else if (dir === "right") r3dMoveRight(l);
  else if (dir === "up") r3dJump(l);
  else if (dir === "down") r3dSlide(l);
}
function r3dKeyDown(l, key, nowMs) {
  var s = l.r3d; if (!s) return;
  var dir = r3dKeyDir(key);
  if (!dir) return;
  var now = (typeof nowMs === "number") ? nowMs : Date.now();
  r3dApplyHeldDir(l, dir);   /* bấm chạm vẫn ăn ngay như trước */
  s.keys = s.keys || {};
  s.keys[dir] = { down: true, next: now + 180 };
}
function r3dKeyUp(l, key) {
  var s = l.r3d; if (!s || !s.keys) return;
  var dir = r3dKeyDir(key);
  if (dir) delete s.keys[dir];
}
function r3dApplyHeldKeys(l, nowMs) {
  var s = l.r3d; if (!s || !s.keys || s.phase !== "play" || s.paused) return;
  var now = (typeof nowMs === "number") ? nowMs : Date.now();
  Object.keys(s.keys).forEach(function (dir) {
    var rec = s.keys[dir];
    if (rec && rec.down && now >= rec.next) {
      r3dApplyHeldDir(l, dir);
      rec.next = now + 180;
    }
  });
}
function r3dStopLoop(l) {
  if (!l || !l.r3d) return;
  l.r3d.loopOn = false;
  try { if (l.r3d.raf) { if (window.cancelAnimationFrame) window.cancelAnimationFrame(l.r3d.raf); else clearTimeout(l.r3d.raf); } } catch (e) {}
  l.r3d.raf = 0;
  if (l.r3d.keyHandler) { try { document.removeEventListener("keydown", l.r3d.keyHandler); } catch (e) {} l.r3d.keyHandler = null; }
  if (l.r3d.keyUpHandler) { try { document.removeEventListener("keyup", l.r3d.keyUpHandler); } catch (e) {} l.r3d.keyUpHandler = null; }
}
function r3dStartLoop(l) {
  if (!l || !l.r3d || l.r3d.loopOn) return;
  l.r3d.loopOn = true;
  var raf = window.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 32); };
  var last = Date.now();
  var tick = function (now) {
    if (!l.r3d || !l.r3d.loopOn) return;
    var dt = Math.min(100, Math.max(0, (now || Date.now()) - last)); last = now || Date.now();
    var nowMs = now || Date.now();
    /* Vòng lặp thống nhất: phím giữ áp dụng mỗi khung; logic game chỉ chạy
       khi đang chơi; fade + đồng bộ thế giới + vẽ luôn chạy — kể cả tạm
       dừng hay màn thưởng — nên khung hình không bao giờ chết cứng. */
    r3dApplyHeldKeys(l, nowMs);
    if (l.r3d.phase === "play" && !l.r3d.paused) r3dStep(l, dt);
    r3dStepFade(l, dt);
    r3dSyncWorld(l, dt, nowMs);
    try { if (l.r3d.renderer && l.r3d.world) l.r3d.renderer.render(l.r3d.world.scene, l.r3d.world.camera); } catch (e) {}
    /* Kết thúc màn qua fade: veil phủ đen xong mới đổi cảnh, rồi fade ra. */
    if (l.r3d.pendingEnd && l.r3d.fadeOpacity >= 1) {
      l.r3d.pendingEnd = false;
      r3dRenderEnd(l);
      r3dStartFade(l, 0, 500);
    }
    l.r3d.raf = raf(tick);
  };
  l.r3d.raf = raf(tick);
}
function r3dStartGame(l) {
  var s = l.r3d; if (!s) return;
  s.phase = "play";
  s.paused = false;
  r3dBindControls(l);
  r3dStartLoop(l);
  r3dUpdateHud(l);
}
/* ---------- Điều khiển thật: bàn phím + chuột + cảm ứng ----------
   Đây là game di chuyển thật, không phải quiz khoác áo game: người chơi tự
   lái nhân vật trong thế giới; từ vựng là vật thể trong thế giới (ngọc để
   chạy tới, mục tiêu để ngắm) — biết từ thì biết phải chạy tới ngọc nào,
   còn kỹ năng di chuyển mới lấy được nó.
   Bàn phím: ←/→ hoặc A/D đổi làn, ↑/W/Space nhảy, ↓/S trượt.
   Chuột: kéo để lái (trái/phải đổi làn, lên nhảy, xuống trượt); bấm nhanh:
   bấm 1/3 trái → sang trái, 1/3 phải → sang phải, giữa → nhảy.
   Cảm ứng: vuốt như chuột kéo. Các hàm r3dKey/r3dMouse* là logic thuần để
   probe kiểm chứng không cần DOM event. */
function r3dKey(l, key) {
  var k = String(key || "");
  if (k === "ArrowLeft" || k === "a" || k === "A") r3dMoveLeft(l);
  else if (k === "ArrowRight" || k === "d" || k === "D") r3dMoveRight(l);
  else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") r3dJump(l);
  else if (k === "ArrowDown" || k === "s" || k === "S") r3dSlide(l);
}
function r3dMouseDown(l, x, y) {
  var s = l.r3d; if (!s) return;
  s.mouseStart = { x: x, y: y };
  s.mouseMoved = false;
}
function r3dMouseMove(l, x, y) {
  var s = l.r3d; if (!s || !s.mouseStart || s.phase !== "play" || s.paused) return;
  var dx = x - s.mouseStart.x, dy = y - s.mouseStart.y;
  if (Math.abs(dx) >= 24) {
    if (dx < 0) r3dMoveLeft(l); else r3dMoveRight(l);
    s.mouseStart.x = x; s.mouseMoved = true;
  }
  if (Math.abs(dy) >= 24) {
    if (dy < 0) r3dJump(l); else r3dSlide(l);
    s.mouseStart.y = y; s.mouseMoved = true;
  }
}
function r3dMouseUp(l, x, y, width) {
  var s = l.r3d; if (!s || !s.mouseStart) return;
  var st = s.mouseStart; s.mouseStart = null;
  if (s.phase !== "play" || s.paused) return;
  if (!s.mouseMoved && Math.abs(x - st.x) < 12 && Math.abs(y - st.y) < 12) {
    var w = width || 640;
    if (x < w / 3) r3dMoveLeft(l);
    else if (x > 2 * w / 3) r3dMoveRight(l);
    else r3dJump(l);
  }
}
function r3dBindControls(l) {
  var s = l.r3d; if (!s) return;
  /* Phím: đăng ký một lần ở document (sống qua các lần vẽ lại màn hình),
     theo dõi cả keydown (giữ) và keyup (nhả) để phím giữ vẫn di chuyển. */
  if (!s.keyHandler) {
    s.keyHandler = function (ev) {
      var k = ev.key;
      if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown" || k === " ") {
        try { ev.preventDefault(); } catch (e) {}
      }
      r3dKeyDown(l, k, Date.now());
    };
    s.keyUpHandler = function (ev) { r3dKeyUp(l, ev.key); };
    try { document.addEventListener("keydown", s.keyHandler); } catch (e) {}
    try { document.addEventListener("keyup", s.keyUpHandler); } catch (e) {}
  }
  /* Chuột/cảm ứng: gắn lại mỗi lần vẽ (phần tử canvas được tạo mới). */
  var box = null;
  try { box = document.getElementById("r3dTouch"); } catch (e) {}
  if (box) {
    var pos = function (ev) {
      var r = null;
      try { r = box.getBoundingClientRect(); } catch (e) {}
      var t = (ev.changedTouches && ev.changedTouches[0]) || ev;
      return { x: t.clientX - (r ? r.left : 0), y: t.clientY - (r ? r.top : 0), w: r ? r.width : 640 };
    };
    box.addEventListener("touchstart", function (ev) {
      var p = pos(ev);
      s.touchStart = { x: p.x, y: p.y };
      r3dMouseDown(l, p.x, p.y);
    }, { passive: true });
    box.addEventListener("touchmove", function (ev) {
      var p = pos(ev);
      r3dMouseMove(l, p.x, p.y);
    }, { passive: true });
    box.addEventListener("touchend", function (ev) {
      var p = pos(ev);
      r3dMouseUp(l, p.x, p.y, p.w);
      s.touchStart = null;
    }, { passive: true });
    box.addEventListener("mousedown", function (ev) { var p = pos(ev); r3dMouseDown(l, p.x, p.y); });
    box.addEventListener("mousemove", function (ev) { if (s.mouseStart) { var p = pos(ev); r3dMouseMove(l, p.x, p.y); } });
    box.addEventListener("mouseup", function (ev) { var p = pos(ev); r3dMouseUp(l, p.x, p.y, p.w); });
  }
}

/* Nạp Three.js lười + dựng thế giới + chạy vòng lặp thống nhất. Dùng chung
   cho cả màn chào và màn chơi để thế giới sống ngay từ màn chào. */
function r3dEnsure3D(l) {
  if (!l.r3d) return;
  r3dStartLoop(l);
  r3dLoadThree().then(function (THREE) {
    if (!l.r3d) return;
    l.r3d.three = THREE;
    l.r3d.world = r3dBuildWorld(THREE);
    var cv = null;
    try { cv = document.getElementById("r3dCanvas"); } catch (e) {}
    if (cv) {
      try {
        l.r3d.renderer = r3dCreateRenderer(THREE, cv);
        l.r3d.renderer.setSize(cv.clientWidth || 640, cv.clientHeight || 360);
      } catch (e) {}
    }
  }).catch(function () {
    var w = null;
    try { w = document.getElementById("r3dHudWord"); } catch (e) {}
    if (w) w.textContent = "Chưa tải được thư viện 3D — kiểm tra mạng rồi bấm Chơi lại.";
  });
}
function r3dRenderIntro(l) {
  r3dEnterWorld(l);
  var app = r3dWorldInner();
  if (!app) return;
  var s = l.r3d;
  var sets = r3dPickSets();
  var opts = sets.map(function (si) {
    var st = (typeof CONTENT !== "undefined" && CONTENT.vocab && CONTENT.vocab[si]) ? CONTENT.vocab[si] : {};
    return '<button class="btn btn-primary" data-r3d-set="' + si + '">🏃 ' + (st.topic || "") + '</button>';
  }).join(" ");
  app.innerHTML = '<div id="r3dTouch" style="position:relative;min-height:100vh">'
    + '<canvas id="r3dCanvas" width="640" height="360" style="position:absolute;inset:0;width:100%;height:100%;background:#87ceeb"></canvas>'
    + '<div class="qblock" style="position:relative;background:rgba(255,255,255,0.88)"><h2>🏃 Chạy 3D — Biệt đội Săn Từ</h2>'
    + '<p>Chạy 3 chiều thật: vuốt trái/phải để đổi làn, vuốt lên để nhảy, vuốt xuống để trượt. Gom đủ '
    + R3D_GOAL_GEMS + ' ngọc từ vựng thì thắng. Đụng chướng ngại mất 1 tim, còn 3 tim.</p>'
    + '<p>Điều khiển: bàn phím WASD hoặc phím mũi tên; chuột: kéo để lái, bấm trái/phải để đổi làn, bấm giữa để nhảy; điện thoại: vuốt. '
    + 'Trên đường sẽ có một từ mục tiêu — chạy tới đúng ngọc từ đó để được thưởng thêm, kỹ năng di chuyển mới lấy được nó.</p>'
    + '<div class="row">' + (opts || "<p>Chưa có bộ từ đủ 12 thẻ — học thêm từ rồi quay lại.</p>") + '</div>'
    + '<div class="row" style="margin-top:12px">' + r3dExitButtonHTML() + '</div>'
    + '<div id="r3dStage" style="margin-top:12px"></div></div></div>';
  r3dWireExit(l);
  var btns = app.querySelectorAll("[data-r3d-set]");
  for (var i = 0; i < btns.length; i++) (function (b) {
    b.onclick = function () {
      r3dNewGame(l, parseInt(b.getAttribute("data-r3d-set"), 10));
      r3dRenderPlay(l);
    };
  })(btns[i]);
  r3dFadeIn(l, 500);
  r3dEnsure3D(l);   /* thế giới sống ngay sau màn chào, không phải ảnh tĩnh */
  void s;
}
function r3dRenderPlay(l) {
  r3dEnterWorld(l);
  var app = r3dWorldInner();
  if (!app) return;
  app.innerHTML = '<div class="qblock" style="margin:0;border-radius:0;min-height:100vh"><div class="row" style="justify-content:space-between">'
    + '<span id="r3dHudScore">🏆 0</span><span id="r3dHudGoal">💎 0/' + R3D_GOAL_GEMS + '</span>'
    + '<span id="r3dHudDist">0m</span><span id="r3dHudLives">❤️ ❤️ ❤️</span>'
    + '<button class="btn" id="r3dPause">⏸ Tạm dừng</button>' + r3dExitButtonHTML() + '</div>'
    + '<div class="row"><span id="r3dHudTarget">🎯 —</span></div>'
    + '<div id="r3dTouch" style="position:relative;margin-top:10px">'
    + '<canvas id="r3dCanvas" width="640" height="360" style="width:100%;height:calc(100vh - 120px);border-radius:12px;background:#87ceeb"></canvas>'
    + '<p id="r3dHudWord" class="mut" style="text-align:center"></p></div></div>';
  r3dWireExit(l);
  var pb = document.getElementById("r3dPause");
  if (pb) pb.onclick = function () { r3dPauseToggle(l); pb.textContent = l.r3d.paused ? "▶ Tiếp tục" : "⏸ Tạm dừng"; };
  r3dStartGame(l);
  r3dFadeIn(l, 400);
  /* Nạp Three.js lười: chưa có mạng thì báo rõ, không vỡ game. */
  r3dEnsure3D(l);
}
function r3dRenderEnd(l) {
  r3dEnterWorld(l);
  var app = r3dWorldInner();
  if (!app) return;
  var s = l.r3d;
  var win = s.phase === "win";
  var words = s.collected.map(function (g) { return g.word + " — " + g.vi; }).join("<br>");
  var panel = '<div class="qblock"><h2>' + (win ? "🎉 Thắng rồi!" : "💪 Chưa qua màn — thử lại nhé!") + '</h2>'
    + '<p>Điểm: ' + s.finalScore + ' · Ngọc đã gom: ' + s.collected.length + '/' + R3D_GOAL_GEMS + ' · Còn ' + s.lives + ' tim</p>'
    + (win ? r3dRewardStarsHTML(s.stars) : "")
    + (words ? '<p>Từ đã gom:<br>' + words + '</p>' : '<p>Chưa gom được ngọc nào — chạy lại và gom từ nhé.</p>')
    + '<div class="row"><button class="btn btn-primary" id="r3dAgain">🔁 Chơi lại</button>'
    + '<button class="btn" id="r3dHub">🏠 Về Game Hub</button>' + r3dExitButtonHTML() + '</div></div>';
  /* Màn thưởng phủ lên trên thế giới đang sống (không xóa canvas) — phía
     sau tấm bảng, mây vẫn trôi, cây vẫn đung đưa, nhân vật vẫn thở. */
  var cv = null;
  try { cv = document.getElementById("r3dCanvas"); } catch (e) {}
  if (cv) {
    var old = null;
    try { old = document.getElementById("r3dEndPanel"); } catch (e) {}
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var wrap = document.createElement("div");
    wrap.id = "r3dEndPanel";
    wrap.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);z-index:5;";
    wrap.innerHTML = panel;
    try { app.appendChild(wrap); } catch (e) { app.innerHTML = panel; }
  } else {
    app.innerHTML = panel;
  }
  if (win) r3dAnimateStars();
  r3dWireExit(l);
  var ag = document.getElementById("r3dAgain");
  if (ag) ag.onclick = function () { r3dRetry(l); };
  var hb = document.getElementById("r3dHub");
  if (hb) hb.onclick = function () { r3dExitWorld(l); };
}
function r3dRender(l) {
  if (!l.r3d) r3dNewGame(l, 0);
  if (l.r3d.phase === "play" || l.r3d.phase === "paused") r3dRenderPlay(l);
  else if (l.r3d.phase === "win" || l.r3d.phase === "lose") r3dRenderEnd(l);
  else r3dRenderIntro(l);
}

/* API dùng chung cho UI và probe kiểm chứng. */
window.Runner3D = {
  adapter: r3dAdapterItems,
  pickSets: r3dPickSets,
  wordOk: r3dWordOk,
  newGame: r3dNewGame,
  startGame: r3dStartGame,
  step: r3dStep,
  moveLeft: r3dMoveLeft,
  moveRight: r3dMoveRight,
  jump: r3dJump,
  slide: r3dSlide,
  key: r3dKey,
  keyDown: r3dKeyDown,
  keyUp: r3dKeyUp,
  keyDir: r3dKeyDir,
  applyHeldKeys: r3dApplyHeldKeys,
  mouseDown: r3dMouseDown,
  mouseMove: r3dMouseMove,
  mouseUp: r3dMouseUp,
  swingAt: r3dSwingAt,
  startFade: r3dStartFade,
  stepFade: r3dStepFade,
  fadeIn: r3dFadeIn,
  pauseToggle: r3dPauseToggle,
  spawn: r3dSpawn,
  finish: r3dFinish,
  toFail: r3dToFail,
  retry: r3dRetry,
  updateHud: r3dUpdateHud,
  stopLoop: r3dStopLoop,
  startLoop: r3dStartLoop,
  buildWorld: r3dBuildWorld,
  createRenderer: r3dCreateRenderer,
  syncWorld: r3dSyncWorld,
  enterWorld: r3dEnterWorld,
  exitWorld: r3dExitWorld,
  worldOn: r3dWorldOn,
  chromeSelectors: R3D_CHROME_SELECTORS,
  rewardStarsHTML: r3dRewardStarsHTML,
  animateStars: r3dAnimateStars,
  render: r3dRender,
  renderIntro: r3dRenderIntro,
  renderPlay: r3dRenderPlay,
  renderEnd: r3dRenderEnd,
  lanes: R3D_LANE_X,
  goalGems: R3D_GOAL_GEMS,
  pixelRatioCap: R3D_PIXEL_RATIO_CAP,
  speed: R3D_SPEED
};
