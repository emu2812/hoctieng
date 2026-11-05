/* G71 — Rồng Lửa RPG, vertical slice vùng 1 Rừng Xanh (v80: ảnh Canva).
   Cốt truyện: vương quốc Ngôn Ngữ bị Bóng Tối Câm Lặng phong ấn, các từ
   bị đánh cắp; rồng nhỏ đi thu hồi từng từ. Vùng 1: 3 ải, mỗi ải 3 trận.
   Quái tiến tới mang từ; tung chiêu = gõ/chạm đúng từ. Chiêu có hệ
   (Lửa/Nước/Điện), quái yếu một hệ — đúng hệ sát thương tối đa, sai hệ
   nửa sát thương; trúng liên tiếp nhân combo tới x3. Rồng 5 tim, quái
   chạm tới trừ 1 tim (khiên chặn được 1 đòn); hết tim thua ải nhưng GIỮ
   cấp/vàng/từ đã thu. Từ đánh bại lần đầu thành chiêu trong Từ Điển Rồng,
   dùng nhiều thăng cấp (tối đa cấp 3). Thắng rơi vàng, cửa hàng giữa các
   trận (bình máu/khiên). Trùm cuối vùng 1 đổi hệ sau mỗi 1/3 máu.
   Từ lấy từ kho CONTENT.vocab sẵn có, chủ đề thiên nhiên — không bịa.
   Hình: ảnh Canva vùng 1 (assets/ronglua/) theo ART_DIRECTION.md;
   bản vẽ code giữ làm dự phòng khi ảnh lỗi/chưa load xong.
   Logic thuần (không cần canvas) để probe kiểm tra được; start() nối DOM. */
(function () {
  "use strict";

  /* ---- Bảng màu ART_DIRECTION.md (chỉ dùng các màu này) ---- */
  var C = {
    ink950: "#04060F", ink900: "#0B1030", ink800: "#1E1B4B", ink700: "#312E81",
    ink600: "#4338CA", ink300: "#A5B4FC", ink200: "#C7D2FE",
    amber700: "#B45309", amber500: "#F59E0B", amber400: "#FBBF24", amber100: "#FDE68A",
    cream: "#FFFBEB", teal600: "#0D9488", grey200: "#E5E7EB", grey400: "#9CA3AF",
    amberDark: "#92400E"
  };

  /* ---- Hệ chiêu: Nước khắc Lửa, Điện khắc Nước, Lửa khắc Điện.
     Quái yếu một hệ: tung đúng hệ yếu gây sát thương tối đa. ---- */
  var ELEMENTS = {
    fire: { key: "fire", name: "Lửa", icon: "🔥", color: "#F59E0B", dark: "#B45309" },
    water: { key: "water", name: "Nước", icon: "💧", color: "#0D9488", dark: "#0D9488" },
    elec: { key: "elec", name: "Điện", icon: "⚡", color: "#FBBF24", dark: "#B45309" }
  };
  var EL_ORDER = ["fire", "water", "elec"];
  function nextEl(k) { return EL_ORDER[(EL_ORDER.indexOf(k) + 1) % EL_ORDER.length]; }

  /* ---- Ảnh Canva vùng 1 Rừng Xanh (v80): vẽ bằng ảnh, bản vẽ code
     làm dự phòng — ảnh lỗi hoặc chưa load xong thì vẽ lại bằng code như
     cũ, game không vỡ. Ảnh đã tối ưu ở assets/ronglua/ (nền ≤1600px,
     sprite cạnh dài ≤512px, huy hiệu cắt từ ảnh quái biến thể). ---- */
  var RL_ART = "assets/ronglua/";
  var RL_IMGS = {
    bg: "nen-rung.png", dragon: "rong-lua-nho.png", monster: "quai-bong-toi.png",
    badge_fire: "quai-lua-badge.png", badge_water: "quai-nuoc-badge.png",
    badge_elec: "quai-dien-badge.png",
    coin: "dong-xu-vang.png", potion: "binh-thuoc.png", shield: "khien.png"
  };
  var rlImg = {};
  function rlLoadImg(name) {
    var rec = { img: null, ok: false };
    try {
      var im = new Image();
      im.onload = function () { rec.ok = !!(im.naturalWidth && im.naturalHeight); };
      im.onerror = function () { rec.ok = false; };
      im.src = RL_ART + RL_IMGS[name];
      rec.img = im;
    } catch (e) { rec.ok = false; }
    rlImg[name] = rec;
  }
  Object.keys(RL_IMGS).forEach(rlLoadImg);
  function rlReady(name) {
    var r = rlImg[name];
    return !!(r && r.img && r.ok && r.img.complete && r.img.naturalWidth > 0);
  }
  function rlDrawCover(ctx, name, W, H) {
    if (!rlReady(name)) return false;
    var im = rlImg[name].img, iw = im.naturalWidth, ih = im.naturalHeight;
    var sc = Math.max(W / iw, H / ih);
    var dw = iw * sc, dh = ih * sc;
    ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return true;
  }
  /* Ảnh nhỏ dùng trong DOM (vàng/bình/khiên ở bản đồ, cửa hàng, HUD). */
  function rlImgTag(name, size) {
    return '<img src="' + RL_ART + RL_IMGS[name] + '" alt="" style="width:' + size + 'px;height:' + size + 'px;vertical-align:-4px">';
  }

  var POTION_COST = 20, POTION_HEAL = 2, SHIELD_COST = 25;
  var BATTLE_XP = 5, BOSS_GOLD = 30, MONSTER_GOLD = 5;
  var LEVEL_NAMES = ["", "Bìa Rừng", "Lối Mòn Xanh", "Hang Trùm Bóng Tối"];

  /* ---- Kho từ theo track (không bịa) ----
     v91: EN moi loc theo chu de thien nhien (vung 1 Rung Xanh); track khac
     dung toan bo kho that cua track do (chu de theo kho cua track). */
  function naturePool() {
    var tk = "en";
    try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? G71.trackKey() : "en"; } catch (e) {}
    if (tk !== "en") {
      var tp = [];
      try { tp = G71.pool(); } catch (e) {}
      var seen2 = {}, uniq2 = [];
      tp.forEach(function (p) {
        var k = String(p.w); if (!seen2[k]) { seen2[k] = 1; uniq2.push({ w: p.w, vi: p.vi, type: p.type || p.w, py: p.py || "" }); }
      });
      return uniq2;
    }
    var re = /environment|nature|animal|weather|geograph|agricultur|climate/i;
    var out = [];
    try {
      (CONTENT.vocab || []).forEach(function (set) {
        if (!re.test(set.theme || set.topic || "")) return;
        (set.cards || []).forEach(function (c) {
          if (c && c.w && c.vi && /^[A-Za-z]+$/.test(c.w)) out.push({ w: String(c.w), vi: String(c.vi), type: String(c.w) });
        });
      });
    } catch (e) {}
    var seen = {}, uniq = [];
    out.forEach(function (p) {
      var k = p.w.toLowerCase(); if (!seen[k]) { seen[k] = 1; uniq.push(p); }
    });
    return uniq;
  }
  /* Lấy n từ thiên nhiên chưa dùng; thiếu thì bù từ kho chung (vẫn là từ
     thật trong sách, lọc một chữ cái a-z). */
  function pickNatureWords(n, used) {
    used = used || {};
    var pool = G71.shuffle(naturePool().slice());
    var words = [];
    pool.forEach(function (p) {
      if (words.length >= n) return;
      if (!G71.isTypeable(p)) return;
      if (!used[String(p.w)]) { used[String(p.w)] = 1; words.push(p); }
    });
    if (words.length < n) {
      var rest = G71.shuffle(G71.pool()).filter(function (p) {
        return G71.isTypeable(p) && !used[String(p.w)];
      });
      while (words.length < n && rest.length) { var p = rest.pop(); used[String(p.w)] = 1; words.push({ w: p.w, vi: p.vi, type: p.type || p.w, py: p.py || "" }); }
    }
    return words;
  }
  function pickBossWord(used) {
    var pool = G71.shuffle(naturePool().slice()).filter(function (p) {
      return (p.type || p.w).length >= 7 && !used[String(p.w)];
    });
    if (pool.length) { used[String(pool[0].w)] = 1; return pool[0]; }
    var rest = pickNatureWords(1, used);
    if (rest[0]) return rest[0];
    var all = G71.pool();
    return all.length ? all[0] : { w: "mountain", vi: "núi", type: "mountain" };
  }

  /* ---- Tiến trình lát cắt, lưu trong state.rongLua (sống qua lần chơi) ---- */
  function freshRL() { return { gold: 0, shield: 0, dict: {}, unlocked: 1, cleared: {} }; }
  function loadRL() {
    var d = freshRL();
    try {
      if (typeof state !== "undefined" && state && state.rongLua) {
        var s = state.rongLua;
        if (typeof s.gold === "number") d.gold = s.gold;
        if (typeof s.shield === "number") d.shield = s.shield;
        if (s.dict) d.dict = s.dict;
        if (typeof s.unlocked === "number") d.unlocked = Math.max(1, Math.min(3, s.unlocked));
        if (s.cleared) d.cleared = s.cleared;
      }
    } catch (e) {}
    return d;
  }
  function saveRL(rl) {
    try {
      if (typeof state !== "undefined" && state) {
        state.rongLua = rl;
        if (typeof saveState === "function") saveState();
      }
    } catch (e) {}
  }

  /* ---- Logic thuần của trận đánh ---- */
  function damageFor(wordLen, wordLvl, match, combo) {
    var base = match ? 2 : 1;
    var lenBonus = wordLen >= 7 ? 1 : 0;
    var mult = Math.min(3, 1 + combo);
    return (base + lenBonus + (wordLvl - 1)) * mult;
  }
  var LOGIC = {
    elements: ELEMENTS,
    nextEl: nextEl,
    damageFor: damageFor,
    pickNatureWords: pickNatureWords,
    pickBossWord: pickBossWord,
    naturePool: naturePool,
    battleSize: function (level, battle) { return 2 + level + battle; },
    monsterHp: function (level) { return 3 + (level - 1); },
    createBattle: function (words, opts) {
      opts = opts || {};
      var level = opts.level || 1, isBoss = !!opts.boss;
      var ws = words.map(function (wd, i) {
        var boss = isBoss && i === 0;
        return {
          w: wd.w, vi: wd.vi, type: wd.type || wd.w, isBoss: boss,
          weak: EL_ORDER[Math.floor(Math.random() * 3)],
          hp: boss ? 30 : LOGIC.monsterHp(level), maxHp: boss ? 30 : LOGIC.monsterHp(level),
          phase: 0, progress: 0, status: "advancing",
          x: 0.15 + Math.random() * 0.7,
          y: -0.15 - i * 0.18,
          speed: boss ? 0.025 : 0.055 + 0.005 * level,
          gold: boss ? BOSS_GOLD : MONSTER_GOLD,
          /* Đạn của quái (v83): phát đầu sau ~2-3 giây, sau đó mỗi
             ~2-3 giây một phát (trùm nhanh hơn). */
          fireIn: boss ? 1.4 + Math.random() * 0.8 : 2.2 + Math.random() * 1.3
        };
      });
      return {
        level: level, battle: opts.battle || 1, isBoss: isBoss,
        words: ws, total: ws.length, resolved: 0, active: null,
        hearts: (typeof opts.hearts === "number") ? opts.hearts : 5,
        shield: (typeof opts.shield === "number") ? opts.shield : 0,
        element: opts.element || "fire",
        score: 0, goldEarned: 0, combo: 0, over: null,
        graceUntil: 0, events: [], collected: [],
        dragon: { x: 0.5, y: 0.85 }, bolts: []
      };
    },
    /* Lái rồng trong sân (v83): x 0,08–0,92, y 0,5–0,92. */
    moveDragon: function (st, dx, dy) {
      if (st.over) return;
      st.dragon.x = Math.max(0.08, Math.min(0.92, st.dragon.x + dx));
      st.dragon.y = Math.max(0.5, Math.min(0.92, st.dragon.y + dy));
    },
    setDragon: function (st, x, y) {
      if (st.over) return;
      st.dragon.x = Math.max(0.08, Math.min(0.92, x));
      st.dragon.y = Math.max(0.5, Math.min(0.92, y));
    },
    lockMonster: function (st, idx) {
      if (st.over) return;
      if (st.words[idx] && st.words[idx].status === "advancing") st.active = idx;
    },
    typeLetter: function (st, ch, now, element, wordLvl) {
      if (st.over) return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1) return { ok: false };
      if (now < st.graceUntil) return { ok: false, grace: true };
      var w = null;
      if (st.active !== null && st.words[st.active] && st.words[st.active].status === "advancing") {
        w = st.words[st.active];
      } else {
        var best = null;
        st.words.forEach(function (wd, i) {
          if (wd.status !== "advancing") return;
          var tg = wd.type || wd.w;
          if (tg.charAt(wd.progress).toLowerCase() !== ch) return;
          if (best === null || wd.y > st.words[best].y) best = i;
        });
        if (best === null) { st.combo = 0; return { ok: false, wrong: true }; }
        st.active = best;
        w = st.words[best];
      }
      var tgt = w.type || w.w;
      if (tgt.charAt(w.progress).toLowerCase() !== ch) { st.combo = 0; return { ok: false, wrong: true }; }
      w.progress++;
      if (w.progress < tgt.length) return { ok: true };
      /* Gõ xong một từ = tung một chiêu lên quái đang khóa. */
      var el = element || st.element;
      var match = (el === w.weak);
      var lvl = 1;
      if (typeof wordLvl === "function") { try { lvl = wordLvl(w.w) || 1; } catch (e) { lvl = 1; } }
      else if (typeof wordLvl === "number") lvl = wordLvl;
      var dmg = damageFor((w.type || w.w).length, lvl, match, st.combo);
      w.hp -= dmg;
      st.score += dmg;
      var killed = false, gold = 0;
      if (w.hp <= 0) {
        w.status = "done";
        w.hp = 0;
        st.resolved++;
        killed = true;
        gold = w.gold;
        st.goldEarned += gold;
        st.collected.push({ w: w.w, vi: w.vi, el: el, lvl: lvl });
        st.active = null;
      } else {
        /* Quái chưa chết: từ reset để gõ lại từ đầu. */
        w.progress = 0;
      }
      st.combo++;
      var phaseEvent = null;
      if (w.isBoss && w.status === "advancing") {
        if (w.phase === 0 && w.hp <= 20) {
          w.phase = 1; w.weak = nextEl(w.weak);
          phaseEvent = { type: "bossPhase", weak: w.weak, phase: 1 };
          st.events.push(phaseEvent);
        } else if (w.phase === 1 && w.hp <= 10) {
          w.phase = 2; w.weak = nextEl(w.weak);
          phaseEvent = { type: "bossPhase", weak: w.weak, phase: 2 };
          st.events.push(phaseEvent);
        }
      }
      if (st.resolved >= st.total) st.over = "win";
      return { ok: true, completed: true, dmg: dmg, match: match, killed: killed,
        gold: gold, monster: w, bossPhase: phaseEvent };
    },
    tick: function (st, dt, now) {
      if (st.over) return;
      st.words.forEach(function (wd) {
        if (wd.status !== "advancing") return;
        wd.y += wd.speed * dt;
        /* Quái trôi nhẹ về phía rồng (đuổi theo) để việc né có ý nghĩa. */
        wd.x += Math.max(-1, Math.min(1, st.dragon.x - wd.x)) * 0.12 * dt;
        /* Chạm tới rồng: quái rơi tới đáy sân HOẶC đụng trúng rồng. */
        if (wd.y >= 1.0 || (Math.abs(wd.x - st.dragon.x) < 0.06 && Math.abs(wd.y - st.dragon.y) < 0.09)) {
          wd.status = "escaped";
          st.resolved++;
          st.combo = 0;
          if (st.active !== null && st.words[st.active] === wd) st.active = null;
          if (st.shield > 0) {
            st.shield--;
            st.events.push({ type: "shieldBlock" });
          } else {
            st.hearts--;
            st.graceUntil = now + 500;
            st.events.push({ type: "heartLost" });
            if (st.hearts <= 0) { st.over = "lose"; st.active = null; }
          }
          return;
        }
        /* Bắn đạn từ xa (chỉ khi còn cách rồng một đoạn — không bắn
           điểm tựa; quái ở sát mép trên chưa bắn). */
        if (wd.y > 0.05 && wd.y < 0.65) {
          wd.fireIn -= dt;
          if (wd.fireIn <= 0) {
            var dx = st.dragon.x - wd.x, dy = st.dragon.y - wd.y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            st.bolts.push({ x: wd.x, y: wd.y, vx: dx / len * 0.45, vy: dy / len * 0.45 });
            wd.fireIn = wd.isBoss ? 1.3 + Math.random() * 0.9 : 2.2 + Math.random() * 1.5;
          }
        }
      });
      /* Đạn của quái bay tới rồng: trúng thì mất tim (ân hạn 500ms sau
         mỗi lần mất tim vẫn bảo vệ khỏi đạn). */
      for (var i = st.bolts.length - 1; i >= 0; i--) {
        var b = st.bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -0.05 || b.x > 1.05 || b.y < -0.05 || b.y > 1.05) { st.bolts.splice(i, 1); continue; }
        if (Math.abs(b.x - st.dragon.x) < 0.05 && Math.abs(b.y - st.dragon.y) < 0.07) {
          st.bolts.splice(i, 1);
          if (now >= st.graceUntil) {
            st.combo = 0;
            if (st.shield > 0) {
              st.shield--;
              st.events.push({ type: "shieldBlock" });
            } else {
              st.hearts--;
              st.graceUntil = now + 500;
              st.events.push({ type: "heartLost" });
              if (st.hearts <= 0) { st.over = "lose"; st.active = null; }
            }
          }
        }
      }
      if (!st.over && st.resolved >= st.total) st.over = "win";
    }
  };

  /* ---- Vẽ bằng code theo ART_DIRECTION.md ---- */
  /* Tim vector hổ phách (sống) / xám (mất) cho HUD — không dùng ký tự ♥. */
  function heartsSvg(n, total) {
    var s = "";
    for (var i = 0; i < total; i++) {
      var fill = (i < n) ? C.amber500 : C.grey400;
      s += '<svg width="18" height="17" viewBox="0 0 24 22" style="vertical-align:-2px"><path d="M12 21 C5 15 2 11 2 7.5 C2 4.5 4.5 2 7.5 2 C9.5 2 11 3.5 12 5 C13 3.5 14.5 2 16.5 2 C19.5 2 22 4.5 22 7.5 C22 11 19 15 12 21Z" fill="' + fill + '"/></svg>';
    }
    return s;
  }
  /* Biểu tượng hệ dạng vector nhỏ: lửa = giọt lửa, nước = giọt nước,
     điện = tia chớp. Màu lấy theo hệ. */
  function drawElIcon(ctx, el, x, y, r) {
    var col = ELEMENTS[el].color;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col;
    ctx.beginPath();
    if (el === "fire") {
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.55, r * 0.55);
      ctx.quadraticCurveTo(0, r * 1.05, -r * 0.55, r * 0.55);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.1, 0, -r);
    } else if (el === "water") {
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.85, r * 0.1, r * 0.6, r * 0.5);
      ctx.quadraticCurveTo(0, r * 1.0, -r * 0.6, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.85, r * 0.1, 0, -r);
    } else {
      ctx.moveTo(r * 0.25, -r);
      ctx.lineTo(-r * 0.55, r * 0.15);
      ctx.lineTo(-r * 0.05, r * 0.15);
      ctx.lineTo(-r * 0.25, r);
      ctx.lineTo(r * 0.55, -r * 0.15);
      ctx.lineTo(r * 0.05, -r * 0.15);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawElBadge(ctx, el, x, y, r) {
    ctx.save();
    ctx.fillStyle = "rgba(4,6,15,.55)";
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ELEMENTS[el].color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
    drawElIcon(ctx, el, x, y, r * 0.62);
    ctx.restore();
  }
  /* Rừng Xanh: ảnh nền Canva (cover) khi ảnh đã load; bản vẽ code lúc
     chạng vạng làm dự phòng. Sương teal + đom đóm hổ phách vẽ bằng code
     làm lớp phủ chuyển động trên cả hai trường hợp. */
  function paintForest(ctx, W, H, t) {
    var useImg = rlReady("bg");
    if (useImg) {
      rlDrawCover(ctx, "bg", W, H);
    } else {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.ink950); g.addColorStop(0.55, C.ink900); g.addColorStop(1, C.ink800);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Quầng teal chân trời. */
    ctx.fillStyle = "rgba(13,148,136,.16)";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.62, W * 0.62, H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    /* Hàng cây xa (mờ, nhạt). */
    ctx.fillStyle = C.ink800;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62);
    for (var x = 0; x <= W; x += 18) {
      var h = H * 0.52 + Math.sin(x / 47 + 1) * H * 0.045;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(W, H * 0.62); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    /* Hàng cây giữa (đậm hơn, tán tròn). */
    ctx.fillStyle = C.ink700;
    for (var i = 0; i < 9; i++) {
      var tx = (i * 0.13 + 0.02) * W, tr = (0.05 + (i % 3) * 0.014) * W;
      ctx.beginPath(); ctx.arc(tx, H * 0.66, tr, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(tx - tr * 0.08, H * 0.66, tr * 0.16, H * 0.1);
    }
    }
    /* Sương teal trôi. */
    ctx.fillStyle = "rgba(13,148,136,.07)";
    for (var m = 0; m < 3; m++) {
      var mx = ((t / 9000 + m * 0.37) % 1.3 - 0.15) * W;
      ctx.beginPath(); ctx.ellipse(mx, H * (0.58 + m * 0.08), W * 0.24, H * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!useImg) {
    /* Mặt đất (chỉ bản vẽ code). */
    ctx.fillStyle = C.ink900;
    ctx.fillRect(0, H * 0.74, W, H * 0.26);
    }
    /* Đom đóm hổ phách bay (điểm sáng, không blur thật). */
    for (var f = 0; f < 14; f++) {
      var fx = (f * 97 + Math.sin(t / 1400 + f * 2.1) * 14) % W;
      var fy = H * (0.2 + ((f * 53) % 50) / 100) + Math.cos(t / 1100 + f) * 6;
      var fa = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t / 500 + f * 1.7));
      ctx.globalAlpha = fa;
      ctx.fillStyle = C.amber400;
      ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fa * 0.3;
      ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!useImg) {
    /* Bụi cây tiền cảnh hai bên đáy làm khung (chàm đậm nhất, chỉ bản vẽ code). */
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.94, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  /* Rồng nhỏ nhìn lên (hướng quái rơi xuống): thân chàm đậm, bụng + sừng
     hổ phách nhạt, cánh hổ phách vỗ nhẹ, điểm sáng trắng ở trên-trái,
     bóng đổ ellipse dưới thân, viền 2px. */
  function drawDragonUp(ctx, x, y, s, t, hurt) {
    if (rlReady("dragon")) {
      var dim = rlImg.dragon.img;
      var dw = s * 4.7, dh = dw * dim.naturalHeight / dim.naturalWidth;
      /* Bóng đổ dưới thân. */
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.beginPath(); ctx.ellipse(x, y + dh * 0.44, dw * 0.4, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      /* Rồng ảnh Canva: bổng nhẹ + nghiêng nhẹ theo nhịp; bị thương thì
         nhấp nháy + lắc nhẹ. */
      ctx.save();
      ctx.translate(x, y + Math.sin(t / 500) * 3);
      ctx.rotate(Math.sin(t / 700) * 0.05);
      if (hurt) { ctx.globalAlpha = 0.55; ctx.translate((Math.random() - 0.5) * 4, 0); }
      ctx.drawImage(dim, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    /* Bóng đổ dưới thân. */
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath(); ctx.ellipse(0, s * 1.05, s * 1.25, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    var flap = Math.sin(t / 280) * 0.18;
    /* Cánh hổ phách hai bên (vỗ nhẹ). */
    ctx.fillStyle = C.amber500;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.1);
    ctx.quadraticCurveTo(-s * 1.7, -s * (0.9 + flap), -s * 1.9, -s * 0.1);
    ctx.quadraticCurveTo(-s * 1.2, s * 0.25, -s * 0.7, s * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.1);
    ctx.quadraticCurveTo(s * 1.7, -s * (0.9 + flap), s * 1.9, -s * 0.1);
    ctx.quadraticCurveTo(s * 1.2, s * 0.25, s * 0.7, s * 0.1);
    ctx.closePath(); ctx.fill();
    /* Thân chàm đậm, viền 2px. */
    ctx.fillStyle = hurt ? C.amberDark : C.ink700;
    ctx.strokeStyle = C.ink800; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    /* Bụng hổ phách nhạt. */
    ctx.fillStyle = C.amber100;
    ctx.beginPath(); ctx.ellipse(0, s * 0.28, s * 0.55, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    /* Đầu + sừng. */
    ctx.fillStyle = C.ink700;
    ctx.beginPath(); ctx.arc(0, -s * 0.85, s * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.amber100;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 1.25); ctx.lineTo(-s * 0.5, -s * 1.7); ctx.lineTo(-s * 0.15, -s * 1.3); ctx.closePath();
    ctx.moveTo(s * 0.35, -s * 1.25); ctx.lineTo(s * 0.5, -s * 1.7); ctx.lineTo(s * 0.15, -s * 1.3); ctx.closePath();
    ctx.fill();
    /* Mắt chàm đậm + glint trắng. */
    ctx.fillStyle = C.ink800;
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.9, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.9, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-s * 0.17, -s * 0.93, s * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.23, -s * 0.93, s * 0.03, 0, Math.PI * 2); ctx.fill();
    /* Điểm sáng trắng mờ trên-trái lưng. */
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.ellipse(-s * 0.45, -s * 0.45, s * 0.3, s * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  /* Quái Bóng Tối: khối chàm đậm, viền chàm nhạt 2px, mắt sáng hổ phách,
     huy hiệu hệ ở góc phải, thanh máu trên đầu, viên từ gắn liền bên dưới. */
  function drawMonster(ctx, m, W, H, t, locked) {
    var px = m.x * W, py = Math.max(m.y * H, 64); /* không để quái + huy
      hiệu + thanh máu bị cắt ở mép trên (sửa xấu 18:11) */
    var s = m.isBoss ? 34 : 24;
    ctx.save();
    /* Bóng đổ dưới quái. */
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(px, py + s * 0.95, s * 0.9, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    if (rlReady("monster")) {
      var mim = rlImg.monster.img;
      var mw = s * 2.7, mh = mw * mim.naturalHeight / mim.naturalWidth;
      ctx.drawImage(mim, px - mw / 2, py - mh / 2 - s * 0.1, mw, mh);
      if (locked) {
        ctx.strokeStyle = C.amber500; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(px, py - s * 0.1, mw * 0.52, mh * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
    /* Thân khối bóng tối (bản vẽ code, dự phòng). */
    ctx.fillStyle = C.ink800;
    ctx.strokeStyle = locked ? C.amber500 : C.ink300;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py, s * 0.95, s * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    /* Gai bóng tối trên đầu. */
    ctx.fillStyle = C.ink800;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.5, py - s * 0.6); ctx.lineTo(px - s * 0.2, py - s * 1.15); ctx.lineTo(px, py - s * 0.6);
    ctx.moveTo(px + s * 0.1, py - s * 0.65); ctx.lineTo(px + s * 0.4, py - s * 1.2); ctx.lineTo(px + s * 0.6, py - s * 0.6);
    ctx.closePath(); ctx.fill();
    /* Mắt sáng hổ phách (trùm: mắt to hơn). */
    var er = m.isBoss ? 4.5 : 3.5;
    ctx.fillStyle = C.amber400;
    ctx.beginPath(); ctx.arc(px - s * 0.32, py - s * 0.1, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + s * 0.32, py - s * 0.1, er, 0, Math.PI * 2); ctx.fill();
    /* Điểm sáng trên-trái thân. */
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.ellipse(px - s * 0.4, py - s * 0.4, s * 0.28, s * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    /* Huy hiệu hệ yếu ở góc phải: ảnh badge Canva cắt từ quái biến thể,
       không thì huy hiệu vector cũ. */
    var badgeKey = { fire: "badge_fire", water: "badge_water", elec: "badge_elec" }[m.weak];
    var bgx = px + s * 0.85, bgy = py - s * 0.75;
    if (rlReady(badgeKey)) {
      ctx.drawImage(rlImg[badgeKey].img, bgx - 12, bgy - 12, 24, 24);
    } else {
      drawElBadge(ctx, m.weak, bgx, bgy, 9);
    }
    /* Thanh máu. */
    var bw = s * 1.9, bx = px - bw / 2, by = py - s * 1.35;
    ctx.fillStyle = C.grey400;
    G71.rr(ctx, bx, by, bw, 6, 3); ctx.fill();
    ctx.fillStyle = m.hp / m.maxHp > 0.5 ? C.amber500 : C.amber700;
    if (m.hp > 0) { G71.rr(ctx, bx, by, bw * (m.hp / m.maxHp), 6, 3); ctx.fill(); }
    /* Viên từ gắn dưới quái. v91: tieng Trung hien 2 dong — chu Han o
       tren, pinyin (chuoi go) o duoi co to mau tien trinh. */
    var mType = m.type || m.w;
    var mTwo = mType !== m.w;
    ctx.font = "700 17px system-ui, sans-serif";
    var mWide = (ctx.measureText(m.w).width >= ctx.measureText(mType).width) ? m.w : mType;
    G71.fitFont(ctx, mWide, Math.max(70, W - 32), 17, 12, "700");
    var tw = Math.max(ctx.measureText(m.w).width, ctx.measureText(mType).width) + 30;
    var pillY = py + s * 1.05;
    var pillX = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, px));
    var pillH = mTwo ? 54 : 34, pillTop = pillY - (mTwo ? 28 : 17);
    if (locked) {
      ctx.fillStyle = "rgba(245,158,11,.35)";
      G71.rr(ctx, pillX - tw / 2 - 4, pillTop - 2, tw + 8, pillH + 4, 20); ctx.fill();
    }
    ctx.fillStyle = C.ink800;
    G71.rr(ctx, pillX - tw / 2, pillTop, tw, pillH, 17); ctx.fill();
    ctx.strokeStyle = locked ? C.amber500 : C.ink200;
    ctx.lineWidth = 2; ctx.stroke();
    if (mTwo) {
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(m.w, pillX - ctx.measureText(m.w).width / 2, pillY - 6);
      var done = mType.slice(0, m.progress), rest = mType.slice(m.progress);
      ctx.font = "700 13px system-ui, sans-serif";
      var x0 = pillX - ctx.measureText(mType).width / 2;
      ctx.fillStyle = C.amber100;
      ctx.fillText(done, x0, pillY + 14);
      ctx.fillStyle = "#fff";
      ctx.fillText(rest, x0 + ctx.measureText(done).width, pillY + 14);
    } else {
      var done2 = mType.slice(0, m.progress), rest2 = mType.slice(m.progress);
      var x02 = pillX - ctx.measureText(mType).width / 2;
      ctx.fillStyle = C.amber100;
      ctx.fillText(done2, x02, pillY + 6);
      ctx.fillStyle = "#fff";
      ctx.fillText(rest2, x02 + ctx.measureText(done2).width, pillY + 6);
    }
    ctx.restore();
  }

  /* ---- Màn hình + luồng chơi ---- */
  var RL = null;      /* tiến trình lát cắt (state.rongLua) */
  var run = null;     /* lượt chạy ải hiện tại {level, battle, hearts, shield, used} */
  var stage = null;   /* G71.openStage api */
  var mode = "map";   /* map | battle | shop | dict | over */
  var battle = null;  /* LOGIC battle state */
  var curElement = "fire";
  var bolts = [], parts = [], floats = [];
  var elBar = null, ctrlBar = null, overlayBox = null;
  var last = 0, hudSig = "";
  var moveKeys = { up: false, down: false, left: false, right: false };

  function esc(s) { return G71.escHtml(s); }
  function toastSafe(msg) { try { if (typeof toast === "function") toast(msg); } catch (e) {} }
  function xpSafe(n) { try { if (typeof awardXp === "function") awardXp(n); } catch (e) {} }
  function dictLevel(w) {
    var e = RL && RL.dict && RL.dict[String(w || "").toLowerCase()];
    return e ? e.lvl : 1;
  }
  function mergeCollected(collected) {
    collected.forEach(function (c) {
      var k = c.w.toLowerCase();
      var old = RL.dict[k];
      if (old) { old.lvl = Math.min(3, old.lvl + 1); old.uses = (old.uses || 1) + 1; old.el = c.el; }
      else RL.dict[k] = { w: c.w, vi: c.vi, el: c.el, lvl: 1, uses: 1 };
    });
  }
  function clearOverlays() {
    if (overlayBox && overlayBox.parentNode) overlayBox.parentNode.removeChild(overlayBox);
    overlayBox = null;
  }
  function teardown() {
    mode = "map";
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("keyup", onKeyUp);
    moveKeys = { up: false, down: false, left: false, right: false };
    stage = null; battle = null; run = null;
    bolts = []; parts = []; floats = [];
  }

  function start() {
    RL = loadRL();
    run = null;
    mode = "map";
    var stg = G71.openStage("🔥 Rồng Lửa — Rừng Xanh (bản thử)",
      "Lái rồng bằng phím mũi tên hoặc kéo trên sân để né đạn của quái; chạm quái để khóa, gõ đúng từ để tung chiêu. Phím 1/2/3 đổi hệ chiêu — đúng hệ khắc quái gây sát thương tối đa. Quái chạm tới rồng hoặc đạn trúng rồng là mất tim; thua ải vẫn giữ cấp, vàng và từ đã thu.",
      function () { teardown(); });
    stage = stg;
    buildControls(stg);
    showMap();
  }

  /* Ban phim tren man hinh (chuot + cam ung) cho tran danh.
     v91: track tieng Han (TP) thi ban phim la cac am tiet Hangul cua tu
     dang khoa (bam theo thu tu); cac track khac go chu cai A-Z nhu cu.
     Lam moi theo sig trong vong frame() de doi theo tu dang khoa.
     PHAI dat o muc IIFE (khong dat trong buildControls) vi frame() goi
     no tu ngoai — de long trong buildControls thi frame() goi se
     ReferenceError am tham trong try/catch, ban phim rong khong. */
  var kbSigRl = "";
  function refreshKbRl() {
    if (!ctrlBar || ctrlBar.style.display === "none") return;
    var isTp = false;
    try { isTp = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
    var act = (battle && battle.active !== null && battle.words[battle.active]) ? battle.words[battle.active] : null;
    if (!act && battle) {
      var low = null;
      battle.words.forEach(function (wd) { if (wd.status === "advancing" && (!low || wd.y > low.y)) low = wd; });
      act = low;
    }
    var sig = (isTp ? "tp:" : "az:") + (act ? (act.type || act.w) : "") + "|" + (battle ? battle.resolved : 0);
    if (sig === kbSigRl) return;
    kbSigRl = sig;
    ctrlBar.innerHTML = "";
    var keys = isTp && act ? String(act.type || act.w).split("") : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    keys.forEach(function (L) {
      var b = document.createElement("button");
      b.className = "btn";
      b.textContent = L;
      b.style.cssText = "padding:6px 4px;min-width:30px;font-size:15px;";
      b.onclick = function () { feed(L); };
      ctrlBar.appendChild(b);
    });
  }

  function buildControls(stg) {
    elBar = document.createElement("div");
    elBar.id = "rlElBar";
    elBar.style.cssText = "display:none;gap:8px;justify-content:center;align-items:center;padding:6px 8px;background:#fff;border-top:2px solid #F3D9A4;flex-wrap:wrap;";
    ["fire", "water", "elec"].forEach(function (k, i) {
      var b = document.createElement("button");
      b.className = "btn";
      b.setAttribute("data-rl-el", k);
      b.innerHTML = ELEMENTS[k].icon + " " + ELEMENTS[k].name + " <span style='opacity:.6'>(" + (i + 1) + ")</span>";
      b.onclick = function () { setElement(k); };
      elBar.appendChild(b);
    });
    var sh = document.createElement("span");
    sh.id = "rlShieldTag";
    sh.style.cssText = "font-weight:700;";
    elBar.appendChild(sh);
    stg.el.appendChild(elBar);
    ctrlBar = document.createElement("div");
    ctrlBar.id = "g71KbRl";
    ctrlBar.style.cssText = "display:none;flex-wrap:wrap;gap:4px;justify-content:center;padding:6px 8px;background:#fff;border-top:2px solid #F3D9A4;touch-action:manipulation;";
    refreshKbRl();
    stg.el.appendChild(ctrlBar);
    if (stg.resize) stg.resize();
  }

  function setElement(k) {
    if (!ELEMENTS[k]) return;
    curElement = k;
    if (battle) battle.element = k;
    if (elBar) {
      var btns = elBar.querySelectorAll("[data-rl-el]");
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i].getAttribute("data-rl-el") === k;
        btns[i].style.background = on ? C.amber500 : "";
        btns[i].style.borderColor = on ? C.amber700 : "";
        btns[i].style.color = on ? "#fff" : "";
      }
    }
    hudSig = "";
    hud();
  }

  function showMap() {
    mode = "map";
    if (elBar) elBar.style.display = "none";
    if (ctrlBar) ctrlBar.style.display = "none";
    clearOverlays();
    var box = document.createElement("div");
    box.id = "rlMap";
    box.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:18px 16px 24px;";
    var dictCount = Object.keys(RL.dict).length;
    var html = '<h2 style="margin:4px 0 2px;">🌲 Rừng Xanh — Vùng 1</h2>'
      + '<p class="mut" style="margin:6px 0 12px;">Vương quốc Ngôn Ngữ bị Bóng Tối Câm Lặng phong ấn, các từ bị đánh cắp. Rồng nhỏ lên đường thu hồi từng từ — bắt đầu từ Rừng Xanh.</p>'
      + '<p style="font-weight:700;margin:6px 0;">' + rlImgTag("coin", 20) + ' Vàng: ' + RL.gold + (RL.shield ? ' &nbsp;·&nbsp; ' + rlImgTag("shield", 20) + ' Khiên: ' + RL.shield : '') + '</p>'
      + '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:12px 0;">';
    [1, 2, 3].forEach(function (lv) {
      var cleared = !!RL.cleared[lv];
      var open = lv <= RL.unlocked;
      var st = cleared ? "✅ Đã qua" : (open ? "▶ Mở" : "🔒 Chưa mở");
      html += '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">Ải ' + lv + " — " + LEVEL_NAMES[lv] + '</h3>'
        + '<p class="mut" style="margin:4px 0;">3 trận · chủ đề thiên nhiên' + (lv === 3 ? ' · trùm cuối đổi hệ' : '') + '</p>'
        + '<p style="margin:4px 0;font-weight:700;">' + st + '</p>'
        + (open ? '<div class="row"><button class="btn btn-primary" data-rl-level="' + lv + '">Chơi ải ' + lv + '</button></div>' : '')
        + '</section>';
    });
    html += '</div>'
      + '<div class="row" style="flex-wrap:wrap;">'
      + '<button class="btn" id="rlDictBtn">📖 Từ Điển Rồng (' + dictCount + ' từ)</button>'
      + '<button class="btn" id="rlBackBtn">← Về khu Trò chơi</button></div>';
    box.innerHTML = html;
    stage.el.appendChild(box);
    overlayBox = box;
    box.querySelectorAll("[data-rl-level]").forEach(function (b) {
      b.onclick = function () { startLevel(parseInt(b.getAttribute("data-rl-level"), 10)); };
    });
    box.querySelector("#rlDictBtn").onclick = showDict;
    box.querySelector("#rlBackBtn").onclick = function () { stage.close(); };
  }

  function showDict() {
    mode = "dict";
    clearOverlays();
    var box = document.createElement("div");
    box.id = "rlDict";
    box.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:18px 16px 24px;";
    var keys = Object.keys(RL.dict).sort();
    var html = '<h2 style="margin:4px 0 2px;">📖 Từ Điển Rồng</h2>'
      + '<p class="mut" style="margin:6px 0 12px;">Từ đánh bại lần đầu thành chiêu. Dùng nhiều thăng cấp (tối đa cấp 3) — cấp càng cao, chiêu càng mạnh.</p>';
    if (!keys.length) {
      html += '<p>Chưa thu được từ nào — đánh bại quái để thu từ thành chiêu.</p>';
    } else {
      html += '<div style="display:grid;gap:10px;">';
      keys.forEach(function (k) {
        var e = RL.dict[k];
        var stars = "★".repeat(e.lvl) + "☆".repeat(3 - e.lvl);
        html += '<section class="card" style="margin:0;padding:10px 14px;"><b>' + esc(e.w) + '</b> — ' + esc(e.vi)
          + '<br><span class="mut">Hệ ' + ELEMENTS[e.el].name + ' ' + ELEMENTS[e.el].icon + ' · Cấp ' + stars + ' · đã dùng ' + (e.uses || 1) + ' lần</span></section>';
      });
      html += '</div>';
    }
    html += '<div class="row" style="margin-top:14px;"><button class="btn btn-primary" id="rlDictBack">← Về bản đồ</button></div>';
    box.innerHTML = html;
    stage.el.appendChild(box);
    overlayBox = box;
    box.querySelector("#rlDictBack").onclick = showMap;
  }

  function startLevel(lv) {
    run = { level: lv, battle: 1, hearts: 5, shield: RL.shield || 0, used: {} };
    startBattle();
  }

  function startBattle() {
    mode = "battle";
    clearOverlays();
    hudSig = "";
    var lv = run.level, b = run.battle;
    var isBoss = (lv === 3 && b === 3);
    var words;
    if (isBoss) {
      var boss = pickBossWord(run.used);
      var mins = pickNatureWords(2, run.used);
      words = [boss].concat(mins);
    } else {
      words = pickNatureWords(LOGIC.battleSize(lv, b), run.used);
    }
    battle = LOGIC.createBattle(words, {
      level: lv, battle: b, boss: isBoss,
      hearts: run.hearts, shield: run.shield, element: curElement
    });
    bolts = []; parts = []; floats = [];
    if (elBar) elBar.style.display = "flex";
    if (ctrlBar) ctrlBar.style.display = "flex";
    setElement(battle.element);
    hud();
    if (stage.resize) stage.resize();
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    stage.canvas.addEventListener("click", onCanvasClick);
    stage.canvas.addEventListener("pointermove", onCanvasDrag);
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function endBattle() {
    mode = "over";
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("keyup", onKeyUp);
    moveKeys = { up: false, down: false, left: false, right: false };
    try { stage.canvas.removeEventListener("click", onCanvasClick); } catch (e) {}
    try { stage.canvas.removeEventListener("pointermove", onCanvasDrag); } catch (e) {}
    if (elBar) elBar.style.display = "none";
    if (ctrlBar) ctrlBar.style.display = "none";
    /* Thua hay thắng đều giữ vàng + từ đã thu trong trận này. */
    RL.gold += battle.goldEarned;
    mergeCollected(battle.collected);
    run.hearts = battle.hearts;
    run.shield = battle.shield;
    RL.shield = battle.shield;
    saveRL(RL);
  }

  function onBattleWin() {
    xpSafe(BATTLE_XP);
    if (battle.isBoss) {
      RL.cleared[3] = true; RL.unlocked = 3; saveRL(RL);
      G71.endScreen(stage, true, "🎉 Thắng Trùm Rừng Xanh!",
        ["Đã thu hồi xong các từ ở Rừng Xanh!", "Vàng: " + RL.gold + " · Từ điển: " + Object.keys(RL.dict).length + " từ · +10 XP đã cộng vào tiến trình."],
        function () { start(); });
      return;
    }
    if (run.battle >= 3) {
      RL.cleared[run.level] = true;
      RL.unlocked = Math.max(RL.unlocked, Math.min(3, run.level + 1));
      saveRL(RL);
      toastSafe("Qua ải " + run.level + "! Đã mở ải " + RL.unlocked + ".");
      showMap();
      return;
    }
    showShop();
  }

  function onBattleLose() {
    clearOverlays();
    var box = document.createElement("div");
    box.id = "rlLose";
    box.style.cssText = "position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(255,247,232,.93);padding:16px;";
    box.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:28px 24px;text-align:center;max-width:520px;width:100%;">'
      + '<h2 style="margin-top:0;">Hết tim rồi!</h2>'
      + '<p style="margin:6px 0;">Rồng đã gục ở ải ' + run.level + ' trận ' + run.battle + '.</p>'
      + '<p style="margin:6px 0;">Cấp, vàng và từ đã thu vẫn giữ nguyên — chơi lại ải nhé.</p>'
      + '<div class="row" style="justify-content:center;"><button class="btn btn-primary" id="rlRetry">Chơi lại ải</button>'
      + '<button class="btn" id="rlLoseMap">Về bản đồ</button></div></div>';
    stage.el.appendChild(box);
    overlayBox = box;
    box.querySelector("#rlRetry").onclick = function () { run.battle = 1; run.hearts = 5; startBattle(); };
    box.querySelector("#rlLoseMap").onclick = showMap;
  }

  function showShop() {
    mode = "shop";
    clearOverlays();
    var box = document.createElement("div");
    box.id = "rlShop";
    box.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:18px 16px 24px;";
    var canPotion = RL.gold >= POTION_COST && run.hearts < 5;
    var canShield = RL.gold >= SHIELD_COST;
    var html = '<h2 style="margin:4px 0 2px;">🛒 Cửa hàng</h2>'
      + '<p class="mut" style="margin:6px 0 12px;">Thắng trận ' + run.battle + ' ải ' + run.level + '! Mua đồ chuẩn bị cho trận tiếp theo. Vàng của bạn: <b>' + RL.gold + '</b> · Tim rồng: ' + run.hearts + '/5</p>'
      + '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">'
      + '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">' + rlImgTag("potion", 22) + ' Bình máu — 20 vàng</h3><p class="mut">Hồi 2 tim cho rồng (tối đa 5).</p><div class="row"><button class="btn btn-primary" id="rlBuyPotion"' + (canPotion ? '' : ' disabled') + '>Mua</button></div></section>'
      + '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">' + rlImgTag("shield", 22) + ' Khiên — 25 vàng</h3><p class="mut">Chặn 1 đòn quái chạm tới rồng trong ải này.</p><div class="row"><button class="btn btn-primary" id="rlBuyShield"' + (canShield ? '' : ' disabled') + '>Mua</button></div></section>'
      + '</div>'
      + '<div class="row" style="margin-top:14px;"><button class="btn btn-primary" id="rlNextBattle">Trận tiếp theo →</button><button class="btn" id="rlShopMap">Về bản đồ</button></div>';
    box.innerHTML = html;
    stage.el.appendChild(box);
    overlayBox = box;
    box.querySelector("#rlBuyPotion").onclick = function () {
      if (RL.gold < POTION_COST || run.hearts >= 5) return;
      RL.gold -= POTION_COST; run.hearts = Math.min(5, run.hearts + POTION_HEAL); saveRL(RL); showShop();
    };
    box.querySelector("#rlBuyShield").onclick = function () {
      if (RL.gold < SHIELD_COST) return;
      RL.gold -= SHIELD_COST; run.shield++; RL.shield = run.shield; saveRL(RL); showShop();
    };
    box.querySelector("#rlNextBattle").onclick = function () { run.battle++; startBattle(); };
    box.querySelector("#rlShopMap").onclick = showMap;
  }

  function hud() {
    if (!stage || !battle) return;
    /* HUD được phép xuống 2 dòng khi hẹp (sửa xấu 18:11: chữ hệ "⚡ Điện"
       ở góc phải từng bị cắt mất nửa ở mép màn hình). */
    if (stage.hud) { stage.hud.style.flexWrap = "wrap"; stage.hud.style.whiteSpace = "normal"; }
    var sig = [run ? run.level : 0, battle.battle, battle.hearts, battle.shield,
      RL.gold, battle.combo, battle.element, battle.total - battle.resolved].join("|");
    if (sig === hudSig) return;
    hudSig = sig;
    var el = ELEMENTS[battle.element];
    stage.hud.innerHTML = "<span style=\"flex:none\">Ải " + run.level + "-" + battle.battle + "</span>"
      + "<span style=\"flex:none\">" + heartsSvg(battle.hearts, 5) + "</span>"
      + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + rlImgTag("coin", 16) + " Vàng: " + RL.gold
      + " · Combo x" + Math.min(3, 1 + battle.combo)
      + " · Quái còn: " + (battle.total - battle.resolved) + "</span>"
      + "<span style=\"flex:none\">" + el.icon + " " + el.name + "</span>";
    var tag = document.getElementById("rlShieldTag");
    if (tag) tag.innerHTML = battle.shield > 0 ? rlImgTag("shield", 18) + " x" + battle.shield : "";
  }

  function burst(x, y, el) {
    for (var i = 0; i < 10; i++) {
      parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.7) * 0.5, ttl: 0.5, el: el });
    }
  }

  function feed(ch) {
    if (mode !== "battle" || !battle || battle.over) return;
    var r = LOGIC.typeLetter(battle, ch, Date.now(), battle.element, dictLevel);
    if (r.ok && r.completed) {
      bolts.push({ x0: battle.dragon.x, y0: Math.max(0.05, battle.dragon.y - 0.06), x1: r.monster.x, y1: r.monster.y, el: battle.element,
        t: 0, ttl: 0.22, dmg: r.dmg, done: false });
      if (r.bossPhase) toastSafe("Trùm đổi hệ! Giờ trùm yếu hệ " + ELEMENTS[r.bossPhase.weak].name + ".");
    }
    hud();
    maybeEnd();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowUp") { moveKeys.up = true; e.preventDefault(); return; }
    if (e.key === "ArrowDown") { moveKeys.down = true; e.preventDefault(); return; }
    if (e.key === "ArrowLeft") { moveKeys.left = true; e.preventDefault(); return; }
    if (e.key === "ArrowRight") { moveKeys.right = true; e.preventDefault(); return; }
    if (e.key === "1" || e.key === "2" || e.key === "3") {
      setElement(EL_ORDER[parseInt(e.key, 10) - 1]);
      return;
    }
    var isTpKey = false;
    try { isTpKey = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
    if (e.key && e.key.length === 1 && (isTpKey || /[a-zA-Z]/.test(e.key))) feed(e.key);
  }

  function onKeyUp(e) {
    if (e.key === "ArrowUp") moveKeys.up = false;
    else if (e.key === "ArrowDown") moveKeys.down = false;
    else if (e.key === "ArrowLeft") moveKeys.left = false;
    else if (e.key === "ArrowRight") moveKeys.right = false;
  }

  /* Kéo trên sân để lái rồng (chuột + cảm ứng; click vẫn khóa quái). */
  function onCanvasDrag(e) {
    if (mode !== "battle" || !battle) return;
    if (!(e.buttons & 1) && e.pointerType === "mouse") return;
    var r = stage.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    LOGIC.setDragon(battle, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }

  function onCanvasClick(e) {
    if (mode !== "battle" || !battle) return;
    var r = stage.canvas.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    var best = null, bd = 1e9;
    battle.words.forEach(function (wd, i) {
      if (wd.status !== "advancing") return;
      var d = Math.abs(wd.x - px) + Math.abs(wd.y - py);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== null && bd < 0.3) LOGIC.lockMonster(battle, best);
  }

  function maybeEnd() {
    if (!battle || !battle.over || mode !== "battle") return;
    var win = battle.over === "win";
    endBattle();
    if (win) onBattleWin(); else onBattleLose();
  }

  function frame(now) {
    if (mode !== "battle" || !battle) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    LOGIC.tick(battle, dt, now);
    /* Lái rồng bằng phím mũi tên giữ (0,55 sân/giây). */
    if (!battle.over) {
      var mv = (moveKeys.right ? 1 : 0) - (moveKeys.left ? 1 : 0);
      var mvY = (moveKeys.down ? 1 : 0) - (moveKeys.up ? 1 : 0);
      if (mv || mvY) LOGIC.moveDragon(battle, mv * 0.55 * dt, mvY * 0.55 * dt);
    }
    /* Logic + HUD + kết thúc trận chạy cả khi không có canvas 2D thật
       (jsdom/probe): chỉ phần vẽ bên dưới mới cần ctx. */
    while (battle.events.length) {
      var ev = battle.events.shift();
      if (ev.type === "shieldBlock") toastSafe("🛡️ Khiên đã chặn 1 đòn!");
    }
    hud();
    maybeEnd();
    if (mode === "battle" && battle) { try { refreshKbRl(); } catch (e) {} }
    if (mode !== "battle" || !battle) return;
    var cv = stage.canvas, ctx = stage.ctx;
    if (!cv || !ctx) { requestAnimationFrame(frame); return; }
    var W = cv.width, H = cv.height;
    if (!W || !H) { requestAnimationFrame(frame); return; }
    ctx.clearRect(0, 0, W, H);
    paintForest(ctx, W, H, now);
    battle.words.forEach(function (m, i) {
      if (m.status !== "advancing") return;
      var py = m.y * H;
      if (py < -100 || py > H + 100) return;
      drawMonster(ctx, m, W, H, now, battle.active === i);
    });
    /* Đạn của quái bay tới rồng: quả cầu bóng tối viền chàm. */
    battle.bolts.forEach(function (b) {
      ctx.save();
      ctx.fillStyle = "#312E81";
      ctx.beginPath(); ctx.arc(b.x * W, b.y * H, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#A5B4FC"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(165,180,252,.9)";
      ctx.beginPath(); ctx.arc(b.x * W - 2, b.y * H - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    /* Tia chiêu từ rồng tới quái. */
    bolts.forEach(function (b) {
      b.t += dt;
      if (!b.done && b.t >= b.ttl) {
        b.done = true;
        floats.push({ x: b.x1, y: b.y1, text: "-" + b.dmg, ttl: 0.9, el: b.el });
        burst(b.x1, b.y1, b.el);
      }
    });
    bolts = bolts.filter(function (b) { return b.t < b.ttl + 0.05; });
    bolts.forEach(function (b) {
      var p = Math.min(1, b.t / b.ttl);
      var x = b.x0 + (b.x1 - b.x0) * p, y = b.y0 + (b.y1 - b.y0) * p;
      ctx.strokeStyle = ELEMENTS[b.el].color; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(b.x0 * W, b.y0 * H); ctx.lineTo(x * W, y * H); ctx.stroke();
      ctx.fillStyle = ELEMENTS[b.el].color;
      ctx.beginPath(); ctx.arc(x * W, y * H, 5, 0, Math.PI * 2); ctx.fill();
    });
    parts = parts.filter(function (p) { return (p.ttl -= dt) > 0; });
    parts.forEach(function (p) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, p.ttl * 2);
      ctx.fillStyle = ELEMENTS[p.el].color;
      ctx.fillRect(p.x * W - 2, p.y * H - 2, 5, 5);
    });
    ctx.globalAlpha = 1;
    floats = floats.filter(function (f) { return (f.ttl -= dt) > 0; });
    floats.forEach(function (f) {
      f.y -= dt * 0.06;
      ctx.globalAlpha = Math.max(0, f.ttl);
      ctx.fillStyle = ELEMENTS[f.el].color;
      ctx.font = "700 17px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x * W, f.y * H);
      ctx.textAlign = "left";
    });
    ctx.globalAlpha = 1;
    /* Rồng ở vị trí lái được (mặc định đáy sân, giữa). */
    var hurt = now < battle.graceUntil && Math.floor(now / 120) % 2 === 0;
    drawDragonUp(ctx, battle.dragon.x * W, battle.dragon.y * H, 22, now, hurt);
    if (mode === "battle") requestAnimationFrame(frame);
  }

  window.G71RongLua = {
    start: start, logic: LOGIC, elements: ELEMENTS, heartsSvg: heartsSvg,
    art: { ready: rlReady, base: RL_ART, files: RL_IMGS },
    store: { load: loadRL, save: saveRL, fresh: freshRL },
    /* Mỏ neo cho probe: đọc trạng thái chơi hiện tại (chế độ, trận, lượt chạy, tiến trình). */
    debug: function () { return { mode: mode, battle: battle, run: run, rl: RL }; }
  };
})();
