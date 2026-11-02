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
    const groups = {};
    for (let i = 1; i <= n; i++) groups["g" + i] = { status: "waiting" };
    Net.set("", { config: { id: Date.now(), count: n }, groups });
  };

  function start(g) {
    const names = SETTINGS.randomNames;
    Net.tx(`groups/${g}`, (grp) => {
      if (grp.status !== "waiting") return;
      grp.game = Logic.newGame(names[Math.floor(Math.random() * names.length)]);
      grp.status = "playing";
      return grp;
    });
  }
  $("startAllBtn").onclick = () => {
    const gs = (root && root.groups) || {};
    order(gs).forEach((g) => { if (gs[g].status === "waiting" && Object.keys(gs[g].members || {}).length === 4) start(g); });
  };

  function render() {
    const gs = (root && root.groups) || {};
    if (!root || !root.config) { $("groups").innerHTML = `<p class="muted">아직 방이 없어요. 조 수를 입력하고 '새 게임 방 만들기'를 누르세요.</p>`; return; }
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
            return `${esc(mem[r] ? mem[r].name : Logic.ROLES[r])}: ${v === undefined ? "…" : esc(Logic.fill(ev.choices[v].text, G.chars[t].name)).slice(0, 18)}`;
          }).join(" / ");
          return `<div class="pend">${Logic.TRACK[t]} 「${esc(Logic.fill(ev.title, G.chars[t].name))}」${pp.res ? " ✔ 결과 확인 중" : `<br><small>${votes}</small>`}</div>`;
        }).join("");
        const last = G.log.filter((l) => l.k === "event").slice(-3).reverse()
          .map((l) => `<li>${l.w === "parent" ? "부모" : "자녀"} ${l.w === "parent" ? l.y + SETTINGS.multi.gap : l.y}세 · ${esc(l.t)}</li>`).join("");
        body = `<div class="nums">
            <span>자녀 <b>${c.age}</b>세</span><span>부모 <b>${p.age}</b>세</span>
            <span>자산 <b>${G.asset}</b></span>
            <span>자녀 좋은 교육 <b>${Logic.goodEdu(c)}</b>가지</span>
          </div>
          ${G.ended ? `<div class="pend">🏁 엔딩: <b>${esc(G.ending && G.ending.title)}</b></div>` : pend || `<div class="pend muted">다음 이벤트 대기 중</div>`}
          <ul class="mini-log">${last}</ul>`;
      }
      const tag = grp.status === "waiting" ? "대기" : grp.status === "playing" ? "진행 중" : "끝";
      return `<div class="admin-card"><div class="admin-card-head"><b>${g.slice(1)}조</b>
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
