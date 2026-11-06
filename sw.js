const C='tienda-v8';
const SHELL=['./','index.html','catalogo.html','config.js','manifest.webmanifest','icon-192.png','icon-512.png'];
const LIBS=['https://cdn.tailwindcss.com','https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js','https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js','https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
// Una respuesta que vino de una redirección (ej. /index.html -> /) NO se puede usar para abrir una página: da ERR_FAILED. Se limpia.
const clean=async r=>{if(r&&r.redirected){const b=await r.blob();return new Response(b,{status:200,statusText:'OK',headers:r.headers})}return r};
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(C);
  await Promise.all(SHELL.map(u=>fetch(u).then(async r=>{if(r&&r.ok)await c.put(u,await clean(r))}).catch(()=>{})));
  await Promise.all(LIBS.map(u=>fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)).catch(()=>{})));
  self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
const SKIP=/firestore\.googleapis|identitytoolkit|securetoken|dolarapi|firebaseinstallations|googleapis\.com\/(?!.*fonts)/;
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||SKIP.test(u.host+u.pathname))return;
  if(u.origin!==location.origin){ // librerías/fuentes: caché primero
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x&&(x.ok||x.type==='opaque')){const c=x.clone();caches.open(C).then(ch=>ch.put(r,c))}return x})));return}
  e.respondWith((async()=>{
    const fromCache=async()=>{let m=await caches.match(r,{ignoreSearch:true});
      if(!m&&r.mode==='navigate'){m=await caches.match(/catalogo/.test(u.pathname)?'catalogo.html':'./')||await caches.match('index.html')}
      return clean(m)};
    const net=fetch(r);
    net.then(async x=>{if(x&&x.ok){const c=await caches.open(C);await c.put(r,await clean(x.clone()))}}).catch(()=>{});
    try{return await Promise.race([net,new Promise((_,j)=>setTimeout(()=>j(new Error('t')),3500))])}
    catch(err){const m=await fromCache();return m||Response.error()}})())});
