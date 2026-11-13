/* Service worker cho web học ngôn ngữ bản mới — cache file tĩnh + hiện
   v112c-retry: đẩy lại để kích hoạt run Pages mới (run #199 kẹt Queued từ 02:37).
   thông báo nhắc học khi có push.
   Đăng ký từ index.html (navigator.serviceWorker.register("sw.js")).
   File này phải được đẩy kèm index.html + content-new.js lên cùng thư mục
   gốc của web (https://emu2812.github.io/hoctieng/sw.js) thì push khi đóng
   trang mới hoạt động. Không chứa khóa bí mật nào. */

/* Cache: tên cache đổi theo phiên bản (CACHE_VERSION) thì bản mới sẽ thay
   hẳn cache cũ. Khi sw.js đổi byte, trình duyệt tự cài service worker mới;
   install nạp lại toàn bộ file tĩnh, skipWaiting + claim để bản mới có hiệu
   lực ngay, không để người học kẹt bản cũ. Đợt đẩy nào đổi file tĩnh thì
   nhớ đổi CACHE_VERSION trong file này. */
var CACHE_VERSION = "ielts-cache-v167"; /* v167: F3 — them buoc phat am vao lo trinh TOEIC (1 buoc dau moi chang: p0 44 am + p1-p3 chu de sieu doan RB_PRON_TOPICS; tong 616 -> 620; bo loc Luyen tap TC them "Phát âm") */ /* v166: sua thu tu hoc dot 1 (F0+F9+F1+F7) — F0: 44 am EN len buoc 1 chuong 1 (RB_CH1_STEPS); F9: cau muc tieu chuong 1 liet ke 44 am truoc; F1: man chinh moi lam chan doan phat am sau khi xep chang (ca 4 track, khong chan duong hoc; EN xep Band 2,0+ them nut On nhanh 44 am); F7: quy tac ngu phap EN/ZH mo san lan dau vao bai, cac lan sau nho trang thai */ /* v165: sua 4 loi noi dung soi lan 3 — Q2 entry TP doi thanh dang ghep am theo tung am tiet + why day bien am hakkyo; onrain->ollain x5 + yerul->yereul x2 (RR); them gram vao MICRO_SKILLS.tp.read; vi du iong doi 用 yong -> 穷 qiong */ /* v164: P3 — nghe lai giong minh vs giong mau trong vong cham buoc 4 + bai am (ELSA P3): ghi song song bang sylStartWave trong luc doc to cham tang 1, hien audio + cap song 2 duong (mau vs minh) ngay sau lan doc; nut ghi rieng chi la du phong khi ban ghi song song chua co; khong cham diem phan nghe lai, khong mic -> chi dong ghi chu lang */ /* v163: P1 — phien 3 luot (ELSA P1): moi lan tap lai chi sua 1 loi — helper p3 dung chung cho buoc 4 the tu 4 track + man chi tiet am tiet + Drill + vong noi-cham sieu am doan v162 (luot 1 noi tu nhien lay baseline -> luot 2 chi sua 1 loi dau tien/am yeu nhat -> luot 3 noi lai ca cau/tu o toc do binh thuong; luot 1 dung het thi di thang luot 3, khong bia loi); cham duy nhat tang 1 SR nhi phan, khong mic -> nghe + go lai */ /* v162: sua S20 phan 4 — 12 chu de sieu am doan thanh bai noi-cham (ELSA 7): vong noi-cham sau ly thuyet moi chu de (nghe phan biet 1 cau hoi tu soan -> doc to 3 cau mau cham tang 1 SR + tu doi chieu bat buoc nghe lai giong minh + dang song 2 duong -> noi tu do 1-2 cau, khong cham diem gia); cau lap nhieu nhat vao So loi sai; khong mic -> nghe + go lai */ /* v161: sua S20 phan 3 — Your Journey (ELSA 8): khoi theo doi tien do truc quan ngay duoi ke hoach ngay trong the "Viec hom nay" (cap hien tai -> cap tiep theo -> thanh % chang hien tai -> uoc tinh thoi gian toi moc tiep theo tu toc do that 7 ngay); state.stepLog ghi buoc lo trinh vua xong lan dau (ch1/tcMarkDone/tpMarkDone/zhAwardOnce tru ph:/bai EN RB qua logStepDoneIfRb) */ /* v160: sua S20 phan 2 — Study Sets phat am "Tu cua toi" (ELSA 9): nut "Luyen phat am bo tu nay" trong muc Tu cua toi, phien toi da 10 tu (nghe mau -> doc to cham tang 1 SR), tu sai vao So loi sai + hang doi SRS phat am v159, tong ket + hen on lai sau 7 ngay */ /* v159: sua S20 phan 1 — SRS phat am: am yeu (chan doan + bai am) + tu con sai (buoc 4 / man chi tiet am tiet) vao hang doi on 1-3-7-14-30 ngay (pronSrs), dung 2 lan cach quang moi tot nghiep; hien chung o trang chu "Den han on" + the "Viec hom nay" + 4 tab On tap; vong on nghe mau -> doc to cham tang 1 SR, khong mic -> nghe + go lai */ /* v158: sua S19 phan 3/3 — bai tap viet cau tu do (P4): buoc cuoi cua bai ngu phap (khung Viet 3 buoc: viet -> tu cham 3 tieu chi / AI cham 4 tieu chi chi VIP -> viet lai ban sua, luu ca hai ban); mo tu cuoi bai ngu phap 4 track + bo loc Luyen tap (skill Viết câu) */ /* v157: sua S19 phan 2/3 — Drill lap 1 cau (P9): 1 man 1 cau, nghe mau -> doc to (SR tang 1 nhi phan), sai lap dung cau do, 5 cau/luot, tong ket + cau lap nhieu nhat vao So loi sai; khong mic -> nghe + go lai; mo tu man video (nut thu 5) + bo loc Luyen tap (skill Drill) + chon nguon video/bai doc */ /* v156: sua S19 phan 1/3 — cong tac 3 che do phu de (Song ngu / Chi ngon ngu goc / Chi tieng Viet) dung chung cho Truyen, Podcast, Shadowing, cot Ban chep workspace; che do luu o state.subMode, mo lai video van giu */ /* v155: sua S18 — man chi tiet am tiet co waveform 2 duong (mau vs minh) cung truc thoi gian; duong mau la duong bao tham chieu tu trong am/duong thanh, ghi ro khong phai song do duoc; duong minh la song that tu ban ghi MediaRecorder */ /* v154: sua S17 — goi y tung bac + diem tu luc (U4), phien tron 60/20/20 + vung vua suc 65–75% (U5), cay micro-skill 4 track (U8) */ /* v153: sua S16 — bai Doc EN chua loi 6 buoc + hien % tu moi */ /* v152: sua S15 — them 8 buoc Viet vao lo trinh TOEIC (w0-w7, 2 moi chang; tong 608 -> 616, v290/l160/r120/g22/s8/w8/c4/m4); chip "Viết" hien lai o bo loc Luyen tap TC */ /* v151: sua S14 — the thi thu TOPIK I tren Ban do ghi "70 câu · 100 phút" (lay tu man chi tiet tpOpenMock: 70 cau, thoi gian tham khao 100 phut; the TOPIK II giu nguyen, chua ghi gio tren the) */ /* v150: sua S13 — moi the game ghi 1 dong luat ngan duoi mo ta (Luyen Go/Rong Bay/Ban Bong Bong/Rong Lua; Giai Do da du luat nen giu nguyen) */ /* v149: sua S12 — lua chon ky nang bo loc Luyen tap chi hien loai co bai that theo track (dem tu pfBuildItems; EN du 11, ZH chi Tu vung, TC +Noi, TP +Noi/Viet); bai Noi TC/TP duoc nhan "Nói" trong skillOf */ /* v148: sua S11 — form "Noi dung cua ban" chi o phien am cua track dang hoc moi gan (*); 2 o con lai ghi "(khong bat buoc)" nho (nhan doi theo #myFTrack) */ /* v147: sua S10 — the "Viec hom nay" gan am yeu (toi da 2 am tu pronWeakData) + 1 tu con sai tu So loi sai + ke hoach ngay 3 nhiem vu + dong Hanh trinh; khach moi 4 track deu thay the (1 viec bat dau) */ /* v146: sua S9 — muc tieu ngay them 3 nut preset 10/15/20 (setGoal ha muc toi thieu 15 -> 10 de preset 10 dat dung 10; giu toi da 180 + buoc 5 + o chinh tu do) */ /* v145: sua S8 — mo ta am r tieng Trung: "rung nhe" -> "hoi ma sat nhe, day thanh rung" (am xat huu thanh quat luoi [ʐ], khong rung luoi); quiz buoc initials + chan doan ZH doi theo */ /* v144: sua S7 — muc HSKK Cao cap danh dau ro "Câu chính thức" (muc 1-6, dung de chinh thuc 3+1+2) hay "Luyện thêm" (muc 7-16); So/Trung toan bo la cau chinh thuc nen khong danh dau them */ /* v143: sua S6 — the chang Ban do ZH ghi ro cap HSK (Chặng N · HSK N; chang N = HSK N) */ /* v142: sua S5 — nut Xong bai Noi TC/TP chi mo sau khi nghe het mau VA doc to it nhat 1 cau (dung/sai deu duoc); may khong mic / khong SR mien doc to */ /* v141: sua S1 — man chi tiet am tiet TP them muc bien am that (lien am 국어 [구거], dong hoa mui hoa 업무 [엄무], cang hoa 학교 [학꾜], tu that trong kho TP + nut nghe mau) */ /* v140: sua S4 — man ly thuyet Shadowing ZH dung khung tieng Trung (nghe tung cau -> nhac lai dung thanh dieu -> so sanh voi mau), tieu de dem that 24 cau hoi thoai */ /* v139: sua M7 — hang "Video co phu de that" moi track mo video that cua chinh track do (ZH mo zh-e10; TC/TP an hang cho toi khi co video that) + TTS workspace dung giong zh-CN/ko-KR */ /* v138: sua M2 — huong dan "AI cham 4–5 tieu chi" -> "AI cham 4 tieu chi" (3 cho index.html 5229/11137/20393; theo M2 + RB_SPEAK/WRITE_CRITERIA_TXT) */ /* v136: 16 bai Noi TOPIK s0-s15 (M6) — 2 bai/chang, ngay truoc kiem tra cuoi chang nhu TC v127 */ /* v135: bo sung 19 van mau Pinyin (ia/ie/iao/iu/ian/in/iang/ing/iong/ua/uo/uai/ui/uan/un/uang/ueng/er/ong) — ban do 40 -> 59 am, nhan dem dong tu mang */ /* v134: mo rong entry HSK 10 -> 16 cau (thanh dieu/pinyin -> tu vung HSK2-4 -> ngu phap/doc hieu HSK3-6), nguong xep toi chang 6; bo cau hoi "ma khong dau" gay hieu nham */ /* v133: va nut Hoc ngay ZH — pronWeakData giai quyet target null qua pronWeakSymInfo (sym ngoai bo chan doan mo ban do am ZH, khong roi ve EN) */ /* v132: sua M1 — cau huong dan So loi sai: sai thi nac giu nguyen, chuoi dung lien tiep ve 0, hen on lai ngay mai (hardJudge khong doi) */ /* v131: man chi tiet tung am tiet (ELSA muc 6 + oc sen 0,5x + TID U1) + va loi ZH pronWeakSymInfo (khong roi ve ban do EN) + tpSpeak them rate */ /* v130: don chu thich code (sua 9 chu thich sai/lac hau: v119b, GĐ2, 44 am, kiem tra cuoi chuong, the tu, hub nghe ZH, TOPIK II cap 3-6, so iframe lazy, URL sw.js) */ /* v129: Tro giang AI sang ZH/TC/TP (specTutorGroupHTML + specTutorPrompt theo track + cong VIP man Tro giang) */ /* v128: cot moc Viet ZH/TC/TP dung chung callAiTutorWriting + parseAiDetailReply (chi khac nhan de) */ /* v127: 8 bai Noi TOEIC s0-s7 (2 moi chang) */ /* v126: video ZH dau tien co phu de that zh-e10 (Better in Chinese) + nghe chep/Shadowing/Podcast tieng Trung */ /* v125: sua 3 cau huong dan noi qua ve cham buoc 4 (tang 1 SR nhi phan, khong phai AI cham tung am) */ /* v124: guong quy dao (MediaPipe, chi-nhin, khong diem) + tach mic/guomg o buoc 4 + nhan HSKK Cao cap du 3 phan */ /* v123: muc phat am rieng TC/TP, cham thanh dieu YIN, HSKK cham that tang 1 */ /* v121: can doi giao dien khi ban phim hien (man ket rieng, che do gon viewport thap, the Giai Do cuon duoc, viewport resizes-content) */ /* v122: lam lai phat am (mo 44 am, bai am 4 man, mot thang cham tang 1, het ket chan doan) */ /* v120b: 3 cho sua render the tu (o dap an to, an menu trai + chan trang, nut Tiep tuc sau dap an sai) */
var CACHE_ASSETS = ["./", "index.html", "content.js", "content-new.js", "config.js", "g71_common.js", "g71_luyen_go.js", "g71_rong_bay.js", "g71_ban_bong_bong.js", "g71_rong_lua.js", "g71_giai_do.js", "assets/ronglua/nen-rung.png", "assets/ronglua/rung-1.jpg", "assets/ronglua/rung-2.jpg", "assets/ronglua/rung-3.jpg", "assets/ronglua/rong-lua-nho.png", "assets/ronglua/quai-bong-toi.png", "assets/ronglua/quai-lua-badge.png", "assets/ronglua/quai-nuoc-badge.png", "assets/ronglua/quai-dien-badge.png", "assets/ronglua/dong-xu-vang.png", "assets/ronglua/binh-thuoc.png", "assets/ronglua/khien.png", "assets/rongbay/rong-bay.png", "assets/rongbay/may-trang.png", "assets/rongbay/may-vang.png", "assets/rongbay/may-giong.png", "assets/audio/nhac-rung.mp3"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(CACHE_ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== CACHE_VERSION) return caches.delete(name);
        return Promise.resolve();
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match("./"); });
    })
  );
});

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || "Nhắc học";
  var body = data.body || "Đến giờ ôn bài rồi — mở web để giữ chuỗi học.";
  var url = data.url || "./";
  event.waitUntil(
    self.registration.showNotification(title, { body: body, data: { url: url } })
  );
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
