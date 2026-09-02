/* יפן · נובמבר 2026 — service worker
   הקבצים יושבים בשורש הריפו, שהוא שורש japantrip.odysee.me.
   הנתיבים יחסיים, כך שזה יעבוד גם אם יעבור לתת-תיקייה. */
const CACHE = "jp2026-v42";
/* חובה — בלי אלה אין אפליקציה */
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"
];
/* רשות — אם הקובץ עדיין לא הועלה, ההתקנה לא תיפול בגללו */
const EXTRA = ["./about.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(CORE).then(() =>
        Promise.all(EXTRA.map(u => c.add(u).catch(() => {})))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  // את הדף עצמו מביאים קודם מהרשת, כדי שעדכון יופיע מיד.
  // אם אין רשת — נופלים לעותק השמור. כך אופליין נשמר בלי להיתקע על גרסה ישנה.
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html", {ignoreSearch: true}))
    );
    return;
  }

  // כל השאר: קודם מהמטמון.
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});
