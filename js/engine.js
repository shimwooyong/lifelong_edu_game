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
          ${d ? `<span class="float" style="color:${d > 0 ? "#2fb47c" : "#e5484d"}">${d > 0 ? "+" : ""}${d}</span>` : ""}
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
      mentorRolled: {}, mentorCount: 0,
      stage: null, busy: false,
    });
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
    if (ev.image) { img.src = ev.image; img.style.display = "block"; } else img.style.display = "none";
    playSound(ev.sound);

    const box = $("evChoices");
    box.innerHTML = "";
    box.style.display = "flex";
    $("evResult").style.display = "none";
    const list = ev.choices.filter((c) => meets(c.requires));

    // 교육 멘토링: 이 시기의 가장 좋은 선택이 있는 이벤트에서 시기당 한 번 확률 검사
    const best = list.find((c) => c.mentor);
    const M = SETTINGS.mentoring;
    if (best && M && !S.mentorRolled[st.id]) {
      S.mentorRolled[st.id] = true;
      if (S.mentorCount < M.max && Math.random() < M.chance * luck()) {
        S.mentorCount++;
        $("eventModal").querySelector(".card").classList.add("mentor");
        $("evTitle").textContent = M.title;
        $("evText").textContent = `${fill(M.text)}\n\n[이번 상황] ${fill(ev.title)}\n${fill(ev.text)}`;
        const b = document.createElement("button");
        b.className = "btn primary";
        b.textContent = "다음 ▶";
        b.onclick = () => choose(best, true);
        box.appendChild(b);
        $("eventModal").classList.add("open");
        return;
      }
    }

    const costOf = (c) => -((c.effects || {}).자산 || 0);
    // 모든 선택지가 돈이 모자라면(피할 수 없는 손실) 잠그지 않는다
    const canLock = list.some((c) => costOf(c) <= S.stats.자산);
    list.forEach((c) => {
      const b = document.createElement("button");
      b.className = "btn";
      const cost = costOf(c);
      b.textContent = fill(c.text);
      if (canLock && cost > 0 && S.stats.자산 < cost) {
        // 돈이 모자라면 고를 수 없다
        b.disabled = true;
        b.textContent += ` (자산 ${cost} 필요)`;
      } else b.onclick = () => choose(c);
      box.appendChild(b);
    });
    $("eventModal").classList.add("open");
  }

  function choose(c, mentored = false) {
    // 확률 결과가 있으면 하나를 고른다
    let out = c;
    if (mentored) {
      // 멘토링: 가장 좋은 선택을 한 것으로 하고 멘토링 결과를 적용
      out = { ...c, effects: c.mentor.effects || c.effects, result: c.mentor.result || c.result };
      $("evTitle").textContent = fill(S.current.title);
      $("evText").textContent = `🎓 교수님의 조언에 따른 선택: "${fill(c.text)}"`;
    } else if (c.outcomes) {
      // 자산이 많을수록 좋은 결과 쪽으로 확률이 기운다
      const ws = c.outcomes.map((o) => weighted(o.chance, toneOf(o)));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      out = c.outcomes[c.outcomes.length - 1];
      for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) { out = c.outcomes[i]; break; } }
    }
    const effects = out.effects || {};
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

    log(`${mentored ? "🎓 교육 멘토링 · " : ""}${fill(S.current.title)} → ${fill(c.text)}`, "event");
    renderStats("stats", applied);
    playSound(out.sound || c.sound);

    // 결과 표시
    $("evChoices").style.display = "none";
    $("evResultText").textContent = fill(out.result || "");
    $("evDeltas").innerHTML = Object.entries(applied).filter(([, d]) => d)
      .map(([k, d]) => `<span style="color:${d > 0 ? "#1f9d63" : "#d23c3c"}">${k === "교육" ? "📚 교육 기회 +1" : `${k} ${d > 0 ? "+" : ""}${d}`}</span>`).join("");
    const info = S.current.info;
    $("evInfo").style.display = info ? "block" : "none";
    $("evInfoText").textContent = fill(info || "");
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
