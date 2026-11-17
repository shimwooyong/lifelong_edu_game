// 도움말 창(게임 방법·평생교육·용어 사전)과 글 속 용어 밑줄
window.Glossary = (() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const has = typeof HELP !== "undefined";
  const terms = has ? Object.keys(HELP.terms).sort((a, b) => b.length - a.length) : [];

  // 글을 안전하게 바꾸고, 용어마다 처음 나오는 곳에 밑줄
  function mark(text) {
    let s = String(text ?? "");
    const parts = [];
    for (const t of terms) { // 긴 용어부터 자리표시로 바꿔 두어 겹치지 않게
      const i = s.indexOf(t);
      if (i < 0) continue;
      parts.push(t);
      s = s.slice(0, i) + "\u0001" + (parts.length - 1) + "\u0002" + s.slice(i + t.length);
    }
    return esc(s).replace(/\u0001(\d+)\u0002/g, (_, n) => `<span class="term" data-t="${esc(parts[n])}">${esc(parts[n])}</span>`);
  }

  // 창 만들기
  let el = null, tip = null;
  function build() {
    if (el || !has) return;
    el = document.createElement("div");
    el.className = "modal help-modal";
    el.innerHTML = `<div class="card">
      <div class="help-tabs"><button class="btn" data-tab="guide">🎮 게임 방법</button><button class="btn" data-tab="lifelong">🌱 평생교육이란?</button><button class="btn" data-tab="terms">📖 용어 사전</button></div>
      <div class="help-body"></div>
      <button class="btn primary help-close">닫기</button></div>`;
    document.body.appendChild(el);
    el.querySelector(".help-close").onclick = close;
    el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => open(b.dataset.tab)));
    el.onclick = (e) => { if (e.target === el) close(); };
    tip = document.createElement("div");
    tip.className = "term-tip";
    document.body.appendChild(tip);
    // 떠 있는 도움말 버튼
    const fab = document.createElement("button");
    fab.className = "btn help-fab";
    fab.textContent = "📖 도움말";
    fab.onclick = () => open("guide");
    document.body.appendChild(fab);
  }
  function open(tab = "guide") {
    build();
    const body = el.querySelector(".help-body");
    el.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    if (tab === "terms") {
      body.innerHTML = `<dl class="term-list">${Object.keys(HELP.terms).sort((a, b) => a.localeCompare(b, "ko"))
        .map((t) => `<dt>${esc(t)}</dt><dd>${esc(HELP.terms[t])}</dd>`).join("")}</dl>`;
    } else {
      body.innerHTML = HELP[tab].map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join("");
    }
    body.scrollTop = 0;
    el.classList.add("open");
  }
  function close() { if (el) el.classList.remove("open"); }

  // 밑줄 친 용어를 누르면 설명 말풍선
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(".term");
    if (!tip) return;
    if (!t) { tip.classList.remove("show"); return; }
    const k = t.dataset.t;
    tip.innerHTML = `<b>${esc(k)}</b><br>${esc(HELP.terms[k] || "")}`;
    const r = t.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - 288, r.left)) + "px";
    tip.style.top = r.bottom + 6 + "px";
    tip.classList.add("show");
    e.stopPropagation();
  }, true);

  // 대기실에 처음 들어왔을 때 한 번 자동으로 게임 방법을 보여 줌
  let shown = false;
  function autoOnce() { if (!shown) { shown = true; open("guide"); } }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
  return { mark, open, close, autoOnce };
})();
