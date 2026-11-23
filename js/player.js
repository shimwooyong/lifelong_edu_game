// 학생(참가자) 화면
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  // 이 기기의 고유 번호 (새로고침해도 같은 자리로 돌아오기 위해)
  let ME = store.get("mp_uid");
  if (!ME) { ME = Math.random().toString(36).slice(2, 10); store.set("mp_uid", ME); }
  // 같은 브라우저 여러 탭으로 테스트할 때는 주소 뒤에 ?p=1 처럼 붙이면 다른 사람으로 취급
  const tabTag = new URLSearchParams(location.search).get("p");
  if (tabTag) ME += "_" + tabTag;
  const SEAT_KEY = "mp_seat" + (tabTag ? "_" + tabTag : "");

  let root = null, picking = null, dismissed = {};
  const seat = () => store.get(SEAT_KEY); // { room, g, role }

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  }

  const groupName = (g) => g.replace("g", "") + "조";
  // 방의 뉴스 정보 (Logic.advance에 넘김)
  const newsCtx = () => ({ pick: root && root.config && root.config.news, done: (root && root.news && root.news.done) || {} });
  const newsById = (k, id) => (typeof NEWS !== "undefined" && NEWS.slots[k] ? NEWS.slots[k].find((n) => n.id === id) : null);
  const membersOf = (grp) => (grp && grp.members) || {};

  // ── 조 목록 ──
  function renderLobby() {
    const cfg = root && root.config, groups = (root && root.groups) || {};
    show("lobby");
    if (!cfg) { $("groupList").innerHTML = ""; $("lobbyMsg").textContent = "진행자가 아직 게임을 열지 않았어요. 잠시 기다려 주세요."; return; }
    $("lobbyMsg").textContent = "";
    $("groupList").innerHTML = Object.keys(groups).sort((a, b) => a.slice(1) - b.slice(1)).map((g) => {
      const n = Object.keys(membersOf(groups[g])).length;
      const st = groups[g].status;
      return `<button class="group-btn" data-g="${g}" ${st !== "waiting" ? "disabled" : ""}>
        <b>${groupName(g)}</b><small>${st === "waiting" ? `${n}/4명` : st === "playing" ? "진행 중" : "끝"}</small></button>`;
    }).join("");
    $("groupList").querySelectorAll(".group-btn").forEach((b) => (b.onclick = () => { picking = b.dataset.g; render(); }));
  }

  // ── 역할 고르기 ──
  function renderJoin() {
    const grp = root.groups[picking];
    show("join");
    $("joinTitle").textContent = groupName(picking) + " 입장";
    const mem = membersOf(grp);
    $("seatList").innerHTML = Object.entries(Logic.ROLES).map(([r, label]) => {
      const m = mem[r];
      return `<button class="seat ${r[0] === "p" ? "parent" : "child"}" data-r="${r}" ${m ? "disabled" : ""}>
        <b>${label}</b><small>${m ? esc(m.name) : "비어 있음"}</small></button>`;
    }).join("");
    $("seatList").querySelectorAll(".seat").forEach((b) => (b.onclick = () => sit(picking, b.dataset.r)));
  }

  function sit(g, role) {
    const name = $("playerName").value.trim();
    if (!name) { $("playerName").focus(); $("playerName").placeholder = "이름을 먼저 입력하세요"; return; }
    store.set("mp_name", name);
    Net.tx(`groups/${g}`, (grp) => {
      grp.members = grp.members || {};
      if (grp.status !== "waiting") return;
      if (grp.members[role] && grp.members[role].uid !== ME) return; // 이미 누가 앉음
      for (const r in grp.members) if (grp.members[r].uid === ME) delete grp.members[r];
      grp.members[role] = { uid: ME, name };
      return grp;
    }).then(() => { store.set(SEAT_KEY, { room: root.config.id, g, role }); picking = null; render(); });
  }

  function leave() {
    const s = seat();
    if (s) Net.tx(`groups/${s.g}`, (grp) => {
      if (grp.members && grp.members[s.role] && grp.members[s.role].uid === ME) delete grp.members[s.role];
      return grp;
    });
    store.set(SEAT_KEY, null);
    render();
  }

  // ── 대기 ──
  function renderWait(g, grp) {
    if (window.Glossary) Glossary.autoOnce();
    show("wait");
    $("waitTitle").textContent = `${groupName(g)} 대기실`;
    const mem = membersOf(grp);
    $("waitSeats").innerHTML = Object.entries(Logic.ROLES).map(([r, label]) =>
      `<div class="seat ${r[0] === "p" ? "parent" : "child"} ${mem[r] ? "on" : ""}">
        <b>${label}</b><small>${mem[r] ? esc(mem[r].name) + (mem[r].uid === ME ? " (나)" : "") : "기다리는 중…"}</small></div>`).join("");
  }

  // ── 게임 ──
  function act(fn) {
    const s = seat();
    Net.tx(`groups/${s.g}`, (grp) => {
      if (!grp.game) return;
      const G = Logic.normalize(grp.game);
      fn(G);
      grp.game = G;
      if (G.ended) grp.status = "ended";
      return grp;
    });
  }

  function renderGame(g, grp, role) {
    const G = Logic.normalize(grp.game);
    const mem = membersOf(grp);
    const child = G.chars.child, parent = G.chars.parent;
    show("gameScreen");
    const st = Logic.stageOf(child.age);
    $("stageTag").textContent = st.id;
    $("stageTag").style.background = st.color;
    if (window.Pixel) $("childSprite").src = Pixel.sprite(st.id);
    $("childName").textContent = child.name;
    $("myRole").textContent = `${groupName(g)} · ${Logic.ROLES[role]}`;
    $("childAge").textContent = child.age;
    $("yearText").textContent = Logic.yearOf(G);
    $("parentAge").textContent = parent.age;
    $("stats").innerHTML = [
      ["가족 자산", G.asset, G.cls + " 출신"],
      ["자녀 교육", child.edu.length + "번", ""],
      ["부모 교육", parent.edu.length + "번", ""],
    ].map(([k, v, sub]) => `<div class="stat"><div class="name">${k}<b>${v}</b></div><div class="sub">${sub}</div></div>`).join("");
    $("timelineBar").innerHTML = STAGES.filter((s) => s.from <= SETTINGS.multi.childEnd)
      .map((s) => `<div style="background:${child.age >= s.from ? s.color : ""}"></div>`).join("");

    // 기록
    const logEl = $("log");
    const atBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
    logEl.innerHTML = G.log.map((l) => l.k === "stage" || l.k === "news"
      ? `<div class="entry ${l.k}"><span class="y">${l.k === "news" ? Logic.birthYear() + l.y : ""}</span><span class="t">${esc(l.t)}</span></div>`
      : `<div class="entry ${l.k} ${l.w === "parent" ? "by-parent" : ""}"><span class="y">${l.w === "parent" ? "부모 " + (l.y + SETTINGS.multi.gap) : l.y}세</span><span class="t">${esc(l.t)}</span></div>`).join("");
    if (atBottom || !logEl.dataset.init) { logEl.scrollTop = logEl.scrollHeight; logEl.dataset.init = 1; }

    // 진행 중인 이벤트 상태
    const tracks = Object.keys(G.pending);
    $("statusLine").innerHTML = tracks.map((t) => {
      const p = G.pending[t], ev = Logic.evById(p.ev);
      const who = Logic.deciders(G, t).map((r) => esc(mem[r] ? mem[r].name : Logic.ROLES[r])).join("·");
      return `<div>${Logic.TRACK[t]} 이벤트 「${esc(Logic.fill(ev.title, G.chars[t].name))}」 — ${p.res ? "결과 확인 중" : who + " 결정 중"}</div>`;
    }).join("");
    // 속보 대기: 이 조가 뉴스 시점에 도착했지만 아직 진행자가 송출하지 않음
    const nc = newsCtx();
    const waiting = G.waitNews != null && !(nc.done && nc.done[G.waitNews]);
    if (waiting) $("statusLine").innerHTML = `<div class="news-wait">📡 곧 브레이킹 뉴스가 발표됩니다. 진행자를 주목하세요!</div>`;
    $("nextBtn").disabled = tracks.length > 0 || waiting;
    $("nextBtn").textContent = tracks.length ? "⏳ 이벤트 진행 중" : waiting ? "📡 속보 대기 중…" : "▶ 다음 이벤트";
    $("nextBtn").classList.toggle("news-wait-btn", waiting);
    $("nextBtn").onclick = () => act((G) => Logic.advance(G, newsCtx()));

    // 이벤트 창: 내가 결정할 것 → 자녀 이벤트 → 부모 이벤트 순으로 보여 줌
    const key = (t) => `${G.year}_${t}_${G.pending[t].ev}`;
    const mine = tracks.find((t) => Logic.deciders(G, t).includes(role) && !(G.pending[t].ack[role]));
    const view = mine || ["child", "parent"].find((t) => G.pending[t] && !dismissed[key(t)]);
    if (view) renderEvent(G, mem, role, view, !!mine, () => { dismissed[key(view)] = 1; render(); });
    else $("eventModal").classList.remove("open");
  }

  function renderEvent(G, mem, role, track, deciding, dismiss) {
    const p = G.pending[track], ev = Logic.evById(p.ev), ch = G.chars[track];
    const ds = Logic.deciders(G, track);
    const nameOf = (r) => (mem[r] ? mem[r].name : Logic.ROLES[r]);
    const st = Logic.stageOf(ch.age);
    $("evStage").textContent = `${Logic.TRACK[track]} · ${st.id}`;
    $("evStage").style.background = st.color;
    $("evAge").textContent = `${Logic.TRACK[track]} ${ch.age}세 · ${Logic.yearOf(G)}년`;
    $("evTitle").textContent = Logic.fill(ev.title, ch.name);
    $("evText").textContent = Logic.fill(ev.text, ch.name);
    $("evText").innerHTML = Glossary.mark(Logic.fill(ev.text, ch.name));
    const card = $("eventModal").querySelector(".card");
    card.classList.remove("mentor");
    const img = $("evImage");
    const pic = window.Pixel ? Pixel.forEvent(ev, st.id, false) : ev.image;
    if (pic) { img.src = pic; img.style.display = "block"; } else img.style.display = "none";

    // 제한시간 막대 (없으면 만든다)
    let tm = $("evTimer");
    if (!tm) { tm = document.createElement("div"); tm.id = "evTimer"; tm.className = "ev-timer"; tm.innerHTML = "<i></i><span></span>"; $("evChoices").before(tm); }
    timerCtx = !p.res && p.t0 ? { t0: p.t0, track } : null;
    tm.style.display = timerCtx ? "" : "none";
    tickTimer();

    const box = $("evChoices"), msg = $("evMsg");
    box.innerHTML = ""; msg.textContent = "";
    if (!p.res) {
      box.style.display = "flex"; $("evResult").style.display = "none";
      const badges = (v) => ds.filter((r) => p.votes[r] === v).map((r) => `<span class="badge">${esc(nameOf(r))}</span>`).join("");
      p.order.forEach((i) => {
        const c = ev.choices[i];
        const b = document.createElement("button");
        b.className = "btn" + (p.votes[role] === i ? " picked" : "");
        const locked = p.locked.includes(i);
        const cost = -((c.effects || {}).자산 || 0);
        // 투자처럼 결과가 운에 따라 갈리는 선택지는 확률을 보여 준다
        const pr = Logic.probs(G, c);
        const prTxt = pr ? `<small class="odds">🎲 ${pr.map((x) => `${x.good ? "성공" : "실패"} ${x.p}%`).join(" / ")}</small>` : "";
        b.innerHTML = `${esc(Logic.fill(c.text, ch.name))}${locked ? ` (자산 ${cost} 필요)` : ""} ${prTxt} ${badges(i)}`;
        if (!deciding || locked) b.disabled = true;
        else b.onclick = () => act((G) => Logic.vote(G, track, role, i));
        box.appendChild(b);
      });
      // Help: 조마다 한 번, 최고 선택이 정해진 이벤트에서만
      const cb = document.createElement("button");
      const can = Logic.canChance(G, p);
      cb.className = "btn chance" + (p.votes[role] === Logic.CHANCE ? " picked" : "");
      cb.innerHTML = `💡 Help <small>${G.chanceUsed ? "(이미 사용함)" : p.mentor < 0 ? "(이 상황에선 쓸 수 없어요)" : "(조마다 1번 · 둘 다 누르면 사용)"}</small> ${badges(Logic.CHANCE)}`;
      if (!deciding || !can) cb.disabled = true;
      else cb.onclick = () => act((G) => Logic.vote(G, track, role, Logic.CHANCE));
      box.appendChild(cb);
      const v = ds.map((r) => p.votes[r]);
      if (!deciding) msg.textContent = `${ds.map(nameOf).join(", ")} 님이 결정하고 있어요. 함께 이야기해 보세요!`;
      else if (v.every((x) => x !== undefined) && v[0] !== v[1]) msg.textContent = "의견이 달라요! 대화해서 같은 선택지를 골라 주세요.";
      else if (p.votes[role] !== undefined) msg.textContent = "상대방의 선택을 기다리는 중…";
      else msg.textContent = `${ds.map(nameOf).join(", ")} 님이 함께 골라야 해요. 둘이 같은 선택지를 고르면 확정됩니다.`;
    } else {
      box.style.display = "none";
      const { c, out } = Logic.resultOf(p);
      $("evText").textContent = `선택: ${Logic.fill(c.text, ch.name)}${p.res.m ? " (💡 Help)" : ""}${p.timedOut ? " (⏰ 시간 초과로 자동 결정)" : ""}`;
      $("evResultText").textContent = Logic.fill(out.result || "", ch.name);
      const d = p.res.d;
      $("evDeltas").innerHTML = (d ? `<span style="color:${d > 0 ? "#2f8f5b" : "#b13e53"}">가족 자산 ${d > 0 ? "+" : ""}${d}</span>` : "")
        + (p.res.e ? `<span style="color:#2f8f5b">📚 교육 기회 +1</span>` : "")
        + (p.res.n ? `<span class="news-delta">📰 뉴스 영향 ${p.res.n > 0 ? "+" : ""}${p.res.n} · ${esc(p.res.nn)}</span>` : "");
      $("evInfo").style.display = ev.info ? "block" : "none";
      $("evInfoText").innerHTML = Glossary.mark(Logic.fill(ev.info || "", ch.name));
      $("evResultText").innerHTML = Glossary.mark(Logic.fill(out.result || "", ch.name));
      $("evResult").style.display = "block";
      const btn = $("evContinue");
      if (deciding) {
        btn.style.display = ""; btn.disabled = false; btn.textContent = "계속";
        btn.onclick = () => act((G) => Logic.ack(G, track, role));
      } else if (ds.includes(role)) {
        btn.style.display = ""; btn.disabled = true; btn.textContent = "다른 사람을 기다리는 중…";
      } else {
        btn.style.display = ""; btn.disabled = false; btn.textContent = "닫기";
        btn.onclick = dismiss;
      }
    }
    $("eventModal").classList.add("open");
  }

  function renderEnd(grp) {
    const G = Logic.normalize(grp.game);
    $("eventModal").classList.remove("open");
    show("endScreen");
    $("endTitle").textContent = G.ending ? G.ending.title : "";
    $("endText").textContent = G.ending ? G.ending.text : "";
    $("endStats").innerHTML = [["가족 자산", G.asset], ["자녀 교육", G.chars.child.edu.length + "번"], ["부모 교육", G.chars.parent.edu.length + "번"]]
      .map(([k, v]) => `<div class="stat"><div class="name">${k}<b>${v}</b></div></div>`).join("")
      + `<div class="decile-line">🏠 출발 <b>${esc(G.cls)}</b> → 마지막 <b>${esc(Logic.decileOf(G.asset))}</b></div>`;
    const list = (ch) => ch.edu.length ? ch.edu.map((e) => `<li><small>${e.age}세</small>${esc(e.name)}</li>`).join("") : "<li>받은 교육이 없습니다.</li>";
    // 배운 이유
    const m = Logic.motiveCounts(G), tot = m.외적 + m.내적 || 1;
    $("endMotive").innerHTML = `<div class="motive-bar"><div class="ext" style="width:${(m.외적 / tot) * 100}%"></div><div class="int" style="width:${(m.내적 / tot) * 100}%"></div></div>
      <div class="motive-legend"><span class="ext">■ 외적 동기(시험·자격·취업·학위) ${m.외적}번</span><span class="int">■ 내적 동기(관심·체험·나눔) ${m.내적}번</span></div>`;
    $("endNews").innerHTML = Object.keys(G.newsSeen).sort().map((k) => {
      const n = newsById(+k, G.newsSeen[k]), a = G.afterNews[k];
      return n ? `<li><small>${NEWS.birthYear + NEWS.ages[k]}년</small>${esc(n.headline)}${a ? `<br><small>→ 그 뒤 첫 선택: ${esc(a.c)}</small>` : ""}</li>` : "";
    }).join("") || "<li>겪은 뉴스가 없습니다.</li>";
    $("eduChild").innerHTML = list(G.chars.child);
    $("eduParent").innerHTML = list(G.chars.parent);
  }

  // ── 전체 그리기 ──
  // 브레이킹 뉴스 배너: 생방송 중이면 모두에게, 끝난 뒤엔 우리 조에 반영될 때 한 번 더(우리 가족의 변화)
  function renderNews(s, grp) {
    if (!window.Breaking || typeof NEWS === "undefined") return;
    const cfg = root && root.config, live = root && root.news && root.news.live;
    const inRoom = s && cfg && s.room === cfg.id;
    if (inRoom && typeof live === "number" && cfg.news) {
      return Breaking.show(Logic.newsItem(cfg.news, live), live, { live: true });
    }
    // 방송이 끝나면 바로 닫힘. 뒤에 다시 뜨는 카드는 없음 (우리 가족 변화는 기록·결과 줄에 나옴)
    Breaking.hide();
  }

  function render() {
    renderMain();
    const s = seat(), cfg = root && root.config;
    renderNews(s, s && cfg && root.groups && root.groups[s.g]);
  }

  function renderMain() {
    const s = seat();
    const cfg = root && root.config;
    const grp = s && cfg && s.room === cfg.id && root.groups && root.groups[s.g];
    const mine = grp && grp.members && grp.members[s.role] && grp.members[s.role].uid === ME;
    if (s && !mine) store.set(SEAT_KEY, null);
    if (mine) {
      if (grp.status === "waiting" || !grp.game) return renderWait(s.g, grp);
      if (grp.game.ended) return renderEnd(grp);
      return renderGame(s.g, grp, s.role);
    }
    $("eventModal").classList.remove("open");
    if (picking && cfg && root.groups[picking] && root.groups[picking].status === "waiting") return renderJoin();
    picking = null;
    renderLobby();
  }

  // ── 선택 제한시간 ──
  let timerCtx = null;
  function tickTimer() {
    const tm = $("evTimer");
    if (!tm || !timerCtx) return;
    const lim = Logic.limitMs(), left = Math.max(0, lim - (Date.now() - timerCtx.t0));
    tm.querySelector("i").style.width = (left / lim) * 100 + "%";
    tm.querySelector("span").textContent = `⏰ ${Math.ceil(left / 1000)}초`;
    tm.classList.toggle("hurry", left < 10000);
    if (left <= 0) { const t = timerCtx.track; timerCtx = null; act((G) => Logic.timeout(G, t)); }
  }
  setInterval(tickTimer, 500);

  $("playerName").value = store.get("mp_name") || "";
  $("backBtn").onclick = () => { picking = null; render(); };
  $("leaveBtn").onclick = leave;
  Net.on("", (data) => { root = data; render(); });
})();
