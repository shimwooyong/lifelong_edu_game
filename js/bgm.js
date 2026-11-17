// 잔잔한 8비트 배경음악: 파일 없이 브라우저가 직접 연주 (저작권 걱정 없음)
// 화면을 처음 누르면 시작(브라우저 규칙), 오른쪽 아래 🔊 버튼으로 켜고 끄기. 설정은 기기에 기억됨
window.BGM = (() => {
  const BPM = 80, STEP = 60 / BPM / 2; // 8분음표 길이(초)
  const VOL = 0.16;                     // 전체 음량
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const _ = null;

  // 8마디 반복 (C - Am - F - G - C - Am - F - G)
  const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const BASS = [48, 45, 41, 43, 48, 45, 41, 43];
  const MELODY = [
    76, _, 74, 72, 74, _, 76, _,
    72, _, 69, _, 72, 74, 76, _,
    77, _, 76, 74, 72, _, _, _,
    74, _, 71, _, 74, 76, 74, _,
    79, _, 76, _, 74, 72, 74, 76,
    76, _, 72, _, 69, _, 72, _,
    72, _, 74, _, 77, _, 76, 74,
    74, _, 71, _, 67, _, _, _,
  ];

  let ctx = null, master = null, timer = null, step = 0, nextT = 0, on = true, started = false;
  try { on = localStorage.getItem("bgm_on") !== "0"; } catch (e) {}

  function tone(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 멜로디 음 길이: 다음 음이 나올 때까지(최대 4칸)
  const holdOf = (i) => { let n = 1; while (n < 4 && MELODY[(i + n) % MELODY.length] === _) n++; return n; };

  function play(i, t) {
    const bar = Math.floor(i / 8) % 8, beat = i % 8;
    const m = MELODY[i % MELODY.length];
    if (m !== _) tone(hz(m), t, STEP * holdOf(i % MELODY.length) * 0.95, "square", 0.045);
    const ch = CHORDS[bar];
    tone(hz(ch[[0, 1, 2, 1][beat % 4]] + 12), t, STEP * 0.6, "triangle", 0.035); // 잔잔한 분산화음
    if (beat === 0 || beat === 4) tone(hz(BASS[bar]), t, STEP * 3.6, "triangle", 0.11); // 베이스
  }

  function schedule() {
    while (nextT < ctx.currentTime + 0.2) { play(step, nextT); step = (step + 1) % 64; nextT += STEP; }
  }

  function start() {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (!master) { master = ctx.createGain(); master.gain.value = VOL; master.connect(ctx.destination); }
      ctx.resume();
      if (!timer) { nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 50); }
      started = true;
    } catch (e) {}
  }
  function stop() { clearInterval(timer); timer = null; if (ctx) ctx.suspend(); }
  function toggle() {
    on = !on;
    try { localStorage.setItem("bgm_on", on ? "1" : "0"); } catch (e) {}
    on ? start() : stop();
    paint();
  }
  // 속보 같은 효과음이 나올 때 잠깐 줄이기
  function duck(sec = 3) {
    if (!master || !ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(VOL * 0.25, t);
    master.gain.linearRampToValueAtTime(VOL, t + sec);
  }

  // 켜기/끄기 버튼
  let btn = null;
  function paint() { if (btn) btn.textContent = on ? "🔊 음악" : "🔇 음악"; }
  function build() {
    btn = document.createElement("button");
    btn.className = "btn bgm-btn";
    btn.onclick = (e) => { e.stopPropagation(); toggle(); };
    paint();
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
  // 브라우저는 사용자가 한 번 누른 뒤에만 소리를 허락함
  const kick = () => { if (!started) start(); };
  document.addEventListener("pointerdown", kick, true);
  document.addEventListener("keydown", kick, true);

  return { start, stop, toggle, duck, state: () => (ctx ? ctx.state + " " + step : "off") };
})();
