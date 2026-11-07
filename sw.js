const V='agac-scada-v12',ASSETS=['./','index.html','offline.html','manifest.webmanifest','favicon.svg','favicon.ico','apple-touch-icon.png','og-image.png','css/styles.css','js/app.js','js/calculators.js','js/field-guide.js','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-192.png','icons/icon-maskable-512.png'];
const EXT=['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(async c=>{await c.addAll(ASSETS);await Promise.all(EXT.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)))}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(h=>h.put(r,c));return x}).catch(()=>caches.match(r).then(m=>m||caches.match('offline.html'))));return}
  if(/\.(css|js|svg|png|ico|woff2?|webmanifest)$/.test(new URL(r.url).pathname)){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x}).catch(()=>caches.match('offline.html'))))}
});
// Hooks for SCADA telemetry alarms (wire to a backend later)
self.addEventListener('sync',e=>{if(e.tag==='alarm-sync')e.waitUntil(Promise.resolve())});
self.addEventListener('push',e=>{const d=e.data?e.data.text():'SCADA alarm';e.waitUntil(self.registration.showNotification('AGAC SCADA',{body:d,icon:'icons/icon-192.png',tag:'scada-alarm'}))});
