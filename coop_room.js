/* ---------- PHÒNG CO-OP — CÁNH CỔNG TRI THỨC, 2–4 NGƯỜI THEO LƯỢT (v62) ----------
   Vertical slice game phần 3 theo MASTER PROMPT (Bùi gửi 09:54 04/11/2026) +
   báo cáo khảo sát giai đoạn 1 (04/11/2026). Chỉ 1 nhiệm vụ CO-OP tiếng Anh,
   chơi theo lượt qua Supabase (Postgres + Realtime), không phải thời gian thực.
   Nguyên tắc: chia KIẾN THỨC, không chỉ chia việc — mỗi người chỉ thấy manh
   mối riêng của mình; cả đội phải chia sẻ mới mở được cổng. Không bot, không
   người chơi giả, không chat tự do (chỉ tin nhắn mẫu + ping), không bảng xếp
   hạng giả. Khách chưa đăng nhập thì KHÔNG có phòng giả — màn hình ghi rõ cần
   đăng nhập. Nội dung chỉ đọc từ bank gốc CONTENT.vocab qua adapter, KHÔNG
   copy bank; mọi mục có content_id/source_id như vòng mobile v60 và PC v61.
   Thưởng chia đều: cùng điểm/sao, mỗi máy tự cộng +10 XP + kỷ lục coop +
   SRS/Sổ lỗi sai của chính mình (dùng chung helper với v60/v61, không viết
   lại). Thắng game không tính vào bước chương (giữ nguyên luật học).
   Luật rời phòng (ghi rõ trong giao diện): người rời để lại manh mối cho cả
   đội (thành manh mối chung) và vai trò chuyển cho người còn lại đầu tiên
   (chủ phòng ưu tiên) — đội không bao giờ kẹt; còn 1 người vẫn mở được cổng.
   Giới hạn trung thực của lát này: RLS chặn đọc/ghi trái phòng nhưng KHÔNG
   kiểm chứng điểm trên máy chủ; điểm CO-OP là điểm đội tự ghi, chưa qua kiểm
   chứng server — không công bố như thành tích chính thức. Kiểm chứng Realtime
   + RLS thật cần 2–4 thiết bị thật sau khi áp migration (xem coop_rooms.sql,
   CHƯA áp dụng). Transport kiểm chứng trong jsdom là CoopTestTransport
   (chỉ dùng cho probe, KHÔNG bao giờ nối vào giao diện). */
var COOP_ROLES = ["Thám hiểm", "Chuyên gia ngôn ngữ", "Phân tích", "Kỹ sư"];
var COOP_TEMPLATES = [
  "Tôi có manh mối rồi.",
  "Tôi đã chia sẻ manh mối.",
  "Cần giúp ở cửa.",
  "Tới lượt bạn rồi.",
  "Mở cổng thôi!",
  "Cảm ơn cả đội!"
];
var COOP_PING_TEXT = "📍 Ping cả đội: chú ý nhé!";
var COOP_LEAVE_RULE = "Luật rời phòng: người rời sẽ để lại manh mối cho cả đội (thành manh mối chung) và vai trò chuyển cho người còn lại đầu tiên (chủ phòng ưu tiên) — đội không bao giờ kẹt, còn 1 người vẫn mở được cổng.";
var COOP_MAX_MEMBERS = 4;

/* Nhãn "đã chơi / chưa chơi" (coopPlayedLabel) nằm trong index.html, cùng
   khối helper game — để tab Luyện tập vẽ được nhãn ngay cả khi file game
   riêng chưa tải xong. */

/* ---------------- Logic phòng thuần túy (không phụ thuộc transport) -------- */
function coopNewCode() {
  var abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", out = "";
  for (var i = 0; i < 6; i++) out += abc[Math.floor(Math.random() * abc.length)];
  return out;
}
function coopPresentMembers(room) {
  return (room.members || []).filter(function (m) { return !m.left; });
}
function coopMemberById(room, id) {
  for (var i = 0; i < (room.members || []).length; i++) if (room.members[i].id === id) return room.members[i];
  return null;
}
function coopNewRoom(code, hostId, nickname) {
  return {
    code: code, hostId: hostId, status: "lobby", lang: "en", setIdx: -1, topic: "",
    phase: "lobby", turnIdx: 0, score: 0, wrong: 0, analystUsed: false,
    doorOpen: false, reward: null, lastExplain: "",
    members: [{ id: hostId, nickname: nickname, roles: [], ready: false, left: false }],
    frags: [], messages: [], rightBy: {}, wrongBy: {}
  };
}
function coopAddMember(room, id, nickname) {
  if (room.status !== "lobby") return { ok: false, why: "Phòng đã bắt đầu nhiệm vụ — chỉ vào được khi còn ở sảnh." };
  if (coopPresentMembers(room).length >= COOP_MAX_MEMBERS) return { ok: false, why: "Phòng đã đủ 4 người." };
  if (coopMemberById(room, id) && !coopMemberById(room, id).left) return { ok: false, why: "Bạn đã ở trong phòng này rồi." };
  var m = coopMemberById(room, id);
  if (m) { m.left = false; m.nickname = nickname; m.ready = false; }
  else room.members.push({ id: id, nickname: nickname, roles: [], ready: false, left: false });
  return { ok: true };
}
function coopSetReady(room, id, ready) {
  var m = coopMemberById(room, id);
  if (!m || m.left) return false;
  m.ready = !!ready; return true;
}
function coopCanStart(room) {
  var p = coopPresentMembers(room);
  if (room.status !== "lobby" || p.length < 2) return false;
  for (var i = 0; i < p.length; i++) if (!p[i].ready) return false;
  return true;
}
/* Chọn bộ từ cho nhiệm vụ: bộ đang học dở nếu đủ thẻ, không thì bộ đủ 12 thẻ. */
function coopPickMissionSet() {
  if (typeof CONTENT === "undefined" || !CONTENT.vocab) return -1;
  var cur = -1;
  try { cur = gameCurrentVocabSet(); } catch (e) { cur = -1; }
  if (cur >= 0 && vocabSetCards(cur).length >= 12) return cur;
  for (var i = 0; i < CONTENT.vocab.length; i++) if (vocabSetCards(i).length >= 12) return i;
  return -1;
}
/* Chia 4 mảnh manh mối (từ thật) vòng tròn cho các thành viên đang có mặt;
   vai trò chia vòng tròn, vai trò chưa có người nhận do chủ phòng đảm nhiệm. */
function coopStartMission(room) {
  if (!coopCanStart(room)) return { ok: false, why: "Cần ít nhất 2 người và tất cả đều bấm Sẵn sàng." };
  var setIdx = coopPickMissionSet();
  if (setIdx < 0) return { ok: false, why: "Không tìm được bộ từ đủ 12 thẻ cho nhiệm vụ." };
  var cards = gameShuffle(vocabSetCards(setIdx).filter(function (c) { return c.w && c.vi; })).slice(0, 4);
  if (cards.length < 4) return { ok: false, why: "Bộ từ này không đủ 4 thẻ có nghĩa để chia manh mối." };
  var set = CONTENT.vocab[setIdx] || {};
  room.setIdx = setIdx; room.topic = set.topic || "";
  var present = coopPresentMembers(room);
  function coopCardIndex(c) {
    var arr = set.cards || [];
    for (var k = 0; k < arr.length; k++) if (arr[k].w === c.w && arr[k].vi === c.vi) return k;
    return -1;
  }
  room.frags = cards.map(function (c, i) {
    return { word: c.w, vi: c.vi, content_id: "en-vocab-" + setIdx + "-" + coopCardIndex(c), source_id: "vocab:" + setIdx, ownerId: present[i % present.length].id, shared: false };
  });
  present.forEach(function (m) { m.roles = []; });
  for (var r = 0; r < COOP_ROLES.length; r++) {
    var holder = present[r % present.length];
    holder.roles.push(COOP_ROLES[r]);
  }
  /* Vai trò chưa có người nhận (khi ít hơn 4 người) đã dồn về chủ phòng nhờ
     chia vòng tròn: chủ phòng là người đầu tiên nên nhận vai trò thừa. */
  room.status = "playing"; room.phase = "share"; room.turnIdx = 0;
  room.score = 0; room.wrong = 0; room.analystUsed = false; room.doorOpen = false;
  room.rightBy = {}; room.wrongBy = {};
  return { ok: true };
}
function coopAllShared(room) {
  for (var i = 0; i < room.frags.length; i++) if (!room.frags[i].shared) return false;
  return room.frags.length > 0;
}
function coopShare(room, memberId, fragIdx) {
  var f = room.frags[fragIdx];
  if (!f || f.ownerId !== memberId || f.shared) return false;
  f.shared = true;
  if (room.phase === "share" && coopAllShared(room)) room.phase = "door";
  return true;
}
function coopTurnMember(room) {
  var p = coopPresentMembers(room);
  if (!p.length) return null;
  return p[((room.turnIdx % p.length) + p.length) % p.length];
}
function coopAdvanceTurn(room) {
  var p = coopPresentMembers(room);
  if (!p.length) return;
  room.turnIdx = (room.turnIdx + 1) % p.length;
}
function coopDoorPick(room, memberId, word, vi) {
  if (room.phase !== "door") return { ok: false, why: "Cổng chưa mở bảng — cả đội chia sẻ hết manh mối đã." };
  var turn = coopTurnMember(room);
  if (!turn || turn.id !== memberId) return { ok: false, why: "Chưa tới lượt bạn — đang chờ " + (turn ? turn.nickname : "người khác") + "." };
  var frag = null;
  for (var i = 0; i < room.frags.length; i++) if (room.frags[i].word === word) frag = room.frags[i];
  if (!frag || !frag.shared) return { ok: false, why: "Từ này chưa được chia sẻ." };
  if (room.matched && room.matched.indexOf(word) >= 0) return { ok: false, why: "Cặp này đã nối đúng rồi." };
  if (!room.matched) room.matched = [];
  if (frag.vi === vi) {
    room.matched.push(word);
    room.score += 25;
    if (!room.rightBy[memberId]) room.rightBy[memberId] = [];
    room.rightBy[memberId].push({ w: word, vi: vi });
    room.lastExplain = "Đúng rồi! " + word + " nghĩa là " + vi + ".";
    if (room.matched.length >= room.frags.length) room.phase = "open";
    coopAdvanceTurn(room);
    return { ok: true, correct: true };
  }
  room.score = Math.max(0, room.score - 5); room.wrong++;
  if (!room.wrongBy[memberId]) room.wrongBy[memberId] = [];
  room.wrongBy[memberId].push({ w: word, vi: vi });
  room.lastExplain = "Chưa đúng: " + word + " không có nghĩa là " + vi + " (nghĩa đúng là " + frag.vi + "). Lượt chuyển cho người tiếp theo.";
  coopAdvanceTurn(room);
  return { ok: true, correct: false };
}
/* Soi đáp án của vai trò Phân tích: chỉ báo đúng/sai, không đổi lượt/điểm,
   mỗi phòng dùng 1 lần. */
function coopAnalystCheck(room, memberId, word, vi) {
  var m = coopMemberById(room, memberId);
  if (!m || m.roles.indexOf("Phân tích") < 0) return { ok: false, why: "Chỉ vai trò Phân tích mới soi đáp án được." };
  if (room.analystUsed) return { ok: false, why: "Lượt soi đáp án của phòng đã dùng hết rồi." };
  var frag = null;
  for (var i = 0; i < room.frags.length; i++) if (room.frags[i].word === word) frag = room.frags[i];
  if (!frag || !frag.shared) return { ok: false, why: "Từ này chưa được chia sẻ." };
  room.analystUsed = true;
  return { ok: true, correct: frag.vi === vi };
}
function coopOpenDoor(room, memberId) {
  if (room.phase !== "open") return { ok: false, why: "Cổng chưa sẵn sàng mở — nối hết các cặp đã." };
  var m = coopMemberById(room, memberId);
  if (!m || m.roles.indexOf("Kỹ sư") < 0) return { ok: false, why: "Chỉ vai trò Kỹ sư mới bấm Mở cổng được." };
  room.doorOpen = true; room.status = "done"; room.phase = "reward";
  room.reward = { score: room.score, stars: gameStarsFor(room.score / 100) };
  return { ok: true };
}
function coopLeave(room, memberId) {
  var m = coopMemberById(room, memberId);
  if (!m || m.left) return false;
  var presentBefore = coopPresentMembers(room);
  var turnBefore = presentBefore.length ? presentBefore[((room.turnIdx % presentBefore.length) + presentBefore.length) % presentBefore.length] : null;
  var leaverPos = presentBefore.indexOf(m);
  m.left = true; m.ready = false;
  room.frags.forEach(function (f) { if (f.ownerId === memberId && !f.shared) f.shared = true; });
  var present = coopPresentMembers(room);
  if (m.roles && m.roles.length) {
    var heir = present[0] || null;
    if (heir) m.roles.forEach(function (r) { if (heir.roles.indexOf(r) < 0) heir.roles.push(r); });
    m.roles = [];
  }
  if (room.hostId === memberId) room.hostId = present.length ? present[0].id : null;
  if (!present.length) { room.status = "closed"; return true; }
  if (room.phase === "share" && coopAllShared(room)) room.phase = "door";
  /* Neo lại lượt: người giữ lượt rời thì người kế tiếp sau vị trí cũ nhận
     lượt; người khác rời thì giữ nguyên người giữ lượt. */
  if (turnBefore && turnBefore.id === memberId) {
    room.turnIdx = leaverPos < present.length ? leaverPos : 0;
  } else if (turnBefore) {
    var idx = -1;
    for (var i = 0; i < present.length; i++) if (present[i].id === turnBefore.id) idx = i;
    room.turnIdx = idx >= 0 ? idx : 0;
  } else room.turnIdx = 0;
  return true;
}
function coopSendMessage(room, memberId, text) {
  var m = coopMemberById(room, memberId);
  if (!m || m.left) return { ok: false, why: "Bạn không còn trong phòng." };
  var isTemplate = COOP_TEMPLATES.indexOf(text) >= 0;
  var isPing = text === COOP_PING_TEXT;
  if (!isTemplate && !isPing) return { ok: false, why: "Phòng CO-OP chỉ dùng tin nhắn mẫu và ping — không chat tự do." };
  var msg = { id: memberId + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e6), memberId: memberId, nickname: m.nickname, text: text, kind: isPing ? "ping" : "template", at: Date.now() };
  room.messages.push(msg);
  return { ok: true, msg: msg };
}

/* ---------------- Phiên đăng nhập (cùng mẫu với code tài khoản sẵn có) ----- */
function coopGetSession(cb) {
  try {
    var ready = window.__supabaseReady;
    if (!ready) { cb(null, null); return; }
    ready.then(function (client) {
      if (!client || !client.auth || !client.auth.getSession) { cb(null, null); return; }
      client.auth.getSession().then(function (res) {
        cb(client, (res && res.data && res.data.session) || null);
      }, function () { cb(client, null); });
    }, function () { cb(null, null); });
  } catch (e) { cb(null, null); }
}

/* ---------------- Transport kiểm chứng (CHỈ cho probe jsdom) --------------- */
/* Lưu phòng trong bộ nhớ, cùng giao diện với transport Supabase. KHÔNG bao
   giờ được nối vào giao diện người dùng — giao diện chỉ dùng transport
   Supabase khi đã đăng nhập, và ghi rõ cần đăng nhập khi là khách. */
function CoopTestTransport() { this.rooms = {}; this.listeners = {}; }
CoopTestTransport.prototype._emit = function (code) {
  var list = this.listeners[code] || [], snap = this.rooms[code];
  for (var i = 0; i < list.length; i++) { try { list[i](snap); } catch (e) {} }
};
CoopTestTransport.prototype.createRoom = function (room, cb) {
  this.rooms[room.code] = JSON.parse(JSON.stringify(room));
  cb(null, this.rooms[room.code]);
};
CoopTestTransport.prototype.joinRoom = function (code, member, cb) {
  var r = this.rooms[code];
  if (!r) { cb({ message: "Không tìm thấy phòng với mã này." }); return; }
  var res = coopAddMember(r, member.id, member.nickname);
  if (!res.ok) { cb({ message: res.why }); return; }
  this._emit(code);
  cb(null, r);
};
CoopTestTransport.prototype.fetchRoom = function (code, cb) {
  cb(null, this.rooms[code] ? JSON.parse(JSON.stringify(this.rooms[code])) : null);
};
CoopTestTransport.prototype.saveRoom = function (room, cb) {
  this.rooms[room.code] = JSON.parse(JSON.stringify(room));
  this._emit(room.code);
  cb(null, this.rooms[room.code]);
};
CoopTestTransport.prototype.sendMessage = function (code, msg, cb) {
  var r = this.rooms[code];
  if (!r) { cb({ message: "Không tìm thấy phòng." }); return; }
  r.messages.push(msg);
  this._emit(code);
  cb(null, msg);
};
CoopTestTransport.prototype.subscribe = function (code, cb) {
  var self = this;
  (this.listeners[code] = this.listeners[code] || []).push(cb);
  return function () {
    var list = self.listeners[code] || [];
    var i = list.indexOf(cb);
    if (i >= 0) list.splice(i, 1);
  };
};

/* ---------------- Transport Supabase thật ---------------------------------- */
/* Bảng (xem coop_rooms.sql, CHƯA áp dụng — cần chủ project chạy migration
   trong SQL editor của Supabase rồi mới dùng được): game_rooms, room_members,
   room_clues, room_messages. Chỉ dùng publishable key qua client sẵn có
   (config.js); KHÔNG có service_role key trong code. */
function CoopSupabaseTransport(client) { this.client = client; }
CoopSupabaseTransport.prototype._roomState = function (room) {
  return { phase: room.phase, turnIdx: room.turnIdx, score: room.score, wrong: room.wrong, analystUsed: room.analystUsed, doorOpen: room.doorOpen, reward: room.reward, lastExplain: room.lastExplain, matched: room.matched || [], rightBy: room.rightBy || {}, wrongBy: room.wrongBy || {} };
};
CoopSupabaseTransport.prototype._assemble = function (code, grow, members, clues, messages) {
  if (!grow) return null;
  var st = grow.state || {};
  return {
    code: grow.code, hostId: grow.host_id, status: grow.status, lang: grow.lang || "en",
    setIdx: grow.set_idx, topic: grow.topic || "",
    phase: st.phase || "lobby", turnIdx: st.turnIdx || 0, score: st.score || 0, wrong: st.wrong || 0,
    analystUsed: !!st.analystUsed, doorOpen: !!st.doorOpen, reward: st.reward || null,
    lastExplain: st.lastExplain || "", matched: st.matched || [],
    rightBy: st.rightBy || {}, wrongBy: st.wrongBy || {},
    members: (members || []).map(function (m) { return { id: m.user_id, nickname: m.nickname, roles: m.roles || [], ready: !!m.ready, left: !!m.left_at }; }),
    frags: (clues || []).map(function (c) { return { word: c.word, vi: c.meaning, content_id: c.content_id, source_id: c.source_id, ownerId: c.user_id, shared: !!c.shared }; }),
    messages: (messages || []).map(function (m) { return { id: m.id, memberId: m.user_id, nickname: m.nickname, text: m.text, kind: m.kind, at: m.created_at ? new Date(m.created_at).getTime() : 0 }; })
  };
};
CoopSupabaseTransport.prototype.fetchRoom = function (code, cb) {
  var self = this, c = this.client;
  c.from("game_rooms").select("*").eq("code", code).maybeSingle().then(function (r) {
    if (r.error || !r.data) { cb(null, null); return; }
    var grow = r.data;
    c.from("room_members").select("*").eq("room_code", code).order("created_at").then(function (m) {
      c.from("room_clues").select("*").eq("room_code", code).order("created_at").then(function (cl) {
        c.from("room_messages").select("*").eq("room_code", code).order("created_at").then(function (ms) {
          cb(null, self._assemble(code, grow, m.data || [], cl.data || [], ms.data || []));
        });
      });
    });
  });
};
CoopSupabaseTransport.prototype.createRoom = function (room, cb) {
  var self = this, c = this.client;
  c.from("game_rooms").insert({ code: room.code, host_id: room.hostId, status: "lobby", lang: "en", state: self._roomState(room) }).then(function (r) {
    if (r.error) { cb({ message: "Tạo phòng thất bại: " + r.error.message }); return; }
    var host = room.members[0];
    c.from("room_members").insert({ room_code: room.code, user_id: host.id, nickname: host.nickname, roles: [], ready: false }).then(function (m) {
      if (m.error) { cb({ message: "Tạo phòng thất bại: " + m.error.message }); return; }
      self.fetchRoom(room.code, cb);
    });
  });
};
CoopSupabaseTransport.prototype.joinRoom = function (code, member, cb) {
  var self = this, c = this.client;
  this.fetchRoom(code, function (err, snap) {
    if (!snap) { cb({ message: "Không tìm thấy phòng với mã này — kiểm tra lại mã." }); return; }
    var res = coopAddMember(snap, member.id, member.nickname);
    if (!res.ok) { cb({ message: res.why }); return; }
    c.from("room_members").insert({ room_code: code, user_id: member.id, nickname: member.nickname, roles: [], ready: false }).then(function (r) {
      if (r.error) { cb({ message: "Vào phòng thất bại: " + r.error.message }); return; }
      self.fetchRoom(code, cb);
    });
  });
};
CoopSupabaseTransport.prototype.saveRoom = function (room, cb) {
  var self = this, c = this.client;
  var jobs = [];
  jobs.push(c.from("game_rooms").update({ host_id: room.hostId, status: room.status, lang: room.lang, set_idx: room.setIdx, topic: room.topic, state: self._roomState(room) }).eq("code", room.code));
  (room.members || []).forEach(function (m) {
    jobs.push(c.from("room_members").upsert({ room_code: room.code, user_id: m.id, nickname: m.nickname, roles: m.roles || [], ready: !!m.ready, left_at: m.left ? new Date().toISOString() : null }, { onConflict: "room_code,user_id" }));
  });
  (room.frags || []).forEach(function (f) {
    jobs.push(c.from("room_clues").upsert({ room_code: room.code, user_id: f.ownerId, word: f.word, meaning: f.vi, content_id: f.content_id, source_id: f.source_id, shared: !!f.shared }, { onConflict: "room_code,content_id" }));
  });
  Promise.all(jobs).then(function () { self.fetchRoom(room.code, cb); }, function (e) { cb({ message: "Lưu phòng thất bại: " + (e && e.message ? e.message : e) }); });
};
CoopSupabaseTransport.prototype.sendMessage = function (code, msg, cb) {
  this.client.from("room_messages").insert({ room_code: code, user_id: msg.memberId, nickname: msg.nickname, text: msg.text, kind: msg.kind }).then(function (r) {
    if (r.error) cb({ message: "Gửi tin thất bại: " + r.error.message });
    else cb(null, msg);
  });
};
CoopSupabaseTransport.prototype.subscribe = function (code, cb) {
  var self = this, c = this.client, done = false, timer = null, ch = null;
  function refetch() { self.fetchRoom(code, function (err, snap) { if (snap) cb(snap); }); }
  try {
    ch = c.channel("coop-" + code);
    ["game_rooms", "room_members", "room_clues", "room_messages"].forEach(function (t) {
      var filter = t === "game_rooms" ? "code=eq." + code : "room_code=eq." + code;
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: filter }, refetch);
    });
    ch.subscribe(function (status) {
      if (status === "SUBSCRIBED") { done = true; if (timer) clearTimeout(timer); }
    });
    /* Dự phòng: nếu Realtime không bắt được trong 3 giây thì thăm dò 5 giây/lần
       (nhịp theo lượt nên thăm dò vẫn đủ nhanh, vẫn trong trần gói Free). */
    timer = setTimeout(function () {
      if (!done) { var iv = setInterval(refetch, 5000); if (ch) ch._coopPoll = iv; }
    }, 3000);
  } catch (e) {
    timer = setTimeout(function () { setInterval(refetch, 5000); }, 0);
  }
  return function () {
    try { if (timer) clearTimeout(timer); if (ch) { if (ch._coopPoll) clearInterval(ch._coopPoll); c.removeChannel(ch); } } catch (e) {}
  };
};

/* ---------------- Giao diện phòng ----------------------------------------- */
function coopSpeak(word) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function coopSeededShuffle(arr, seedStr) {
  var seed = 0, s = String(seedStr || "");
  for (var i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
  var out = arr.slice();
  for (var j = out.length - 1; j > 0; j--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    var k = seed % (j + 1), t = out[j]; out[j] = out[k]; out[k] = t;
  }
  return out;
}
function coopStop(l) {
  var cp = l && l.coop;
  if (cp && cp.unsub) { try { cp.unsub(); } catch (e) {} cp.unsub = null; }
}
function coopBack(l) { coopStop(l); backFromLesson(); go("practice"); }
function coopSubscribe(l, cp) {
  if (cp.unsub || !cp.transport || !cp.room) return;
  cp.unsub = cp.transport.subscribe(cp.room.code, function (snap) {
    if (!snap) return;
    cp.room = snap;
    if (snap.status === "closed") {
      coopStop(l); cp.screen = "start"; cp.room = null; cp.note = "Phòng đã đóng vì mọi người đều rời.";
    }
    if (typeof curLesson !== "undefined" && curLesson === l) renderCoop(document.getElementById("app"), l);
  });
}
function coopMembersHTML(room, me) {
  var p = coopPresentMembers(room);
  return p.map(function (m) {
    var tags = [];
    if (m.id === room.hostId) tags.push("chủ phòng");
    if (m.id === me) tags.push("bạn");
    if (m.roles && m.roles.length) tags.push(m.roles.join(" + "));
    return "<li>" + esc(m.nickname) + (tags.length ? " <span class=\"mut\">(" + esc(tags.join(" · ")) + ")</span>" : "") + (m.ready ? " ✅ sẵn sàng" : " ⏳ chưa sẵn sàng") + "</li>";
  }).join("");
}
function renderCoop(app, l) {
  var cp = l.coop;
  if (!cp) cp = l.coop = { screen: "start", sessionChecked: false, sessionChecking: false };
  if (!cp.sessionChecked) {
    if (!cp.sessionChecking) {
      cp.sessionChecking = true;
      app.innerHTML = '<div class="qblock"><h2>👥 Phòng CO-OP — Cánh cổng tri thức</h2><p class="mut">Đang kiểm tra đăng nhập…</p></div>';
      coopGetSession(function (client, session) {
        cp.client = client; cp.session = session || null;
        cp.me = session ? session.user.id : null;
        cp.transport = session ? new CoopSupabaseTransport(client) : null;
        cp.sessionChecked = true; cp.sessionChecking = false;
        if (typeof curLesson !== "undefined" && curLesson === l) renderCoop(document.getElementById("app"), l);
      });
    } else {
      app.innerHTML = '<div class="qblock"><h2>👥 Phòng CO-OP — Cánh cổng tri thức</h2><p class="mut">Đang kiểm tra đăng nhập…</p></div>';
    }
    return;
  }
  var h = "";
  if (cp.screen === "start") {
    h += '<div class="qblock"><h2>👥 Phòng CO-OP — Cánh cổng tri thức</h2>';
    h += '<p class="mut">Chơi cùng 2–4 người thật, theo lượt (không phải thời gian thực): mỗi người nhận manh mối riêng, chia sẻ cho cả đội bằng tin nhắn mẫu, cùng mở cổng và chia đều thưởng. Chủ đề: từ vựng tiếng Anh từ bộ bạn đang học.</p>';
    if (cp.note) h += '<p><b>' + esc(cp.note) + '</b></p>';
    if (!cp.session) {
      h += '<p><b>Phòng CO-OP cần đăng nhập để đồng bộ với bạn chơi khác.</b> Bạn đang ở chế độ khách nên chưa vào phòng được — khách không có phòng giả, chỉ chơi đơn được. Đăng nhập rồi quay lại đây nhé.</p>';
      h += '<div class="row"><button class="btn btn-primary" id="coopToMine">🔑 Tới mục Tài khoản để đăng nhập</button><button class="btn" id="coopBack0">Về Luyện tập</button></div>';
    } else if (!cp.client) {
      h += '<p><b>Chưa kết nối được Supabase — kiểm tra mạng rồi thử lại.</b></p>';
      h += '<div class="row"><button class="btn btn-primary" id="coopRetry">🔄 Thử lại</button><button class="btn" id="coopBack0">Về Luyện tập</button></div>';
    } else {
      h += '<p>Biệt danh của bạn trong phòng (không dùng email, không chat tự do):</p><p><input id="coopNick" maxlength="20" placeholder="Ví dụ: Gấu Ú" style="width:220px"></p>';
      h += '<div class="row"><button class="btn btn-primary" id="coopCreate">➕ Tạo phòng mới</button></div>';
      h += '<p>— hoặc —</p><p><input id="coopCode" maxlength="6" placeholder="Mã phòng 6 ký tự" style="width:220px"></p>';
      h += '<div class="row"><button class="btn btn-primary" id="coopJoin">🚪 Vào phòng</button><button class="btn" id="coopBack0">Về Luyện tập</button></div>';
      h += '<p id="coopErr" class="mut"></p>';
      h += '<p class="mut">' + esc(COOP_LEAVE_RULE) + '</p>';
      h += '<p class="mut">Chế độ này chơi theo lượt qua Supabase (mỗi nước đi là một bản ghi, không gửi vị trí mỗi khung hình) nên chạy được trên gói miễn phí. Điểm đội là điểm tự ghi, chưa qua kiểm chứng máy chủ nên không công bố như thành tích chính thức.</p>';
    }
    h += '</div>';
    app.innerHTML = h;
    var back0 = document.getElementById("coopBack0");
    if (back0) back0.onclick = function () { coopBack(l); };
    var toMine = document.getElementById("coopToMine");
    if (toMine) toMine.onclick = function () { coopStop(l); backFromLesson(); go("mine"); };
    var retry = document.getElementById("coopRetry");
    if (retry) retry.onclick = function () { cp.sessionChecked = false; renderCoop(app, l); };
    var create = document.getElementById("coopCreate");
    if (create) create.onclick = function () {
      var nick = (document.getElementById("coopNick").value || "").trim() || "Người chơi";
      var code = coopNewCode();
      var room = coopNewRoom(code, cp.me, nick);
      cp.transport.createRoom(room, function (err, snap) {
        if (err) { var e = document.getElementById("coopErr"); if (e) e.textContent = err.message; return; }
        cp.room = snap; cp.screen = "room"; coopSubscribe(l, cp); renderCoop(app, l);
      });
    };
    var join = document.getElementById("coopJoin");
    if (join) join.onclick = function () {
      var nick = (document.getElementById("coopNick").value || "").trim() || "Người chơi";
      var code = (document.getElementById("coopCode").value || "").trim().toUpperCase();
      if (!code) { var e0 = document.getElementById("coopErr"); if (e0) e0.textContent = "Nhập mã phòng 6 ký tự trước đã."; return; }
      cp.transport.joinRoom(code, { id: cp.me, nickname: nick }, function (err, snap) {
        if (err) { var e = document.getElementById("coopErr"); if (e) e.textContent = err.message; return; }
        cp.room = snap; cp.screen = "room"; coopSubscribe(l, cp); renderCoop(app, l);
      });
    };
    return;
  }
  var room = cp.room;
  if (!room) { cp.screen = "start"; renderCoop(app, l); return; }
  /* Đồng bộ màn hình khi phòng đổi trạng thái từ máy khác (qua Realtime):
     sảnh → nhiệm vụ, nhiệm vụ → thưởng. */
  if (room.status === "playing" && cp.screen === "room") cp.screen = "mission";
  if ((room.status === "done" || room.phase === "reward") && cp.screen !== "reward") cp.screen = "reward";
  if (cp.screen === "room") {
    var me = coopMemberById(room, cp.me);
    h += '<div class="qblock"><h2>👥 Phòng CO-OP — Mã: ' + esc(room.code) + '</h2>';
    h += '<p class="mut">Gửi mã này cho bạn chơi (2–4 người). Mọi người bấm Sẵn sàng rồi chủ phòng bấm Bắt đầu.</p>';
    h += '<ul>' + coopMembersHTML(room, cp.me) + '</ul>';
    if (me) h += '<div class="row"><button class="btn btn-primary" id="coopReady">' + (me.ready ? "↩️ Hủy sẵn sàng" : "✅ Tôi sẵn sàng") + '</button>';
    if (room.hostId === cp.me) h += '<button class="btn btn-primary" id="coopStart"' + (coopCanStart(room) ? "" : " disabled") + '>🚀 Bắt đầu nhiệm vụ</button>';
    h += '<button class="btn" id="coopLeave">🚪 Rời phòng</button></div>';
    if (room.hostId === cp.me && !coopCanStart(room)) h += '<p class="mut">Cần ít nhất 2 người và tất cả đều bấm Sẵn sàng mới bắt đầu được.</p>';
    h += '<p class="mut">' + esc(COOP_LEAVE_RULE) + '</p>';
    h += '<p id="coopErr" class="mut"></p></div>';
    app.innerHTML = h;
    var ready = document.getElementById("coopReady");
    if (ready) ready.onclick = function () {
      var m2 = coopMemberById(room, cp.me);
      coopSetReady(room, cp.me, !m2.ready);
      cp.transport.saveRoom(room, function (err, snap) { if (snap) { cp.room = snap; renderCoop(app, l); } });
    };
    var start = document.getElementById("coopStart");
    if (start) start.onclick = function () {
      var r = coopStartMission(room);
      if (!r.ok) { var e = document.getElementById("coopErr"); if (e) e.textContent = r.why; return; }
      cp.transport.saveRoom(room, function (err, snap) { if (snap) { cp.room = snap; cp.screen = "mission"; renderCoop(app, l); } });
    };
    var leave = document.getElementById("coopLeave");
    if (leave) leave.onclick = function () {
      coopLeave(room, cp.me);
      cp.transport.saveRoom(room, function () { coopStop(l); cp.screen = "start"; cp.room = null; cp.note = "Bạn đã rời phòng."; renderCoop(app, l); });
    };
    return;
  }
  if (cp.screen === "mission" && room.status === "playing") {
    var meM = coopMemberById(room, cp.me);
    var phaseText = room.phase === "share" ? "Bước 1 — Chia sẻ manh mối: mỗi người chia sẻ manh mối riêng của mình." : (room.phase === "door" ? "Bước 2 — Bảng cửa: lần lượt nối từng từ với nghĩa đúng." : "Bước 3 — Sẵn sàng mở cổng.");
    h += '<div class="qblock"><h2>👥 Phòng CO-OP — ' + esc(room.topic || "Cánh cổng tri thức") + ' (mã ' + esc(room.code) + ')</h2>';
    h += '<p><b>' + esc(phaseText) + '</b></p>';
    h += '<p class="mut">Thành viên:</p><ul>' + coopMembersHTML(room, cp.me) + '</ul>';
    if (room.phase === "door" || room.phase === "open") {
      var turn = coopTurnMember(room);
      h += '<p><b>Lượt của: ' + esc(turn ? turn.nickname : "—") + (turn && turn.id === cp.me ? " (lượt của bạn)" : "") + '</b> · Điểm đội: ' + room.score + '</p>';
    }
    h += '<h3>🔒 Manh mối của bạn</h3>';
    room.frags.forEach(function (f, i) {
      if (f.ownerId !== cp.me) return;
      h += '<p>' + esc(f.word) + " — " + esc(f.vi) + (f.shared ? " ✅ đã chia sẻ" : ' <button class="btn" data-coopshare="' + i + '">📤 Chia sẻ cho cả đội</button>') + '</p>';
    });
    h += '<h3>📤 Manh mối cả đội đã thấy</h3>';
    room.frags.forEach(function (f) {
      if (f.shared) {
        var owner = coopMemberById(room, f.ownerId);
        h += '<p>' + esc(f.word) + " — " + esc(f.vi) + ' <span class="mut">(của ' + esc(owner ? owner.nickname : "?") + ')</span></p>';
      } else if (f.ownerId !== cp.me) {
        var owner2 = coopMemberById(room, f.ownerId);
        h += '<p class="mut">🔒 Manh mối của ' + esc(owner2 ? owner2.nickname : "?") + ' (chưa chia sẻ)</p>';
      }
    });
    if (meM) {
      h += '<h3>🎭 Kỹ năng theo vai trò</h3><div class="row">';
      if (meM.roles.indexOf("Thám hiểm") >= 0) h += '<button class="btn" id="coopScout">🔭 Dò đường</button>';
      if (meM.roles.indexOf("Chuyên gia ngôn ngữ") >= 0) room.frags.forEach(function (f) { if (f.shared) h += '<button class="btn" data-coopspeak="' + esc(f.word) + '">🔊 Nghe: ' + esc(f.word) + ' (giọng tổng hợp)</button>'; });
      if (meM.roles.indexOf("Phân tích") >= 0) h += '<button class="btn" id="coopAnalyst">🔍 Soi đáp án (1 lần/phòng)</button>';
      if (meM.roles.indexOf("Kỹ sư") >= 0 && room.phase === "open") h += '<button class="btn btn-primary" id="coopOpen">🚪 Mở cổng</button>';
      h += '</div>';
      if (cp.hintNote) h += '<p>' + esc(cp.hintNote) + '</p>';
      if (cp.analystNote) h += '<p>' + esc(cp.analystNote) + '</p>';
    }
    if (room.phase === "door" || room.phase === "open") {
      var meanings = coopSeededShuffle(room.frags.map(function (f) { return f.vi; }), room.code);
      h += '<h3>🚪 Bảng cửa — bấm 1 từ rồi bấm 1 nghĩa</h3>';
      h += '<p>Đã chọn: từ <b>' + esc(cp.selWord || "—") + '</b> · nghĩa <b>' + esc(cp.selVi || "—") + '</b></p>';
      h += '<div class="row">' + room.frags.map(function (f) {
        var done = (room.matched || []).indexOf(f.word) >= 0;
        return '<button class="btn" data-coopword="' + esc(f.word) + '"' + (done ? " disabled" : "") + '>' + esc(f.word) + (done ? " ✓" : "") + '</button>';
      }).join("") + '</div>';
      h += '<div class="row">' + meanings.map(function (vi) {
        return '<button class="btn" data-coopvi="' + esc(vi) + '">' + esc(vi) + '</button>';
      }).join("") + '</div>';
      h += '<div class="row"><button class="btn btn-primary" id="coopCheckPair">✅ Kiểm tra cặp này</button></div>';
      if (room.lastExplain) h += '<p>' + esc(room.lastExplain) + '</p>';
    }
    h += '<h3>💬 Tin nhắn mẫu (không chat tự do)</h3><div class="row">';
    COOP_TEMPLATES.forEach(function (t) { h += '<button class="btn" data-coopmsg="' + esc(t) + '">' + esc(t) + '</button>'; });
    h += '<button class="btn" data-coopmsg="' + esc(COOP_PING_TEXT) + '">' + esc(COOP_PING_TEXT) + '</button></div>';
    h += '<div class="qblock">' + (room.messages.length ? room.messages.map(function (m) { return '<p><b>' + esc(m.nickname) + ':</b> ' + esc(m.text) + '</p>'; }).join("") : '<p class="mut">Chưa có tin nhắn nào.</p>') + '</div>';
    h += '<div class="row"><button class="btn" id="coopLeave2">🚪 Rời phòng</button><button class="btn" id="coopBack2">Về Luyện tập</button></div>';
    h += '<p class="mut">' + esc(COOP_LEAVE_RULE) + '</p></div>';
    app.innerHTML = h;
    function coopRefresh(snap) { if (snap) { cp.room = snap; renderCoop(app, l); } }
    document.querySelectorAll("[data-coopshare]").forEach(function (b) {
      b.onclick = function () { coopShare(room, cp.me, parseInt(b.dataset.coopshare, 10)); cp.transport.saveRoom(room, coopRefresh); };
    });
    document.querySelectorAll("[data-coopspeak]").forEach(function (b) {
      b.onclick = function () { coopSpeak(b.dataset.coopspeak); };
    });
    var scout = document.getElementById("coopScout");
    if (scout) scout.onclick = function () {
      var notShared = room.frags.filter(function (f) { return !f.shared; });
      if (!notShared.length) cp.hintNote = "Cả đội đã chia sẻ hết manh mối rồi — sang bảng cửa thôi.";
      else {
        var names = [];
        notShared.forEach(function (f) { var o = coopMemberById(room, f.ownerId); if (o && names.indexOf(o.nickname) < 0) names.push(o.nickname); });
        cp.hintNote = "Còn " + notShared.length + " manh mối chưa chia sẻ, của: " + names.join(", ") + ".";
      }
      renderCoop(app, l);
    };
    var analyst = document.getElementById("coopAnalyst");
    if (analyst) analyst.onclick = function () {
      if (!cp.selWord || !cp.selVi) { cp.analystNote = "Chọn 1 từ và 1 nghĩa trước rồi mới soi được."; renderCoop(app, l); return; }
      var r = coopAnalystCheck(room, cp.me, cp.selWord, cp.selVi);
      cp.analystNote = r.ok ? ("Soi đáp án: cặp này " + (r.correct ? "ĐÚNG." : "SAI — thử cặp khác nhé.")) : r.why;
      if (r.ok) cp.transport.saveRoom(room, coopRefresh); else renderCoop(app, l);
    };
    document.querySelectorAll("[data-coopword]").forEach(function (b) {
      b.onclick = function () { cp.selWord = b.dataset.coopword; renderCoop(app, l); };
    });
    document.querySelectorAll("[data-coopvi]").forEach(function (b) {
      b.onclick = function () { cp.selVi = b.dataset.coopvi; renderCoop(app, l); };
    });
    var checkPair = document.getElementById("coopCheckPair");
    if (checkPair) checkPair.onclick = function () {
      if (!cp.selWord || !cp.selVi) { room.lastExplain = "Chọn 1 từ và 1 nghĩa trước đã."; renderCoop(app, l); return; }
      var r = coopDoorPick(room, cp.me, cp.selWord, cp.selVi);
      cp.selWord = null; cp.selVi = null;
      if (!r.ok) { room.lastExplain = r.why; renderCoop(app, l); return; }
      cp.transport.saveRoom(room, coopRefresh);
    };
    var openBtn = document.getElementById("coopOpen");
    if (openBtn) openBtn.onclick = function () {
      var r = coopOpenDoor(room, cp.me);
      if (!r.ok) { room.lastExplain = r.why; renderCoop(app, l); return; }
      cp.transport.saveRoom(room, function (err, snap) { if (snap) { cp.room = snap; cp.screen = "reward"; renderCoop(app, l); } });
    };
    document.querySelectorAll("[data-coopmsg]").forEach(function (b) {
      b.onclick = function () {
        var r = coopSendMessage(room, cp.me, b.dataset.coopmsg);
        if (!r.ok) { toast(r.why); return; }
        cp.transport.sendMessage(room.code, r.msg, function () { cp.transport.saveRoom(room, coopRefresh); });
      };
    });
    var leave2 = document.getElementById("coopLeave2");
    if (leave2) leave2.onclick = function () {
      coopLeave(room, cp.me);
      cp.transport.saveRoom(room, function () { coopStop(l); cp.screen = "start"; cp.room = null; cp.note = "Bạn đã rời phòng."; renderCoop(app, l); });
    };
    var back2 = document.getElementById("coopBack2");
    if (back2) back2.onclick = function () { coopBack(l); };
    return;
  }
  if (cp.screen === "reward") {
    var rw = (room.reward || { score: room.score || 0, stars: 0 });
    if (!cp.rewardApplied) {
      cp.rewardApplied = true;
      awardXp(10);
      gameSaveBest("coop", rw.score, rw.stars, "en");
      var myRight = (room.rightBy && room.rightBy[cp.me]) || [];
      var myWrong = (room.wrongBy && room.wrongBy[cp.me]) || [];
      myRight.forEach(function (w) { try { gameWordRight(w.w, w.vi, "en", true); } catch (e) {} });
      myWrong.forEach(function (w) { try { gameWordWrong("coop", w.w, w.vi, "en"); } catch (e) {} });
      cp.myRight = myRight; cp.myWrong = myWrong;
    }
    h += '<div class="qblock"><h2>🎉 Cả đội đã mở cổng!</h2>';
    h += '<p>Điểm đội: <b>' + rw.score + '</b> · Sao: ' + "⭐".repeat(rw.stars || 0) + ' · Mỗi người +10 XP, chia đều.</p>';
    h += gameSummaryHTML(cp.myRight || [], cp.myWrong || []);
    h += '<div class="row"><button class="btn btn-primary" id="coopAgain">👥 Chơi phòng mới</button><button class="btn" id="coopBack3">Về Luyện tập</button></div></div>';
    app.innerHTML = h;
    var again = document.getElementById("coopAgain");
    if (again) again.onclick = function () { coopStop(l); cp.screen = "start"; cp.room = null; cp.rewardApplied = false; cp.myRight = []; cp.myWrong = []; renderCoop(app, l); };
    var back3 = document.getElementById("coopBack3");
    if (back3) back3.onclick = function () { coopBack(l); };
    return;
  }
  cp.screen = "start"; renderCoop(app, l);
}
