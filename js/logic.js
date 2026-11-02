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
    return true;
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
    };
    addLog(G, `── 자녀 ${G.stage} ──`, "stage");
    addLog(G, fill(`{이름}이(가) ${cls.text}에서 태어났다. (${cls.name}, 가족 자산 ${G.asset})`, childName));
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
    const p = { ev: ev.id, order: [], locked: [], mentor: -1, votes: {}, ack: {} };

    // 교육 멘토링: 인생 양끝 구간 제외, 시기당 한 번 확률 검사
    const best = idx.find((i) => ev.choices[i].mentor);
    const MM = SETTINGS.mentoring, st = stageOf(ch.age);
    const edge = SETTINGS.maxAge * ((MM && MM.edge) || 0);
    if (best !== undefined && MM && ch.age >= edge && ch.age <= SETTINGS.maxAge - edge && !ch.mentorRolled[st.id]) {
      ch.mentorRolled[st.id] = true;
      const pr = MM.chance * luck(G) * Math.pow(MM.repeat ?? 1, ch.mentorCount);
      if (ch.mentorCount < MM.max && Math.random() < pr) { ch.mentorCount++; p.mentor = best; }
    }
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    p.order = idx;
    const cost = (i) => -((ev.choices[i].effects || {}).자산 || 0);
    const canLock = idx.some((i) => cost(i) <= G.asset);
    p.locked = canLock ? idx.filter((i) => cost(i) > 0 && G.asset < cost(i)) : [];
    G.pending[track] = p;
  }

  // 다음 이벤트가 나올 때까지 해를 넘긴다
  function advance(G) {
    if (G.ended || Object.keys(G.pending).length) return G;
    for (;;) {
      G.year++;
      const c = G.chars.child, pa = G.chars.parent;
      c.age = G.year; pa.age = G.year + M().gap;
      if (G.year > M().childEnd) { finish(G); return G; }
      const st = stageOf(c.age);
      if (st.id !== G.stage) { G.stage = st.id; addLog(G, `── 자녀 ${st.id} ──`, "stage"); }
      if (G.year === M().independentAge) addLog(G, `── ${c.name} 독립: 이제 자녀가 스스로 선택하고, 부모님은 노년을 보냅니다 ──`, "stage");
      const ec = findEvent(G, "child");
      const ep = G.year >= M().independentAge ? findEvent(G, "parent") : null;
      if (ec) openEvent(G, "child", ec);
      if (ep) openEvent(G, "parent", ep);
      if (ec || ep) return G;
    }
  }

  // 결과 다시 계산(화면 표시용)
  function resultOf(p) {
    const ev = evById(p.ev), c = ev.choices[p.res.c];
    let out = c;
    if (p.res.m) out = { ...c, effects: c.mentor.effects || c.effects, result: c.mentor.result || c.result };
    else if (p.res.o >= 0) out = c.outcomes[p.res.o];
    return { ev, c, out };
  }

  function resolve(G, track, i) {
    const p = G.pending[track], ev = evById(p.ev), c = ev.choices[i], ch = G.chars[track];
    const mentored = p.mentor >= 0;
    let out = c, oi = -1;
    if (mentored) out = { ...c, effects: c.mentor.effects || c.effects, result: c.mentor.result || c.result };
    else if (c.outcomes) {
      const ws = c.outcomes.map((o) => weighted(G, o.chance, toneOf(o)));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      oi = ws.length - 1;
      for (let k = 0; k < ws.length; k++) { r -= ws[k]; if (r < 0) { oi = k; break; } }
      out = c.outcomes[oi];
    }
    const before = G.asset;
    G.asset = Math.max(0, Math.round(before + (((out.effects || {}).자산) || 0)));
    for (const f of [].concat(c.flags || [], out.flags || [])) ch.flags[f] = true;
    const eduName = out.edu !== undefined ? out.edu : c.edu;
    const good = (out.eduGood !== undefined ? out.eduGood : c.eduGood) !== false;
    if (eduName) ch.edu.push({ age: ch.age, name: fill(eduName, ch.name), good });
    p.res = { c: i, o: oi, d: G.asset - before, e: eduName ? 1 : 0, m: mentored ? 1 : 0 };
    addLog(G, `${mentored ? "🎓 교육 멘토링 · " : ""}${fill(ev.title, ch.name)} → ${fill(c.text, ch.name)}`, "event", track);
  }

  // 선택(투표): 결정하는 두 사람이 같은 선택지를 고르면 확정
  function vote(G, track, role, i) {
    const p = G.pending[track];
    if (!p || p.res || !deciders(G, track).includes(role)) return G;
    p.votes[role] = i;
    const v = deciders(G, track).map((r) => p.votes[r]);
    if (v.every((x) => x !== undefined && x === v[0])) resolve(G, track, v[0]);
    return G;
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

  return { ROLES, TRACK, normalize, newGame, advance, vote, ack, deciders, resultOf, evById, stageOf, fill, goodEdu };
})();
