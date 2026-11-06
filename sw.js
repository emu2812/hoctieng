/* Service worker cho web học ngôn ngữ bản mới — cache file tĩnh + hiện
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
var CACHE_VERSION = "ielts-cache-v106c"; /* v106c: khung bài học không còn dính (hết xén mép trên khi cuộn) + kết quả bài Nói về cột chính */
var CACHE_ASSETS = ["./", "index.html", "content.js", "content-new.js", "config.js", "g71_common.js", "g71_luyen_go.js", "g71_rong_bay.js", "g71_ban_bong_bong.js", "g71_rong_lua.js", "g71_dau_bai.js", "assets/ronglua/nen-rung.png", "assets/ronglua/rong-lua-nho.png", "assets/ronglua/quai-bong-toi.png", "assets/ronglua/quai-lua-badge.png", "assets/ronglua/quai-nuoc-badge.png", "assets/ronglua/quai-dien-badge.png", "assets/ronglua/dong-xu-vang.png", "assets/ronglua/binh-thuoc.png", "assets/ronglua/khien.png"];

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
