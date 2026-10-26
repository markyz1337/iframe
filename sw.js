const CACHE = 'panou-v1';
const PRECACHE = [
  './',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(u =>
        fetch(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' }))
          .then(r => c.put(u, r))
          .catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  // datele Supabase nu se salvează aici (au cache-ul lor în aplicație)
  if (url.hostname.endsWith('supabase.co')) return;

  const store = res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  };

  // pagina: întâi rețeaua, iar fără internet varianta salvată
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(store).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./'))
      )
    );
    return;
  }

  // restul (scripturi, fonturi, imagini): din cache instant, reîmprospătat în fundal
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(store).catch(() => hit);
      return hit || net;
    })
  );
});

