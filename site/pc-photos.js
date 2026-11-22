/* PeaceCream photo shelf: finished branded photos saved in this browser's IndexedDB.
 * Photos never leave the device and are never published to the World Map. */
(function (root) {
  'use strict';
  const DB = 'peacecream-photos', STORE = 'photos', VERSION = 1;
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
        const req = root.indexedDB.open(DB, VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => { const db = req.result; db.onclose = () => { dbPromise = null; }; db.onversionchange = () => { db.close(); dbPromise = null; }; resolve(db); };
        req.onerror = () => reject(req.error);
      });
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  }
  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      const result = fn(s);
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('aborted'));
    }));
  }
  const uid = () => (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

  /** @param {{blob: Blob, caption: string, template: string, format: string, mode: string}} entry */
  function save(entry) {
    if (!(entry.blob instanceof Blob)) return Promise.reject(new Error('Nothing to save yet.'));
    const record = { id: uid(), blob: entry.blob, caption: String(entry.caption || '').slice(0, 80), template: entry.template, format: entry.format, mode: entry.mode, createdAt: new Date().toISOString() };
    return tx('readwrite', s => s.put(record)).then(() => record);
  }
  function list() {
    return tx('readonly', s => s.getAll()).then(rows => (rows || []).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  }
  function remove(id) { return tx('readwrite', s => s.delete(id)); }
  function clear() { return tx('readwrite', s => s.clear()); }

  root.PeacePhotos = { save, list, remove, clear };
})(window);
