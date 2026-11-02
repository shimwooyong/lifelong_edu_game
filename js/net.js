// 데이터 주고받기: Firebase가 설정돼 있으면 Firebase, 아니면 브라우저 안(로컬 테스트)
const Net = (() => {
  const ROOT = window.GAME_ROOT || "lifelong";
  const cfg = window.FIREBASE_CONFIG || {};
  const getAt = (obj, path) => path.split("/").filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

  if (cfg.databaseURL && window.firebase) {
    firebase.initializeApp(cfg);
    const db = firebase.database();
    const ref = (p) => db.ref(p ? `${ROOT}/${p}` : ROOT);
    return {
      mode: "firebase",
      on(p, cb) { const r = ref(p); const h = (s) => cb(s.val()); r.on("value", h); return () => r.off("value", h); },
      set(p, v) { return ref(p).set(v); },
      // fn이 undefined를 돌려주면 취소
      tx(p, fn) { return ref(p).transaction((cur) => (cur === null ? null : fn(cur))); },
    };
  }

  // ── 로컬 테스트 모드 ──
  const KEY = "mp_db_" + ROOT;
  const subs = new Set();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = (data) => { localStorage.setItem(KEY, JSON.stringify(data)); subs.forEach((f) => f()); };
  window.addEventListener("storage", (e) => { if (e.key === KEY) subs.forEach((f) => f()); });
  const setAt = (data, p, v) => {
    const keys = p.split("/").filter(Boolean);
    if (!keys.length) return v || {};
    let o = data;
    keys.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
    if (v == null) delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = v;
    return data;
  };
  return {
    mode: "local",
    on(p, cb) { const f = () => cb(clone(getAt(read(), p))); subs.add(f); f(); return () => subs.delete(f); },
    set(p, v) { write(setAt(read(), p, clone(v))); return Promise.resolve(); },
    tx(p, fn) {
      const data = read(), cur = clone(getAt(data, p));
      if (cur == null) return Promise.resolve();
      const next = fn(cur);
      if (next !== undefined) write(setAt(data, p, clone(next)));
      return Promise.resolve();
    },
  };
})();
