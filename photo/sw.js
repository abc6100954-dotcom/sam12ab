/* 工地照片 — 離線快取（上傳本身不經過這裡：POST 與跨網域請求一律放行） */
var CACHE = "site-photo-v1";
var SHELL = ["./", "./index.html", "./manifest.webmanifest",
             "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return (k.indexOf("site-photo-") === 0 && k !== CACHE) ? caches.delete(k) : null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);

  // Google 字型：快取優先
  if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req).then(function(hit){
          if(hit) return hit;
          return fetch(req).then(function(res){
            try{ c.put(req, res.clone()); }catch(err){}
            return res;
          }).catch(function(){ return hit || Response.error(); });
        });
      })
    );
    return;
  }

  if(url.origin !== location.origin) return;

  // 自己的檔案：網路優先（改版才會生效），連不上就用快取
  e.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ try{ c.put(req, copy); }catch(err){} });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match("./index.html"); });
    })
  );
});
