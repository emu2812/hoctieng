/* G71 — Đấu Bài Với Máy (v85 lát cắt đầu-cuối; v105 làm lại thành game
   đấu bài chiến thuật thật theo lệnh Bùi 19:18 06/11: "phải có hệ bài
   cách chiến đấu đầy đủ như game chiến thuật thực sự").
   Mỗi bên một bộ bài 12 lá; lá là từ thật (kho CONTENT.vocab theo track
   đang học) kèm sức mạnh + hệ Lửa/Nước/Điện như Rồng Lửa.
   HỆ BÀI v105:
   - Năng lượng: mỗi lượt 3 ⚡, hồi đầy đầu lượt; mỗi lá có GIÁ (1–3 ⚡
     tùy sức/loại); một lượt đánh được NHIỀU lá tới khi hết năng lượng.
   - 7 LOẠI lá (loại gắn với từng từ, ổn định qua các trận — suy từ từ
     nên lá "apple" luôn là cùng một loại): Tấn công, Đỡ, Hồi máu,
     Tăng sức (buff), Đốt, Độc, Làm yếu. Trạng thái kéo dài qua lượt,
     hiện rõ số lượt còn lại trên người bị dính.
   - XÂY BỘ BÀI: người chơi tự chọn 12 lá từ bộ sưu tập đã có (màn chọn
     bài trước trận; chưa chọn thì dùng bộ mặc định như cũ). Lá tung đòn
     kết liễu được NÂNG CẤP: cấp lẻ +1 sức, cấp chẵn -1 giá (tối thiểu 1).
   - Ý ĐỊNH MÁY: trước lượt máy, hiện rõ máy định đánh những lá nào
     (lá, loại, hệ, sức, giá) để người chơi tính nước đi; máy đánh đúng
     như ý định đã hiện.
   - AI máy chiến thuật: tính năng lượng của nó, giữ lá đỡ khi yếu máu,
     dùng lá khắc hệ khi có, không đánh bừa lá mạnh nhất mọi lúc, không
     đánh lá vượt năng lượng còn lại.
   Gõ đúng từ trên lá để tung chiêu — gõ sai chỉ gõ lại, không mất lượt.
   Khắc hệ vòng như Rồng Lửa (Nước khắc Lửa, Điện khắc Nước, Lửa khắc
   Điện): đúng hệ khắc gây gấp đôi, sai hệ chỉ một nửa. Thắng: +20 vàng
   (vàng chung với Rồng Lửa) + 10 XP qua G71.endScreen + 1 lá mới vào
   bộ sưu tập. Thua vẫn giữ nguyên bộ sưu tập. Bộ sưu tập lưu
   state.dauBai (sống qua lần chơi).
   Logic thuần (không cần canvas) để probe kiểm tra được; start() nối DOM. */
(function () {
  "use strict";

  var MAX_HP = 30, DECK_SIZE = 12, HAND_START = 3, WIN_GOLD = 20, MAX_ENERGY = 3;

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

  /* ---- 7 loại lá ---- */
  var KINDS = {
    attack: { key: "attack", name: "Tấn công", icon: "⚔️", desc: "Gây sát thương bằng sức lá (khắc hệ gấp đôi)." },
    defend: { key: "defend", name: "Đỡ", icon: "🛡️", desc: "Chặn hoàn toàn đòn tiếp theo của máy." },
    heal: { key: "heal", name: "Hồi máu", icon: "💚", desc: "Hồi máu bằng sức lá, kẹp ở máu tối đa." },
    buff: { key: "buff", name: "Tăng sức", icon: "⬆️", desc: "Chiêu Tấn công +2 sát thương trong 2 lượt." },
    burn: { key: "burn", name: "Đốt", icon: "🔥", desc: "Đốt máy: mất máu mỗi lượt, 2 lượt." },
    poison: { key: "poison", name: "Độc", icon: "☠️", desc: "Trúng độc: mất máu mỗi lượt, 3 lượt." },
    weaken: { key: "weaken", name: "Làm yếu", icon: "🌀", desc: "Đòn Tấn công của máy chỉ còn một nửa trong 2 lượt." }
  };
  var KIND_KEYS = ["attack", "defend", "heal", "buff", "burn", "poison", "weaken"];
  /* Tỉ lệ loại trong một bộ 12 lá: 5 tấn công, 2 đỡ, 1 mỗi loại còn lại. */
  var KIND_CYCLE = ["attack", "attack", "attack", "attack", "attack",
    "defend", "defend", "heal", "burn", "poison", "buff", "weaken"];
  /* Loại gắn với từng từ (băm từ từ — ổn định qua các trận, không xáo
     lại mỗi trận nên người chơi nhớ được "lá nào là lá gì"). */
  function kindFor(w) {
    var h = 0, s = String(w || "");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return KIND_CYCLE[(h + s.length * 7) % KIND_CYCLE.length];
  }
  /* Giá năng lượng gốc: 1 + (sức >= 7) + (lá trạng thái); kẹp 1–3. */
  function costForBase(c) {
    var cost = 1 + ((c.power || 0) >= 7 ? 1 : 0)
      + ((c.kind === "burn" || c.kind === "poison" || c.kind === "weaken") ? 1 : 0);
    return Math.max(1, Math.min(3, cost));
  }
  function costOf(c) {
    if (!c) return 1;
    if (typeof c.cost === "number") return c.cost;
    return costForBase(c);
  }
  /* Trạng thái một lá gây ra (null nếu lá không gây trạng thái). Sát
     thương theo lượt tỉ lệ với sức lá để lá mạnh đốt/độc mạnh hơn. */
  function statusFor(c) {
    if (!c) return null;
    if (c.kind === "burn") return { kind: "burn", turns: 2, amount: Math.max(1, Math.floor((c.power || 0) / 3)) };
    if (c.kind === "poison") return { kind: "poison", turns: 3, amount: Math.max(1, Math.floor((c.power || 0) / 4)) };
    if (c.kind === "weaken") return { kind: "weaken", turns: 2, amount: 0 };
    if (c.kind === "buff") return { kind: "buff", turns: 2, amount: 2 };
    return null;
  }
  function hasStatus(list, kind) {
    return (list || []).some(function (s) { return s && s.kind === kind; });
  }
  function statusText(s) {
    if (!s) return "";
    if (s.kind === "burn") return "🔥 Đốt " + s.amount + " máu/lượt · còn " + s.turns + " lượt";
    if (s.kind === "poison") return "☠️ Độc " + s.amount + " máu/lượt · còn " + s.turns + " lượt";
    if (s.kind === "weaken") return "🌀 Làm yếu · còn " + s.turns + " lượt";
    if (s.kind === "buff") return "⬆️ Tăng sức +2 · còn " + s.turns + " lượt";
    return "";
  }

  /* Lá bài từ từ thật: sức mạnh = độ dài từ (+ thưởng nâng cấp); hệ
     chia đều 3 hệ rồi xáo; loại suy từ từ; giá theo sức + loại
     (- giảm giá khi đã nâng cấp, tối thiểu 1). */
  function buildDeck(words, upgrades) {
    var els = [];
    for (var i = 0; i < words.length; i++) els.push(EL_ORDER[i % 3]);
    G71.shuffle(els);
    return words.map(function (wd, i) {
      var key = String(wd.w).toLowerCase();
      var up = (upgrades && upgrades[key]) || null;
      var powerBonus = up ? Math.ceil((up.lvl || 0) / 2) : 0;
      var costCut = up ? Math.floor((up.lvl || 0) / 2) : 0;
      var power = String(wd.type || wd.w).length + powerBonus;
      var kind = kindFor(wd.w);
      var cost = Math.max(1, costForBase({ power: power, kind: kind }) - costCut);
      /* Cụm/ví dụ: lá trong bộ sưu tập không lưu col/ex — tra lại từ
         kho track (pool có col/ex) để lá bài hiện đủ nội dung. */
      var col = String(wd.col || ""), ex = String(wd.ex || "");
      if (!col && !ex) {
        try {
          var all = G71.pool();
          for (var j = 0; j < all.length; j++) {
            if (String(all[j].w).toLowerCase() === key) { col = String(all[j].col || ""); ex = String(all[j].ex || ""); break; }
          }
        } catch (e) {}
      }
      return { w: String(wd.w), vi: String(wd.vi), type: String(wd.type || wd.w),
        el: els[i], power: power, kind: kind, cost: cost, lvl: up ? (up.lvl || 0) : 0,
        col: col, ex: ex };
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
    kinds: KINDS,
    nextEl: nextEl,
    beats: beats,
    dmgFor: dmgFor,
    buildDeck: buildDeck,
    kindFor: kindFor,
    costFor: costForBase,
    costOf: costOf,
    statusFor: statusFor,
    statusText: statusText,
    hasStatus: hasStatus,
    MAX_HP: MAX_HP,
    DECK_SIZE: DECK_SIZE,
    MAX_ENERGY: MAX_ENERGY,
    WIN_GOLD: WIN_GOLD,
    createMatch: function (pCards, mCards) {
      var p = deal(G71.shuffle(pCards.slice()));
      var m = deal(G71.shuffle(mCards.slice()));
      var st = {
        pHp: MAX_HP, mHp: MAX_HP,
        pHand: p.hand, pDeck: p.deck, pDiscard: [],
        mHand: m.hand, mDeck: m.deck, mDiscard: [],
        pStance: null, mStance: null, pShield: false, mShield: false,
        pStatus: [], mStatus: [],
        pEnergy: MAX_ENERGY, mEnergy: MAX_ENERGY,
        turn: "player", pending: null, over: null, goldEarned: 0,
        mIntent: [], mLast: null, pLast: null, finishCard: null, played: [],
        log: ["Trận đấu bắt đầu — bạn đi trước. Mỗi lượt 3 ⚡, đánh được nhiều lá tới khi hết năng lượng."]
      };
      st.mIntent = LOGIC.planMachine(st);
      return st;
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
    /* Trạng thái trừ máu / hết hạn vào ĐẦU lượt của bên bị dính. */
    tickStatuses: function (st, who) {
      if (st.over) return;
      var list = who === "player" ? st.pStatus : st.mStatus;
      var hpKey = who === "player" ? "pHp" : "mHp";
      var name = who === "player" ? "Bạn" : "Máy";
      var i = 0;
      while (i < list.length) {
        var s = list[i];
        if (s.kind === "burn" || s.kind === "poison") {
          st[hpKey] -= s.amount;
          st.log.push((s.kind === "burn" ? "🔥 " : "☠️ ") + name + " chịu " + s.amount + " máu "
            + (s.kind === "burn" ? "bỏng" : "độc") + " (còn " + Math.max(0, s.turns - 1) + " lượt).");
        }
        s.turns--;
        if (s.turns <= 0) {
          st.log.push((s.kind === "burn" ? "🔥 Lửa đốt" : s.kind === "poison" ? "☠️ Độc" : s.kind === "weaken" ? "🌀 Làm yếu" : "⬆️ Tăng sức")
            + " trên người " + name + " đã hết.");
          list.splice(i, 1);
        } else i++;
      }
      if (st.mHp <= 0) { st.mHp = 0; st.over = "win"; st.goldEarned = WIN_GOLD; st.log.push("🎉 Bạn thắng trận đấu bài!"); }
      else if (st.pHp <= 0) { st.pHp = 0; st.over = "lose"; st.log.push("Máy thắng trận này."); }
    },
    /* Chọn 1 lá trong tay để gõ tung chiêu. Loại lá đã gắn sẵn trên lá
       (không còn chọn hành động riêng); năng lượng trừ khi gõ xong. */
    playCard: function (st, who, idx) {
      if (st.over) return { ok: false, why: "over" };
      if (st.pending) return { ok: false, why: "typing" };
      if (who === "player" && st.turn !== "player") return { ok: false, why: "turn" };
      var hand = who === "player" ? st.pHand : st.mHand;
      var card = hand[idx];
      if (!card) return { ok: false, why: "nocard" };
      if (who === "player" && costOf(card) > st.pEnergy) return { ok: false, why: "energy" };
      hand.splice(idx, 1);
      st.pending = { who: who, card: card, progress: 0 };
      return { ok: true, card: card };
    },
    /* Đổi ý khi đang gõ: trả lá về tay, không mất năng lượng. */
    cancelPending: function (st) {
      if (!st.pending || st.pending.who !== "player") return false;
      st.pHand.push(st.pending.card);
      st.pending = null;
      return true;
    },
    /* Gõ chữ để tung chiêu: sai chỉ gõ lại (không mất lượt, không mất
       gì); gõ xong từ thì tung chiêu, TRỪ năng lượng theo giá lá, rồi
       vẫn là lượt của bạn (đánh tiếp lá khác hoặc kết thúc lượt). */
    typeLetter: function (st, ch) {
      if (st.over) return { ok: false };
      var p = st.pending;
      if (!p || p.who !== "player") return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1) return { ok: false };
      var w = p.card.type || p.card.w;
      if (w.charAt(p.progress).toLowerCase() !== ch) return { ok: false, wrong: true };
      p.progress++;
      if (p.progress < w.length) return { ok: true };
      var cast = p;
      st.pending = null;
      st.pEnergy = Math.max(0, st.pEnergy - costOf(cast.card));
      var res = LOGIC.resolveCast(st, cast);
      return { ok: true, completed: true, cast: res };
    },
    resolveCast: function (st, cast) {
      var atk = cast.who, def = atk === "player" ? "machine" : "player";
      var card = cast.card;
      var kind = cast.kind || card.kind || "attack";
      var r = { who: atk, card: card, kind: kind, dmg: 0, blocked: false, healed: 0 };
      /* Tên trường trong state là pHp/mHp, pStance/mStance, pShield/mShield
         (không phải playerHp/machineHp) — ánh xạ who → tiền tố p/m. */
      var ap = atk === "player" ? "p" : "m", dp = def === "player" ? "p" : "m";
      var atkHp = ap + "Hp", defHp = dp + "Hp";
      var atkStance = ap + "Stance", defStance = dp + "Stance";
      var atkShield = ap + "Shield", defShield = dp + "Shield";
      var atkStatus = atk === "player" ? st.pStatus : st.mStatus;
      var defStatus = def === "player" ? st.pStatus : st.mStatus;
      var atkDisc = atk === "player" ? st.pDiscard : st.mDiscard;
      var whoName = atk === "player" ? "Bạn" : "Máy";
      var defName = def === "player" ? "Bạn" : "Máy";
      var dispW = (typeof G71 !== "undefined" && G71.displayWord) ? G71.displayWord(card) : card.w;
      if (kind === "attack") {
        if (st[defShield]) {
          st[defShield] = false;
          r.blocked = true;
          st.log.push("🛡️ " + defName + " đỡ được đòn " + dispW + " (" + elName(card.el) + ") — khiên vỡ, không mất máu.");
        } else {
          var dmg = dmgFor(card.power, card.el, st[defStance]);
          if (hasStatus(atkStatus, "weaken")) dmg = Math.max(1, Math.floor(dmg / 2));
          if (hasStatus(atkStatus, "buff")) dmg += 2;
          st[defHp] -= dmg;
          r.dmg = dmg;
          var tag = beats(card.el, st[defStance]) ? " (khắc hệ — gấp đôi!)"
            : beats(st[defStance], card.el) ? " (bị khắc hệ — chỉ một nửa)" : "";
          if (hasStatus(atkStatus, "weaken")) tag += " (đang bị làm yếu)";
          if (hasStatus(atkStatus, "buff")) tag += " (đang tăng sức +2)";
          st.log.push("⚔️ " + whoName + " đánh lá " + dispW + " (" + elName(card.el) + ", sức " + card.power + ") — " + defName + " mất " + dmg + " máu" + tag + ".");
        }
      } else if (kind === "defend") {
        st[atkShield] = true;
        st.log.push("🛡️ " + whoName + " giơ lá " + dispW + " (" + elName(card.el) + ") lên đỡ — chặn hoàn toàn đòn tiếp theo của " + defName + ".");
      } else if (kind === "heal") {
        var before = st[atkHp];
        st[atkHp] = Math.min(MAX_HP, st[atkHp] + card.power);
        r.healed = st[atkHp] - before;
        st.log.push("💚 " + whoName + " dùng lá " + dispW + " (" + elName(card.el) + ") hồi " + r.healed + " máu.");
      } else if (kind === "buff" || kind === "burn" || kind === "poison" || kind === "weaken") {
        var eff = statusFor(card);
        var target = kind === "buff" ? atkStatus : defStatus;
        var targetName = kind === "buff" ? whoName : defName;
        var old = null;
        target.forEach(function (s) { if (s.kind === kind) old = s; });
        if (old) {
          old.turns = Math.max(old.turns, eff.turns);
          old.amount = Math.max(old.amount, eff.amount);
        } else target.push(eff);
        r.status = eff;
        var verb = kind === "buff" ? "tăng sức (+2 sát thương, 2 lượt)"
          : kind === "burn" ? "đốt (" + eff.amount + " máu/lượt, 2 lượt)"
          : kind === "poison" ? "trúng độc (" + eff.amount + " máu/lượt, 3 lượt)"
          : "làm yếu (đòn tấn công còn một nửa, 2 lượt)";
        st.log.push(KINDS[kind].icon + " " + whoName + " dùng lá " + dispW + " (" + elName(card.el) + ") — " + targetName + " bị " + verb + (old ? " (làm mới thời gian)." : "."));
      }
      st[atkStance] = card.el;
      atkDisc.push(card);
      if (atk === "player") { st.pLast = { w: card.w, vi: card.vi, el: card.el, power: card.power, cost: costOf(card), kind: kind }; st.played.push(card.w); }
      else { st.mLast = { w: card.w, vi: card.vi, el: card.el, power: card.power, cost: costOf(card), kind: kind }; }
      if (st.mHp <= 0) {
        st.mHp = 0; st.over = "win"; st.goldEarned = WIN_GOLD;
        if (atk === "player") st.finishCard = card;
        st.log.push("🎉 Bạn thắng trận đấu bài!");
      } else if (st.pHp <= 0) {
        st.pHp = 0; st.over = "lose"; st.log.push("Máy thắng trận này.");
      }
      return r;
    },
    /* AI máy chiến thuật (quyết định được, không ngẫu nhiên): tính năng
       lượng còn lại của nó, giữ lá đỡ khi yếu máu, dùng lá khắc hệ khi
       có, không đánh bừa lá mạnh nhất mọi lúc, không bao giờ lên kế
       hoạch vượt năng lượng. Trả về danh sách nước đi (theo thứ tự
       đánh) — cũng chính là Ý ĐỊNH hiện cho người chơi xem trước. */
    planMachine: function (st) {
      var hand = st.mHand.slice();
      var energy = MAX_ENERGY;
      var plan = [];
      function effDmg(c) {
        var d = dmgFor(c.power, c.el, st.pStance);
        if (hasStatus(st.mStatus, "weaken")) d = Math.max(1, Math.floor(d / 2));
        if (hasStatus(st.mStatus, "buff") || plan.some(function (p) { return p.kind === "buff"; })) d += 2;
        return d;
      }
      function take(c) {
        var i = hand.indexOf(c);
        if (i < 0) return false;
        if (costOf(c) > energy) return false;
        hand.splice(i, 1);
        energy -= costOf(c);
        plan.push({ card: c, kind: c.kind || "attack", w: c.w, el: c.el, power: c.power, cost: costOf(c) });
        return true;
      }
      function affordable(kind) {
        return hand.filter(function (c) { return c.kind === kind && costOf(c) <= energy; });
      }
      /* 1. Yếu máu thì hồi trước. */
      if (st.mHp <= 10) {
        var heals = affordable("heal");
        if (heals.length) take(strongest(heals));
      }
      /* 2. Chưa tăng sức thì tăng sức trước (đòn sau mạnh hơn). */
      if (!hasStatus(st.mStatus, "buff")) {
        var buffs = affordable("buff");
        if (buffs.length) take(strongest(buffs));
      }
      /* 3. Gây trạng thái lên người chơi nếu chưa dính loại đó. */
      ["weaken", "burn", "poison"].forEach(function (k) {
        if (hasStatus(st.pStatus, k)) return;
        var cs = affordable(k);
        if (cs.length) take(strongest(cs));
      });
      /* 4. Tấn công: lá không bị khắc trước, lá mạnh nhất trong nhóm đó. */
      var atks = affordable("attack");
      atks.sort(function (a, b) { return effDmg(b) - effDmg(a); });
      var good = atks.filter(function (c) { return !beats(st.pStance, c.el); });
      var bad = atks.filter(function (c) { return beats(st.pStance, c.el); });
      good.forEach(function (c) { take(c); });
      /* 5. Không đánh được lá tốt nào: đỡ nếu có lá đỡ; không thì đánh
         lá bị khắc nhưng đủ mạnh (sát thương >= 4) chứ không bỏ lượt. */
      var attacked = plan.some(function (p) { return p.kind === "attack"; });
      if (!attacked) {
        var defs = affordable("defend");
        if (defs.length) take(strongest(defs));
        else bad.forEach(function (c) { if (effDmg(c) >= 4) take(c); });
      }
      return plan;
    },
    /* Giữ lại vỏ aiChoose cũ: trả về nước đi đầu tiên của kế hoạch. */
    aiChoose: function (st) {
      var plan = LOGIC.planMachine(st);
      if (!plan.length) return null;
      var first = plan[0];
      return { card: first.card, idx: st.mHand.indexOf(first.card), action: first.kind, kind: first.kind };
    },
    /* Lượt máy: trạng thái trừ máu trước, rồi đánh đúng như ý định đã
       hiện, rồi bốc 1 lá. Ý định tính từ tay máy trước khi bốc nên luôn
       khớp tay máy lúc đánh. */
    machineTurn: function (st) {
      if (st.over) return;
      LOGIC.tickStatuses(st, "machine");
      if (st.over) return;
      st.mEnergy = MAX_ENERGY;
      var plan = st.mIntent || [];
      plan.forEach(function (p) {
        if (st.over) return;
        var idx = -1;
        for (var i = 0; i < st.mHand.length; i++) if (st.mHand[i] === p.card || st.mHand[i].w === p.w) { idx = i; break; }
        if (idx < 0) return;
        var card = st.mHand[idx];
        if (costOf(card) > st.mEnergy) return;
        st.mHand.splice(idx, 1);
        st.mEnergy = Math.max(0, st.mEnergy - costOf(card));
        LOGIC.resolveCast(st, { who: "machine", card: card, kind: p.kind });
      });
      if (!st.over) LOGIC.draw(st, "machine");
    },
    /* Bắt đầu lượt mới của bạn: trạng thái trừ máu, bốc 1 lá, hồi đầy
       năng lượng, tính ý định mới của máy cho lượt sau. */
    startPlayerTurn: function (st) {
      if (st.over) return;
      LOGIC.tickStatuses(st, "player");
      if (st.over) return;
      LOGIC.draw(st, "player");
      st.pEnergy = MAX_ENERGY;
      st.turn = "player";
      st.mIntent = LOGIC.planMachine(st);
      st.log.push("▶ Lượt của bạn — " + st.pEnergy + " ⚡, bốc 1 lá. Máy định làm gì đã hiện ở trên, tính nước đi rồi đánh nhé.");
    },
    /* Kết thúc lượt bạn: máy đánh, rồi tới lượt mới của bạn. */
    endPlayerTurn: function (st) {
      if (st.over || st.pending) return false;
      st.turn = "machine";
      LOGIC.machineTurn(st);
      if (st.over) return true;
      LOGIC.startPlayerTurn(st);
      return true;
    },
    /* Dùng cho probe: tung chiêu ngay không qua gõ chữ. */
    forceCast: function (st, who, card, kind) {
      if (st.over) return null;
      return LOGIC.resolveCast(st, { who: who, card: card, kind: kind || card.kind || "attack" });
    }
  };

  /* ---- Bộ sưu tập + nâng cấp + vàng chung ---- */
  function freshDB() { return { cards: {}, wins: 0, losses: 0, upgrades: {}, deck: null }; }
  function loadDB() {
    var d = freshDB();
    try {
      if (typeof state !== "undefined" && state && state.dauBai) {
        var s = state.dauBai;
        if (s.cards) {
          Object.keys(s.cards).forEach(function (k) {
            var c = s.cards[k];
            /* v105: bo la chu cai don con sot tu ban luu cu (de truoc
               v105 rewardCard chua loc) — la 1 phim giet chet, khong
               phai la choi duoc; kho tu vung khong doi. */
            var single = false;
            try { single = (typeof G71 !== "undefined" && G71.isSingleLetter) ? G71.isSingleLetter(c) : false; } catch (e) {}
            if (c && c.w && c.vi && ELEMENTS[c.el] && !single) {
              d.cards[String(c.w).toLowerCase()] = { w: c.w, vi: c.vi, type: c.type || c.w, el: c.el };
            }
          });
        }
        if (typeof s.wins === "number") d.wins = s.wins;
        if (typeof s.losses === "number") d.losses = s.losses;
        if (s.upgrades) {
          Object.keys(s.upgrades).forEach(function (k) {
            var u = s.upgrades[k];
            if (u && typeof u.lvl === "number" && u.lvl > 0) d.upgrades[String(k).toLowerCase()] = { lvl: u.lvl };
          });
        }
        if (Array.isArray(s.deck) && s.deck.length === DECK_SIZE
          && s.deck.every(function (k) { return !!d.cards[String(k).toLowerCase()]; })) {
          d.deck = s.deck.map(function (k) { return String(k).toLowerCase(); });
        }
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
      db.cards[c.w.toLowerCase()] = { w: c.w, vi: c.vi, type: c.type || c.w, el: c.el };
    });
    saveDB(db);
    return db;
  }
  function rewardCard(db) {
    var pool = G71.shuffle(G71.pool()).filter(function (p) {
      return G71.isTypeable(p) && !G71.isSingleLetter(p) && !db.cards[p.w.toLowerCase()];
    });
    var pick = pool[0];
    if (!pick) return null;
    var el = EL_ORDER[Math.floor(Math.random() * 3)];
    db.cards[pick.w.toLowerCase()] = { w: pick.w, vi: pick.vi, type: pick.type || pick.w, el: el };
    return db.cards[pick.w.toLowerCase()];
  }
  /* Bộ mặc định: 12 lá đầu tiên trong bộ sưu tập (thứ tự đã có). */
  function defaultDeckKeys(db) {
    return Object.keys(db.cards).slice(0, DECK_SIZE);
  }
  function deckWords(db, keys) {
    return keys.map(function (k) { return db.cards[String(k).toLowerCase()]; }).filter(function (c) { return !!c; });
  }
  /* Nâng cấp lá kết liễu: cấp lẻ +1 sức, cấp chẵn -1 giá (tối thiểu 1). */
  function upgradeCard(db, key) {
    key = String(key || "").toLowerCase();
    if (!db.cards[key]) return null;
    var u = db.upgrades[key] || { lvl: 0 };
    u.lvl++;
    db.upgrades[key] = u;
    return { key: key, lvl: u.lvl, powerBonus: Math.ceil(u.lvl / 2), costCut: Math.floor(u.lvl / 2) };
  }

  /* ---- Màn hình + luồng chơi ---- */
  var DB = null, match = null, stage = null, arena = null;
  var selCard = -1, wrongFlash = false, deckSel = [];
  var mode = "idle"; /* idle | deck | battle | over */

  function esc(s) { return G71.escHtml(s); }
  function toastSafe(msg) { try { if (typeof toast === "function") toast(msg); } catch (e) {} }

  function start() {
    DB = ensureStarter(loadDB());
    /* v105: openStage goi closeStage -> teardown() (xoa mode/deckSel) neu
       san dang mo — nen dat deckSel/mode SAU openStage, neu khong mo lai
       (ke ca nut "Choi lai" sau tran) se ra man chon bai trong. */
    var stg = G71.openStage("🃏 Đấu Bài — Xây bộ bài",
      "Chọn đúng 12 lá từ bộ sưu tập để vào trận — mỗi lá có loại, hệ, sức và giá năng lượng riêng. Lá nào mạnh thì tốn nhiều ⚡. Thắng trận, lá kết liễu được nâng cấp.",
      function () { teardown(); });
    stage = stg;
    deckSel = (DB.deck && DB.deck.length === DECK_SIZE) ? DB.deck.slice() : defaultDeckKeys(DB);
    mode = "deck";
    buildDeckScreen(stg);
  }

  function teardown() {
    mode = "idle";
    document.removeEventListener("keydown", onKey);
    stage = null; match = null; arena = null; selCard = -1; deckSel = [];
  }

  /* ---- Màn xây bộ bài ---- */
  function buildDeckScreen(stg) {
    arena = document.createElement("div");
    arena.id = "dbDeck";
    arena.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:14px 14px 20px;";
    stg.el.appendChild(arena);
    renderDeck();
  }
  function deckCardHTML(c, key, selected) {
    var kind = KINDS[c.kind] || KINDS.attack;
    var el = ELEMENTS[c.el] || ELEMENTS.fire;
    var up = (DB.upgrades && DB.upgrades[key]) || null;
    return '<button class="btn" data-db-deck-card="' + esc(key) + '" style="text-align:left;padding:10px 12px;min-width:150px;flex:1 1 150px;border:2px solid ' + el.color + ';'
      + (selected ? 'background:#FDE68A;box-shadow:0 0 0 3px #F59E0B;' : '')
      + '"><span style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;"><span>' + kind.icon + ' ' + kind.name + '</span><span>⚡' + c.cost + '</span></span>'
      + '<span style="display:block;font-size:17px;font-weight:700;">' + esc(G71.displayWord(c)) + (up ? ' <span style="color:#B45309;">★' + up.lvl + '</span>' : '') + '</span>'
      + '<span style="display:block;font-size:13px;color:#57534A;">' + esc(c.vi) + '</span>'
      + '<span style="display:block;font-size:13px;font-weight:700;">' + el.icon + ' ' + el.name + ' · sức ' + c.power + '</span></button>';
  }
  function renderDeck() {
    if (!stage || !arena || mode !== "deck") return;
    var keys = Object.keys(DB.cards);
    var deckCards = buildDeck(deckWords(DB, keys), DB.upgrades);
    var byKey = {};
    deckCards.forEach(function (c) { byKey[c.w.toLowerCase()] = c; });
    var cardsHtml = keys.map(function (k) {
      return deckCardHTML(byKey[k], k, deckSel.indexOf(k) >= 0);
    }).join("");
    arena.innerHTML = '<div class="row" style="justify-content:space-between;align-items:center;">'
      + '<h2 style="margin:0;">🃏 Đấu Bài — Xây bộ bài</h2>'
      + '<button class="btn" id="dbExit">✕ Thoát</button></div>'
      + '<p class="mut" style="margin:6px 0;">Chọn đúng <b>12 lá</b> từ bộ sưu tập (' + keys.length + ' lá) để vào trận. Mỗi lá có loại + hệ + sức + giá ⚡ riêng — lá mạnh tốn nhiều năng lượng, xếp bộ sao cho vừa đánh vừa đỡ vừa hồi.</p>'
      + '<p style="font-weight:700;margin:6px 0;">🪙 Vàng: ' + readGold() + ' · 🏆 Thắng: ' + DB.wins + ' · Thua: ' + DB.losses + ' · Đã chọn: <span id="dbDeckCount">' + deckSel.length + '</span>/12 lá</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + cardsHtml + '</div>'
      + '<div class="row" style="margin-top:14px;flex-wrap:wrap;">'
      + '<button class="btn btn-primary" id="dbStart" data-db-start' + (deckSel.length === DECK_SIZE ? '' : ' disabled') + '>⚔️ Vào trận (' + deckSel.length + '/12)</button>'
      + '<button class="btn" id="dbRandom">🎲 Chọn ngẫu nhiên 12 lá</button>'
      + '<button class="btn" id="dbDefault">↺ Bộ mặc định</button></div>'
      + '<p class="mut" style="margin:10px 0 0;">Luật nhanh: mỗi lượt 3 ⚡ — lá Tấn công gây sát thương, lá Đỡ chặn đòn sau, lá Hồi hồi máu, lá Tăng sức/Đốt/Độc/Làm yếu gây trạng thái kéo dài qua lượt. Gõ đúng từ trên lá để tung chiêu.</p>';
    var ex = arena.querySelector("#dbExit");
    if (ex) ex.onclick = function () { stage.close(); };
    arena.querySelectorAll("[data-db-deck-card]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-db-deck-card");
        var i = deckSel.indexOf(k);
        if (i >= 0) deckSel.splice(i, 1);
        else if (deckSel.length < DECK_SIZE) deckSel.push(k);
        else { toastSafe("Bộ bài chỉ có 12 lá — bỏ bớt 1 lá rồi chọn lá khác."); return; }
        renderDeck();
      };
    });
    var st2 = arena.querySelector("#dbStart");
    if (st2) st2.onclick = function () { if (deckSel.length === DECK_SIZE) startMatch(); };
    var rd = arena.querySelector("#dbRandom");
    if (rd) rd.onclick = function () { deckSel = G71.shuffle(keys.slice()).slice(0, DECK_SIZE); renderDeck(); };
    var df = arena.querySelector("#dbDefault");
    if (df) df.onclick = function () { deckSel = defaultDeckKeys(DB); renderDeck(); };
  }

  /* ---- Màn đấu ---- */
  function startMatch() {
    DB.deck = deckSel.slice();
    saveDB(DB);
    var pCards = buildDeck(deckWords(DB, deckSel), DB.upgrades);
    var mCards = buildDeck(G71.pickTypingWords(DECK_SIZE).words);
    match = LOGIC.createMatch(pCards, mCards);
    selCard = -1; wrongFlash = false; mode = "battle";
    if (arena && arena.parentNode) arena.parentNode.removeChild(arena);
    arena = document.createElement("div");
    arena.id = "dbArena";
    arena.style.cssText = "position:absolute;inset:0;z-index:4;overflow:auto;background:#FFFBEB;padding:14px 14px 20px;";
    stage.el.appendChild(arena);
    document.addEventListener("keydown", onKey);
    render();
  }

  function hpBar(hp) {
    var pct = Math.max(0, Math.min(100, hp / MAX_HP * 100));
    var col = hp > 15 ? "#1E9E6A" : hp > 7 ? "#F59E0B" : "#E11D48";
    return '<div style="background:#E5E7EB;border-radius:999px;height:14px;overflow:hidden;margin:4px 0;">'
      + '<div style="width:' + pct + '%;height:100%;background:' + col + ';"></div></div>';
  }
  function energyPips(n) {
    var s = "";
    for (var i = 0; i < MAX_ENERGY; i++) {
      s += '<span style="color:' + (i < n ? '#B45309' : '#D1D5DB') + ';font-size:18px;">⚡</span>';
    }
    return s;
  }
  function statusLine(list) {
    if (!list || !list.length) return "";
    return list.map(function (s) { return statusText(s); }).join(" · ");
  }
  function stanceLine(who) {
    var st = who === "player" ? match.pStance : match.mStance;
    var sh = who === "player" ? match.pShield : match.mShield;
    var s = st ? elIcon(st) + " " + elName(st) : "—";
    return "Thế: <b>" + s + "</b>" + (sh ? ' &nbsp;🛡️ <b>đang đỡ</b>' : "");
  }
  function lastCardLine(last) {
    if (!last) return '<span class="mut">Chưa đánh lá nào.</span>';
    var kind = KINDS[last.kind] || KINDS.attack;
    var el = ELEMENTS[last.el] || ELEMENTS.fire;
    return '<b>' + esc(G71.displayWord(last)) + '</b> — ' + kind.icon + ' ' + kind.name
      + ' · ' + el.icon + ' ' + el.name + ' · sức ' + last.power + ' · ⚡' + last.cost;
  }
  function intentLine() {
    var plan = match.mIntent || [];
    if (!plan.length) return '<span class="mut">Máy hết bài — không đánh lượt tới.</span>';
    return plan.map(function (p) {
      var kind = KINDS[p.kind] || KINDS.attack;
      var el = ELEMENTS[p.el] || ELEMENTS.fire;
      return '<span style="display:inline-block;background:#fff;border:2px solid ' + el.color + ';border-radius:12px;padding:2px 8px;margin:2px 4px 2px 0;font-size:13px;">'
        + kind.icon + ' ' + kind.name + ' <b>' + esc(G71.displayWord(p)) + '</b> (' + el.icon + ' ' + el.name + ' · sức ' + p.power + ' · ⚡' + p.cost + ')</span>';
    }).join("");
  }
  function cardHTML(c, i) {
    var sel = (i === selCard);
    var kind = KINDS[c.kind] || KINDS.attack;
    var el = ELEMENTS[c.el] || ELEMENTS.fire;
    var afford = costOf(c) <= match.pEnergy && !match.pending;
    var exLine = "";
    if (c.col) exLine = '<span style="display:block;font-size:12px;color:#57534A;font-style:italic;">“' + esc(c.col) + '”</span>';
    else if (c.ex) exLine = '<span style="display:block;font-size:12px;color:#57534A;font-style:italic;">“' + esc(String(c.ex).slice(0, 42)) + (String(c.ex).length > 42 ? '…' : '') + '”</span>';
    return '<button class="btn" data-db-card="' + i + '" style="text-align:left;padding:10px 12px;min-width:150px;flex:1 1 150px;border:2px solid ' + el.color + ';'
      + (sel ? 'background:#FDE68A;box-shadow:0 0 0 3px #F59E0B;' : 'box-shadow:0 2px 8px ' + el.color + '44;')
      + (afford ? '' : 'opacity:.55;')
      + '"><span style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;"><span>' + kind.icon + ' ' + kind.name + '</span><span>⚡' + c.cost + '</span></span>'
      + '<span style="display:block;font-size:17px;font-weight:700;">' + esc(G71.displayWord(c)) + (c.lvl ? ' <span style="color:#B45309;">★' + c.lvl + '</span>' : '') + '</span>'
      + '<span style="display:block;font-size:13px;color:#57534A;">' + esc(c.vi) + '</span>'
      + '<span style="display:block;font-size:13px;font-weight:700;">' + el.icon + ' ' + el.name + ' · sức ' + c.power + '</span>'
      + exLine + '</button>';
  }

  function render() {
    if (!stage || !arena || !match) return;
    var last = match.log.slice(-4);
    var logHtml = last.map(function (l) { return "<p style=\"margin:4px 0;\">" + esc(l) + "</p>"; }).join("");
    var pend = match.pending;
    var typeHtml = "";
    if (pend) {
      var pType = pend.card.type || pend.card.w;
      var done = pType.slice(0, pend.progress), rest = pType.slice(pend.progress);
      var kind = KINDS[pend.card.kind] || KINDS.attack;
      var bigWord = G71.displayWord(pend.card);
      typeHtml = '<section class="card" style="margin:12px 0 0;border:2px solid #B45309;"><h3 style="margin:0 0 4px;">Gõ từ trên lá để tung chiêu — ' + kind.icon + ' ' + kind.name + ' · tốn ' + costOf(pend.card) + ' ⚡</h3>'
        + (bigWord !== pType ? '<p style="font-size:26px;font-weight:700;margin:6px 0;">' + esc(bigWord) + '</p>' : '')
        + '<p style="font-size:22px;font-weight:700;margin:6px 0;"><span style="color:#B45309;">' + esc(done) + '</span><span>' + esc(rest) + '</span></p>'
        + '<p class="mut" style="margin:4px 0;">' + esc(pend.card.vi) + " · " + ELEMENTS[pend.card.el].icon + " " + ELEMENTS[pend.card.el].name
        + (wrongFlash ? ' · <span style="color:#E11D48;font-weight:700;">✗ gõ sai rồi, gõ lại nhé</span>' : " · gõ sai chỉ gõ lại, không mất lượt") + '</p>'
        + '<div class="row"><button class="btn" data-db-cancel>↩ Đổi lá (không mất ⚡)</button></div></section>';
    } else if (selCard >= 0 && match.pHand[selCard]) {
      var sc = match.pHand[selCard];
      var sk = KINDS[sc.kind] || KINDS.attack;
      typeHtml = '<p class="mut" style="margin:12px 0 0;">Đã chọn lá <b>' + esc(G71.displayWord(sc)) + '</b> (' + sk.icon + ' ' + sk.name + ' · tốn ' + costOf(sc) + ' ⚡) — bấm lại vào lá để gõ tung chiêu, hoặc chọn lá khác.</p>';
    } else {
      typeHtml = '<p class="mut" style="margin:12px 0 0;">Chọn 1 lá trong tay để đánh — mỗi lượt có ' + MAX_ENERGY + ' ⚡, đánh được nhiều lá tới khi hết năng lượng.</p>';
    }
    var isTpDb = false;
    try { isTpDb = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
    var kbHtml = "";
    if (pend) {
      var kbKeys = isTpDb ? String(pend.card.type || pend.card.w).split("") : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      kbHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:10px 0 0;">'
        + kbKeys.map(function (L) {
            return '<button class="btn" data-db-key="' + esc(L) + '" style="padding:6px 4px;min-width:30px;font-size:15px;">' + esc(L) + "</button>";
          }).join("") + "</div>";
    }
    arena.innerHTML = '<div class="row" style="justify-content:space-between;align-items:center;">'
      + '<h2 style="margin:0;">🃏 Đấu Bài — Đấu với máy</h2>'
      + '<button class="btn" id="dbExit">✕ Thoát</button></div>'
      + '<p style="font-weight:700;margin:6px 0;">🪙 Vàng: ' + readGold() + " · 🏆 Thắng: " + DB.wins + " · Thua: " + DB.losses + " · Bộ sưu tập: " + Object.keys(DB.cards).length + " lá</p>"
      + '<p style="font-weight:700;margin:6px 0;">' + (match.turn === "player" ? "▶ Lượt của bạn" : "🤖 Lượt máy…") + " — còn " + match.pEnergy + " ⚡</p>"
      + '<section class="card" style="margin:8px 0;border:2px solid #E11D48;"><h3 style="margin:0 0 2px;">🤖 Máy · Máu ' + Math.max(0, match.mHp) + "/" + MAX_HP + " · " + energyPips(match.mEnergy) + "</h3>"
      + hpBar(match.mHp)
      + '<p style="margin:4px 0;">' + stanceLine("machine") + " · Bài trên tay: " + match.mHand.length + " lá · Bộ bài còn: " + match.mDeck.length + " lá</p>"
      + (statusLine(match.mStatus) ? '<p style="margin:4px 0;font-weight:700;">' + esc(statusLine(match.mStatus)) + '</p>' : '')
      + '<p style="margin:4px 0;" data-db-mlast>Lá vừa đánh: ' + lastCardLine(match.mLast) + '</p>'
      + '<p style="margin:4px 0;" data-db-intent>🎯 Máy định lượt tới: ' + intentLine() + '</p></section>'
      + '<section class="card" style="margin:8px 0;min-height:96px;"><h3 style="margin:0 0 4px;">📜 Diễn biến trận đấu</h3>' + logHtml + "</section>"
      + '<section class="card" style="margin:8px 0;border:2px solid #1E9E6A;"><h3 style="margin:0 0 2px;">🧑 Bạn · Máu ' + Math.max(0, match.pHp) + "/" + MAX_HP + " · " + energyPips(match.pEnergy) + "</h3>"
      + hpBar(match.pHp)
      + '<p style="margin:4px 0;">' + stanceLine("player") + " · Bộ bài còn: " + match.pDeck.length + " lá</p>"
      + (statusLine(match.pStatus) ? '<p style="margin:4px 0;font-weight:700;">' + esc(statusLine(match.pStatus)) + '</p>' : '')
      + '<p style="margin:4px 0;">Lá vừa đánh: ' + lastCardLine(match.pLast) + '</p>'
      + '<div class="row" style="margin-top:8px;"><button class="btn btn-primary" data-db-endturn' + (pend ? ' disabled' : '') + '>⏭️ Kết thúc lượt (' + match.pEnergy + ' ⚡ còn lại)</button></div></section>'
      + '<h3 style="margin:12px 0 6px;">🖐️ Bài trên tay (' + match.pHand.length + " lá)</h3>"
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + match.pHand.map(cardHTML).join("") + "</div>"
      + typeHtml
      + kbHtml;
    var ex = arena.querySelector("#dbExit");
    if (ex) ex.onclick = function () { stage.close(); };
    arena.querySelectorAll("[data-db-card]").forEach(function (b) {
      b.onclick = function () {
        if (match.pending) return;
        var idx = parseInt(b.getAttribute("data-db-card"), 10);
        if (idx === selCard) {
          /* Bấm lại vào lá đã chọn = bắt đầu gõ tung chiêu. */
          doPlay(idx);
          return;
        }
        selCard = idx;
        wrongFlash = false;
        render();
      };
    });
    var et = arena.querySelector("[data-db-endturn]");
    if (et) et.onclick = function () { doEndTurn(); };
    var cx = arena.querySelector("[data-db-cancel]");
    if (cx) cx.onclick = function () {
      LOGIC.cancelPending(match);
      selCard = -1;
      wrongFlash = false;
      render();
    };
    arena.querySelectorAll("[data-db-key]").forEach(function (b) {
      b.onclick = function () { feed(b.getAttribute("data-db-key")); };
    });
  }

  function doPlay(idx) {
    if (mode !== "battle" || !match || match.over || match.pending) return;
    if (idx < 0 || !match.pHand[idx]) return;
    var r = LOGIC.playCard(match, "player", idx);
    if (!r.ok) {
      if (r.why === "energy") toastSafe("Không đủ ⚡ — lá này tốn " + costOf(match.pHand[idx]) + " ⚡, bạn còn " + match.pEnergy + " ⚡.");
      return;
    }
    selCard = -1;
    wrongFlash = false;
    render();
  }

  function doEndTurn() {
    if (mode !== "battle" || !match || match.over || match.pending) return;
    LOGIC.endPlayerTurn(match);
    selCard = -1;
    wrongFlash = false;
    render();
    if (match.over) endMatch();
  }

  function feed(ch) {
    if (mode !== "battle" || !match || match.over || !match.pending) return;
    var r = LOGIC.typeLetter(match, ch);
    if (r && r.wrong) {
      wrongFlash = true;
      /* v103 P2.8: go sai chu cua la dang go thi tu tren la vao hang doi
         on (go sai chi la go lai trong tran, nhung chinh ta cua tu do
         chua vung — gap lai o buoi on se chac hon). */
      try { if (typeof recordGameMiss === "function" && match.pending && match.pending.card) recordGameMiss(match.pending.card.w, "dau-bai"); } catch (e) {}
    }
    else if (r && r.ok) wrongFlash = false;
    render();
    if (match.over) endMatch();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var isTpKey = false;
    try { isTpKey = (typeof G71 !== "undefined" && G71.trackKey && G71.trackKey() === "tp"); } catch (e) {}
    if (e.key && e.key.length === 1 && (isTpKey || /[a-zA-Z]/.test(e.key))) feed(e.key);
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
      var upLine = "";
      /* Lá kết liễu: lá tung đòn cuối; thắng bằng trạng thái (đốt/độc
         trừ máu đầu lượt máy) thì lấy lá người chơi đánh gần nhất. */
      var finKey = match.finishCard ? match.finishCard.w
        : (match.played.length ? match.played[match.played.length - 1] : null);
      if (finKey) {
        var up = upgradeCard(DB, finKey);
        if (up) upLine = "Lá kết liễu " + G71.displayWord({ w: finKey, vi: (DB.cards[String(finKey).toLowerCase()] || {}).vi || "" }) + " lên cấp " + up.lvl
          + " (sức +" + up.powerBonus + (up.costCut ? ", giá -" + up.costCut + " ⚡" : "") + ").";
      }
      saveDB(DB);
      lines.push("Bạn thắng trận đấu bài!");
      lines.push("Thưởng: +" + WIN_GOLD + " vàng (vàng chung với Rồng Lửa) · +10 XP đã cộng vào tiến trình.");
      if (upLine) lines.push(upLine);
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
    kinds: KINDS,
    render: render,
    store: { load: loadDB, save: saveDB, fresh: freshDB, gold: readGold },
    /* Mỏ neo cho probe: đọc trạng thái chơi hiện tại. */
    debug: function () { return { mode: mode, match: match, db: DB, selCard: selCard, deckSel: deckSel.slice() }; }
  };
})();
