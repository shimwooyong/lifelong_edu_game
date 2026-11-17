// 조별 게임 규칙 (화면과 무관). 게임 상태 G를 받아 바꾼다.
const Logic = (() => {
  const M = () => SETTINGS.multi;
  const ROLES = { p1: "부모 1", p2: "부모 2", c1: "자녀 1", c2: "자녀 2" };
  const TRACK = { child: "자녀", parent: "부모" };
  const evById = (id) => EVENTS.find((e) => e.id === id);
  const stageOf = (age) => STAGES.find((s) => age >= s.from && age <= s.to) || STAGES[STAGES.length - 1];

  // 서버에서 빈 목록·빈 객체가 사라지므로 다시 채워 준다
  function normalize(G) {
    if (!G) return G;
    G.log = G.log || [];
    G.pending = G.pending || {};
    G.world = G.world || {}; G.newsSeen = G.newsSeen || {}; G.hist = G.hist || []; G.afterNews = G.afterNews || {};
    if (G.waitNews === undefined) G.waitNews = null;
    for (const k of ["child", "parent"]) {
      const c = G.chars[k];
      c.flags = c.flags || {}; c.done = c.done || {}; c.edu = c.edu || [];
      c.mentorRolled = c.mentorRolled || {}; c.mentorCount = c.mentorCount || 0;
    }
    for (const t in G.pending) {
      const p = G.pending[t];
      p.votes = p.votes || {}; p.ack = p.ack || {}; p.order = p.order || []; p.locked = p.locked || [];
    }
    return G;
  }

  // ── 확률 ──
  function luck(G) {
    const L = SETTINGS.luck;
    return Math.max(L.min, Math.min(L.max, Math.sqrt((G.asset || 0) / L.base)));
  }
  function toneOf(o) {
    if (o.good === true || o.good === false) return o.good;
    const a = (o.effects || {}).자산;
    return a > 0 ? true : a < 0 ? false : null;
  }
  const weighted = (G, p, tone) => (tone === true ? p * luck(G) : tone === false ? p / luck(G) : p);
  const goodEdu = (ch) => new Set(ch.edu.filter((e) => e.good).map((e) => e.name)).size;

  function meets(G, ch, req) {
    if (!req) return true;
    const stats = { 자산: G.asset };
    for (const k in req.min || {}) if (!(stats[k] >= req.min[k])) return false;
    for (const k in req.max || {}) if (!(stats[k] <= req.max[k])) return false;
    for (const f of req.flags || []) if (!ch.flags[f]) return false;
    for (const f of req.notFlags || []) if (ch.flags[f]) return false;
    if (req.eduCount && ch.edu.length < req.eduCount) return false;
    if (req.goodEdu && goodEdu(ch) < req.goodEdu) return false;
    if (req.maxGoodEdu != null && goodEdu(ch) > req.maxGoodEdu) return false;
    for (const f of req.world || []) if (!(G.world && G.world[f])) return false;
    for (const f of req.notWorld || []) if (G.world && G.world[f]) return false;
    return true;
  }

  // ── 브레이킹 뉴스 ──
  const hasNews = () => typeof NEWS !== "undefined";
  const birthYear = () => (hasNews() ? NEWS.birthYear : 2026);
  const yearOf = (G) => birthYear() + (G ? G.year : 0);
  const newsSlotAt = (age) => (hasNews() ? NEWS.ages.indexOf(age) : -1);
  // pick: 방마다 정한 후보 번호 목록
  const newsItem = (pick, k) => (hasNews() && pick && NEWS.slots[k] ? NEWS.slots[k][pick[k] || 0] : null);
  const worldItem = (id) => { if (!hasNews()) return null; for (const s of NEWS.slots) for (const n of s) if (n.id === id) return n; return null; };

  function applyNews(G, k, item) {
    G.world[item.id] = true;
    G.newsSeen[k] = item.id;
    const at = NEWS.ages[k];
    addLog(G, `📰 ${birthYear() + at}년 속보: ${item.headline}`, "news");
    G.log[G.log.length - 1].y = at;
    const sh = item.shock ? item.shock(G) : null;
    if (sh && sh.asset) {
      G.asset = Math.max(0, Math.round(G.asset + sh.asset));
      addLog(G, `📰 뉴스 영향: 가족 자산 ${sh.asset > 0 ? "+" : ""}${sh.asset} (${sh.note})`, "news");
      G.log[G.log.length - 1].y = at;
      G.hist.push([at, G.asset]);
    }
    G.newsJust = k;
  }

  // 뉴스가 바꾼 세상에서의 추가 자산 효과
  function worldMods(G, ev, c, ch, base) {
    let add = 0; const notes = [];
    for (const id in G.world) {
      const n = worldItem(id);
      for (const m of (n && n.mods) || []) {
        if (!m.test(ev, c, ch, G)) continue;
        const a = typeof m.asset === "function" ? m.asset(base) : m.asset;
        if (a) { add += a; notes.push(m.note); }
      }
    }
    return { add, notes };
  }
  // 멘토링 최고 선택이 뉴스로 바뀌었는지
  function mentorSwap(G, evId) {
    for (const id in G.world) { const n = worldItem(id); if (n && n.mentor && n.mentor[evId]) return { id, ...n.mentor[evId] }; }
    return null;
  }

  // 배운 이유: 외적 동기(시험·자격·취업·학위) / 내적 동기(관심·체험·나눔) / 기본 학교(구분 안 함)
  function motiveOf(c, eduName) {
    if (c.motive) return c.motive;
    const s = (eduName || "") + " " + (c.text || "");
    if (/어린이집|유치원|초등학교|일반 고등학교|특성화고|4년제 대학교|전문대학$/.test(eduName || "")) return "기본";
    if (/학원|자격|시험|선행|재수|특목|특수목적|컨설팅|취업|직업훈련|직무|학위|대학원|학점은행|방송통신|사이버|편입|검정고시|교환학생|일학습병행|신입사원|전직|요양보호사|재교육|장학/.test(s)) return "외적";
    return "내적";
  }
  function motiveCounts(G) {
    const m = { 외적: 0, 내적: 0, 기본: 0 };
    for (const k of ["child", "parent"]) for (const e of G.chars[k].edu) m[e.motive || "내적"]++;
    return m;
  }

  // {이름} + 조사 처리
  function fill(text, name) {
    name = name || "";
    const last = name.charCodeAt(name.length - 1);
    const has = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
    const josa = { "이(가)": ["이", "가"], "은(는)": ["은", "는"], "을(를)": ["을", "를"],
      "과(와)": ["과", "와"], "아(야)": ["아", "야"], "으로(로)": ["으로", "로"] };
    return (text || "")
      .replace(/\{이름\}(이\(가\)|은\(는\)|을\(를\)|과\(와\)|아\(야\)|으로\(로\))/g, (_, j) => name + josa[j][has ? 0 : 1])
      .replace(/\{이름\}/g, name);
  }

  function addLog(G, t, k = "", who = "child") { G.log.push({ t, k, y: G.year, w: who }); }

  // ── 새 게임 ──
  function newGame(childName, clsName) {
    const list = SETTINGS.startClasses;
    // 관리자가 정해 준 분위가 있으면 그대로, 없으면 확률대로
    let cls = list.find((c) => c.name === clsName);
    let r = Math.random() * list.reduce((a, c) => a + c.chance, 0);
    if (!cls) { cls = list[list.length - 1]; for (const c of list) { r -= c.chance; if (r < 0) { cls = c; break; } } }
    const spread = 1 + (Math.random() * 2 - 1) * (SETTINGS.startSpread || 0);
    const mk = (name, age) => ({ name, age, flags: {}, done: {}, edu: [], mentorRolled: {}, mentorCount: 0 });
    const G = {
      year: 0, asset: Math.round(cls.asset * spread), cls: cls.name,
      chars: { child: mk(childName, 0), parent: mk("부모님", M().gap) },
      log: [], pending: {}, ended: false, stage: stageOf(0).id,
      world: {}, newsSeen: {}, hist: [], afterNews: {}, waitNews: null,
    };
    G.hist.push([0, G.asset]);
    addLog(G, `── 자녀 ${G.stage} ──`, "stage");
    addLog(G, fill(`{이름}이(가) ${birthYear()}년, ${cls.text}에서 태어났다. (${cls.name}, 가족 자산 ${G.asset})`, childName));
    return G;
  }

  // 지금 이 이벤트를 결정하는 역할
  const deciders = (G, track) => (track === "parent" || G.year < M().independentAge ? ["p1", "p2"] : ["c1", "c2"]);

  function findEvent(G, track) {
    const ch = G.chars[track];
    const fixed = EVENTS.filter((e) => e.age != null), ranged = EVENTS.filter((e) => e.age == null);
    return [...fixed, ...ranged].find((e) => {
      if (ch.done[e.id]) return false;
      const ok = e.age != null ? e.age === ch.age : e.ages ? ch.age >= e.ages[0] && ch.age <= e.ages[1] : false;
      if (!ok || !meets(G, ch, e.requires)) return false;
      return e.chance == null || Math.random() < weighted(G, e.chance, toneOf(e));
    });
  }

  function openEvent(G, track, ev) {
    const ch = G.chars[track];
    ch.done[ev.id] = true;
    const idx = ev.choices.map((_, i) => i).filter((i) => meets(G, ch, ev.choices[i].requires));
    // mentor: 교수님 찬스로 골라질 '최고 선택' 번호(-1이면 이 이벤트에선 찬스 못 씀), t0: 선택 시작 시각(타이머)
    const p = { ev: ev.id, order: [], locked: [], mentor: -1, votes: {}, ack: {}, t0: Date.now() };

    // 교수님 찬스: 최고 선택이 정해진(뻔하지 않은) 이벤트에서만, 인생 양끝 구간 제외
    const sw = mentorSwap(G, ev.id);
    const swIdx = sw ? idx.find((i) => ev.choices[i].text.includes(sw.pick)) : undefined;
    const best = swIdx !== undefined ? swIdx : idx.find((i) => ev.choices[i].mentor);
    if (swIdx !== undefined) p.msw = sw.id;
    const MM = SETTINGS.mentoring;
    const edge = SETTINGS.maxAge * ((MM && MM.edge) || 0);
    if (best !== undefined && MM && ch.age >= edge && ch.age <= SETTINGS.maxAge - edge) p.mentor = best;
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    p.order = idx;
    const cost = (i) => -((ev.choices[i].effects || {}).자산 || 0);
    const canLock = idx.some((i) => cost(i) <= G.asset);
    p.locked = canLock ? idx.filter((i) => cost(i) > 0 && G.asset < cost(i)) : [];
    G.pending[track] = p;
  }

  // 다음 이벤트가 나올 때까지 해를 넘긴다
  // news: { pick: 방의 뉴스 후보 번호, done: 발표가 끝난 뉴스 } — 없으면 뉴스 없이 진행
  function advance(G, news) {
    if (G.ended || Object.keys(G.pending).length) return G;
    for (;;) {
      const k = newsSlotAt(G.year + 1);
      if (k >= 0 && news && news.pick && G.newsSeen[k] === undefined) {
        const item = newsItem(news.pick, k);
        if (item && !(news.done && news.done[k])) { G.waitNews = k; return G; } // 앵커 발표를 기다림
        if (item) applyNews(G, k, item);
      }
      G.waitNews = null;
      G.year++;
      const c = G.chars.child, pa = G.chars.parent;
      c.age = G.year; pa.age = G.year + M().gap;
      if (G.year > M().childEnd) { finish(G); return G; }
      const st = stageOf(c.age);
      if (st.id !== G.stage) { G.stage = st.id; addLog(G, `── 자녀 ${st.id} ──`, "stage"); }
      if (G.year === M().independentAge) addLog(G, `── ${c.name} 독립: 이제 자녀가 스스로 선택합니다 ──`, "stage");
      if (G.year === M().parentStart) addLog(G, `── 부모님 ${pa.age}세: 이제 부모님의 이벤트도 함께 나옵니다 ──`, "stage");
      const ec = findEvent(G, "child");
      const ep = G.year >= M().parentStart ? findEvent(G, "parent") : null;
      // 같은 해에 둘 다 나오면 부모 이벤트 먼저, 끝나면 자녀 이벤트
      if (ep) { openEvent(G, "parent", ep); if (ec) G.queued = ec.id; }
      else if (ec) openEvent(G, "child", ec);
      if (ec || ep) return G;
    }
  }

  // 결과 다시 계산(화면 표시용)
  function resultOf(p) {
    const ev = evById(p.ev), c = ev.choices[p.res.c];
    let out = c;
    if (p.res.m) out = mentorOut(p, c);
    else if (p.res.o >= 0) out = c.outcomes[p.res.o];
    return { ev, c, out };
  }
  function mentorOut(p, c) {
    const sw = p.msw && worldItem(p.msw) && worldItem(p.msw).mentor[p.ev];
    const m = sw || c.mentor || {};
    return { ...c, effects: m.effects || c.effects, result: m.result || c.result };
  }

  function resolve(G, track, i, mentored = false) {
    const p = G.pending[track], ev = evById(p.ev), c = ev.choices[i], ch = G.chars[track];
    let out = c, oi = -1;
    if (mentored) out = mentorOut(p, c);
    else if (c.outcomes) {
      const ws = c.outcomes.map((o) => weighted(G, o.chance, toneOf(o)));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      oi = ws.length - 1;
      for (let k = 0; k < ws.length; k++) { r -= ws[k]; if (r < 0) { oi = k; break; } }
      out = c.outcomes[oi];
    }
    const before = G.asset;
    const base = ((out.effects || {}).자산) || 0;
    const wm = worldMods(G, ev, c, ch, base);
    G.asset = Math.max(0, Math.round(before + base + wm.add));
    G.hist.push([G.year, G.asset]);
    for (const f of [].concat(c.flags || [], out.flags || [])) ch.flags[f] = true;
    const eduName = out.edu !== undefined ? out.edu : c.edu;
    const good = (out.eduGood !== undefined ? out.eduGood : c.eduGood) !== false;
    if (eduName) ch.edu.push({ age: ch.age, name: fill(eduName, ch.name), good, motive: motiveOf(c, eduName) });
    p.res = { c: i, o: oi, d: G.asset - before, e: eduName ? 1 : 0, m: mentored ? 1 : 0, n: wm.add, nn: wm.notes.join(", ") };
    // 뉴스 직후 첫 선택 기록 (결과 비교용)
    if (G.newsJust != null) {
      G.afterNews[G.newsJust] = { w: track, ev: fill(ev.title, ch.name), c: fill(c.text, ch.name) };
      G.newsJust = null;
    }
    addLog(G, `${mentored ? "🎓 교수님 찬스 · " : ""}${fill(ev.title, ch.name)} → ${fill(c.text, ch.name)}`, "event", track);
  }

  const CHANCE = -2; // 투표값: 교수님 찬스
  const canChance = (G, p) => p && p.mentor >= 0 && !G.chanceUsed;
  // 투표값 v로 확정 (찬스면 최고 선택 + 찬스 사용 처리)
  function settle(G, track, v) {
    const p = G.pending[track];
    if (v === CHANCE) { G.chanceUsed = true; resolve(G, track, p.mentor, true); }
    else resolve(G, track, v);
  }

  // 선택(투표): 결정하는 두 사람이 같은 선택지(또는 둘 다 교수님 찬스)를 고르면 확정
  function vote(G, track, role, i) {
    const p = G.pending[track];
    if (!p || p.res || !deciders(G, track).includes(role)) return G;
    if (i === CHANCE && !canChance(G, p)) return G;
    p.votes[role] = i;
    const v = deciders(G, track).map((r) => p.votes[r]);
    if (v.every((x) => x !== undefined && x === v[0])) settle(G, track, v[0]);
    return G;
  }

  // 제한시간이 지나면: 한 명만 골랐으면 그것, 둘이 다르면 둘 중 무작위, 아무도 안 골랐으면 전체 중 무작위
  const limitMs = () => (M().choiceSeconds || 60) * 1000;
  function timeout(G, track) {
    const p = G.pending[track];
    if (!p || p.res || !p.t0 || Date.now() - p.t0 < limitMs()) return G;
    const vs = deciders(G, track).map((r) => p.votes[r]).filter((x) => x !== undefined && (x !== CHANCE || canChance(G, p)));
    const pool = vs.length ? vs : p.order.filter((i) => !p.locked.includes(i));
    const pickV = pool.length ? pool[Math.floor(Math.random() * pool.length)] : p.order[0];
    p.timedOut = 1;
    settle(G, track, pickV);
    return G;
  }

  // 확률 결과가 있는 선택지의 실제 확률(%) — 자산에 따라 달라짐
  function probs(G, c) {
    if (!c.outcomes) return null;
    const ws = c.outcomes.map((o) => weighted(G, o.chance, toneOf(o)));
    const sum = ws.reduce((a, b) => a + b, 0) || 1;
    return c.outcomes.map((o, k) => ({ p: Math.round((ws[k] / sum) * 100), good: toneOf(o) !== false }));
  }

  // 자산 → 소득분위 (출발 때 쓴 10분위 자산표 기준, 가장 가까운 분위)
  function decileOf(asset) {
    const list = SETTINGS.startClasses;
    let best = list[0];
    for (const c of list) if (Math.abs(c.asset - asset) < Math.abs(best.asset - asset)) best = c;
    return best.name;
  }

  // 결과 확인: 두 사람 모두 '계속'을 누르면 닫힘
  function ack(G, track, role) {
    const p = G.pending[track];
    if (!p || !p.res || !deciders(G, track).includes(role)) return G;
    p.ack[role] = true;
    if (deciders(G, track).every((r) => p.ack[r])) {
      const { c, out } = resultOf(p);
      const next = evById(out.next || c.next);
      delete G.pending[track];
      if (next) openEvent(G, track, next);
      // 부모 이벤트가 끝나면 기다리던 자녀 이벤트를 연다
      if (!Object.keys(G.pending).length && G.queued) {
        const q = evById(G.queued); G.queued = null;
        if (q) openEvent(G, "child", q);
      }
    }
    return G;
  }

  function finish(G) {
    G.ended = true;
    G.year = M().childEnd;
    G.chars.child.age = G.year; G.chars.parent.age = G.year + M().gap;
    const n = goodEdu(G.chars.child);
    const end = ENDINGS.find((e) => !e.requires || !e.requires.goodEdu || n >= Math.round(e.requires.goodEdu * M().endingScale))
      || { title: "끝", text: "" };
    G.ending = { title: fill(end.title, G.chars.child.name), text: fill(end.text, G.chars.child.name) };
    addLog(G, `자녀가 ${G.year}세가 되었다. 게임 끝!`, "stage");
  }

  return { ROLES, TRACK, normalize, newGame, advance, vote, ack, deciders, resultOf, evById, stageOf, fill, goodEdu,
    yearOf, birthYear, newsItem, motiveCounts, timeout, probs, decileOf, canChance, CHANCE, limitMs };
})();
