// 브레이킹 뉴스 배너 (학생 화면 공용)
window.Breaking = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let shownKey = null, audio = null, autoT = null;

  // 짧은 경보음 (삐-뽀-삐-뽀)
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      for (let i = 0; i < 6; i++) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "square"; o.frequency.value = i % 2 ? 660 : 990;
        g.gain.setValueAtTime(0.06, t0 + i * 0.18); g.gain.setValueAtTime(0, t0 + i * 0.18 + 0.15);
        o.connect(g); g.connect(audio.destination); o.start(t0 + i * 0.18); o.stop(t0 + i * 0.18 + 0.16);
      }
    } catch (e) {}
  }

  // item: 뉴스, k: 몇 번째 뉴스, o: { live, shock(문구), onClose }
  function show(item, k, o = {}) {
    const el = $("breaking");
    if (!el || !item) return;
    const key = k + (o.live ? "L" : "R");
    if (shownKey !== key) {
      shownKey = key;
      const year = NEWS.birthYear + NEWS.ages[k];
      $("bkArt").src = window.Pixel ? Pixel.scene("news") : "";
      $("bkDate").textContent = `${year}년 ${item.month || 1}월 · 대한민국`;
      $("bkHead").textContent = item.headline;
      $("bkChanges").innerHTML = (item.changes || []).map((c) => `<li>${esc(c)}</li>`).join("");
      const tk = `${item.ticker}  ▶  ${item.headline}  ▶  `;
      $("bkTicker").textContent = tk + tk;
      el.classList.remove("open"); void el.offsetWidth; el.classList.add("open");
      if (window.BGM) BGM.news(true); // 속보 테마로
      if (o.live) { beep(); if (window.BGM) BGM.duck(1.5); }
    }
    el.classList.toggle("live", !!o.live);
    $("bkLive").style.display = o.live ? "" : "none";
    $("bkWait").style.display = o.live ? "" : "none";
    $("bkShock").style.display = o.shock ? "" : "none";
    $("bkShock").textContent = o.shock || "";
    $("bkClose").style.display = o.live ? "none" : "";
    $("bkClose").onclick = () => { clearTimeout(autoT); autoT = null; hide(); if (o.onClose) o.onClose(); };
    // 생방송이 끝난 뒤 보여 주는 우리 가족 변화 카드는 누르지 않아도 8초 뒤 저절로 닫힘
    if (!o.live && !autoT) autoT = setTimeout(() => { autoT = null; $("bkClose").click(); }, 8000);
  }
  function hide() {
    const el = $("breaking");
    if (el && el.classList.contains("open") && window.BGM) BGM.news(false); // 원래 음악으로
    if (el) el.classList.remove("open"); shownKey = null;
  }
  return { show, hide, beep };
})();
