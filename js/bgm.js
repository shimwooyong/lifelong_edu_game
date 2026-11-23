// 잔잔한 8비트 배경음악: 파일 없이 브라우저가 직접 연주 (저작권 걱정 없음)
// 화면을 처음 누르면 시작(브라우저 규칙), 오른쪽 아래 🔊 버튼으로 켜고 끄기. 설정은 기기에 기억됨
window.BGM = (() => {
  const BPM = 80, STEP = 60 / BPM / 2; // 8분음표 길이(초)
  const VOL = 0.3;                      // 전체 음량 (2026-11-23: 0.16 → 0.3으로 올림)
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

  // ── 속보 테마: 긴장감 (브레이킹 뉴스가 떠 있는 동안) ──
  // 반음씩 갈아대는 16분음표 저음 + 마디마다 반음씩 올라가는 조 + 불안한 감7화음 + 심장 박동 + 스네어 롤
  const NSTEP = 60 / 184 / 4; // 184BPM 16분음표
  const N_ROOT = [40, 41, 42, 43]; // E → F → F# → G (계속 조여 오는 느낌)
  let noise = null;
  function noiseHit(t, vol, dur, type, freq) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.01);
  }
  function heart(t, vol) { // 낮게 쿵 울리는 심장 박동
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.23);
  }
  // 떨리는 긴 음 (비브라토)
  function eerie(freq, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "square"; o.frequency.value = freq;
    l.frequency.value = 6; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setTargetAtTime(0, t + dur, 0.05);
    o.connect(g); g.connect(bus); o.start(t); l.start(t); o.stop(t + dur + 0.3); l.stop(t + dur + 0.3);
  }
  // 사이렌: 음이 위아래로 울부짖듯 오르내림
  function siren(t, dur, lo, hi, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(lo, t); o.frequency.linearRampToValueAtTime(hi, t + dur / 2); o.frequency.linearRampToValueAtTime(lo, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setTargetAtTime(0, t + dur - 0.05, 0.04);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.2);
  }
  // 과장된 속보 테마 (2026-11-23 피드백: 더 긴박하고 다급하게)
  // 184BPM, 쿵쿵 몰아치는 북, 숨 가쁜 16분 고음 경보 멜로디, 엇박 금관 찌르기, 사이렌, 마디마다 반음씩 올라감
  const RUN = [0, 12, 11, 12, 7, 12, 6, 12, 0, 12, 11, 12, 13, 12, 6, 7]; // 쉴 틈 없이 달리는 고음 (반음·증4도로 불안하게)
  function playNews(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16, r = N_ROOT[bar];
    // 숨 가쁜 고음 경보 멜로디
    tone(hz(r + 36 + RUN[s]), t, NSTEP * 0.75, "square", 0.03, 0.002, 0.02);
    // 갈아대는 저음 옥타브 왕복
    tone(hz(r + (s % 2 ? 12 : 0) + (s % 8 === 6 ? 1 : 0)), t, NSTEP * 0.85, "square", 0.05, 0.002, 0.02);
    if (s % 4 === 0) tone(hz(r - 12), t, NSTEP * 3.5, "triangle", 0.13, 0.004, 0.05);
    // 북: 박마다 쿵, 마디 끝은 쿵쿵쿵쿵
    if (s % 4 === 0 || (s >= 12 && s % 2 === 0)) heart(t, 0.4);
    // 스네어: 2·4박 + 마지막 마디는 점점 커지는 롤
    if (bar === 3 && s >= 4) noiseHit(t, 0.03 + (s - 4) * 0.006, 0.06, "bandpass", 2000);
    else if (s === 4 || s === 12) noiseHit(t, 0.07, 0.12, "bandpass", 1800);
    // 하이햇: 쉬지 않고 칙칙칙
    if (s % 2 === 1) noiseHit(t, 0.012, 0.03, "highpass", 7000);
    // 금관 찌르기: 감7화음을 엇박에 '빠밤!'
    if (s === 0 || s === 3 || s === 6 || s === 10) [0, 3, 6, 9].forEach((d) => tone(hz(r + 24 + d), t, NSTEP * (s === 0 ? 2.5 : 1.2), "sawtooth", 0.014, 0.002, 0.04));
    // 떨리는 긴 경고음
    if (s === 8) eerie(hz(r + 42), t, NSTEP * 7, 0.022);
    // 사이렌: 두 마디마다 울부짖기
    if (s === 0 && bar % 2 === 0) siren(t, NSTEP * 16, hz(r + 48), hz(r + 55), 0.018);
    // 한 바퀴 끝: 위로 치솟는 음 → 다음 바퀴 처음으로
    if (bar === 3 && s === 12) siren(t, NSTEP * 4, hz(r + 24), hz(r + 60), 0.02);
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
      if (mode === "news") { playNews(step, nextT); step = (step + 1) % 64; nextT += NSTEP; }
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
