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

  let ctx = null, master = null, bus = null, timer = null, step = 0, nextT = 0, on = true, started = false;
  try { on = localStorage.getItem("bgm_on") !== "0"; } catch (e) {}

  // 음 하나: 부드럽게 시작(atk) → 길게 유지(살짝 줄어듦) → 끝에서 천천히 사라짐(rel). 음이 뚝 끊기지 않게
  function tone(freq, t, dur, type, vol, atk = 0.015, rel = 0.12) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setTargetAtTime(vol * 0.65, t + atk, dur * 0.5);
    g.gain.setTargetAtTime(0, t + dur, rel / 3);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + rel + 0.05);
  }
  // 멜로디 음 길이: 다음 음이 나올 때까지(최대 4칸)
  const holdOf = (i) => { let n = 1; while (n < 4 && MELODY[(i + n) % MELODY.length] === _) n++; return n; };

  // ── 속보 테마: 단조, 빠른 박자, 경보음 같은 멜로디 (브레이킹 뉴스가 떠 있는 동안) ──
  const NSTEP = 60 / 152 / 2; // 152BPM 8분음표
  const N_CHORDS = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]; // Am - F - G - E
  const N_LEAD = [
    81, _, 76, _, 81, _, 76, 77,
    77, _, 72, _, 77, _, 72, 74,
    79, _, 74, _, 79, _, 74, 76,
    80, _, 76, _, 80, _, 83, _,
  ];
  let noise = null;
  function hat(t, vol = 0.05) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noise; f.type = "highpass"; f.frequency.value = 6000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.06);
  }
  function drum(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
  }
  function playNews(i, t) {
    const bar = Math.floor(i / 8) % 4, beat = i % 8, ch = N_CHORDS[bar];
    // 쿵쿵 울리는 북 + 쉴 새 없는 하이햇
    if (beat === 0 || beat === 4) drum(t);
    hat(t, beat % 2 ? 0.03 : 0.05);
    // 몰아치는 베이스 (8분음표, 옥타브 왕복)
    tone(hz(ch[0] - 12 + (beat % 2 ? 12 : 0)), t, NSTEP * 0.8, "square", 0.05, 0.005, 0.04);
    // 엇박자 화음 찌르기
    if (beat === 0 || beat === 3 || beat === 6) ch.forEach((n) => tone(hz(n + 12), t, NSTEP * 0.9, "square", 0.018, 0.005, 0.05));
    // 경보음 같은 멜로디
    const m = N_LEAD[i % 32];
    if (m !== _) tone(hz(m), t, NSTEP * (N_LEAD[(i + 1) % 32] === _ ? 1.8 : 0.9), "square", 0.04, 0.005, 0.06);
  }

  function playMain(i, t) {
    const bar = Math.floor(i / 8) % 8, beat = i % 8;
    const m = MELODY[i % MELODY.length];
    const ch = CHORDS[bar];
    // 멜로디: 다음 음까지 이어서
    if (m !== _) tone(hz(m), t, STEP * holdOf(i % MELODY.length), "square", 0.04, 0.02, 0.2);
    // 분산화음: 16분음표로 촘촘하게, 앞 음과 살짝 겹치게
    const arp = [0, 1, 2, 1, 2, 1, 0, 1];
    tone(hz(ch[arp[(beat * 2) % 8]] + 12), t, STEP * 0.7, "triangle", 0.028, 0.01, 0.15);
    tone(hz(ch[arp[(beat * 2 + 1) % 8]] + 12), t + STEP / 2, STEP * 0.7, "triangle", 0.022, 0.01, 0.15);
    // 패드: 마디 내내 깔리는 부드러운 화음
    if (beat === 0) ch.forEach((n) => tone(hz(n), t, STEP * 8, "sine", 0.03, 0.4, 0.6));
    // 베이스: 근음 + 5도로 걸음걸이처럼
    if (beat === 0) tone(hz(BASS[bar]), t, STEP * 4, "triangle", 0.11, 0.02, 0.2);
    if (beat === 4) tone(hz(BASS[bar] + 7), t, STEP * 4, "triangle", 0.09, 0.02, 0.2);
  }

  let mode = "main"; // main: 잔잔한 곡, news: 속보 테마
  function schedule() {
    while (nextT < ctx.currentTime + 0.2) {
      if (mode === "news") { playNews(step, nextT); step = (step + 1) % 32; nextT += NSTEP; }
      else { playMain(step, nextT); step = (step + 1) % 64; nextT += STEP; }
    }
  }
  // 곡 바꾸기: 잠깐 소리를 줄였다가 새 곡을 처음부터
  function setMode(m) {
    if (mode === m) return;
    mode = m; step = 0;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(VOL, t + 0.4);
    nextT = t + 0.08;
  }

  function start() {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (!master) {
        master = ctx.createGain(); master.gain.value = VOL; master.connect(ctx.destination);
        // 은은한 메아리: 음 사이를 채워 소리가 덜 비어 보이게
        bus = ctx.createGain(); bus.connect(master);
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const nd = noise.getChannelData(0); for (let k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
        const dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
        dl.delayTime.value = STEP * 1.5; fb.gain.value = 0.32; wet.gain.value = 0.3; lp.type = "lowpass"; lp.frequency.value = 2200;
        bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(master);
      }
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

  return { start, stop, toggle, duck, news: (onAir) => setMode(onAir ? "news" : "main"), state: () => (ctx ? ctx.state + " " + mode + " " + step : "off") };
})();
