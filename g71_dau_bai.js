/* G71 — Đấu Bài Với Máy (v85, lát cắt chơi được đầu-cuối).
   Mỗi bên một bộ bài 12 lá; lá là từ thật (kho CONTENT.vocab theo track
   đang học — EN trước) kèm sức mạnh + hệ Lửa/Nước/Điện như Rồng Lửa.
   Mỗi lượt bốc 1 lá, đánh 1 lá: Đánh / Đỡ / Hồi tùy chọn. Đánh lá nào thì
   gõ đúng từ trên lá để tung chiêu — gõ sai chỉ gõ lại, không mất lượt.
   Khắc hệ vòng như Rồng Lửa (Nước khắc Lửa, Điện khắc Nước, Lửa khắc
   Điện): đúng hệ khắc gây gấp đôi, sai hệ chỉ một nửa. Đỡ chặn hoàn toàn
   đòn tiếp theo; Hồi hồi máu bằng sức lá. Máy đánh lại theo bài của nó
   (AI đơn giản: yếu máu thì hồi, có lá khắc hệ thì đánh lá đó, bị khắc
   hệ toàn bộ thì đỡ, còn lại đánh lá mạnh nhất). Thắng vì chọn bài khôn
   hơn + giữ bài đúng lúc, không phải vì trả lời đúng một câu.
   Thắng: +20 vàng (vàng chung với Rồng Lửa, xài được ở cửa hàng Rồng
   Lửa) + 10 XP qua G71.endScreen + 1 lá mới vào bộ sưu tập. Thua vẫn
   giữ nguyên bộ sưu tập. Bộ sưu tập lưu state.dauBai (sống qua lần chơi).
   Logic thuần (không cần canvas) để probe kiểm tra được; start() nối DOM. */
(function () {
  "use strict";

  var MAX_HP = 30, DECK_SIZE = 12, HAND_START = 3, WIN_GOLD = 20;

  var ELEMENTS = {
    fire: { key: "fire", name: "Lửa", icon: "🔥", color: "#F59E0B" },
    water: { key: "water", name: "Nước", icon: "💧", color: "#0D9488" },
    elec: { key: "elec", name: "Điện", icon: "⚡", color: "#FBBF24" }
  };
  var EL_ORDER = ["fire", "water", "elec"];
  function nextEl(k) { return EL_ORDER[(EL_ORDER.indexOf(k) + 1) % EL_ORDER.length]; }
  /* a khắc b khi a là hệ tiếp theo của b trong vòng (Nước khắc Lửa,
     Điện khắc Nước, Lửa khắc Điện) — cùng vòng khắc hệ với Rồng Lửa. */
  function beats(a, b) {
    if (!a || !b || !ELEMENTS[a] || !ELEMENTS[b]) return false;
    return nextEl(b) === a;
  }
  function elName(k) { return ELEMENTS[k] ? ELEMENTS[k].name : ""; }
  function elIcon(k) { return ELEMENTS[k] ? ELEMENTS[k].icon : ""; }
  /* Đúng hệ khắc: gấp đôi; sai hệ (bị khắc): một nửa; bằng hệ: đủ. */
  function dmgFor(power, atkEl, defEl) {
    var mult = 1;
    if (beats(atkEl, defEl)) mult = 2;
    else if (beats(defEl, atkEl)) mult = 0.5;
    return Math.max(1, Math.round(power * mult));
  }
  function strongest(cards) {
    var best = null;
    cards.forEach(function (c) {
      if (!best || c.power > best.power) best = c;
    });
    return best;
  }
  /* Lá bài từ từ thật: sức mạnh = độ dài từ; hệ chia đều 3 hệ rồi xáo. */
  function buildDeck(words) {
    var els = [];
    for (var i = 0; i < words.length; i++) els.push(EL_ORDER[i % 3]);
    G71.shuffle(els);
    return words.map(function (wd, i) {
      return { w: String(wd.w), vi: String(wd.vi), el: els[i], power: String(wd.w).length };
    });
  }

  /* ---- Logic thuần của trận đấu ---- */
  function deal(cards) {
    var deck = cards.slice();
    var hand = deck.splice(0, HAND_START);
    return { hand: hand, deck: deck };
  }
  var LOGIC = {
    elements: ELEMENTS,
    nextEl: nextEl,
    beats: beats,
    dmgFor: dmgFor,
    buildDeck: buildDeck,
    MAX_HP: MAX_HP,
    DECK_SIZE: DECK_SIZE,
    WIN_GOLD: WIN_GOLD,
    createMatch: function (pCards, mCards) {
      var p = deal(G71.shuffle(pCards.slice()));
      var m = deal(G71.shuffle(mCards.slice()));
      return {
        pHp: MAX_HP, mHp: MAX_HP,
        pHand: p.hand, pDeck: p.deck, pDiscard: [],
        mHand: m.hand, mDeck: m.deck, mDiscard: [],
        pStance: null, mStance: null, pShield: false, mShield: false,
        turn: "player", pending: null, over: null, goldEarned: 0,
        log: ["Trận đấu bắt đầu — bạn đi trước. Mỗi lượt bốc 1 lá, đánh 1 lá."]
      };
    },
    /* Bốc 1 lá; hết bộ bài thì xáo lại chồng bài đã đánh. */
    draw: function (st, who) {
      if (st.over) return null;
      var deck = who === "player" ? st.pDeck : st.mDeck;
      var disc = who === "player" ? st.pDiscard : st.mDiscard;
      var hand = who === "player" ? st.pHand : st.mHand;
      if (!deck.length) {
        if (!disc.length) return null;
        var resh = G71.shuffle(disc.slice());
        if (who === "player") { st.pDeck = resh; st.pDiscard = []; deck = resh; }
        else { st.mDeck = resh; st.mDiscard = []; deck = resh; }
      }
      var c = deck.shift();
      hand.push(c);
      return c;
    },
    /* Chọn 1 lá trong tay + 1 hành động → chờ gõ đúng từ trên lá. */
    playCard: function (st, who, idx, action) {
      if (st.over) return { ok: false, why: "over" };
      if (st.pending) return { ok: false, why: "typing" };
      if (who === "player" && st.turn !== "player") return { ok: false, why: "turn" };
      var hand = who === "player" ? st.pHand : st.mHand;
      var card = hand[idx];
      if (!card) return { ok: false, why: "nocard" };
      if (["attack", "defend", "heal"].indexOf(action) < 0) return { ok: false, why: "action" };
      hand.splice(idx, 1);
      st.pending = { who: who, card: card, action: action, progress: 0 };
      return { ok: true, card: card };
    },
    /* Gõ chữ để tung chiêu: sai chỉ gõ lại (không mất lượt, không mất
       gì); gõ xong từ thì tung chiêu, rồi tới lượt máy đánh lại. */
    typeLetter: function (st, ch) {
      if (st.over) return { ok: false };
      var p = st.pending;
      if (!p || p.who !== "player") return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1 || !/[a-z]/.test(ch)) return { ok: false };
      var w = p.card.w;
      if (w.charAt(p.progress).toLowerCase() !== ch) return { ok: false, wrong: true };
      p.progress++;
      if (p.progress < w.length) return { ok: true };
      var cast = p;
      st.pending = null;
      var res = LOGIC.resolveCast(st, cast);
      if (!st.over) LOGIC.machineTurn(st);
      return { ok: true, completed: true, cast: res };
    },
    resolveCast: function (st, cast) {
      var atk = cast.who, def = atk === "player" ? "machine" : "player";
      var card = cast.card;
      var r = { who: atk, card: card, action: cast.action, dmg: 0, blocked: false, healed: 0 };
      /* Tên trường trong state là pHp/mHp, pStance/mStance, pShield/mShield
         (không phải playerHp/machineHp) — ánh xạ who → tiền tố p/m. */
      var ap = atk === "player" ? "p" : "m", dp = def === "player" ? "p" : "m";
      var atkHp = ap + "Hp", defHp = dp + "Hp";
      var atkStance = ap + "Stance", defStance = dp + "Stance";
      var atkShield = ap + "Shield", defShield = dp + "Shield";
      var atkDisc = atk === "player" ? st.pDiscard : st.mDiscard;
      var whoName = atk === "player" ? "Bạn" : "Máy";
      var defName = def === "player" ? "Bạn" : "Máy";
      if (cast.action === "attack") {
        if (st[defShield]) {
          st[defShield] = false;
          r.blocked = true;
          st.log.push("🛡️ " + defName + " đỡ được đòn " + card.w + " (" + elName(card.el) + ") — khiên vỡ, không mất máu.");
        } else {
          var dmg = dmgFor(card.power, card.el, st[defStance]);
          st[defHp] -= dmg;
          r.dmg = dmg;
          var tag = beats(card.el, st[defStance]) ? " (khắc hệ — gấp đôi!)"
            : beats(st[defStance], card.el) ? " (bị khắc hệ — chỉ một nửa)" : "";
          st.log.push("⚔️ " + whoName + " đánh lá " + card.w + " (" + elName(card.el) + ", sức " + card.power + ") — " + defName + " mất " + dmg + " máu" + tag + ".");
        }
      } else if (cast.action === "defend") {
        st[atkShield] = true;
        st.log.push("🛡️ " + whoName + " giơ lá " + card.w + " (" + elName(card.el) + ") lên đỡ — chặn hoàn toàn đòn tiếp theo của " + defName + ".");
      } else if (cast.action === "heal") {
        var before = st[atkHp];
        st[atkHp] = Math.min(MAX_HP, st[atkHp] + card.power);
        r.healed = st[atkHp] - before;
        st.log.push("💚 " + whoName + " dùng lá " + card.w + " (" + elName(card.el) + ") hồi " + r.healed + " máu.");
      }
      st[atkStance] = card.el;
      atkDisc.push(card);
      if (st.mHp <= 0) { st.over = "win"; st.goldEarned = WIN_GOLD; st.log.push("🎉 Bạn thắng trận đấu bài!"); }
      else if (st.pHp <= 0) { st.over = "lose"; st.log.push("Máy thắng trận này."); }
      return r;
    },
    /* AI máy (đơn giản, quyết định được, không ngẫu nhiên): yếu máu thì
       hồi; có lá khắc hệ của bạn thì đánh lá đó; bị khắc hệ toàn bộ thì
       đỡ; còn lại đánh lá mạnh nhất. */
    aiChoose: function (st) {
      var hand = st.mHand;
      if (!hand.length) return null;
      var best = strongest(hand);
      if (st.mHp <= 10) return { card: best, idx: hand.indexOf(best), action: "heal" };
      var beating = hand.filter(function (c) { return beats(c.el, st.pStance); });
      if (beating.length) {
        var b = strongest(beating);
        return { card: b, idx: hand.indexOf(b), action: "attack" };
      }
      if (st.pStance) {
        var losingAll = hand.every(function (c) { return beats(st.pStance, c.el); });
        if (losingAll) return { card: best, idx: hand.indexOf(best), action: "defend" };
      }
      return { card: best, idx: hand.indexOf(best), action: "attack" };
    },
    machineTurn: function (st) {
      if (st.over) return;
      LOGIC.draw(st, "machine");
      var pick = LOGIC.aiChoose(st);
      if (!pick) {
        st.log.push("Máy hết bài, bỏ lượt.");
      } else {
        st.mHand.splice(pick.idx, 1);
        LOGIC.resolveCast(st, { who: "machine", card: pick.card, action: pick.action });
      }
      if (!st.over) { LOGIC.draw(st, "player"); st.turn = "player"; }
    },
    /* Dùng cho probe: tung chiêu ngay không qua gõ chữ. */
    forceCast: function (st, who, card, action) {
      if (st.over) return null;
      return LOGIC.resolveCast(st, { who: who, card: card, action: action });
    }
  };

  /* ---- Bộ sưu tập + vàng chung ---- */
  function freshDB() { return { cards: {}, wins: 0, losses: 0 }; }
  function loadDB() {
    var d = freshDB();
    try {
      if (typeof state !== "undefined" && state && state.dauBai && state.dauBai.cards) {
        var s = state.dauBai;
        Object.keys(s.cards).forEach(function (k) {
          var c = s.cards[k];
          if (c && c.w && c.vi && ELEMENTS[c.el]) {
            d.cards[String(c.w).toLowerCase()] = { w: c.w, vi: c.vi, el: c.el };
          }
        });
        if (typeof s.wins === "number") d.wins = s.wins;
        if (typeof s.losses === "number") d.losses = s.losses;
      }
    } catch (e) {}
    return d;
  }
  function saveDB(db) {
    try {
      if (typeof state !== "undefined" && state) {
        state.dauBai = db;
        if (typeof saveState === "function") saveState();
      }
    } catch (e) {}
  }
  /* Vàng chung web: cùng ví với Rồng Lửa (state.rongLua.gold) để vàng
     thắng ở đây xài được ở cửa hàng Rồng Lửa và ngược lại. */
  function readGold() {
    try {
      return (state && state.rongLua && typeof state.rongLua.gold === "number") ? state.rongLua.gold : 0;
    } catch (e) { return 0; }
  }
  function addGold(n) {
    try {
      if (typeof state !== "undefined" && state) {
        state.rongLua = state.rongLua || {};
        state.rongLua.gold = (state.rongLua.gold || 0) + n;
        if (typeof saveState === "function") saveState();
      }
    } catch (e) {}
  }
  function ensureStarter(db) {
    if (Object.keys(db.cards).length >= DECK_SIZE) return db;
    var got = G71.pickTypingWords(DECK_SIZE);
    buildDeck(got.words).forEach(function (c) {
      db.cards[c.w.toLowerCase()] = { w: c.w, vi: c.vi, el: c.el };
    });
    saveDB(db);
    return db;
  }
  function rewardCard(db) {
    var pool = G71.shuffle(G71.pool()).filter(function (p) {
      return /^[A-Za-z]+$/.test(p.w) && !db.cards[p.w.toLowerCase()];
    });
    var pick = pool[0];
    if (!pick) return null;
    var el = EL_ORDER[Math.floor(Math.random() * 3)];
    db.cards[pick.w.toLowerCase()] = { w: pick.w, vi: pick.vi, el: el };
    return db.cards[pick.w.toLowerCase()];
  }

  /* ---- Màn hình + luồng chơi ---- */
  var DB = null, match = null, stage = null, arena = null;
  var selCard = -1, wrongFlash = false;
  var mode = "idle"; /* idle | battle | over */

  function esc(s) { return G71.escHtml(s); }
  function toastSafe(msg) { try { if (typeof toast === "function") toast(msg); } catch (e) {} }

  function start() {
    DB = ensureStarter(loadDB());
    var pCards = buildDeck(Object.keys(DB.cards).map(function (k) { return DB.cards[k]; }));
    var mCards = buildDeck(G71.pickTypingWords(DECK_SIZE).words);
    match = LOGIC.createMatch(pCards, mCards);
    selCard = -1; wrongFlash = false; mode = "battle";
    var stg = G71.openStage("🃏 Đấu Bài — Đấu với máy",
      "Bốc 1 lá mỗi lượt, đánh 1 lá: chọn lá trong tay rồi chọn Đánh/Đỡ/Hồi, gõ đúng từ trên lá để tung chiêu — gõ sai chỉ gõ lại, không mất lượt. Đúng hệ khắc gây gấp đôi, sai hệ chỉ một nửa. Máy đánh lại theo bài của nó.",
      function () { teardown(); });
    stage = stg;
    buildArena(stg);
    document.addEventListener("keydown", onKey);
    render();
  }

  function teardown() {
    mode = "idle";
    document.removeEventListener("keydown", onKey);
    stage = null; match = null; arena = null; selCard = -1;
  }

  function buildArena(stg) {
    arena = document.createElement("div");
    arena.id = "dbArena";
    arena.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:14px 14px 20px;";
    stg.el.appendChild(arena);
  }

  function hpBar(hp) {
    var pct = Math.max(0, Math.min(100, hp / MAX_HP * 100));
    var col = hp > 15 ? "#1E9E6A" : hp > 7 ? "#F59E0B" : "#E11D48";
    return '<div style="background:#E5E7EB;border-radius:999px;height:14px;overflow:hidden;margin:4px 0;">'
      + '<div style="width:' + pct + '%;height:100%;background:' + col + ';"></div></div>';
  }
  function stanceLine(who) {
    var st = who === "player" ? match.pStance : match.mStance;
    var sh = who === "player" ? match.pShield : match.mShield;
    var s = st ? elIcon(st) + " " + elName(st) : "—";
    return "Thế: <b>" + s + "</b>" + (sh ? ' &nbsp;🛡️ <b>đang đỡ</b>' : "");
  }
  function cardHTML(c, i) {
    var sel = (i === selCard);
    return '<button class="btn" data-db-card="' + i + '" style="text-align:left;padding:10px 12px;min-width:118px;flex:1 1 118px;'
      + (sel ? "background:#FDE68A;border-color:#B45309;" : "")
      + '"><b style="font-size:17px;">' + esc(c.w) + '</b><br><span style="font-size:13px;color:#57534A;">' + esc(c.vi) + '</span>'
      + '<br><span style="font-size:13px;font-weight:700;">' + ELEMENTS[c.el].icon + " " + ELEMENTS[c.el].name + " · ⚔️ " + c.power + "</span></button>";
  }

  function render() {
    if (!stage || !arena || !match) return;
    var last = match.log.slice(-6);
    var logHtml = last.map(function (l) { return "<p style=\"margin:4px 0;\">" + esc(l) + "</p>"; }).join("");
    var pend = match.pending;
    var typeHtml = "";
    if (pend) {
      var done = pend.card.w.slice(0, pend.progress), rest = pend.card.w.slice(pend.progress);
      typeHtml = '<section class="card" style="margin:12px 0 0;"><h3 style="margin:0 0 4px;">Gõ từ trên lá để tung chiêu'
        + (pend.action === "attack" ? " — ⚔️ Đánh" : pend.action === "defend" ? " — 🛡️ Đỡ" : " — 💚 Hồi") + '</h3>'
        + '<p style="font-size:22px;font-weight:700;margin:6px 0;"><span style="color:#B45309;">' + esc(done) + '</span><span>' + esc(rest) + '</span></p>'
        + '<p class="mut" style="margin:4px 0;">' + esc(pend.card.vi) + " · " + ELEMENTS[pend.card.el].icon + " " + ELEMENTS[pend.card.el].name
        + (wrongFlash ? ' · <span style="color:#E11D48;font-weight:700;">✗ gõ sai rồi, gõ lại nhé</span>' : " · gõ sai chỉ gõ lại, không mất lượt") + "</p></section>";
    } else if (selCard >= 0 && match.pHand[selCard]) {
      typeHtml = '<p class="mut" style="margin:12px 0 0;">Đã chọn lá <b>' + esc(match.pHand[selCard].w) + "</b> — chọn Đánh, Đỡ hay Hồi ở dưới.</p>";
    } else {
      typeHtml = '<p class="mut" style="margin:12px 0 0;">Chọn 1 lá trong tay để đánh — mỗi lượt đánh đúng 1 lá.</p>';
    }
    var acts = [["attack", "⚔️ Đánh", "Tấn công máy"], ["defend", "🛡️ Đỡ", "Chặn đòn tiếp theo"], ["heal", "💚 Hồi", "Hồi máu = sức lá"]];
    var actHtml = acts.map(function (a) {
      var dis = (selCard < 0 || !!pend) ? " disabled" : "";
      return '<button class="btn btn-primary" data-db-action="' + a[0] + '"' + dis + ' style="flex:1;min-width:100px;">' + a[1] + '<br><span style="font-size:12px;font-weight:400;">' + a[2] + "</span></button>";
    }).join("");
    var kbHtml = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function (L) {
      return '<button class="btn" data-db-key="' + L + '" style="padding:6px 4px;min-width:30px;font-size:15px;">' + L + "</button>";
    }).join("");
    arena.innerHTML = '<div class="row" style="justify-content:space-between;align-items:center;">'
      + '<h2 style="margin:0;">🃏 Đấu Bài — Đấu với máy</h2>'
      + '<button class="btn" id="dbExit">✕ Thoát</button></div>'
      + '<p class="mut" style="margin:6px 0;">Mỗi lượt bốc 1 lá, đánh 1 lá. Gõ đúng từ trên lá để tung chiêu — gõ sai chỉ gõ lại. Đúng hệ khắc gây gấp đôi, sai hệ chỉ một nửa.</p>'
      + '<p style="font-weight:700;margin:6px 0;">🪙 Vàng: ' + readGold() + " · 🏆 Thắng: " + DB.wins + " · Thua: " + DB.losses + " · Bộ sưu tập: " + Object.keys(DB.cards).length + " lá</p>"
      + '<section class="card" style="margin:8px 0;"><h3 style="margin:0 0 2px;">🤖 Máy · Máu ' + Math.max(0, match.mHp) + "/" + MAX_HP + "</h3>"
      + hpBar(match.mHp)
      + '<p style="margin:4px 0;">' + stanceLine("machine") + " · Bài trên tay: " + match.mHand.length + " lá · Bộ bài còn: " + match.mDeck.length + " lá</p></section>"
      + '<section class="card" style="margin:8px 0;min-height:120px;"><h3 style="margin:0 0 4px;">📜 Diễn biến trận đấu</h3>' + logHtml + "</section>"
      + '<section class="card" style="margin:8px 0;"><h3 style="margin:0 0 2px;">🧑 Bạn · Máu ' + Math.max(0, match.pHp) + "/" + MAX_HP + "</h3>"
      + hpBar(match.pHp)
      + '<p style="margin:4px 0;">' + stanceLine("player") + " · Bộ bài còn: " + match.pDeck.length + " lá</p></section>"
      + '<h3 style="margin:12px 0 6px;">🖐️ Bài trên tay (' + match.pHand.length + " lá)</h3>"
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + match.pHand.map(cardHTML).join("") + "</div>"
      + '<div class="row" style="margin-top:12px;flex-wrap:wrap;">' + actHtml + "</div>"
      + typeHtml
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:10px 0 0;">' + kbHtml + "</div>";
    var ex = arena.querySelector("#dbExit");
    if (ex) ex.onclick = function () { stage.close(); };
    arena.querySelectorAll("[data-db-card]").forEach(function (b) {
      b.onclick = function () {
        if (match.pending) return;
        selCard = parseInt(b.getAttribute("data-db-card"), 10);
        wrongFlash = false;
        render();
      };
    });
    arena.querySelectorAll("[data-db-action]").forEach(function (b) {
      b.onclick = function () { doAction(b.getAttribute("data-db-action")); };
    });
    arena.querySelectorAll("[data-db-key]").forEach(function (b) {
      b.onclick = function () { feed(b.getAttribute("data-db-key")); };
    });
  }

  function doAction(action) {
    if (mode !== "battle" || !match || match.over || match.pending) return;
    if (selCard < 0 || !match.pHand[selCard]) return;
    var r = LOGIC.playCard(match, "player", selCard, action);
    if (!r.ok) return;
    selCard = -1;
    wrongFlash = false;
    render();
  }

  function feed(ch) {
    if (mode !== "battle" || !match || match.over || !match.pending) return;
    var r = LOGIC.typeLetter(match, ch);
    if (r && r.wrong) wrongFlash = true;
    else if (r && r.ok) wrongFlash = false;
    render();
    if (match.over) endMatch();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) feed(e.key);
  }

  function endMatch() {
    mode = "over";
    document.removeEventListener("keydown", onKey);
    var win = match.over === "win";
    var lines = [];
    if (win) {
      DB.wins++;
      addGold(WIN_GOLD);
      var nw = rewardCard(DB);
      saveDB(DB);
      lines.push("Bạn thắng trận đấu bài!");
      lines.push("Thưởng: +" + WIN_GOLD + " vàng (vàng chung với Rồng Lửa) · +10 XP đã cộng vào tiến trình.");
      if (nw) lines.push("Nhận thẻ mới: " + nw.w + " — " + nw.vi + " (" + ELEMENTS[nw.el].name + ").");
      else lines.push("Bộ sưu tập đã đủ hết từ trong kho — không còn thẻ mới.");
      lines.push("Thắng: " + DB.wins + " · Thua: " + DB.losses + " · Thẻ đã có: " + Object.keys(DB.cards).length + " lá.");
    } else {
      DB.losses++;
      saveDB(DB);
      lines.push("Máy thắng trận này.");
      lines.push("Thẻ của bạn vẫn giữ nguyên — chơi lại để gỡ nhé.");
      lines.push("Thắng: " + DB.wins + " · Thua: " + DB.losses + " · Thẻ đã có: " + Object.keys(DB.cards).length + " lá.");
    }
    /* Gỡ sân đấu trước khi hiện màn kết thúc (endScreen vẽ lên khung canvas). */
    if (arena && arena.parentNode) arena.parentNode.removeChild(arena);
    arena = null;
    G71.endScreen(stage, win, win ? "🎉 Thắng trận đấu bài!" : "Thua trận rồi!", lines, function () { start(); });
  }

  window.G71DauBai = {
    start: start,
    logic: LOGIC,
    elements: ELEMENTS,
    store: { load: loadDB, save: saveDB, fresh: freshDB, gold: readGold },
    /* Mỏ neo cho probe: đọc trạng thái chơi hiện tại. */
    debug: function () { return { mode: mode, match: match, db: DB, selCard: selCard }; }
  };
})();
