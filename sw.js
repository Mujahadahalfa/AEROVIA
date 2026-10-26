const V='aerovia-v7';
const SHELL=['./','index.html','css/main.css','js/app.js','manifest.webmanifest','assets/images/logo.jpg','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-192.png','assets/icons/icon-maskable-512.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-64.png','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname.endsWith('tile.openstreetmap.org'))return; // peta selalu butuh internet
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
