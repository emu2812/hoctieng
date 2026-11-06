/* G71 — Rồng Lửa RPG, đủ 5 vùng × 10 ải (v98).
   Cốt truyện: vương quốc Ngôn Ngữ bị Bóng Tối Câm Lặng phong ấn, các từ
   bị đánh cắp; rồng nhỏ đi thu hồi từng từ. 5 vùng × 10 ải, mỗi ải 3 trận:
   (1) Rừng Xanh — thiên nhiên; (2) Làng Chài — đời sống; (3) Thành Phố —
   công việc/học tập; (4) Hang Pha Lê — cảm xúc/mô tả; (5) Núi Lửa — tổng
   hợp, trùm cuối. Thắng trùm Núi Lửa mở Chế độ Vô Tận (kỷ lục cá nhân).
   Quái tiến tới mang từ; tung chiêu = gõ/chạm đúng từ. Chiêu có hệ
   (Lửa/Nước/Điện), quái yếu một hệ — đúng hệ sát thương tối đa, sai hệ
   nửa sát thương; trúng liên tiếp nhân combo tới x3. Rồng 5 tim, quái
   chạm tới trừ 1 tim (khiên chặn được 1 đòn); hết tim thua ải nhưng GIỮ
   cấp/vàng/từ đã thu. Từ đánh bại lần đầu thành chiêu trong Từ Điển Rồng,
   dùng nhiều thăng cấp (tối đa cấp 3). Thắng rơi vàng, cửa hàng giữa các
   trận (bình máu/khiên). Trùm mỗi vùng đổi hệ sau mỗi 1/3 máu.
   Kho từ lấy từ kho thật của track đang học (v91), lọc theo chủ đề vùng;
   chủ đề nào kho mỏng (TOEIC: thiên nhiên/cảm xúc) thì ưu tiên từ theo
   chủ đề, thiếu bù từ kho chung của track — vẫn là từ thật trong sách,
   không bịa, và bản đồ ghi rõ. Vùng sau mở khi qua trùm vùng trước HOẶC
   đủ XP web (100/300/600/1000). Vùng 1 giữ luật/nội dung lát cắt v78–v80
   (3 trận/ải, trùm HP 30 đổi hệ ở 20/10, ảnh Canva + fallback vẽ code).
   Hình: ảnh Canva vùng 1 (assets/ronglua/); vùng 2–5 vẽ bằng code theo
   ART_DIRECTION.md (một bảng màu chàm + hổ phách + teal, bo 20px, sáng
   trên-trái). Logic thuần (không cần canvas) để probe kiểm tra được;
   start() nối DOM. */
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

  /* ---- 5 vùng: chủ đề, trùm, tên ải (v98) ---- */
  var REGIONS = [
    { id: 1, name: "Rừng Xanh", icon: "🌲", theme: "thiên nhiên", boss: "Trùm Bóng Tối",
      accent: "teal", desc: "Nơi từ về thiên nhiên, cây cỏ, thú vật và thời tiết bị phong ấn.",
      weather: { key: "rain", season: "Mùa xuân", name: "Mưa phùn", icon: "🌧️", element: "water", mult: 1.5 },
      stages: ["Bìa Rừng", "Lối Mòn Xanh", "Suối Ngàn Hoa", "Thác Bạc", "Tổ Chim Lớn",
        "Vườn Nấm", "Cây Cổ Thụ", "Hang Đom Đóm", "Đỉnh Tán Lá", "Hang Trùm Bóng Tối"] },
    { id: 2, name: "Làng Chài", icon: "🎣", theme: "đời sống", boss: "Trùm Sóng Đen",
      accent: "teal", desc: "Từ về đời sống, gia đình, ăn uống, chợ búa và việc nhà.",
      weather: { key: "sun", season: "Mùa hè", name: "Nắng vàng", icon: "☀️", element: "fire", mult: 1.5 },
      stages: ["Bến Cá", "Chợ Sáng", "Bếp Lửa Hồng", "Nhà Gỗ Ven Sông", "Vườn Rau",
        "Quán Nước Đầu Làng", "Thuyền Buồm", "Kho Lúa", "Đêm Hội Làng", "Hang Trùm Sóng Đen"] },
    { id: 3, name: "Thành Phố", icon: "🏙️", theme: "công việc và học tập", boss: "Trùm Bóng Đêm",
      accent: "amber", desc: "Từ về công việc, học tập, trường lớp và thành phố.",
      weather: { key: "storm", season: "Mùa thu", name: "Giông", icon: "⛈️", element: "elec", mult: 1.5 },
      stages: ["Ga Tàu", "Văn Phòng", "Phòng Họp", "Thư Viện", "Giảng Đường",
        "Quán Cà Phê", "Công Viên", "Trung Tâm Thương Mại", "Sân Vận Động", "Tháp Trùm Bóng Đêm"] },
    { id: 4, name: "Hang Pha Lê", icon: "💎", theme: "cảm xúc và mô tả", boss: "Trùm Pha Lê Đen",
      accent: "indigo", desc: "Từ về cảm xúc, tính cách, quan hệ và cách mô tả con người.",
      weather: { key: "snow", season: "Mùa đông", name: "Tuyết rơi", icon: "❄️", element: "water", mult: 1.5 },
      stages: ["Cửa Hang", "Dòng Suối Pha Lê", "Gương Cảm Xúc", "Vườn Hoa Tím",
        "Cầu Vồng", "Hồ Nước Trong", "Tháp Tính Cách", "Cánh Đồng Hoa", "Đỉnh Pha Lê", "Trùm Pha Lê Đen"] },
    { id: 5, name: "Núi Lửa", icon: "🌋", theme: "tổng hợp", boss: "Trùm Dung Nham",
      accent: "fire", desc: "Tổng hợp mọi chủ đề — chỉ dành cho rồng đã qua 4 vùng.",
      weather: { key: "heat", season: "Mùa khô", name: "Nóng bức", icon: "🌡️", element: "fire", mult: 1.5 },
      stages: ["Chân Núi", "Dòng Dung Nham", "Hang Đá Nóng", "Cầu Đá", "Đỉnh Khói",
        "Hồ Lửa", "Vực Sâu", "Cổng Tro", "Sườn Núi Lửa", "Hang Trùm Dung Nham"] }
  ];
  /* XP web cần để mở vùng 2–5 nếu chưa qua trùm vùng trước (vùng 1 luôn mở). */
  var XP_NEED = [0, 100, 300, 600, 1000];
  function regionById(id) {
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i];
    return REGIONS[0];
  }
  function xpNeedFor(region) { return XP_NEED[Math.max(0, Math.min(4, (region || 1) - 1))]; }
  /* Regex lọc bộ từ theo chủ đề vùng, theo từng track (v98).
     EN lọc theo topic tiếng Anh của CONTENT.vocab; ZH/TC/TP lọc theo topic
     tiếng Việt của bộ. Vùng 5 tổng hợp: không lọc, lấy toàn kho track. */
  var REGION_TOPIC_RE = {
    1: {
      en: /environment|nature|animal|weather|geograph|agricultur|climate|forest|garden|plant/i,
      zh: /thiên nhiên|môi trường|động vật|thời tiết|bốn mùa|nông nghiệp|khí hậu/i,
      tc: /môi trường|an toàn.*lao động|năng lượng/i,
      tp: /thiên nhiên|môi trường|động vật|thời tiết|bốn mùa|nông nghiệp|khí hậu|công viên/i
    },
    2: {
      en: /daily life|family|home|food|house|market|village|cooking|housework|kitchen|restaurant|shopping/i,
      zh: /đời sống|gia đình|sinh hoạt|ăn uống|chợ|nhà ở|quần áo|mua sắm|nấu ăn|việc nhà/i,
      tc: /ăn trưa|nhà ăn|khách sạn|nhà hàng|du lịch công tác|đi công tác|ăn uống/i,
      tp: /gia đình|ăn uống|nhà bếp|chợ|mua sắm|việc nhà|đời sống|món ăn|ẩm thực/i
    },
    3: {
      en: /work|business|job|office|study|education|school|city|career|meeting|presentation|interview/i,
      zh: /công việc|học tập|trường học|văn phòng|thành phố|thi cử|giáo dục|nghề nghiệp/i,
      tc: /họp|email|tuyển dụng|quản lý|kinh doanh|tài chính|marketing|văn phòng|công việc|dự án/i,
      tp: /công việc|trường học|học tập|thi cử|văn phòng|thành phố|giáo dục|nghề nghiệp/i
    },
    4: {
      en: /feeling|emotion|psycholog|describ|character|personality|opinion/i,
      zh: /cảm xúc|tính cách|phẩm chất|tâm lý|miêu tả|quan hệ xã hội/i,
      tc: /đánh giá|phản hồi|khiếu nại|thương lượng|đàm phán|giao tiếp|quan hệ|ứng xử/i,
      tp: /cảm xúc|tính cách|tâm lý|quan hệ|bạn bè|gặp gỡ/i
    },
    5: null /* tổng hợp: toàn kho track */
  };

  /* ---- Lớp sâu v99: thời tiết/mùa, quái yếu theo nhóm từ, bạn đồng hành,
     ghép cụm từ/câu, từ quá hạn bị bắt cóc (SRS thành cốt truyện).
     Tất cả dùng dữ liệu thật của track đang học; không bịa, không đổi luật
     lõi/XP/SRS đã có — chỉ thêm lớp sâu lên trên. ---- */
  /* Thời tiết/mùa theo vùng: chiêu đúng hệ thời tiết được tăng sát thương
     ×1,5 — mức tăng hiện rõ trên HUD + bản đồ vùng, không tăng ngầm. */
  function weatherFor(region) {
    var r = regionById(region || 1);
    return r.weather || null;
  }
  function weatherMult(element, region) {
    var w = weatherFor(region);
    if (!w || w.element !== element) return 1;
    return w.mult || 1.5;
  }
  /* Quái yếu theo NHÓM từ: mỗi quái sợ một nhóm; từ nó mang thuộc nhóm
     đó thì chiêu gây sát thương ×2 (hiện rõ trên thẻ quái). Nhóm lấy từ
     dữ liệu thật: độ dài chuỗi gõ + chủ đề bộ của từ trong kho. */
  var GROUP_WEAK = {
    long: { label: "từ dài", hint: "Sợ từ dài (≥7 chữ)" },
    nature: { label: "từ thiên nhiên", hint: "Sợ từ thiên nhiên" },
    emotion: { label: "từ cảm xúc", hint: "Sợ từ cảm xúc" },
    daily: { label: "từ đời sống", hint: "Sợ từ đời sống" },
    work: { label: "từ công việc", hint: "Sợ từ công việc" }
  };
  var GROUP_KEYS = ["long", "nature", "emotion", "daily", "work"];
  var GROUP_REGION = { nature: 1, daily: 2, work: 3, emotion: 4 };
  function wordGroups(word) {
    var out = [];
    var type = String((word && word.type) || (word && word.w) || "");
    if (type.length >= 7) out.push("long");
    var topic = String((word && word.theme) || "") + " " + String((word && word.vi) || "");
    Object.keys(GROUP_REGION).forEach(function (g) {
      var res = REGION_TOPIC_RE[GROUP_REGION[g]];
      if (!res) return;
      var hit = false;
      ["en", "zh", "tc", "tp"].forEach(function (tk) { if (res[tk] && res[tk].test(topic)) hit = true; });
      if (hit) out.push(g);
    });
    return out;
  }
  /* Bạn đồng hành: mở khóa khi thắng trùm vùng tương ứng (suy ra từ tiến
     trình đã qua trùm, không cần lưu riêng — bản lưu cũ tự có). */
  var COMPANIONS = [
    { id: "sparrow", name: "Sẻ Lửa", icon: "🐦", region: 1, kind: "dmg", element: "fire", bonus: 1,
      effect: "Chiêu Lửa +1 sát thương", unlock: "Thắng trùm Rừng Xanh" },
    { id: "turtle", name: "Rùa Nước", icon: "🐢", region: 2, kind: "heal", element: "", bonus: 1,
      effect: "Hồi 1 tim sau mỗi trận thắng", unlock: "Thắng trùm Làng Chài" },
    { id: "firefly", name: "Đom Đóm Điện", icon: "🪲", region: 3, kind: "dmg", element: "elec", bonus: 1,
      effect: "Chiêu Điện +1 sát thương", unlock: "Thắng trùm Thành Phố" },
    { id: "rabbit", name: "Thỏ Pha Lê", icon: "🐇", region: 4, kind: "dmg", element: "water", bonus: 1,
      effect: "Chiêu Nước +1 sát thương", unlock: "Thắng trùm Hang Pha Lê" }
  ];
  function unlockedCompanions(rl) {
    var out = [];
    COMPANIONS.forEach(function (c) {
      var p = rl && rl.progress && rl.progress[String(c.region)];
      if (p && p.cleared && p.cleared["10"]) out.push(c.id);
    });
    return out;
  }
  function companionDmgBonus(element, companions) {
    var b = 0;
    (companions || []).forEach(function (id) {
      COMPANIONS.forEach(function (c) { if (c.id === id && c.kind === "dmg" && c.element === element) b += c.bonus; });
    });
    return b;
  }
  function companionHeal(companions) {
    return (companions || []).indexOf("turtle") >= 0 ? 1 : 0;
  }
  /* Cụm từ/câu thật để ghép chiêu combo: EN/TC/ZH dùng trường col của thẻ
     (cụm từ thật trong sách); TP không có col nên dùng câu ví dụ ex.
     ZH: col là chữ Hán — tách col thành từng đoạn bằng cách tra pinyin của
     đoạn trong kho từ của track (từ dài nhất trước); đoạn nào không tra
     được thì cụm đó không dùng làm quái cụm (không bịa pinyin). Trả về
     null khi không có cụm hợp lệ. */
  function phraseFor(word, pool) {
    if (!word) return null;
    var tk = "en";
    try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? G71.trackKey() : "en"; } catch (e) {}
    if (tk === "tp") {
      var ex = String(word.ex || "").replace(/[.?!。！？]+$/, "").trim();
      if (!ex) return null;
      var parts = ex.split(/\s+/).filter(function (s) { return !!s; });
      if (parts.length < 2) return null;
      return { display: ex, vi: word.vi || "", parts: parts.map(function (p) { return { text: p, type: p }; }) };
    }
    var col = String(word.col || "").trim();
    if (!col) return null;
    if (tk === "zh") {
      var map = {};
      (pool || []).forEach(function (p) { if (p.w && p.type) map[String(p.w)] = String(p.type); });
      var zhParts = [], rest = col;
      while (rest.length) {
        var found = null;
        for (var L = Math.min(4, rest.length); L >= 1; L--) {
          var seg = rest.slice(0, L);
          if (map[seg]) { found = { text: seg, type: map[seg] }; rest = rest.slice(L); break; }
        }
        if (!found) return null;
        zhParts.push(found);
      }
      if (zhParts.length < 2) return null;
      return { display: col, vi: word.vi || "", parts: zhParts };
    }
    var words = col.split(/\s+/).filter(function (s) { return !!s; });
    if (words.length < 2) return null;
    return { display: col, vi: word.vi || "", parts: words.map(function (p) { return { text: p, type: p.toLowerCase() }; }) };
  }
  /* Chuỗi gõ của cụm, có dấu cách giữa các từ — dùng để hiển thị tiến
     trình gõ (gõ liền không cần dấu cách; dấu cách được bỏ qua). */
  function phraseSpaced(phrase) {
    if (!phrase || !phrase.parts) return "";
    return phrase.parts.map(function (p) { return p.type; }).join(" ");
  }
  /* Từ quá hạn SRS bị quái bắt cóc: lấy từ kho SRS thật của track đang
     học, theo đúng lịch 1-3-7-14-30. EN: state.cards (dueCards); ZH:
     zhHard loại card (zhDueHard); TC/TP: tcDueCards90/tpDueCards90.
     Tối đa 8 từ, quá hạn nhất lên trước. */
  function findKidnapped() {
    var tk = "en";
    try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? G71.trackKey() : "en"; } catch (e) {}
    var out = [];
    try {
      if (tk === "en" && typeof dueCards === "function") {
        dueCards().forEach(function (d) {
          var c = d.card || {};
          if (c.w && c.vi) out.push({ w: String(c.w), vi: String(c.vi), type: String(c.w), py: "",
            theme: String(c.theme || ""), key: d.key, track: "en", due: d.due || "" });
        });
      } else if (tk === "zh" && typeof zhDueHard === "function") {
        zhDueHard().forEach(function (d) {
          var h = d.h || {};
          if (h.kind === "card" && h.han && h.vi) {
            var py = "";
            try { py = G71.pinyinPlain(h.pinyin || ""); } catch (e) { py = String(h.pinyin || ""); }
            out.push({ w: String(h.han), vi: String(h.vi), type: py, py: String(h.pinyin || ""),
              theme: "", key: d.key, track: "zh", due: h.due || "" });
          }
        });
      } else if (tk === "tc" && typeof tcDueCards90 === "function") {
        tcDueCards90().forEach(function (d) {
          var c = d.card || {};
          if (c.w && c.vi) out.push({ w: String(c.w), vi: String(c.vi), type: String(c.w), py: "",
            theme: "", key: d.key, track: "tc", due: d.due || "" });
        });
      } else if (tk === "tp" && typeof tpDueCards90 === "function") {
        tpDueCards90().forEach(function (d) {
          var c = d.card || {};
          if (c.w && c.vi) out.push({ w: String(c.w), vi: String(c.vi), type: String(c.w), py: "",
            theme: "", key: d.key, track: "tp", due: d.due || "" });
        });
      }
    } catch (e) {}
    out.sort(function (a, b) { return (a.due || "") < (b.due || "") ? -1 : ((a.due || "") > (b.due || "") ? 1 : 0); });
    return out.slice(0, 8);
  }
  /* Ôn lại một từ đã cứu, đúng luật SRS của track đó (không xóa dữ liệu,
     không trừ điểm học): EN dùng vocabBoxJudge; ZH dùng zhHardJudge;
     TC/TP tăng 1 nấc + hẹn theo RB_INTERVALS (đúng luật nút Nhớ rồi). */
  function reviewKidnapped(item) {
    try {
      if (!item || !item.key) return false;
      if (item.track === "en" && typeof vocabBoxJudge === "function") { vocabBoxJudge(item.key, true); return true; }
      if (item.track === "zh" && typeof zhHardJudge === "function") { zhHardJudge(item.key, true); return true; }
      if ((item.track === "tc" || item.track === "tp") && typeof todayStr === "function"
        && typeof addDaysStr === "function" && typeof RB_INTERVALS !== "undefined") {
        var isTc = item.track === "tc";
        var boxes = isTc ? (state.tcCardBox || {}) : (state.tpCardBox || {});
        var dues = isTc ? (state.tcCardDue || {}) : (state.tpCardDue || {});
        var box = Math.min(5, (boxes[item.key] || 0) + 1);
        boxes[item.key] = box;
        if (box >= 5) delete dues[item.key];
        else dues[item.key] = addDaysStr(todayStr(), RB_INTERVALS[Math.min(box - 1, RB_INTERVALS.length - 1)]);
        if (isTc) { state.tcCardBox = boxes; state.tcCardDue = dues; }
        else { state.tpCardBox = boxes; state.tpCardDue = dues; }
        if (typeof saveState === "function") saveState();
        return true;
      }
    } catch (e) {}
    return false;
  }

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
  /* ---- Kho từ theo chủ đề vùng + track (v98).
     naturePool/pickNatureWords giữ nguyên vỏ bọc vùng 1 (probe cũ).
     Vùng 5 tổng hợp = toàn kho track. Kho chủ đề mỏng thì bù từ kho
     chung của track — vẫn là từ thật trong sách, không bịa. ---- */
  function regionPool(regionId) {
    var tk = "en";
    try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? G71.trackKey() : "en"; } catch (e) {}
    var re = REGION_TOPIC_RE[regionId || 1];
    var all = [];
    try { all = G71.pool(); } catch (e) { all = []; }
    if (!re) return all.slice();
    var rx = re[tk] || re.en;
    if (!rx) return all.slice();
    var out = [], seen = {};
    all.forEach(function (c) {
      /* G71.pool() mang chủ đề bộ trong trường theme (không phải set/topic). */
      var topic = (c.theme || c.set || c.topic || "") + " " + (c.w || "") + " " + (c.vi || "");
      if (!rx.test(topic)) return;
      var k = String(c.w || "").toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = true; out.push(c);
    });
    return out;
  }
  function pickRegionWords(regionId, n, used) {
    used = used || {};
    var pool = G71.shuffle(regionPool(regionId).slice());
    var words = [];
    pool.forEach(function (p) {
      if (words.length >= n) return;
      if (!G71.isTypeable(p)) return;
      if (!used[String(p.w)]) { used[String(p.w)] = 1; words.push(p); }
    });
    if (words.length < n) {
      /* Kho chủ đề mỏng (vd TOEIC thiên nhiên/cảm xúc): bù từ kho chung
         của track — vẫn là từ thật trong sách, không bịa. */
      var rest = G71.shuffle(G71.pool()).filter(function (p) {
        return G71.isTypeable(p) && !used[String(p.w)];
      });
      while (words.length < n && rest.length) { var p = rest.pop(); used[String(p.w)] = 1; words.push({ w: p.w, vi: p.vi, type: p.type || p.w, py: p.py || "" }); }
    }
    return words;
  }
  function pickBossWord(used, regionId) {
    used = used || {};
    var pool = G71.shuffle(regionPool(regionId || 1).slice()).filter(function (p) {
      return G71.isTypeable(p) && (p.type || p.w).length >= 7 && !used[String(p.w)];
    });
    if (pool.length) { used[String(pool[0].w)] = 1; return pool[0]; }
    /* Kho chủ đề không có từ dài ≥7 (vd TOEIC thiên nhiên): lấy từ dài
       của toàn kho track — vẫn là từ thật trong sách, không bịa. */
    var longAll = G71.shuffle(G71.pool().slice()).filter(function (p) {
      return G71.isTypeable(p) && (p.type || p.w).length >= 7 && !used[String(p.w)];
    });
    if (longAll.length) { used[String(longAll[0].w)] = 1; return longAll[0]; }
    var rest = pickRegionWords(regionId || 1, 1, used);
    if (rest[0]) return rest[0];
    var all = G71.pool();
    return all.length ? all[0] : { w: "mountain", vi: "núi", type: "mountain" };
  }
  /* Ghi chú kho mỏng hiển thị trên bản đồ vùng (v98): kho chủ đề nào
     dưới 42 từ gõ được (nhu cầu tối đa một ải: 13+14+15) thì ghi rõ,
     không giấu — người học biết vùng đó lấy thêm từ kho chung. */
  function regionPoolNote(regionId) {
    var tk = "en";
    try { tk = (typeof G71 !== "undefined" && G71.trackKey) ? G71.trackKey() : "en"; } catch (e) {}
    var n = regionPool(regionId).filter(function (c) { return G71.isTypeable(c); }).length;
    if (n >= 42) return "";
    var trackName = { en: "IELTS", zh: "HSK", tc: "TOEIC", tp: "TOPIK" }[tk] || tk;
    return "Kho từ " + trackName + " theo chủ đề này còn ít (" + n + " từ gõ được) — vùng này ưu tiên từ theo chủ đề, thiếu thì lấy thêm từ kho chung của track, vẫn là từ thật trong sách.";
  }

  /* ---- Tiến trình 5 vùng, lưu trong state.rongLua (sống qua lần chơi) ----
     Dạng mới v98: { gold, shield, dict, region, progress: { "1": { unlocked,
     cleared: {} }, ... }, endless, endlessBest }. Vàng dùng chung với Đấu
     Bài (g71_dau_bai.js đọc state.rongLua.gold) nên gold giữ ở cấp cao
     nhất. Dạng cũ v78–v97 { unlocked, cleared } của vùng 1 được migration
     giữ nguyên vào progress["1"]. Vùng sau mở khi qua trùm vùng trước
     HOẶC đủ XP web (100/300/600/1000) — loadRL tự suy ra cả hai đường,
     để không bao giờ kẹt dù lưu cũ thiếu. ---- */
  function freshRL() {
    return { gold: 0, shield: 0, dict: {}, region: 1,
      progress: { "1": { unlocked: 1, cleared: {} } }, endless: false, endlessBest: 0 };
  }
  function webXp() {
    try { return (typeof state !== "undefined" && state && state.xp) || 0; } catch (e) { return 0; }
  }
  function loadRL() {
    var d = freshRL();
    try {
      if (typeof state !== "undefined" && state && state.rongLua) {
        var s = state.rongLua;
        if (typeof s.gold === "number") d.gold = s.gold;
        if (typeof s.shield === "number") d.shield = s.shield;
        if (s.dict) d.dict = s.dict;
        if (typeof s.endless === "boolean") d.endless = s.endless;
        if (typeof s.endlessBest === "number") d.endlessBest = s.endlessBest;
        if (s.progress) {
          Object.keys(s.progress).forEach(function (rk) {
            var p = s.progress[rk] || {};
            d.progress[rk] = {
              unlocked: Math.max(1, Math.min(10, (typeof p.unlocked === "number" ? p.unlocked : 1))),
              cleared: p.cleared || {}
            };
          });
          if (typeof s.region === "number") d.region = Math.max(1, Math.min(5, s.region));
        } else if (typeof s.unlocked === "number" || s.cleared) {
          /* Dạng cũ v78–v97: unlocked/cleared là của vùng 1. */
          d.progress["1"] = {
            unlocked: Math.max(1, Math.min(10, s.unlocked || 1)), cleared: {}
          };
          if (s.cleared) Object.keys(s.cleared).forEach(function (k) { d.progress["1"].cleared[k] = true; });
          d.region = 1;
        }
      }
    } catch (e) {}
    /* Suy ra vùng mở cao nhất: qua trùm vùng trước, hoặc đủ XP web. */
    for (var r = 1; r <= 4; r++) {
      var pr = d.progress[String(r)];
      if (pr && pr.cleared && pr.cleared["10"]) d.region = Math.max(d.region, r + 1);
    }
    var xp = webXp();
    for (var r2 = 2; r2 <= 5; r2++) if (xp >= XP_NEED[r2 - 1]) d.region = Math.max(d.region, r2);
    if (d.progress["5"] && d.progress["5"].cleared && d.progress["5"].cleared["10"]) d.endless = true;
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
  function regionProg(rl, region) {
    var k = String(region);
    if (!rl.progress[k]) rl.progress[k] = { unlocked: 1, cleared: {} };
    return rl.progress[k];
  }
  function regionOpen(rl, region) {
    if (region <= 1) return true;
    if (rl && rl.region >= region) return true;
    return webXp() >= xpNeedFor(region);
  }
  function stageOpen(rl, region, stage) {
    return regionOpen(rl, region) && stage <= regionProg(rl, region).unlocked;
  }
  function stageCleared(rl, region, stage) {
    var p = rl.progress[String(region)];
    return !!(p && p.cleared && p.cleared[String(stage)]);
  }

  /* ---- Logic thuần của trận đánh ---- */
  function damageFor(wordLen, wordLvl, match, combo, weatherMult) {
    var base = match ? 2 : 1;
    var lenBonus = wordLen >= 7 ? 1 : 0;
    var mult = Math.min(3, 1 + combo);
    /* weatherMult: hệ số thời tiết vùng (1 = không tăng, 1,5 = đúng hệ
       thời tiết). Làm tròn để sát thương luôn là số nguyên như trước. */
    return Math.round((base + lenBonus + (wordLvl - 1)) * mult * (weatherMult || 1));
  }
  var LOGIC = {
    elements: ELEMENTS,
    nextEl: nextEl,
    damageFor: damageFor,
    weatherFor: weatherFor,
    weatherMult: weatherMult,
    wordGroups: wordGroups,
    phraseFor: phraseFor,
    phraseSpaced: phraseSpaced,
    companionDmgBonus: companionDmgBonus,
    companionHeal: companionHeal,
    layoutPills: layoutPills,
    pickNatureWords: pickNatureWords,
    pickRegionWords: pickRegionWords,
    pickBossWord: pickBossWord,
    naturePool: naturePool,
    regionPool: regionPool,
    regionPoolNote: regionPoolNote,
    regions: REGIONS,
    xpNeedFor: xpNeedFor,
    regionOpen: regionOpen,
    battleSize: function (level, battle) { return 2 + level + battle; },
    /* HP quái tăng theo vùng: 3 + (ải−1) + (vùng−1)×2 (vùng 1 giữ nguyên). */
    monsterHp: function (level, region) { return 3 + (level - 1) + ((region || 1) - 1) * 2; },
    /* HP trùm theo vùng: 30 + (vùng−1)×10 (vùng 1 giữ nguyên 30). */
    bossHp: function (region) { return 30 + ((region || 1) - 1) * 10; },
    createBattle: function (words, opts) {
      opts = opts || {};
      var level = opts.level || 1, isBoss = !!opts.boss, region = opts.region || 1;
      /* Nhẹ nhàng cho người mới: ải 1 vùng 1 (3 trận) — quái di chuyển
         chậm một nửa và không bắn trong 30 giây đầu mỗi trận. Vùng khác
         ải 1 không nhẹ (người chơi tới đó đã qua nhiều ải). Chỉ tính
         nhẹ khi vùng được truyền rõ ràng là 1 — trận gọi không kèm vùng
         (vd test v83) giữ luật cũ: quái bắn bình thường. */
      var gentle = (opts.gentle !== undefined) ? !!opts.gentle : (opts.region === 1 && level === 1);
      var ws = words.map(function (wd, i) {
        var boss = isBoss && i === 0;
        var bhp = LOGIC.bossHp(region), mhp = LOGIC.monsterHp(level, region);
        /* Điểm yếu theo nhóm từ: trùm sợ một nhóm theo chủ đề (từ trùm
           luôn dài nên không sợ nhóm "từ dài"), quái thường sợ ngẫu nhiên
           một trong 5 nhóm. Nhóm của từ tính từ dữ liệu thật của từ. */
        var themeGroups = ["nature", "emotion", "daily", "work"];
        var gWeak = boss ? themeGroups[Math.floor(Math.random() * themeGroups.length)]
          : GROUP_KEYS[Math.floor(Math.random() * GROUP_KEYS.length)];
        return {
          w: wd.w, vi: wd.vi, type: wd.type || wd.w, isBoss: boss,
          weak: EL_ORDER[Math.floor(Math.random() * 3)],
          groupWeak: gWeak,
          groups: wordGroups({ w: wd.w, vi: wd.vi, theme: wd.theme || "",
            type: wd.headType || wd.type || wd.w }),
          phrase: wd.phrase || null, isPhrase: !!wd.phrase, partIdx: 0,
          hp: boss ? bhp : mhp, maxHp: boss ? bhp : mhp,
          phase: 0, progress: 0, status: "advancing",
          x: 0.15 + Math.random() * 0.7,
          y: -0.15 - i * 0.18,
          speed: boss ? 0.025 + 0.002 * (region - 1) : 0.055 + 0.005 * level + 0.003 * (region - 1),
          gold: boss ? BOSS_GOLD : MONSTER_GOLD,
          /* Đạn của quái (v83): phát đầu sau ~2-3 giây, sau đó mỗi
             ~2-3 giây một phát (trùm nhanh hơn). */
          fireIn: boss ? 1.4 + Math.random() * 0.8 : 2.2 + Math.random() * 1.3
        };
      });
      return {
        level: level, battle: opts.battle || 1, isBoss: isBoss, region: region,
        words: ws, total: ws.length, resolved: 0, active: null,
        hearts: (typeof opts.hearts === "number") ? opts.hearts : 5,
        shield: (typeof opts.shield === "number") ? opts.shield : 0,
        element: opts.element || "fire",
        score: 0, goldEarned: 0, combo: 0, over: null,
        graceUntil: 0, events: [], collected: [],
        gentle: gentle, elapsed: 0,
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
    typeLetter: function (st, ch, now, element, wordLvl, companions) {
      if (st.over) return { ok: false };
      ch = String(ch || "").toLowerCase();
      if (!ch || ch.length !== 1) return { ok: false };
      if (now < st.graceUntil) return { ok: false, grace: true };
      /* Dấu cách: chỉ có nghĩa với quái cụm từ (gõ liền các từ trong cụm,
         dấu cách được bỏ qua, không mất combo); quái thường gõ cách là gõ sai. */
      if (ch === " ") {
        var actM = (st.active !== null && st.words[st.active]) ? st.words[st.active] : null;
        if (actM && actM.isPhrase && actM.status === "advancing") return { ok: true, ignored: true };
        st.combo = 0;
        return { ok: false, wrong: true };
      }
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
      /* Sát thương một chiêu: đúng hệ ×2 nền, từ dài +1, cấp từ, combo
         tới ×3, thời tiết vùng ×1,5 khi đúng hệ thời tiết, đúng nhóm từ
         quái sợ ×2, bạn đồng hành +1. */
      function spellDmg(partLen, el, lvl, groupHit, comboPart) {
        var wMult = weatherMult(el, st.region);
        var base = damageFor(partLen, lvl, (el === w.weak), st.combo, wMult);
        var d = base * (groupHit ? 2 : 1) * (comboPart ? 3 : 1) + companionDmgBonus(el, companions);
        return { dmg: d, weatherBoost: wMult > 1 };
      }
      function wordLvlOf() {
        var lvl = 1;
        if (typeof wordLvl === "function") { try { lvl = wordLvl(w.w) || 1; } catch (e) { lvl = 1; } }
        else if (typeof wordLvl === "number") lvl = wordLvl;
        return lvl;
      }
      function groupHitOf() {
        return !!(w.groupWeak && (w.groups || []).indexOf(w.groupWeak) >= 0);
      }
      /* Quái cụm từ: mỗi từ trong cụm xong là một chiêu; từ cuối cụm là
         chiêu combo ×3. Gõ sai chỉ gõ lại, không mất lượt. */
      if (w.isPhrase && w.phrase && w.phrase.parts && w.phrase.parts.length) {
        var cumLen = 0, partIdx = 0, partEnd = 0;
        for (var pi = 0; pi < w.phrase.parts.length; pi++) {
          cumLen += w.phrase.parts[pi].type.length;
          if (w.progress <= cumLen) { partIdx = pi; partEnd = cumLen; break; }
        }
        if (w.progress < partEnd) return { ok: true };
        var elP = element || st.element;
        var isLast = partIdx === w.phrase.parts.length - 1;
        var gHitP = groupHitOf();
        var sdP = spellDmg(w.phrase.parts[partIdx].type.length, elP, wordLvlOf(), gHitP, isLast);
        w.hp -= sdP.dmg;
        st.score += sdP.dmg;
        w.partIdx = partIdx + 1;
        var killedP = false, goldP = 0;
        if (w.hp <= 0) {
          w.status = "done"; w.hp = 0; st.resolved++;
          killedP = true; goldP = w.gold; st.goldEarned += goldP;
          st.collected.push({ w: w.w, vi: w.vi, el: elP, lvl: wordLvlOf() });
          st.active = null;
        } else if (isLast) {
          /* Hết cụm mà quái chưa chết: gõ lại cụm từ đầu. */
          w.progress = 0; w.partIdx = 0;
        }
        st.combo++;
        if (st.resolved >= st.total) st.over = "win";
        return { ok: true, completed: true, part: true, comboPart: isLast, dmg: sdP.dmg,
          match: (elP === w.weak), killed: killedP, gold: goldP, monster: w,
          weatherBoost: sdP.weatherBoost, groupHit: gHitP,
          compBonus: companionDmgBonus(elP, companions), bossPhase: null };
      }
      if (w.progress < tgt.length) return { ok: true };
      /* Gõ xong một từ = tung một chiêu lên quái đang khóa. */
      var el = element || st.element;
      var match = (el === w.weak);
      var lvl = wordLvlOf();
      var gHit = groupHitOf();
      var sd = spellDmg((w.type || w.w).length, el, lvl, gHit, false);
      var dmg = sd.dmg;
      w.hp -= dmg;
      st.score += dmg;
      /* Trùm đổi hệ sau mỗi 1/3 máu (vùng 1 HP 30: ở 20 rồi 10). Sửa v99:
         hai mốc kiểm tra riêng (không else-if) và kiểm tra cả khi đòn này
         kết liễu trùm — đòn mạnh vượt hai mốc vẫn ghi đủ 2 lần đổi hệ,
         đúng luật "đổi hệ sau mỗi 1/3 máu" (trước đây đòn kết liễu làm
         mất mốc thứ hai khi sát thương thời tiết tăng). */
      var phaseEvent = null;
      if (w.isBoss) {
        if (w.phase === 0 && w.hp <= w.maxHp * 2 / 3) {
          w.phase = 1; w.weak = nextEl(w.weak);
          phaseEvent = { type: "bossPhase", weak: w.weak, phase: 1 };
          st.events.push(phaseEvent);
        }
        if (w.phase === 1 && w.hp <= w.maxHp / 3) {
          w.phase = 2; w.weak = nextEl(w.weak);
          phaseEvent = { type: "bossPhase", weak: w.weak, phase: 2 };
          st.events.push(phaseEvent);
        }
      }
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
      if (st.resolved >= st.total) st.over = "win";
      return { ok: true, completed: true, dmg: dmg, match: match, killed: killed,
        gold: gold, monster: w, bossPhase: phaseEvent,
        weatherBoost: sd.weatherBoost, groupHit: gHit,
        compBonus: companionDmgBonus(el, companions) };
    },
    tick: function (st, dt, now) {
      if (st.over) return;
      st.elapsed = (st.elapsed || 0) + dt;
      /* Nhẹ nhàng ải 1 vùng 1: 30 giây đầu mỗi trận, quái đi chậm một nửa
         và không bắn — người mới có thời gian đọc thẻ + khóa quái. */
      var gentle = !!(st.gentle && st.elapsed < 30);
      st.words.forEach(function (wd) {
        if (wd.status !== "advancing") return;
        wd.y += wd.speed * (gentle ? 0.5 : 1) * dt;
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
           điểm tựa; quái ở sát mép trên chưa bắn). Nhẹ nhàng ải 1:
           30 giây đầu không bắn. */
        if (!gentle && wd.y > 0.05 && wd.y < 0.65) {
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
  /* ---- Nền 4 vùng mới (v98): vẽ bằng code, CÙNG hệ nghệ thuật với vùng 1
     (bảng màu C chàm + hổ phách + teal, bo 20px, sáng trên-trái, bóng đổ,
     lớp xa mờ nhạt — gần rõ nét). Vùng 1 giữ ảnh Canva + paintForest. ---- */
  function paintVillage(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.ink950); g.addColorStop(0.55, C.ink900); g.addColorStop(1, C.ink800);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Trăng + quầng teal chân trời. */
    ctx.fillStyle = C.amber100;
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.12, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(13,148,136,.16)";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.6, W * 0.6, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    /* Nhà gỗ xa (mờ, chàm). */
    ctx.fillStyle = C.ink800; ctx.globalAlpha = 0.85;
    for (var i = 0; i < 6; i++) {
      var hx = (0.03 + i * 0.17) * W, hw = W * 0.11, hh = H * (0.1 + (i % 3) * 0.03);
      ctx.fillRect(hx, H * 0.6 - hh, hw, hh);
      ctx.beginPath(); ctx.moveTo(hx - 4, H * 0.6 - hh); ctx.lineTo(hx + hw / 2, H * 0.6 - hh - H * 0.04);
      ctx.lineTo(hx + hw + 4, H * 0.6 - hh); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* Đèn hổ phách trong cửa sổ nhà xa. */
    ctx.fillStyle = C.amber400;
    for (var wnd = 0; wnd < 6; wnd++) {
      ctx.globalAlpha = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(t / 700 + wnd * 1.9));
      ctx.fillRect((0.06 + wnd * 0.17) * W, H * 0.56, 6, 8);
    }
    ctx.globalAlpha = 1;
    /* Biển teal dưới, sóng trôi. */
    ctx.fillStyle = C.ink700;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
    ctx.fillStyle = "rgba(13,148,136,.35)";
    for (var s = 0; s < 3; s++) {
      var sx = ((t / 6000 + s * 0.4) % 1.2 - 0.1) * W;
      ctx.beginPath(); ctx.ellipse(sx, H * (0.74 + s * 0.07), W * 0.22, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    /* Thuyền buồm nhỏ trôi. */
    var bx = ((t / 22000) % 1.2 - 0.1) * W;
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.moveTo(bx, H * 0.72); ctx.lineTo(bx + 34, H * 0.72); ctx.lineTo(bx + 17, H * 0.76); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.amber100;
    ctx.beginPath(); ctx.moveTo(bx + 17, H * 0.72); ctx.lineTo(bx + 17, H * 0.66); ctx.lineTo(bx + 30, H * 0.72); ctx.closePath(); ctx.fill();
    /* Đèn lồng hổ phách bay. */
    for (var f = 0; f < 8; f++) {
      var fx = (f * 131 + Math.sin(t / 1500 + f * 2.3) * 12) % W;
      var fy = H * (0.18 + ((f * 41) % 40) / 100) + Math.cos(t / 1200 + f) * 5;
      ctx.globalAlpha = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t / 600 + f * 1.7));
      ctx.fillStyle = C.amber400;
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* Bụi cây tiền cảnh hai bên đáy làm khung. */
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.94, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  function paintCity(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.ink950); g.addColorStop(0.6, C.ink900); g.addColorStop(1, C.ink800);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Sao + trăng. */
    ctx.fillStyle = C.amber100;
    for (var st = 0; st < 16; st++) {
      ctx.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t / 800 + st * 2.7));
      ctx.beginPath(); ctx.arc((st * 173) % W, H * (0.05 + ((st * 37) % 20) / 100), 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.1, 20, 0, Math.PI * 2); ctx.fill();
    /* Quầng hổ phách chân trời. */
    ctx.fillStyle = "rgba(245,158,11,.12)";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.66, W * 0.62, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    /* Tòa nhà xa (mờ). */
    ctx.fillStyle = C.ink800; ctx.globalAlpha = 0.8;
    for (var i = 0; i < 8; i++) {
      var bx2 = (0.02 + i * 0.125) * W, bw = W * 0.09, bh = H * (0.22 + ((i * 53) % 18) / 100);
      ctx.fillRect(bx2, H * 0.66 - bh, bw, bh);
    }
    ctx.globalAlpha = 1;
    /* Tòa nhà gần + cửa sổ hổ phách sáng. */
    ctx.fillStyle = C.ink700;
    for (var j = 0; j < 5; j++) {
      var cx = (0.06 + j * 0.19) * W, cw = W * 0.13, ch = H * (0.3 + ((j * 71) % 16) / 100);
      ctx.fillRect(cx, H * 0.72 - ch, cw, ch);
      ctx.fillStyle = C.amber400;
      for (var wy = 0; wy < 3; wy++) for (var wx = 0; wx < 2; wx++) {
        if (((j * 7 + wy * 3 + wx) % 3) === 0) continue;
        ctx.globalAlpha = 0.65;
        ctx.fillRect(cx + cw * (0.2 + wx * 0.45), H * 0.72 - ch + ch * (0.2 + wy * 0.28), 5, 7);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = C.ink700;
    }
    /* Đường phố dưới. */
    ctx.fillStyle = C.ink900;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = C.amber400; ctx.globalAlpha = 0.7;
    ctx.fillRect(W * 0.1, H * 0.86, W * 0.8, 3);
    ctx.globalAlpha = 1;
    /* Bụi cây tiền cảnh hai bên đáy làm khung. */
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.94, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  function paintCrystal(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.ink950); g.addColorStop(0.55, C.ink900); g.addColorStop(1, C.ink800);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Quầng teal giữa hang. */
    ctx.fillStyle = "rgba(13,148,136,.18)";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.55, W * 0.5, H * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    /* Tinh thể xa (nhạt, chàm). */
    ctx.fillStyle = C.ink700;
    for (var i = 0; i < 7; i++) {
      var cx2 = (0.04 + i * 0.15) * W, cw2 = W * (0.05 + (i % 3) * 0.012), ch2 = H * (0.16 + ((i * 47) % 14) / 100);
      ctx.beginPath(); ctx.moveTo(cx2, H * 0.62); ctx.lineTo(cx2 + cw2 / 2, H * 0.62 - ch2);
      ctx.lineTo(cx2 + cw2, H * 0.62); ctx.closePath(); ctx.fill();
    }
    /* Tinh thể gần: chàm nhạt + cạnh sáng trên-trái. */
    for (var j = 0; j < 5; j++) {
      var dx = (0.08 + j * 0.19) * W, dw = W * (0.07 + (j % 2) * 0.02), dh = H * (0.24 + ((j * 61) % 18) / 100);
      ctx.fillStyle = C.ink300;
      ctx.beginPath(); ctx.moveTo(dx, H * 0.78); ctx.lineTo(dx + dw / 2, H * 0.78 - dh);
      ctx.lineTo(dx + dw, H * 0.78); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx + dw * 0.12, H * 0.78 - dh * 0.1);
      ctx.lineTo(dx + dw / 2, H * 0.78 - dh); ctx.stroke();
    }
    /* Nền hang dưới. */
    ctx.fillStyle = C.ink900;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    /* Điểm sáng lấp lánh. */
    for (var f2 = 0; f2 < 14; f2++) {
      var fx2 = (f2 * 101 + Math.sin(t / 1300 + f2 * 2.2) * 10) % W;
      var fy2 = H * (0.15 + ((f2 * 59) % 55) / 100) + Math.cos(t / 1000 + f2) * 5;
      ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t / 550 + f2 * 1.9));
      ctx.fillStyle = C.amber400;
      ctx.beginPath(); ctx.arc(fx2, fy2, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* Bụi cây tiền cảnh hai bên đáy làm khung. */
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.94, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  function paintVolcano(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.ink950); g.addColorStop(0.55, C.ink900); g.addColorStop(1, C.ink800);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Khói hổ phách trên miệng núi. */
    ctx.fillStyle = "rgba(245,158,11,.14)";
    for (var s = 0; s < 3; s++) {
      var sx2 = W * 0.5 + Math.sin(t / 2000 + s * 2.1) * 30;
      ctx.beginPath(); ctx.ellipse(sx2, H * (0.2 + s * 0.05), W * (0.16 + s * 0.05), H * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    }
    /* Núi lửa: chàm đậm, miệng sáng dung nham. */
    ctx.fillStyle = C.ink800;
    ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.78); ctx.lineTo(W * 0.5, H * 0.22);
    ctx.lineTo(W * 0.9, H * 0.78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.amber500;
    ctx.beginPath(); ctx.moveTo(W * 0.44, H * 0.3); ctx.lineTo(W * 0.5, H * 0.22);
    ctx.lineTo(W * 0.56, H * 0.3); ctx.lineTo(W * 0.52, H * 0.34); ctx.lineTo(W * 0.48, H * 0.34);
    ctx.closePath(); ctx.fill();
    /* Dòng dung nham chảy xuống sườn. */
    ctx.strokeStyle = C.amber500; ctx.lineWidth = 5; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.32);
    ctx.quadraticCurveTo(W * 0.56, H * 0.5, W * 0.6, H * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.47, H * 0.34);
    ctx.quadraticCurveTo(W * 0.42, H * 0.55, W * 0.38, H * 0.78); ctx.stroke();
    ctx.globalAlpha = 1;
    /* Hồ dung nham dưới chân núi. */
    ctx.fillStyle = C.ink900;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = "rgba(245,158,11,.5)";
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.8, W * 0.34, H * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    /* Tàn lửa hổ phách bay lên. */
    for (var f3 = 0; f3 < 16; f3++) {
      var fx3 = (f3 * 89 + Math.sin(t / 1200 + f3 * 2.4) * 16) % W;
      var fy3 = H * (0.85 - ((t / 9000 + f3 * 0.07) % 0.7));
      ctx.globalAlpha = 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(t / 500 + f3 * 1.8));
      ctx.fillStyle = (f3 % 3 === 0) ? C.amber400 : C.amber500;
      ctx.beginPath(); ctx.arc(fx3, fy3, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* Bụi cây tiền cảnh hai bên đáy làm khung. */
    ctx.fillStyle = C.ink950;
    ctx.beginPath(); ctx.ellipse(W * 0.06, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.94, H + 6, W * 0.2, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  /* Bộ chọn nền theo vùng: 1 = rừng (ảnh Canva nếu có), 2–5 = vẽ code. */
  function paintRegion(ctx, W, H, t, region) {
    if (region === 2) return paintVillage(ctx, W, H, t);
    if (region === 3) return paintCity(ctx, W, H, t);
    if (region === 4) return paintCrystal(ctx, W, H, t);
    if (region === 5) return paintVolcano(ctx, W, H, t);
    return paintForest(ctx, W, H, t);
  }
  /* Hiệu ứng thời tiết theo vùng (v99): lớp phủ nhẹ cùng hệ nghệ thuật
     (chàm + hổ phách + teal/trắng, alpha thấp) — mưa, nắng, giông, tuyết,
     nóng bức. Vẽ sau nền vùng, trước quái. */
  function paintWeather(ctx, W, H, t, region) {
    var w = weatherFor(region);
    if (!w) return;
    ctx.save();
    if (w.key === "rain") {
      /* Mưa phùn: vệt chéo nhạt rơi. */
      ctx.strokeStyle = "rgba(165,180,252,.5)"; ctx.lineWidth = 1.5;
      for (var i = 0; i < 26; i++) {
        var rx = (((i * 97 + t / 22) % (W + 60)) + W + 60) % (W + 60) - 30;
        var ry = (((i * 173 + t / 14) % (H + 40)) + H + 40) % (H + 40) - 20;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 14); ctx.stroke();
      }
    } else if (w.key === "sun") {
      /* Nắng vàng: tia sáng từ góc trên-trái + mặt trời nhỏ. */
      ctx.strokeStyle = "rgba(251,191,36,.28)"; ctx.lineWidth = 5;
      for (var j = 0; j < 7; j++) {
        var ang = -0.5 + j * 0.22;
        ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.06);
        ctx.lineTo(W * 0.08 + Math.cos(ang) * W * 0.5, H * 0.06 + Math.sin(ang) * H * 0.6); ctx.stroke();
      }
      ctx.fillStyle = "rgba(251,191,36,.5)";
      ctx.beginPath(); ctx.arc(W * 0.08, H * 0.06, 26, 0, Math.PI * 2); ctx.fill();
    } else if (w.key === "storm") {
      /* Giông: chớp sáng cả sân theo chu kỳ + một tia sét răng cưa. */
      var cyc = (t % 4000) / 4000;
      if (cyc < 0.06) {
        ctx.fillStyle = "rgba(255,255,255," + (0.12 * (1 - cyc / 0.06)).toFixed(3) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.strokeStyle = "rgba(253,230,138,.85)"; ctx.lineWidth = 3;
      var bx = W * (0.3 + 0.4 * Math.sin(t / 5000));
      ctx.beginPath(); ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 18, H * 0.2); ctx.lineTo(bx - 8, H * 0.38); ctx.lineTo(bx + 14, H * 0.55); ctx.stroke();
    } else if (w.key === "snow") {
      /* Tuyết rơi: chấm trắng trôi chậm. */
      ctx.fillStyle = "rgba(255,255,255,.75)";
      for (var s = 0; s < 30; s++) {
        var sx = (((s * 113 + Math.sin(t / 1600 + s) * 10) % W) + W) % W;
        var sy = (((s * 67 + t / 30) % H) + H) % H;
        ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (w.key === "heat") {
      /* Nóng bức: tàn lửa hổ phách bay lên. */
      for (var e = 0; e < 16; e++) {
        var ex = (((e * 89 + Math.sin(t / 1200 + e * 2.4) * 16) % W) + W) % W;
        var ey = H * (0.85 - ((((t / 9000 + e * 0.07) % 0.7) + 0.7) % 0.7));
        ctx.globalAlpha = 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(t / 500 + e * 1.8));
        ctx.fillStyle = (e % 3 === 0) ? C.amber400 : C.amber500;
        ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
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
  /* ---- Bố cục thẻ từ không chồng nhau (sửa render v98 B1) ----
     Thẻ từ gắn dưới quái; khi quái tụ lại, thẻ sau bị thẻ trước che.
     Xếp thẻ theo thứ tự quái: thẻ nào đụng thẻ đã xếp thì dời xuống
     (hoặc lên nếu chạm đáy sân) một khoảng bằng chiều cao thẻ + 8px.
     Kết quả ghi vào m._pillX/_pillDy để drawMonster vẽ đúng chỗ + nối
     một đường mảnh từ quái tới thẻ đã dời. */
  function layoutPills(ctx, monsters, W, H) {
    if (!ctx || !monsters) return;
    var placed = [];
    monsters.forEach(function (m) {
      if (!m || m.status !== "advancing") return;
      var px = m.x * W, py = Math.max(m.y * H, 64);
      var s = m.isBoss ? 34 : 24;
      var mType = m.type || m.w;
      var pillH = (mType !== m.w) ? 54 : 34;
      var disp = (m.isPhrase && m.phrase) ? m.phrase.display : m.w;
      var typeSp = (m.isPhrase && m.phrase) ? phraseSpaced(m.phrase) : mType;
      var tw;
      try {
        ctx.font = "700 17px system-ui, sans-serif";
        tw = Math.max(ctx.measureText(disp).width, ctx.measureText(typeSp).width) + 30;
      } catch (e) { tw = Math.max(String(disp).length, String(typeSp).length) * 10 + 30; }
      var pillX = Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, px));
      var pillY = py + s * 1.05;
      var step = pillH + 8, dy = 0, found = false;
      var tries = [0, step, -step, step * 2, -step * 2];
      for (var ti = 0; ti < tries.length; ti++) {
        var cand = tries[ti];
        var top = pillY + cand - pillH / 2, bottom = pillY + cand + pillH / 2;
        if (top < 4 || bottom > H - 4) continue;
        var clash = false;
        for (var i = 0; i < placed.length; i++) {
          var p = placed[i];
          if (Math.abs(pillX - p.x) < (tw + p.tw) / 2 + 8 && top < p.bottom + 4 && bottom > p.top - 4) { clash = true; break; }
        }
        if (!clash) { dy = cand; found = true; break; }
      }
      if (!found) dy = 0;
      m._pillX = pillX; m._pillDy = dy; m._pillTw = tw; m._pillH = pillH;
      placed.push({ x: pillX, top: pillY + dy - pillH / 2, bottom: pillY + dy + pillH / 2, tw: tw });
    });
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
    /* Nhãn điểm yếu theo nhóm từ (v99): hiện trên thanh máu để người chơi
       biết nên khóa quái nào — từ quái mang thuộc nhóm này thì chiêu ×2.
       Ẩn khi quái còn ở sát mép trên (không đủ chỗ). */
    if (m.groupWeak && GROUP_WEAK[m.groupWeak] && py - s * 1.35 - 24 > 0) {
      var gw = GROUP_WEAK[m.groupWeak].hint;
      ctx.font = "700 11px system-ui, sans-serif";
      var gwW = ctx.measureText(gw).width + 14;
      var gwX = Math.max(gwW / 2 + 4, Math.min(W - gwW / 2 - 4, px));
      var gwY = py - s * 1.35 - 12;
      ctx.fillStyle = "rgba(4,6,15,.72)";
      G71.rr(ctx, gwX - gwW / 2, gwY - 9, gwW, 18, 9); ctx.fill();
      ctx.fillStyle = C.amber100;
      ctx.fillText(gw, gwX - ctx.measureText(gw).width / 2, gwY + 4);
    }
    /* Viên từ gắn dưới quái. v91: tieng Trung hien 2 dong — chu Han o
       tren, pinyin (chuoi go) o duoi co to mau tien trinh. v99: quái cụm
       từ hiện cụm ở trên, chuỗi gõ có dấu cách ở dưới với tiến trình
       theo từng từ; thẻ từ được layoutPills dời khi quái tụ lại. */
    var mType = m.type || m.w;
    var mTwo = mType !== m.w;
    var isPh = !!(m.isPhrase && m.phrase);
    var dispTop = isPh ? m.phrase.display : m.w;
    var dispBot = isPh ? phraseSpaced(m.phrase) : mType;
    ctx.font = "700 17px system-ui, sans-serif";
    var mWide = (ctx.measureText(dispTop).width >= ctx.measureText(dispBot).width) ? dispTop : dispBot;
    G71.fitFont(ctx, mWide, Math.max(70, W - 32), 17, 12, "700");
    var tw = Math.max(ctx.measureText(dispTop).width, ctx.measureText(dispBot).width) + 30;
    var pillY = py + s * 1.05 + (m._pillDy || 0);
    var pillX = (typeof m._pillX === "number") ? m._pillX : Math.max(tw / 2 + 8, Math.min(W - tw / 2 - 8, px));
    var pillH = (isPh || mTwo) ? 54 : 34, pillTop = pillY - ((isPh || mTwo) ? 28 : 17);
    if (m._pillDy) {
      /* Đường nối mảnh từ quái tới thẻ đã dời. */
      ctx.strokeStyle = "rgba(245,158,11,.65)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py + s * 0.9); ctx.lineTo(pillX, pillTop); ctx.stroke();
    }
    if (locked) {
      ctx.fillStyle = "rgba(245,158,11,.35)";
      G71.rr(ctx, pillX - tw / 2 - 4, pillTop - 2, tw + 8, pillH + 4, 20); ctx.fill();
    }
    ctx.fillStyle = C.ink800;
    G71.rr(ctx, pillX - tw / 2, pillTop, tw, pillH, 17); ctx.fill();
    ctx.strokeStyle = locked ? C.amber500 : C.ink200;
    ctx.lineWidth = 2; ctx.stroke();
    if (isPh) {
      /* Cụm từ: dòng trên là cụm (chữ Hán/Hangul/cụm tiếng Anh), dòng
         dưới là chuỗi gõ có dấu cách, tô tiến trình theo từng từ. */
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(dispTop, pillX - ctx.measureText(dispTop).width / 2, pillY - 6);
      ctx.font = "700 13px system-ui, sans-serif";
      var x0 = pillX - ctx.measureText(dispBot).width / 2;
      var off = 0;
      m.phrase.parts.forEach(function (pt, pi) {
        var plen = pt.type.length;
        var dn = Math.max(0, Math.min(plen, m.progress - off));
        var donePart = pt.type.slice(0, dn), restPart = pt.type.slice(dn);
        ctx.fillStyle = C.amber100;
        ctx.fillText(donePart, x0, pillY + 14);
        x0 += ctx.measureText(donePart).width;
        ctx.fillStyle = "#fff";
        ctx.fillText(restPart, x0, pillY + 14);
        x0 += ctx.measureText(restPart).width;
        if (pi < m.phrase.parts.length - 1) {
          ctx.fillStyle = "#fff";
          ctx.fillText(" ", x0, pillY + 14);
          x0 += ctx.measureText(" ").width;
        }
        off += plen;
      });
    } else if (mTwo) {
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
  var RL = null;      /* tiến trình 5 vùng (state.rongLua) */
  var run = null;     /* lượt chạy ải hiện tại {region, level, battle, hearts, shield, used} */
  var curRegion = 1;  /* vùng đang xem trên bản đồ */
  var stage = null;   /* G71.openStage api */
  var mode = "map";   /* map | battle | shop | dict | over */
  var battle = null;  /* LOGIC battle state */
  var curElement = "fire";
  var bolts = [], parts = [], floats = [];
  var elBar = null, ctrlBar = null, overlayBox = null;
  var last = 0, hudSig = "";
  var moveKeys = { up: false, down: false, left: false, right: false };
  /* Gợi ý mặc định + gợi ý riêng ải 1 (v99 B4): ải 1 nói rõ từng bước
     khóa quái → gõ từ, vì người mới ở v98 gõ mà không khóa nên không
     gây sát thương. */
  var HINT_DEFAULT = "Lái rồng bằng phím mũi tên hoặc kéo trên sân để né đạn của quái; chạm quái để khóa, gõ đúng từ để tung chiêu. Phím 1/2/3 đổi hệ chiêu — đúng hệ khắc quái gây sát thương tối đa. Quái chạm tới rồng hoặc đạn trúng rồng là mất tim; thua ải vẫn giữ cấp, vàng và từ đã thu. 5 vùng × 10 ải, trùm mỗi vùng đổi hệ sau mỗi 1/3 máu — thắng trùm Núi Lửa mở Chế độ Vô Tận.";
  var HINT_STAGE1 = "👉 Bước 1: CHẠM vào quái để khóa nó (quái đã khóa có viền vàng — quái đầu tiên đã khóa sẵn cho bạn). Bước 2: GÕ đúng từ trên thẻ của quái để tung chiêu. Đúng hệ khắc quái gây sát thương tối đa. Quái ải 1 đi chậm và không bắn trong 30 giây đầu — cứ bình tĩnh gõ!";

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
    curRegion = Math.min(RL.region, 5);
    var stg = G71.openStage("🔥 Rồng Lửa — 5 Vùng", HINT_DEFAULT,
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
    var sig = (isTp ? "tp:" : "az:") + (act ? (act.type || act.w) : "") + (act && act.isPhrase ? ":ph" : "") + "|" + (battle ? battle.resolved : 0);
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
    /* Quái cụm từ: thêm phím cách (gõ liền các từ, dấu cách được bỏ qua). */
    if (act && act.isPhrase) {
      var sp = document.createElement("button");
      sp.className = "btn";
      sp.textContent = "␣ cách";
      sp.style.cssText = "padding:6px 12px;min-width:56px;font-size:15px;";
      sp.onclick = function () { feed(" "); };
      ctrlBar.appendChild(sp);
    }
  }

  function buildControls(stg) {
    elBar = document.createElement("div");
    elBar.id = "rlElBar";
    elBar.style.cssText = "display:none;gap:8px;justify-content:center;align-items:center;padding:6px 8px;background:#fff;border-top:2px solid #F3D9A4;flex-wrap:wrap;flex:none;";
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
    var cp = document.createElement("span");
    cp.id = "rlCompanionTag";
    cp.style.cssText = "font-weight:700;";
    elBar.appendChild(cp);
    stg.el.appendChild(elBar);
    ctrlBar = document.createElement("div");
    ctrlBar.id = "g71KbRl";
    /* v99 B5: chừa khoảng an toàn dưới bàn phím (16px) + flex:none để bàn
       phím luôn thấy trọn vẹn, không phải cuộn mới thấy hàng phím. */
    ctrlBar.style.cssText = "display:none;flex-wrap:wrap;gap:4px;justify-content:center;padding:6px 8px 16px;background:#fff;border-top:2px solid #F3D9A4;touch-action:manipulation;flex:none;";
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
    var reg = regionById(curRegion);
    var prog = regionProg(RL, curRegion);
    var html = '<h2 style="margin:4px 0 2px;">🔥 Rồng Lửa — 5 Vùng</h2>'
      + '<p class="mut" style="margin:6px 0 12px;">Vương quốc Ngôn Ngữ bị Bóng Tối Câm Lặng phong ấn, các từ bị đánh cắp. Rồng nhỏ lên đường thu hồi từng từ — bắt đầu từ Rừng Xanh, qua 5 vùng tới Núi Lửa.</p>'
      + '<p style="font-weight:700;margin:6px 0;">' + rlImgTag("coin", 20) + ' Vàng: ' + RL.gold + (RL.shield ? ' &nbsp;·&nbsp; ' + rlImgTag("shield", 20) + ' Khiên: ' + RL.shield : '') + '</p>'
      + '<div class="row" style="flex-wrap:wrap;margin:8px 0 12px;" id="rlRegionTabs">';
    REGIONS.forEach(function (rg) {
      var open = regionOpen(RL, rg.id);
      var label = rg.icon + " " + rg.name + (open ? "" : " 🔒");
      html += '<button class="btn" data-rl-region-tab="' + rg.id + '"'
        + (rg.id === curRegion ? ' style="background:#F59E0B;border-color:#B45309;color:#fff;"' : '')
        + (open ? '' : ' disabled title="Qua trùm vùng trước hoặc đủ ' + xpNeedFor(rg.id) + ' XP để mở"') + '>' + label + '</button>';
    });
    html += '</div>'
      + '<h3 style="margin:8px 0 4px;">' + reg.icon + ' ' + reg.name + ' — Vùng ' + reg.id + ' · chủ đề ' + reg.theme + '</h3>'
      + '<p class="mut" style="margin:4px 0 12px;">' + reg.desc + ' Trùm vùng: <b>' + reg.boss + '</b> (ải 10, đổi hệ sau mỗi 1/3 máu).</p>';
    var wth = weatherFor(curRegion);
    if (wth) html += '<p style="margin:4px 0 12px;font-weight:700;">' + wth.icon + ' Thời tiết vùng: ' + wth.name + ' (' + wth.season + ') — chiêu hệ ' + ELEMENTS[wth.element].name + ' +50%.</p>';
    var note = regionPoolNote(curRegion);
    if (note) html += '<p class="mut" style="margin:4px 0 12px;">⚠️ ' + note + '</p>';
    html += '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:12px 0;">';
    for (var lv = 1; lv <= 10; lv++) {
      var cleared = !!prog.cleared[lv];
      var open = lv <= prog.unlocked;
      var st = cleared ? "✅ Đã qua" : (open ? "▶ Mở" : "🔒 Chưa mở");
      html += '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">Ải ' + lv + " — " + reg.stages[lv - 1] + '</h3>'
        + '<p class="mut" style="margin:4px 0;">3 trận · chủ đề ' + reg.theme + (lv === 10 ? ' · trùm ' + reg.boss : '') + '</p>'
        + '<p style="margin:4px 0;font-weight:700;">' + st + '</p>'
        + (open ? '<div class="row"><button class="btn btn-primary" data-rl-region="' + curRegion + '" data-rl-level="' + lv + '">Chơi ải ' + lv + '</button></div>' : '')
        + '</section>';
    }
    html += '</div>';
    if (RL.endless) {
      html += '<section class="card" style="margin:0 0 12px;"><h3 style="margin:0 0 4px;">♾️ Chế độ Vô Tận</h3>'
        + '<p class="mut" style="margin:4px 0;">Đã thắng trùm Núi Lửa! Quái kéo tới từng đợt, càng về sau càng đông và càng nhanh. Kỷ lục của bạn: <b>' + (RL.endlessBest || 0) + ' đợt</b>.</p>'
        + '<div class="row"><button class="btn btn-primary" id="rlEndlessBtn">Chơi Vô Tận</button></div></section>';
    }
    /* v99: ải giải cứu từ quá hạn SRS + mục bạn đồng hành. */
    var kids = [];
    try { kids = findKidnapped(); } catch (e) {}
    if (kids.length) {
      html += '<section class="card" style="margin:0 0 12px;border:2px solid #B45309;"><h3 style="margin:0 0 4px;">🆘 Giải cứu từ bị bắt cóc — ' + kids.length + ' từ quá hạn</h3>'
        + '<p class="mut" style="margin:4px 0;">Những từ này đã quá hạn ôn theo lịch SRS (1-3-7-14-30) nên bị quái bắt cóc. Thắng ải giải cứu để lấy lại từ — mỗi từ được ôn lại một nấc, không mất dữ liệu ôn tập, không trừ điểm học.</p>'
        + '<div class="row"><button class="btn btn-primary" id="rlRescueBtn">Giải cứu ngay</button></div></section>';
    }
    var comps = [];
    try { comps = unlockedCompanions(RL); } catch (e) {}
    html += '<section class="card" style="margin:0 0 12px;"><h3 style="margin:0 0 4px;">🐾 Bạn đồng hành</h3>'
      + '<p class="mut" style="margin:4px 0;">Mở khóa bằng cách thắng trùm vùng — bạn đồng hành hỗ trợ ngay trong trận.</p>'
      + COMPANIONS.map(function (c) {
          var has = comps.indexOf(c.id) >= 0;
          return '<p style="margin:4px 0;">' + (has ? '✅ ' : '🔒 ') + c.icon + ' <b>' + c.name + '</b> — ' + c.effect + ' <span class="mut">(' + c.unlock + ')</span></p>';
        }).join("") + '</section>';
    html += '<div class="row" style="flex-wrap:wrap;">'
      + '<button class="btn" id="rlDictBtn">📖 Từ Điển Rồng (' + dictCount + ' từ)</button>'
      + '<button class="btn" id="rlBackBtn">← Về khu Trò chơi</button></div>';
    box.innerHTML = html;
    /* v99 B2: overlay nằm trong khung canvas (stage.wrap), không phủ thanh
       tiêu đề — nút "?" hướng dẫn và "✕ Thoát" luôn bấm được. */
    stage.wrap.appendChild(box);
    overlayBox = box;
    box.querySelectorAll("[data-rl-region-tab]").forEach(function (b) {
      b.onclick = function () {
        curRegion = parseInt(b.getAttribute("data-rl-region-tab"), 10);
        showMap();
      };
    });
    box.querySelectorAll("[data-rl-level]").forEach(function (b) {
      b.onclick = function () {
        startLevel(parseInt(b.getAttribute("data-rl-region"), 10),
          parseInt(b.getAttribute("data-rl-level"), 10));
      };
    });
    var eb = box.querySelector("#rlEndlessBtn");
    if (eb) eb.onclick = startEndless;
    var rb = box.querySelector("#rlRescueBtn");
    if (rb) rb.onclick = startRescue;
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
    stage.wrap.appendChild(box);
    overlayBox = box;
    box.querySelector("#rlDictBack").onclick = showMap;
  }

  function startLevel(region, lv) {
    run = { region: region, level: lv, battle: 1, hearts: 5, shield: RL.shield || 0, used: {} };
    startBattle();
  }

  /* Ghép cụm từ/câu cho quái cuối trận (v99 A5): từ ải 2 trở đi, trận 2–3
     có một quái cụm từ — gõ từng từ trong cụm thật (col/ex của thẻ) để
     tung chiêu combo (từ cuối cụm ×3). Trận trùm và ải 1 không có. */
  function applyPhraseMonster(words) {
    if (!words || !words.length) return;
    var lastW = words[words.length - 1];
    if (!lastW || lastW.isBoss) return;
    var pool = null;
    try { pool = G71.pool(); } catch (e) { pool = null; }
    var ph = null;
    try { ph = LOGIC.phraseFor(lastW, pool); } catch (e) { ph = null; }
    if (!ph) return;
    lastW.headType = lastW.type || lastW.w;
    lastW.phrase = ph;
    lastW.type = ph.parts.map(function (p) { return p.type; }).join("");
  }
  /* Mở trận: phần chung của startBattle/startEndlessWave/startRescue. */
  function setupBattle(words, opts) {
    mode = "battle";
    clearOverlays();
    hudSig = "";
    battle = LOGIC.createBattle(words, opts);
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
  /* Tự động khóa quái thấp nhất (gần rồng nhất) khi vào trận — dùng cho
     ải 1 (người mới chưa biết phải chạm quái trước khi gõ) và ải giải cứu. */
  function autoLockLowest() {
    if (!battle) return;
    var lowIdx = -1;
    battle.words.forEach(function (wd, i) {
      if (wd.status === "advancing" && (lowIdx < 0 || wd.y > battle.words[lowIdx].y)) lowIdx = i;
    });
    if (lowIdx >= 0) LOGIC.lockMonster(battle, lowIdx);
  }

  function startBattle() {
    var rg = run.region, lv = run.level, b = run.battle;
    var isBoss = (lv === 10 && b === 3);
    var words;
    if (isBoss) {
      var boss = pickBossWord(run.used, rg);
      var mins = pickRegionWords(rg, 2, run.used);
      words = [boss].concat(mins);
    } else {
      words = pickRegionWords(rg, LOGIC.battleSize(lv, b), run.used);
      if (lv >= 2 && b >= 2) applyPhraseMonster(words);
    }
    setupBattle(words, {
      level: lv, battle: b, boss: isBoss, region: rg,
      hearts: run.hearts, shield: run.shield, element: curElement
    });
    /* v99 B4: ải 1 — gợi ý rõ từng bước + khóa sẵn quái đầu tiên. */
    if (stage && stage.hint) stage.hint.textContent = (lv === 1) ? HINT_STAGE1 : HINT_DEFAULT;
    if (lv === 1) autoLockLowest();
  }

  /* Chế độ Vô Tận (v98): mở sau khi thắng trùm Núi Lửa. Quái kéo tới
     từng đợt, càng về sau càng đông (tối đa 12) và càng nhanh; 5 tim
     mang theo qua các đợt, không có cửa hàng giữa đợt. */
  function startEndless() {
    run = { region: 5, endless: true, wave: 1, level: 10, battle: 1,
      hearts: 5, shield: RL.shield || 0, used: {} };
    startEndlessWave();
  }
  function startEndlessWave() {
    run.battle = run.wave;
    var n = Math.min(4 + run.wave, 12);
    var words = pickRegionWords(5, n, run.used);
    if (run.wave >= 2) applyPhraseMonster(words);
    setupBattle(words, {
      level: Math.min(10, 2 + run.wave), battle: run.wave, boss: false, region: 5,
      hearts: run.hearts, shield: run.shield, element: curElement
    });
  }

  /* Ải giải cứu từ bị bắt cóc (v99 A4): quái mang đúng các từ quá hạn SRS
     của track đang học. Thắng thì mỗi từ được ôn lại một nấc đúng luật
     SRS; thua thì từ vẫn quá hạn, không mất dữ liệu. Trận giải cứu nhẹ
     nhàng (quái không bắn 30 giây đầu) vì đây là buổi ôn, không phải thử thách. */
  function startRescue() {
    var kids = [];
    try { kids = findKidnapped(); } catch (e) {}
    if (!kids.length) { toastSafe("Không còn từ nào bị bắt cóc — ôn đúng hạn nhé!"); showMap(); return; }
    var words = kids.filter(function (k) {
      try { return G71.isTypeable(k); } catch (e) { return true; }
    });
    if (!words.length) { toastSafe("Các từ quá hạn không gõ được trong game — ôn lại ở tab Ôn tập nhé."); showMap(); return; }
    run = { region: curRegion, level: 0, battle: 1, hearts: 5, shield: RL.shield || 0,
      used: {}, rescue: true, rescueWords: words };
    setupBattle(words, {
      level: 1, battle: 1, boss: false, region: curRegion, gentle: true,
      hearts: 5, shield: 0, element: curElement
    });
    if (stage && stage.hint) stage.hint.textContent = "🆘 Ải giải cứu: các từ quá hạn ôn bị quái bắt cóc! Gõ đúng từ trên thẻ quái để cứu từ — thắng thì mỗi từ được ôn lại một nấc theo lịch SRS.";
    autoLockLowest();
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
    /* v99 A4: thắng ải giải cứu — mỗi từ được ôn lại một nấc đúng luật SRS. */
    if (run.rescue) {
      var saved = 0;
      (run.rescueWords || []).forEach(function (it) { if (reviewKidnapped(it)) saved++; });
      saveRL(RL);
      G71.endScreen(stage, true, "🎉 Đã cứu " + saved + " từ!",
        ["Các từ bị quái bắt cóc đã trở về — mỗi từ được ôn lại một nấc theo lịch SRS (1-3-7-14-30).",
          "Vàng: " + RL.gold + " · Từ điển: " + Object.keys(RL.dict).length + " từ · XP đã cộng vào tiến trình."],
        function () { start(); });
      return;
    }
    if (run.endless) {
      /* Vô Tận: qua một đợt, kỷ lục = đợt cao nhất, tim mang theo. */
      RL.endlessBest = Math.max(RL.endlessBest || 0, run.wave);
      var healE = 0;
      try { healE = companionHeal(unlockedCompanions(RL)); } catch (e) {}
      if (healE > 0 && run.hearts < 5) {
        run.hearts = Math.min(5, run.hearts + healE);
        toastSafe("🐢 Rùa Nước hồi " + healE + " tim cho rồng!");
      }
      saveRL(RL);
      run.wave++;
      toastSafe("Qua đợt " + (run.wave - 1) + "! Đợt " + run.wave + " đang tới — đông hơn, nhanh hơn.");
      startEndlessWave();
      return;
    }
    if (battle.isBoss) {
      var progB = regionProg(RL, run.region);
      progB.cleared["10"] = true;
      progB.unlocked = 10;
      var regB = regionById(run.region);
      if (run.region < 5) {
        RL.region = Math.max(RL.region, run.region + 1);
        regionProg(RL, run.region + 1);
      } else {
        RL.endless = true;
      }
      saveRL(RL);
      var lines = ["Đã thu hồi xong các từ ở " + regB.name + "!",
        "Vàng: " + RL.gold + " · Từ điển: " + Object.keys(RL.dict).length + " từ · +10 XP đã cộng vào tiến trình."];
      if (run.region < 5) lines.push("Đã mở vùng " + regionById(run.region + 1).name + "!");
      else lines.push("Chế độ Vô Tận đã mở — quái kéo tới từng đợt, kỷ lục đang chờ bạn!");
      G71.endScreen(stage, true, "🎉 Thắng " + regB.boss + "!", lines,
        function () { start(); });
      return;
    }
    if (run.battle >= 3) {
      var prog = regionProg(RL, run.region);
      prog.cleared[String(run.level)] = true;
      prog.unlocked = Math.max(prog.unlocked, Math.min(10, run.level + 1));
      /* v99 A3: bạn đồng hành Rùa Nước hồi 1 tim sau mỗi trận thắng. */
      var heal = 0;
      try { heal = companionHeal(unlockedCompanions(RL)); } catch (e) {}
      if (heal > 0 && run.hearts < 5) {
        run.hearts = Math.min(5, run.hearts + heal);
        toastSafe("🐢 Rùa Nước hồi " + heal + " tim cho rồng!");
      }
      saveRL(RL);
      toastSafe("Qua ải " + run.level + " vùng " + regionById(run.region).name + "! Đã mở ải " + prog.unlocked + ".");
      showMap();
      return;
    }
    var healS = 0;
    try { healS = companionHeal(unlockedCompanions(RL)); } catch (e) {}
    if (healS > 0 && run.hearts < 5) {
      run.hearts = Math.min(5, run.hearts + healS);
      toastSafe("🐢 Rùa Nước hồi " + healS + " tim cho rồng!");
    }
    showShop();
  }

  function onBattleLose() {
    clearOverlays();
    var box = document.createElement("div");
    box.id = "rlLose";
    /* v99 B3: nền mờ tối để trận đấu còn thấy mờ phía sau hộp thoại
       (trước đây là kem gần như đục nên trông như trang trắng). */
    box.style.cssText = "position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(4,6,15,.55);padding:16px;";
    var title = "Hết tim rồi!";
    var line1, line2, retryLabel;
    if (run.endless) {
      title = "Vô Tận kết thúc ở đợt " + run.wave + "!";
      line1 = "Kỷ lục của bạn: " + (RL.endlessBest || 0) + " đợt.";
      line2 = "Cấp, vàng và từ đã thu vẫn giữ nguyên — chơi lại từ đợt 1 nhé.";
      retryLabel = "Chơi lại Vô Tận";
    } else if (run.rescue) {
      title = "Quái giữ từ rồi!";
      line1 = "Rồng đã gục trong ải giải cứu — các từ quá hạn vẫn bị quái giữ.";
      line2 = "Không mất dữ liệu ôn tập, không trừ điểm học — chơi lại ải giải cứu nhé.";
      retryLabel = "Giải cứu lại";
    } else {
      line1 = "Rồng đã gục ở vùng " + regionById(run.region).name + " — ải " + run.level + " trận " + run.battle + ".";
      line2 = "Cấp, vàng và từ đã thu vẫn giữ nguyên — chơi lại ải nhé.";
      retryLabel = "Chơi lại ải";
    }
    box.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:28px 24px;text-align:center;max-width:520px;width:100%;">'
      + '<h2 style="margin-top:0;">' + title + '</h2>'
      + '<p style="margin:6px 0;">' + line1 + '</p>'
      + '<p style="margin:6px 0;">' + line2 + '</p>'
      + '<div class="row" style="justify-content:center;"><button class="btn btn-primary" id="rlRetry">' + retryLabel + '</button>'
      + '<button class="btn" id="rlLoseMap">Về bản đồ</button></div></div>';
    stage.wrap.appendChild(box);
    overlayBox = box;
    box.querySelector("#rlRetry").onclick = function () {
      if (run.endless) startEndless();
      else if (run.rescue) startRescue();
      else { run.battle = 1; run.hearts = 5; startBattle(); }
    };
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
      + '<p class="mut" style="margin:6px 0 12px;">Thắng trận ' + run.battle + ' ải ' + run.level + ' vùng ' + regionById(run.region).name + '! Mua đồ chuẩn bị cho trận tiếp theo. Vàng của bạn: <b>' + RL.gold + '</b> · Tim rồng: ' + run.hearts + '/5</p>'
      + '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">'
      + '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">' + rlImgTag("potion", 22) + ' Bình máu — 20 vàng</h3><p class="mut">Hồi 2 tim cho rồng (tối đa 5).</p><div class="row"><button class="btn btn-primary" id="rlBuyPotion"' + (canPotion ? '' : ' disabled') + '>Mua</button></div></section>'
      + '<section class="card" style="margin:0;"><h3 style="margin:0 0 4px;">' + rlImgTag("shield", 22) + ' Khiên — 25 vàng</h3><p class="mut">Chặn 1 đòn quái chạm tới rồng trong ải này.</p><div class="row"><button class="btn btn-primary" id="rlBuyShield"' + (canShield ? '' : ' disabled') + '>Mua</button></div></section>'
      + '</div>'
      + '<div class="row" style="margin-top:14px;"><button class="btn btn-primary" id="rlNextBattle">Trận tiếp theo →</button><button class="btn" id="rlShopMap">Về bản đồ</button></div>';
    box.innerHTML = html;
    stage.wrap.appendChild(box);
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
    var compsHud = [];
    try { compsHud = unlockedCompanions(RL); } catch (e) {}
    var sig = [(run && run.region) || 0, run ? run.level : 0, battle.battle, battle.hearts, battle.shield,
      RL.gold, battle.combo, battle.element, battle.total - battle.resolved, run && run.endless ? run.wave : 0,
      compsHud.join(","), run && run.rescue ? 1 : 0].join("|");
    if (sig === hudSig) return;
    hudSig = sig;
    var el = ELEMENTS[battle.element];
    var wthHud = weatherFor((run && run.region) || battle.region || 1);
    var stageLabel = (run && run.rescue)
      ? "🆘 Giải cứu từ"
      : (run && run.endless)
      ? "Vô Tận · Đợt " + run.wave
      : "V" + (run.region || 1) + " · Ải " + run.level + "-" + battle.battle;
    stage.hud.innerHTML = "<span style=\"flex:none\">" + stageLabel + "</span>"
      + "<span style=\"flex:none\">" + heartsSvg(battle.hearts, 5) + "</span>"
      + "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + rlImgTag("coin", 16) + " Vàng: " + RL.gold
      + " · Combo x" + Math.min(3, 1 + battle.combo)
      + " · Quái còn: " + (battle.total - battle.resolved)
      + (wthHud ? " · " + wthHud.icon + " " + wthHud.name + ": " + ELEMENTS[wthHud.element].name + " +50%" : "")
      + "</span>"
      + "<span style=\"flex:none\">" + el.icon + " " + el.name + "</span>";
    var tag = document.getElementById("rlShieldTag");
    if (tag) tag.innerHTML = battle.shield > 0 ? rlImgTag("shield", 18) + " x" + battle.shield : "";
    var ctag = document.getElementById("rlCompanionTag");
    if (ctag) {
      var chips = [];
      compsHud.forEach(function (id) {
        COMPANIONS.forEach(function (c) { if (c.id === id) chips.push(c.icon + " " + c.name); });
      });
      ctag.textContent = chips.length ? "🐾 " + chips.join(" · ") : "";
    }
  }

  function burst(x, y, el) {
    for (var i = 0; i < 10; i++) {
      parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.7) * 0.5, ttl: 0.5, el: el });
    }
  }

  function feed(ch) {
    if (mode !== "battle" || !battle || battle.over) return;
    var comps = [];
    try { comps = unlockedCompanions(RL); } catch (e) {}
    var r = LOGIC.typeLetter(battle, ch, Date.now(), battle.element, dictLevel, comps);
    if (r.ok && r.completed) {
      bolts.push({ x0: battle.dragon.x, y0: Math.max(0.05, battle.dragon.y - 0.06), x1: r.monster.x, y1: r.monster.y, el: battle.element,
        t: 0, ttl: 0.22, dmg: r.dmg, done: false });
      if (r.bossPhase) toastSafe("Trùm đổi hệ! Giờ trùm yếu hệ " + ELEMENTS[r.bossPhase.weak].name + ".");
      if (r.groupHit) floats.push({ x: r.monster.x, y: Math.max(0.08, r.monster.y - 0.1), text: "Điểm yếu nhóm từ! ×2", ttl: 1.2, el: battle.element });
      if (r.comboPart) floats.push({ x: r.monster.x, y: Math.max(0.08, r.monster.y - 0.16), text: "COMBO CỤM TỪ ×3!", ttl: 1.2, el: battle.element });
      if (r.weatherBoost) floats.push({ x: r.monster.x, y: Math.max(0.08, r.monster.y - 0.22), text: "Thời tiết +50%!", ttl: 1.2, el: battle.element });
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
    if (e.key === " ") { feed(" "); return; }
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
    var paintReg = (run && run.region) || (battle && battle.region) || 1;
    paintRegion(ctx, W, H, now, paintReg);
    paintWeather(ctx, W, H, now, paintReg);
    /* Xếp thẻ từ trước khi vẽ quái để thẻ không chồng nhau (v99 B1). */
    try { layoutPills(ctx, battle.words, W, H); } catch (e) {}
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
    start: start, startEndless: startEndless, startRescue: startRescue,
    logic: LOGIC, elements: ELEMENTS, heartsSvg: heartsSvg,
    companions: COMPANIONS, unlockedCompanions: unlockedCompanions,
    findKidnapped: findKidnapped, reviewKidnapped: reviewKidnapped,
    art: { ready: rlReady, base: RL_ART, files: RL_IMGS, paint: paintRegion, paintWeather: paintWeather,
      drawMonster: drawMonster, drawDragonUp: drawDragonUp },
    store: { load: loadRL, save: saveRL, fresh: freshRL },
    regions: REGIONS, regionById: regionById,
    /* Mỏ neo cho probe: đọc trạng thái chơi hiện tại (chế độ, trận, lượt chạy, tiến trình). */
    debug: function () { return { mode: mode, battle: battle, run: run, rl: RL, curRegion: curRegion }; }
  };
})();
