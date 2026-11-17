// 게임 엔진: 데이터(data 폴더)를 읽어 게임을 진행한다
(() => {
  const $ = (id) => document.getElementById(id);
  const S = {}; // 현재 게임 상태
  let bgm = null;

  // ── 유틸 ──
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v) => Math.max(0, Math.round(v)); // 자산은 0 아래로 내려가지 않음

  // 좋은 교육 종류 수 (같은 이름은 한 번만)
  const goodEduCount = () => new Set(S.edu.filter((e) => e.good).map((e) => e.name)).size;

  // 자산에 따른 운 배율: 자산이 많을수록 좋은 일은 더 자주, 나쁜 일은 덜 자주
  function luck() {
    const L = SETTINGS.luck;
    return Math.max(L.min, Math.min(L.max, Math.sqrt((S.stats.자산 || 0) / L.base)));
  }
  // good: true(좋은 일) / false(나쁜 일) / 없음(보통). 없으면 자산 변화로 판단
  function toneOf(o) {
    if (o.good === true || o.good === false) return o.good;
    const a = (o.effects || {}).자산;
    return a > 0 ? true : a < 0 ? false : null;
  }
  const weighted = (p, tone) => tone === true ? p * luck() : tone === false ? p / luck() : p;
  const stageOf = (age) => STAGES.find((s) => age >= s.from && age <= s.to) || STAGES[STAGES.length - 1];

  // {이름}과 조사 처리: {이름}이(가), 은(는), 을(를), 과(와), 아(야), 으로(로)
  function fill(text) {
    const name = S.name || "";
    const last = name.charCodeAt(name.length - 1);
    const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
    const josa = { "이(가)": ["이", "가"], "은(는)": ["은", "는"], "을(를)": ["을", "를"],
      "과(와)": ["과", "와"], "아(야)": ["아", "야"], "으로(로)": ["으로", "로"] };
    return (text || "")
      .replace(/\{이름\}(이\(가\)|은\(는\)|을\(를\)|과\(와\)|아\(야\)|으로\(로\))/g,
        (_, j) => name + josa[j][hasBatchim ? 0 : 1])
      .replace(/\{이름\}/g, name);
  }

  // 조건 검사: { min:{지식:50}, max:{...}, flags:[...], notFlags:[...], eduCount:3 }
  function meets(req) {
    if (!req) return true;
    for (const k in req.min || {}) if (S.stats[k] < req.min[k]) return false;
    for (const k in req.max || {}) if (S.stats[k] > req.max[k]) return false;
    for (const f of req.flags || []) if (!S.flags[f]) return false;
    for (const f of req.notFlags || []) if (S.flags[f]) return false;
    if (req.eduCount && S.edu.length < req.eduCount) return false;
    if (req.goodEdu && goodEduCount() < req.goodEdu) return false;
    if (req.maxGoodEdu != null && goodEduCount() > req.maxGoodEdu) return false;
    for (const f of req.world || []) if (!S.world[f]) return false;
    for (const f of req.notWorld || []) if (S.world[f]) return false;
    return true;
  }

  // ── 브레이킹 뉴스 (혼자하기: 그 나이가 되면 자동 송출) ──
  const hasNews = () => typeof NEWS !== "undefined";
  const newsPick = (k) => NEWS.slots[k][NEWS.fixed ? NEWS.fixed[k] : Math.floor(Math.random() * NEWS.slots[k].length)];
  const worldItem = (id) => { if (!hasNews()) return null; for (const s of NEWS.slots) for (const n of s) if (n.id === id) return n; return null; };
  // 뉴스 데이터는 조별 게임 모양(G, ch)을 기대하므로 맞춰 준다
  function ctx() {
    const ch = { name: S.name, age: S.age, flags: S.flags, edu: S.edu };
    return { ch, G: { asset: S.stats.자산, world: S.world, cls: S.cls && S.cls.name, chars: { child: ch, parent: ch } } };
  }
  function worldMods(ev, c, base) {
    let add = 0; const notes = []; const { G, ch } = ctx();
    for (const id in S.world) for (const m of (worldItem(id) || {}).mods || []) {
      if (!m.test(ev, c, ch, G)) continue;
      const a = typeof m.asset === "function" ? m.asset(base) : m.asset;
      if (a) { add += a; notes.push(m.note); }
    }
    return { add, notes };
  }
  // 이 나이에 뉴스가 있으면 발표하고 true
  function airNews(age) {
    if (!hasNews()) return false;
    const k = NEWS.ages.indexOf(age);
    if (k < 0 || S.newsSeen[k]) return false;
    const item = newsPick(k);
    S.newsSeen[k] = item.id; S.world[item.id] = true;
    log(`📰 ${NEWS.birthYear + age}년 속보: ${item.headline}`, "news", age);
    let shockTxt = "";
    const sh = item.shock ? item.shock(ctx().G) : null;
    if (sh && sh.asset) {
      const before = S.stats.자산;
      S.stats.자산 = clamp(before + sh.asset);
      shockTxt = `${S.name}에게 온 변화 → 자산 ${sh.asset > 0 ? "+" : ""}${S.stats.자산 - before} (${sh.note})`;
      log(`📰 뉴스 영향: 자산 ${sh.asset > 0 ? "+" : ""}${S.stats.자산 - before} (${sh.note})`, "news", age);
      renderStats("stats", { 자산: S.stats.자산 - before });
    }
    if (window.Breaking) {
      S.busy = true;
      Breaking.show(item, k, { live: false, shock: shockTxt, onClose: () => { S.busy = false; } });
    }
    return true;
  }

  function playSound(src) {
    if (!src) return;
    try { new Audio(src).play(); } catch (e) {}
  }

  // ── 화면 ──
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
  }

  function renderStats(target, withFloat = {}) {
    const box = $(target);
    box.innerHTML = "";
    const items = [
      ["자산", S.stats.자산, S.cls ? S.cls.name + " 출신" : "", withFloat.자산],
      ["받은 교육", S.edu.length + "번", "", withFloat.교육],
    ];
    for (const [k, v, sub, d] of items) {
      box.insertAdjacentHTML("beforeend", `
        <div class="stat">
          <div class="name">${k}<b>${v}</b></div>
          <div class="sub">${sub}</div>
          ${d ? `<span class="float" style="color:${d > 0 ? "#2f8f5b" : "#b13e53"}">${d > 0 ? "+" : ""}${d}</span>` : ""}
        </div>`);
    }
  }

  function renderTop() {
    const st = stageOf(S.age);
    $("ageText").textContent = S.age;
    $("nameText").textContent = S.name;
    $("stageTag").textContent = st.id;
    $("stageTag").style.background = st.color;
    // 인생 진행 막대
    const bar = $("timelineBar");
    bar.innerHTML = STAGES.map((s) =>
      `<div style="background:${S.age >= s.from ? s.color : ""}" title="${s.id}"></div>`).join("");
  }

  function log(text, type = "", age = S.age) {
    const el = document.createElement("div");
    el.className = "entry " + type;
    el.innerHTML = `<span class="y">${type === "stage" ? "" : age + "세"}</span><span class="t"></span>`;
    el.querySelector(".t").textContent = fill(text);
    $("log").appendChild(el);
    $("log").scrollTop = $("log").scrollHeight;
  }

  // ── 진행 ──
  // 소득분위 확률대로 태어날 가정을 고른다
  function pickClass() {
    const list = SETTINGS.startClasses;
    let r = Math.random() * list.reduce((a, c) => a + c.chance, 0);
    for (const c of list) { r -= c.chance; if (r < 0) return c; }
    return list[list.length - 1];
  }

  function start() {
    const cls = pickClass();
    const spread = 1 + (Math.random() * 2 - 1) * (SETTINGS.startSpread || 0);
    Object.assign(S, {
      name: $("nameInput").value.trim() || pick(SETTINGS.randomNames),
      age: 0, cls,
      stats: { 자산: Math.round(cls.asset * spread) },
      flags: {}, done: {}, edu: [],
      chanceUsed: false, world: {}, newsSeen: {},
      stage: null, busy: false,
    });
    S.startAsset = S.stats.자산;
    $("log").innerHTML = "";
    show("gameScreen");
    renderTop();
    renderStats("stats");
    S.stage = stageOf(0).id;
    log(`── ${S.stage} ──`, "stage");
    log(`{이름}이(가) ${cls.text}에서 태어났다. (${cls.name}, 자산 ${S.stats.자산})`);
    if (SETTINGS.bgm && !bgm) { bgm = new Audio(SETTINGS.bgm); bgm.loop = true; bgm.play().catch(() => {}); }
  }

  function findEvent() {
    // 나이가 딱 정해진 이벤트를 먼저, 그다음 무작위 이벤트
    const fixed = EVENTS.filter((e) => e.age != null), ranged = EVENTS.filter((e) => e.age == null);
    return [...fixed, ...ranged].find((e) => {
      if (S.done[e.id]) return false;
      const ageOk = e.age != null ? e.age === S.age
        : e.ages ? S.age >= e.ages[0] && S.age <= e.ages[1] : false;
      if (!ageOk || !meets(e.requires)) return false;
      return e.chance == null || Math.random() < weighted(e.chance, toneOf(e));
    });
  }

  // 1년 진행(화면에는 보이지 않음). 이벤트가 열리면 true 반환
  function nextYear() {
    if (S.busy) return true;
    if (S.age >= SETTINGS.maxAge) { ending(); return true; }
    if (airNews(S.age + 1)) return true; // 뉴스가 먼저, 닫은 뒤 다음 이벤트
    S.age++;
    const st = stageOf(S.age);
    if (st.id !== S.stage) { S.stage = st.id; log(`── ${st.id} ──`, "stage"); }
    renderTop();
    const ev = findEvent();
    if (ev) { openEvent(ev); return true; }
    if (S.age >= SETTINGS.maxAge) { ending(); return true; }
    return false;
  }

  function skipToEvent() {
    while (!nextYear()) {}
  }

  // ── 이벤트 ──
  function openEvent(ev) {
    S.busy = true;
    S.current = ev;
    S.done[ev.id] = true;
    const st = stageOf(S.age);
    $("evStage").textContent = st.id;
    $("evStage").style.background = st.color;
    $("evAge").textContent = S.age + "세";
    $("evTitle").textContent = fill(ev.title);
    $("evText").textContent = fill(ev.text);
    $("eventModal").querySelector(".card").classList.remove("mentor");
    const img = $("evImage");
    const pic = window.Pixel ? Pixel.forEvent(ev, st.id) : ev.image;
    if (pic) { img.src = pic; img.style.display = "block"; } else img.style.display = "none";
    playSound(ev.sound);

    const box = $("evChoices");
    box.innerHTML = "";
    box.style.display = "flex";
    $("evResult").style.display = "none";
    const list = ev.choices.filter((c) => meets(c.requires));

    if (window.Glossary) $("evText").innerHTML = Glossary.mark(fill(ev.text));

    // 교수님 찬스: 한 번만, 최고 선택이 정해진 이벤트에서만(뉴스가 최고 선택을 바꿨으면 그걸로), 인생 양끝 구간 제외
    let swap = null;
    for (const id in S.world) { const n = worldItem(id); if (n && n.mentor && n.mentor[ev.id]) swap = n.mentor[ev.id]; }
    const best = (swap && list.find((c) => c.text.includes(swap.pick))) || list.find((c) => c.mentor);
    const M = SETTINGS.mentoring;
    const edge = SETTINGS.maxAge * (M?.edge ?? 0);
    const chanceOk = !!best && S.age >= edge && S.age <= SETTINGS.maxAge - edge;
    S.chance = chanceOk ? { c: best, swap: swap && best.text.includes(swap.pick) ? swap : null } : null;

    // 선택지 순서는 매번 섞는다
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const costOf = (c) => -((c.effects || {}).자산 || 0);
    // 모든 선택지가 돈이 모자라면(피할 수 없는 손실) 잠그지 않는다
    const canLock = list.some((c) => costOf(c) <= S.stats.자산);
    const open = [];
    list.forEach((c) => {
      const b = document.createElement("button");
      b.className = "btn";
      const cost = costOf(c);
      b.textContent = fill(c.text);
      if (canLock && cost > 0 && S.stats.자산 < cost) {
        // 돈이 모자라면 고를 수 없다
        b.disabled = true;
        b.textContent += ` (자산 ${cost} 필요)`;
      } else { b.onclick = () => choose(c); open.push(c); }
      // 투자처럼 결과가 운에 따라 갈리는 선택지는 확률을 보여 준다(자산 반영)
      if (c.outcomes) {
        const ws = c.outcomes.map((o) => weighted(o.chance, toneOf(o))), sum = ws.reduce((a, x) => a + x, 0) || 1;
        b.insertAdjacentHTML("beforeend", `<small class="odds">🎲 ${c.outcomes.map((o, k) => `${toneOf(o) === false ? "실패" : "성공"} ${Math.round((ws[k] / sum) * 100)}%`).join(" / ")}</small>`);
      }
      box.appendChild(b);
    });
    // 교수님 찬스 버튼
    const cb = document.createElement("button");
    cb.className = "btn chance";
    cb.innerHTML = `🎓 교수님 찬스 <small>${S.chanceUsed ? "(이미 사용함)" : S.chance ? "(일생에 1번)" : "(이 상황에선 쓸 수 없어요)"}</small>`;
    if (S.chanceUsed || !S.chance) cb.disabled = true;
    else cb.onclick = () => { S.chanceUsed = true; choose(S.chance.c, true); };
    box.appendChild(cb);
    // 선택 제한시간: 끝나면 고를 수 있는 선택지 중 무작위
    startTimer(() => choose(pick(open.length ? open : list), false, true));
    $("eventModal").classList.add("open");
  }

  // ── 선택 제한시간 ──
  let timer = null;
  function startTimer(onEnd) {
    stopTimer();
    const sec = SETTINGS.soloChoiceSeconds;
    let tm = $("evTimer");
    if (!tm) { tm = document.createElement("div"); tm.id = "evTimer"; tm.className = "ev-timer"; tm.innerHTML = "<i></i><span></span>"; $("evChoices").before(tm); }
    tm.style.display = sec ? "" : "none";
    if (!sec) return;
    const t0 = Date.now(), lim = sec * 1000;
    const tick = () => {
      const left = Math.max(0, lim - (Date.now() - t0));
      tm.querySelector("i").style.width = (left / lim) * 100 + "%";
      tm.querySelector("span").textContent = `⏰ ${Math.ceil(left / 1000)}초`;
      tm.classList.toggle("hurry", left < 10000);
      if (left <= 0) { stopTimer(); onEnd(); }
    };
    tick();
    timer = setInterval(tick, 500);
  }
  function stopTimer() { clearInterval(timer); timer = null; const tm = $("evTimer"); if (tm) tm.style.display = "none"; }

  function choose(c, mentored = false, timedOut = false) {
    stopTimer();
    // 확률 결과가 있으면 하나를 고른다
    let out = c;
    if (mentored) {
      // 교수님 찬스: 가장 좋은 선택을 한 것으로 하고 찬스 결과를 적용 (뉴스가 바꾼 최고 선택이면 그 결과)
      const m = (S.chance && S.chance.swap) || c.mentor || {};
      out = { ...c, effects: m.effects || c.effects, result: m.result || c.result };
      $("evText").textContent = `🎓 교수님 찬스로 고른 선택: "${fill(c.text)}"`;
    } else if (c.outcomes) {
      // 자산이 많을수록 좋은 결과 쪽으로 확률이 기운다
      const ws = c.outcomes.map((o) => weighted(o.chance, toneOf(o)));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      out = c.outcomes[c.outcomes.length - 1];
      for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) { out = c.outcomes[i]; break; } }
    }
    if (timedOut) $("evText").textContent = `⏰ 시간 초과로 자동 결정: "${fill(c.text)}"`;
    const effects = { ...(out.effects || {}) };
    // 뉴스가 바꾼 세상의 추가 효과
    const wm = worldMods(S.current, c, effects.자산 || 0);
    if (wm.add) effects.자산 = (effects.자산 || 0) + wm.add;
    const applied = {};
    for (const k in effects) {
      const before = S.stats[k];
      S.stats[k] = clamp(before + effects[k]);
      applied[k] = S.stats[k] - before;
    }
    for (const f of [].concat(c.flags || [], out.flags || [])) S.flags[f] = true;
    const eduName = out.edu !== undefined ? out.edu : c.edu;
    const eduGood = (out.eduGood !== undefined ? out.eduGood : c.eduGood) !== false;
    if (eduName) { S.edu.push({ age: S.age, name: fill(eduName), good: eduGood }); applied.교육 = 1; }

    log(`${mentored ? "🎓 교수님 찬스 · " : ""}${fill(S.current.title)} → ${fill(c.text)}`, "event");
    renderStats("stats", applied);
    playSound(out.sound || c.sound);

    // 결과 표시
    const mk = (t) => (window.Glossary ? Glossary.mark(fill(t)) : fill(t));
    $("evChoices").style.display = "none";
    $("evResultText").innerHTML = mk(out.result || "");
    $("evDeltas").innerHTML = Object.entries(applied).filter(([, d]) => d)
      .map(([k, d]) => `<span style="color:${d > 0 ? "#2f8f5b" : "#b13e53"}">${k === "교육" ? "📚 교육 기회 +1" : `${k} ${d > 0 ? "+" : ""}${d}`}</span>`).join("")
      + (wm.add ? `<span class="news-delta">📰 뉴스 영향 ${wm.add > 0 ? "+" : ""}${wm.add} · ${wm.notes.join(", ")}</span>` : "");
    const info = S.current.info;
    $("evInfo").style.display = info ? "block" : "none";
    $("evInfoText").innerHTML = mk(info || "");
    $("evResult").style.display = "block";
    $("evContinue").onclick = () => closeEvent(out.next || c.next);
  }

  function closeEvent(nextId) {
    $("eventModal").classList.remove("open");
    S.busy = false;
    const next = nextId && EVENTS.find((e) => e.id === nextId);
    if (next) return openEvent(next);
    if (S.age >= SETTINGS.maxAge) ending();
  }

  // ── 엔딩 ──
  function ending() {
    S.busy = true;
    const end = ENDINGS.find((e) => meets(e.requires)) || { title: "끝", text: "" };
    $("endTitle").textContent = fill(end.title);
    $("endText").textContent = fill(end.text);
    renderStats("endStats");
    // 출발 분위 → 마지막 분위 (출발 때 쓴 10분위 자산표에서 가장 가까운 분위)
    const list = SETTINGS.startClasses, a = S.stats.자산;
    const last = list.reduce((b, c) => (Math.abs(c.asset - a) < Math.abs(b.asset - a) ? c : b), list[0]);
    $("endStats").insertAdjacentHTML("beforeend", `<div class="decile-line">🏠 출발 <b>${S.cls.name}</b> → 마지막 <b>${last.name}</b></div>`);
    $("eduList").innerHTML = S.edu.length
      ? S.edu.map((e) => `<li><small>${e.age}세</small>${e.name}</li>`).join("")
      : "<li>받은 교육이 없습니다.</li>";
    show("endScreen");
  }

  // ── 시작 ──
  document.title = SETTINGS.title;
  $("gameTitle").textContent = SETTINGS.title;
  $("gameSubtitle").textContent = SETTINGS.subtitle;
  $("startBtn").onclick = start;
  $("nameInput").onkeydown = (e) => { if (e.key === "Enter") start(); };
  $("skipBtn").onclick = skipToEvent;
  $("restartBtn").onclick = () => { show("startScreen"); $("nameInput").value = ""; };
})();
