/* Service worker cho web học ngôn ngữ bản mới — cache file tĩnh + hiện
   v112c-retry: đẩy lại để kích hoạt run Pages mới (run #199 kẹt Queued từ 02:37).
   thông báo nhắc học khi có push.
   Đăng ký từ index.html (navigator.serviceWorker.register("sw.js")).
   File này phải được đẩy kèm index.html + content-new.js lên cùng thư mục
   gốc của web (https://slb-md.github.io/ielts/sw.js) thì push khi đóng
   trang mới hoạt động. Không chứa khóa bí mật nào. */

/* Cache: tên cache đổi theo phiên bản (CACHE_VERSION) thì bản mới sẽ thay
   hẳn cache cũ. Khi sw.js đổi byte, trình duyệt tự cài service worker mới;
   install nạp lại toàn bộ file tĩnh, skipWaiting + claim để bản mới có hiệu
   lực ngay, không để người học kẹt bản cũ. Đợt đẩy nào đổi file tĩnh thì
   nhớ đổi CACHE_VERSION trong file này. */
var CACHE_VERSION = "ielts-cache-v124"; /* v124: guong quy dao (MediaPipe, chi-nhin, khong diem) + tach mic/guomg o buoc 4 + nhan HSKK Cao cap du 3 phan */ /* v123: muc phat am rieng TC/TP, cham thanh dieu YIN, HSKK cham that tang 1 */ /* v121: can doi giao dien khi ban phim hien (man ket rieng, che do gon viewport thap, the Giai Do cuon duoc, viewport resizes-content) */ /* v122: lam lai phat am (mo 44 am, bai am 4 man, mot thang cham tang 1, het ket chan doan) */ /* v120b: 3 cho sua render the tu (o dap an to, an menu trai + chan trang, nut Tiep tuc sau dap an sai) */
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
