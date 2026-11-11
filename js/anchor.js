// 앵커 화면: 뉴스 원고를 보고 '송출 시작' → 모든 학생 화면에 속보 배너, '방송 종료' → 게임 재개
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let root = null, view = null; // view: 지금 보고 있는 뉴스 번호

  function enter() {
    try { sessionStorage.setItem("mp_anchor", "1"); } catch (e) {}
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "desk"));
    Net.on("", (d) => { root = d; render(); });
  }
  $("pwBtn").onclick = () => {
    if ($("pw").value === window.ANCHOR_PASSWORD) enter();
    else $("pwMsg").textContent = "비밀번호가 틀렸어요.";
  };
  $("pw").onkeydown = (e) => { if (e.key === "Enter") $("pwBtn").click(); };
  try { if (sessionStorage.getItem("mp_anchor")) enter(); } catch (e) {}

  const item = (k) => NEWS.slots[k][(root.config.news || [])[k] || 0];

  function render() {
    const cfg = root && root.config;
    if (!cfg || !cfg.news) {
      $("slotList").innerHTML = "";
      $("script").innerHTML = `<p class="muted">아직 뉴스가 있는 게임 방이 없어요. 선생님이 방을 만들면 원고가 나타납니다.</p>`;
      $("onAir").className = "on-air"; $("onAir").textContent = "OFF AIR";
      return;
    }
    const nw = root.news || {}, done = nw.done || {}, live = nw.live;
    const gs = Object.values(root.groups || {}).filter((g) => g.game);
    const isLive = typeof live === "number";
    const next = NEWS.ages.findIndex((_, k) => !done[k]);
    if (view == null || (isLive && view !== live)) view = isLive ? live : Math.max(0, next);

    $("onAir").className = "on-air" + (isLive ? " live" : "");
    $("onAir").textContent = isLive ? "● ON AIR" : "OFF AIR";

    // 뉴스 목록
    $("slotList").innerHTML = NEWS.ages.map((age, k) => {
      const wait = gs.filter((g) => g.game.waitNews === k).length;
      const st = live === k ? "on" : done[k] ? "done" : k === next ? "next" : "";
      return `<button class="slot-btn ${st} ${view === k ? "sel" : ""}" data-k="${k}">
        <b>${NEWS.birthYear + age}년</b><small>${live === k ? "방송 중" : done[k] ? "✔ 발표 끝" : `대기 ${wait}/${gs.length}조`}</small></button>`;
    }).join("");
    $("slotList").querySelectorAll(".slot-btn").forEach((b) => (b.onclick = () => { view = +b.dataset.k; render(); }));

    // 원고
    const k = view, it = item(k), age = NEWS.ages[k];
    const wait = gs.filter((g) => g.game.waitNews === k).length;
    const reached = gs.filter((g) => g.game.waitNews === k || g.game.year >= age).length;
    const lines = it.script.map(([who, t]) => `<div class="line ${who === "앵커 1" ? "a1" : "a2"}"><span class="who">${esc(who)}</span><p>${esc(t)}</p></div>`).join("");
    let ctrl;
    if (live === k) ctrl = `<button id="endBtn" class="btn primary big">■ 방송 종료 · 게임 다시 시작</button>`;
    else if (done[k]) ctrl = `<p class="muted">이미 발표한 뉴스예요.</p>`;
    else if (isLive) ctrl = `<p class="muted">다른 뉴스를 방송 중이에요. 먼저 종료해 주세요.</p>`;
    else ctrl = `<button id="airBtn" class="btn red big">🔴 속보 송출 시작</button>
      <p class="muted">이 시점에 도착해 기다리는 조: <b>${wait}</b> / 시작한 조 ${gs.length} · ${reached < gs.length ? "아직 도착하지 않은 조가 있어요. 대부분 모이면 송출하세요." : "모든 조가 도착했어요!"}</p>`;
    $("script").innerHTML = `
      <img class="bk-art" src="${window.Pixel ? Pixel.scene("news") : ""}" alt="">
      <div class="bk-date">${NEWS.birthYear + age}년 ${it.month || 1}월 · 자녀 ${age}세 시점</div>
      <h2 class="bk-head">${esc(it.headline)}</h2>
      <h3>📜 원고 (번갈아 읽어 주세요)</h3>
      <div class="lines">${lines}</div>
      <h3>📌 마지막에 덧붙일 말 — 이 뉴스로 바뀌는 세상</h3>
      <ul class="bk-changes">${it.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <div class="ctrl">${ctrl}</div>`;
    if ($("airBtn")) $("airBtn").onclick = () => Net.set("news/live", k);
    if ($("endBtn")) $("endBtn").onclick = () => Net.set(`news/done/${k}`, true).then(() => Net.set("news/live", null));
  }
})();
