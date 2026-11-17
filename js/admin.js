// 관리자 화면: 방 만들기, 조별 시작, 실시간 진행 상황
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let root = null;
  const order = (gs) => Object.keys(gs || {}).sort((a, b) => a.slice(1) - b.slice(1));

  function enter() {
    try { sessionStorage.setItem("mp_admin", "1"); } catch (e) {}
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "panel"));
    $("modeTag").textContent = Net.mode === "firebase" ? "온라인(Firebase)" : "로컬 테스트 모드";
    $("joinUrl").textContent = location.href.replace(/admin\.html.*$/, "");
    $("anchorUrl").textContent = location.href.replace(/admin\.html.*$/, "anchor.html");
    $("anchorPw").textContent = window.ANCHOR_PASSWORD || "";
    Net.on("", (d) => { root = d; render(); });
  }
  $("pwBtn").onclick = () => {
    if ($("pw").value === window.ADMIN_PASSWORD) enter();
    else $("pwMsg").textContent = "비밀번호가 틀렸어요.";
  };
  $("pw").onkeydown = (e) => { if (e.key === "Enter") $("pwBtn").click(); };
  try { if (sessionStorage.getItem("mp_admin")) enter(); } catch (e) {}

  $("createBtn").onclick = () => {
    const n = Math.max(1, Math.min(30, parseInt($("groupCount").value, 10) || 7));
    if (root && root.config && !confirm("지금 방을 지우고 새로 만들까요? 진행 중인 게임이 모두 사라집니다.")) return;
    // 방을 만들 때 모든 조의 소득분위를 한꺼번에 무작위로 정한다 (조끼리 겹치지 않게, 10조 넘으면 다시 섞어서)
    const cls = [];
    while (cls.length < n) {
      const deck = SETTINGS.startClasses.map((c) => c.name);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      cls.push(...deck);
    }
    const groups = {};
    for (let i = 1; i <= n; i++) groups["g" + i] = { status: "waiting", cls: cls[i - 1] };
    // 이번 방에서 터질 뉴스: 시기마다 후보 중 하나를 무작위로 (반 전체가 같은 뉴스를 겪음)
    const news = typeof NEWS !== "undefined" ? (NEWS.fixed || NEWS.slots.map((s) => Math.floor(Math.random() * s.length))) : null;
    Net.set("", { config: { id: Date.now(), count: n, news }, groups });
  };

  function start(g) {
    const names = SETTINGS.randomNames;
    Net.tx(`groups/${g}`, (grp) => {
      if (grp.status !== "waiting") return;
      grp.game = Logic.newGame(names[Math.floor(Math.random() * names.length)], grp.cls);
      grp.status = "playing";
      return grp;
    });
  }
  $("startAllBtn").onclick = () => {
    const gs = (root && root.groups) || {};
    const ready = order(gs).filter((g) => gs[g].status === "waiting" && Object.keys(gs[g].members || {}).length === 4);

    ready.forEach((g) => start(g));
  };

  // ── 탭 ──
  let tab = "prog";
  $("tabProg").onclick = () => { tab = "prog"; render(); };
  $("tabCmp").onclick = () => { tab = "cmp"; render(); };

  // ── 브레이킹 뉴스 송출판 (앵커 화면과 같은 기능, 비상용) ──
  function renderNews() {
    const cfg = root.config, nw = root.news || {}, done = nw.done || {}, live = nw.live;
    if (typeof NEWS === "undefined" || !cfg.news) { $("newsPanel").innerHTML = `<p class="muted">이 방은 뉴스 없이 만들어졌어요. 새 방을 만들면 뉴스가 들어갑니다.</p>`; return; }
    const gs = root.groups || {};
    $("newsPanel").innerHTML = NEWS.ages.map((age, k) => {
      const it = Logic.newsItem(cfg.news, k);
      const wait = Object.values(gs).filter((g) => g.game && g.game.waitNews === k).length;
      const st = live === k ? "on" : done[k] ? "done" : "";
      const btn = live === k ? `<button class="btn" data-end="${k}">■ 방송 종료</button>`
        : done[k] ? `<span>✔ 발표 끝</span>` : `<button class="btn red" data-air="${k}">🔴 속보 송출</button>`;
      return `<div class="news-slot ${st}"><div><b>${NEWS.birthYear + age}년</b> · 자녀 ${age}세</div>
        <div>${esc(it.headline)}</div><div>📡 대기 중인 조: <b>${wait}</b></div>${btn}</div>`;
    }).join("");
    $("newsPanel").querySelectorAll("[data-air]").forEach((b) => (b.onclick = () => Net.set("news/live", +b.dataset.air)));
    $("newsPanel").querySelectorAll("[data-end]").forEach((b) => (b.onclick = () => {
      const k = +b.dataset.end;
      Net.set(`news/done/${k}`, true).then(() => Net.set("news/live", null));
    }));
  }

  // ── 결과 비교 ──
  const COLORS = ["#e8202a", "#3b5dc9", "#2f8f5b", "#ef7d57", "#7a4c9e", "#257179", "#b08a5a", "#41a6f6", "#b13e53", "#241f2e"];
  function renderCompare() {
    const gs = root.groups || {}, cfg = root.config;
    const list = order(gs).filter((g) => gs[g].game).map((g) => ({ g, G: Logic.normalize(gs[g].game) }));
    if (!list.length) { $("cmpView").innerHTML = `<p class="muted">아직 시작한 조가 없어요.</p>`; return; }
    const end = SETTINGS.multi.childEnd;
    const maxA = Math.max(100, ...list.flatMap(({ G }) => G.hist.map((h) => h[1]))) * 1.08;
    const W = 860, H = 320, L = 48, R = 14, T = 16, B = 34;
    const x = (v) => L + (v / end) * (W - L - R), y = (a) => T + (1 - a / maxA) * (H - T - B);
    let svg = `<svg viewBox="0 0 ${W} ${H}" font-family="Galmuri11, monospace" font-size="11">`;
    for (let i = 0; i <= 4; i++) { const a = Math.round((maxA / 4) * i); svg += `<line x1="${L}" x2="${W - R}" y1="${y(a)}" y2="${y(a)}" stroke="#d9c39b" stroke-width="1"/><text x="${L - 6}" y="${y(a) + 4}" text-anchor="end" fill="#6b6478">${a}</text>`; }
    for (let a = 0; a <= end; a += 10) svg += `<text x="${x(a)}" y="${H - 14}" text-anchor="middle" fill="#6b6478">${Logic.birthYear() + a}</text>`;
    if (typeof NEWS !== "undefined" && cfg.news) NEWS.ages.forEach((age, k) => {
      const it = Logic.newsItem(cfg.news, k);
      svg += `<line x1="${x(age)}" x2="${x(age)}" y1="${T}" y2="${H - B}" stroke="#e8202a" stroke-width="2" stroke-dasharray="4 4"/>
        <text x="${x(age) + 4}" y="${T + 10}" fill="#c0182a" font-weight="700">${esc(it.id)}</text>`;
    });
    list.forEach(({ G }, i) => {
      const pts = [];
      G.hist.forEach(([yr, a], j) => { if (j) pts.push(`${x(yr)},${y(G.hist[j - 1][1])}`); pts.push(`${x(yr)},${y(a)}`); });
      if (G.hist.length) pts.push(`${x(G.year)},${y(G.asset)}`);
      svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="3"/>`;
    });
    svg += `<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#241f2e" stroke-width="2"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#241f2e" stroke-width="2"/></svg>`;
    const legend = list.map(({ g, G }, i) => `<span style="color:${COLORS[i % COLORS.length]}">■ ${g.slice(1)}조 (${esc(G.cls)})</span>`).join("");

    const rows = list.map(({ g, G }, i) => {
      const c = G.chars.child, m = Logic.motiveCounts(G), tot = m.외적 + m.내적 || 1;
      const start = G.hist.length ? G.hist[0][1] : G.asset;
      const after = Object.keys(G.afterNews).sort().map((k) => `<div><small>${Logic.birthYear() + NEWS.ages[k]}</small> ${esc(G.afterNews[k].c)}</div>`).join("") || "—";
      return `<tr>
        <td><b style="color:${COLORS[i % COLORS.length]}">${g.slice(1)}조</b><br><small>${esc(c.name)}네</small></td>
        <td>${esc(G.cls)}</td>
        <td class="num">${start} → <b>${G.asset}</b></td>
        <td>${G.ended ? `<b>${esc(G.ending && G.ending.title)}</b>` : `진행 중 (자녀 ${c.age}세)`}</td>
        <td class="num">${Logic.goodEdu(c)}가지</td>
        <td class="num">${c.edu.length} / ${G.chars.parent.edu.length}</td>
        <td>외적 ${m.외적} · 내적 ${m.내적}<div class="mini-motive"><div class="ext" style="width:${(m.외적 / tot) * 100}%"></div><div class="int" style="width:${(m.내적 / tot) * 100}%"></div></div></td>
        <td>${after}</td></tr>`;
    }).join("");
    // 조별 순위: 교육(자녀 좋은 교육 가짓수), 자산(지금 가족 자산), 종합(두 순위의 합, 같으면 교육 순위 우선)
    const rankBy = (val) => { const s = list.map((o) => val(o)).sort((a, b) => b - a); return (o) => 1 + s.indexOf(val(o)); };
    const eduOf = ({ G }) => Logic.goodEdu(G.chars.child), assetOf = ({ G }) => G.asset;
    const rEdu = rankBy(eduOf), rAsset = rankBy(assetOf);
    const ranked = list.map((o, i) => ({ ...o, i, re: rEdu(o), ra: rAsset(o) }))
      .sort((a, b) => (a.re + a.ra) - (b.re + b.ra) || a.re - b.re || b.G.asset - a.G.asset);
    const medal = (n) => ["🥇", "🥈", "🥉"][n] || `${n + 1}위`;
    const rankRows = ranked.map((o, n) => `<tr>
        <td class="num">${medal(n)}</td>
        <td><b style="color:${COLORS[o.i % COLORS.length]}">${o.g.slice(1)}조</b> <small>${esc(o.G.cls)}</small></td>
        <td class="num">${eduOf(o)}가지 <small>(${o.re}위)</small></td>
        <td class="num">${o.G.asset} <small>(${o.ra}위 · ${esc(Logic.decileOf(o.G.asset))})</small></td>
        <td>${o.G.ended ? esc(o.G.ending && o.G.ending.title) : `진행 중 (자녀 ${o.G.chars.child.age}세)`}</td></tr>`).join("");
    const qs = typeof NEWS !== "undefined" ? NEWS.discuss : [];
    $("cmpView").innerHTML = `
      <div class="compare-table-wrap"><h3>🏆 조별 순위 <small class="muted">교육 순위 + 자산 순위를 더해 작은 순서 (같으면 교육 우선)</small></h3>
        <table class="compare-table"><tr><th>순위</th><th>조</th><th>자녀 좋은 교육</th><th>가족 자산 (마지막 분위)</th><th>엔딩</th></tr>${rankRows}</table></div>
      <div class="compare-chart"><b>가족 자산의 변화</b> <span class="muted">(빨간 점선 = 브레이킹 뉴스)</span>${svg}<div class="compare-legend">${legend}</div></div>
      <div class="compare-table-wrap"><table class="compare-table">
        <tr><th>조</th><th>소득분위</th><th>자산 (시작→지금)</th><th>엔딩</th><th>자녀 좋은 교육</th><th>받은 교육 (자녀/부모)</th><th>배운 이유</th><th>뉴스 직후 첫 선택</th></tr>
        ${rows}</table></div>
      <div class="discuss"><h3>💬 함께 이야기해 봐요</h3><ol>${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></div>`;
  }

  function render() {
    const gs = (root && root.groups) || {};
    $("tabProg").classList.toggle("on", tab === "prog"); $("tabCmp").classList.toggle("on", tab === "cmp");
    $("progView").style.display = tab === "prog" ? "" : "none";
    $("cmpView").style.display = tab === "cmp" ? "" : "none";
    if (!root || !root.config) { $("newsPanel").innerHTML = ""; $("groups").innerHTML = `<p class="muted">아직 방이 없어요. 조 수를 입력하고 '새 게임 방 만들기'를 누르세요.</p>`; return; }
    renderNews();
    if (tab === "cmp") renderCompare();
    $("groupCount").value = root.config.count;
    $("groups").innerHTML = order(gs).map((g) => {
      const grp = gs[g], mem = grp.members || {};
      const n = Object.keys(mem).length;
      const seats = Object.entries(Logic.ROLES).map(([r, l]) =>
        `<span class="mini-seat ${mem[r] ? "on" : ""}">${l}: ${mem[r] ? esc(mem[r].name) : "—"}</span>`).join("");
      let body = "";
      if (grp.status === "waiting") {
        body = `<button class="btn ${n === 4 ? "primary" : ""}" data-start="${g}">${n === 4 ? "게임 시작" : `시작 (${n}/4명)`}</button>`;
      } else if (grp.game) {
        const G = Logic.normalize(grp.game);
        const c = G.chars.child, p = G.chars.parent;
        const pend = Object.keys(G.pending).map((t) => {
          const pp = G.pending[t], ev = Logic.evById(pp.ev);
          const votes = Logic.deciders(G, t).map((r) => {
            const v = pp.votes[r];
            return `${esc(mem[r] ? mem[r].name : Logic.ROLES[r])}: ${v === undefined ? "…" : v === Logic.CHANCE ? "🎓 교수님 찬스" : esc(Logic.fill(ev.choices[v].text, G.chars[t].name)).slice(0, 18)}`;
          }).join(" / ");
          return `<div class="pend">${Logic.TRACK[t]} 「${esc(Logic.fill(ev.title, G.chars[t].name))}」${pp.res ? " ✔ 결과 확인 중" : `<br><small>${votes}</small>`}</div>`;
        }).join("");
        const last = G.log.filter((l) => l.k === "event").slice(-3).reverse()
          .map((l) => `<li>${l.w === "parent" ? "부모" : "자녀"} ${l.w === "parent" ? l.y + SETTINGS.multi.gap : l.y}세 · ${esc(l.t)}</li>`).join("");
        const nwDone = (root.news && root.news.done) || {};
        const waitTxt = G.waitNews != null && !nwDone[G.waitNews] ? `<div class="pend news-wait">📡 속보 대기 중</div>` : "";
        body = `<div class="nums">
            <span><b>${Logic.yearOf(G)}</b>년</span><span>자녀 <b>${c.age}</b>세</span><span>부모 <b>${p.age}</b>세</span>
            <span><b>${G.cls}</b></span><span>자산 <b>${G.asset}</b></span>
            <span>자녀 좋은 교육 <b>${Logic.goodEdu(c)}</b>가지</span>
          </div>
          ${G.ended ? `<div class="pend">🏁 엔딩: <b>${esc(G.ending && G.ending.title)}</b></div>` : pend || waitTxt || `<div class="pend muted">다음 이벤트 대기 중</div>`}
          <ul class="mini-log">${last}</ul>`;
      }
      const tag = grp.status === "waiting" ? "대기" : grp.status === "playing" ? "진행 중" : "끝";
      return `<div class="admin-card"><div class="admin-card-head"><b>${g.slice(1)}조</b> <span class="tag cls-tag">${esc(grp.cls || "")}</span>
        ${grp.game ? `<span class="muted">${esc(grp.game.chars.child.name)}네</span>` : ""}<span class="tag">${tag}</span></div>
        <div class="seats-row">${seats}</div>${body}</div>`;
    }).join("");
    $("groups").querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => {
      const g = b.dataset.start, n = Object.keys(gs[g].members || {}).length;
      if (n < 4 && !confirm(`${g.slice(1)}조는 ${n}명뿐이에요. 비어 있는 역할의 선택은 진행되지 않습니다. 그래도 시작할까요?`)) return;
      start(g);
    }));
  }
})();
