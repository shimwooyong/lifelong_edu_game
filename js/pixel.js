// 도트 그림: 코드로 작은 그림을 그려 이미지로 만든다 (외부 애셋 없음)
// 이벤트 그림은 data 쪽 image 필드가 있으면 그걸 쓰고, 없으면 아래 SCENE_OF로 자동 선택
window.Pixel = (() => {
  const C = {
    ink: "#241f2e", ink2: "#3a3346", gray: "#8b8599", gray2: "#5a5466", lgray: "#c9c3cf",
    cream: "#fbf3e0", paper: "#f3e6c8", wall2: "#d9c39b",
    sky: "#8fcfe6", sky2: "#c4e6ee", night: "#29366f", night2: "#1a1c2c",
    sun: "#ffcd75", orange: "#ef7d57", red: "#b13e53", pink: "#e98a9a",
    green: "#38b764", grass: "#4fa356", grass2: "#257f4c", teal: "#257179",
    blue: "#3b5dc9", lblue: "#41a6f6", win: "#73c2e6", purple: "#7a4c9e",
    wood: "#8a5a3c", wood2: "#5e3b28", dirt: "#b08a5a",
    skin: "#f2c19a", skin2: "#d99a74", hair: "#3a2a20", hairG: "#d8d2dc", board: "#2f5a46",
  };
  const W = 96, H = 56;
  let x0; // 현재 캔버스 컨텍스트

  // 좌표 단위는 그대로 두고, 실제 픽셀은 SCALE배로 촘촘하게 그린다 (0.5 단위 = 실제 1픽셀)
  const SCALE = 2, h_ = 1 / SCALE;
  const r = (x, y, w, h, c) => { x0.fillStyle = C[c] || c; x0.fillRect(x, y, w, h); };
  const shade = (x, y, w, h, a = 0.18) => r(x, y, w, h, `rgba(0,0,0,${a})`);
  const lite = (x, y, w, h, a = 0.35) => r(x, y, w, h, `rgba(255,255,255,${a})`);
  // 윤곽선은 항상 1칸(실제 2픽셀) 굵기로 통일, 안쪽 디테일만 0.5칸으로 세밀하게
  const box = (x, y, w, h, c) => { r(x, y, w, h, "ink"); r(x + 1, y + 1, w - 2, h - 2, c); };

  // ── 조각 ──
  const sky = (c = "sky") => {
    r(0, 0, W, H, c);
    if (c === "sky") { r(0, 0, W, 6, "#7cc4e0"); for (let i = 0; i < W; i += 1) if (i % 2 === 0) r(i, 6, h_, h_, "#7cc4e0"); }
  };
  const ground = (y, c = "grass", c2 = "grass2") => {
    r(0, y, W, H - y, c); r(0, y, W, h_, c2); lite(0, y + h_, W, h_, 0.2);
    for (let i = 2; i < W; i += 4.5) { r(i, y + 2 + (i % 3), h_, 1, c2); r(i + h_, y + 1.5 + (i % 3), h_, h_, c2); }
    for (let i = 5; i < W; i += 11) r(i, y + 5 + (i % 4), 1, h_, "sun");
  };
  const cloud = (x, y) => {
    r(x + 2.5, y, 5, h_, "cream"); r(x + 1.5, y + h_, 7.5, h_, "cream"); r(x + h_, y + 1, 10, 1.5, "cream");
    r(x, y + 1.5, 11, 1, "cream"); r(x + h_, y + 2.5, 10, h_, "sky2"); r(x + 1, y + 3, 8.5, h_, "sky2");
  };
  const sun = (x, y) => {
    r(x + 1.5, y, 4, 7, "sun"); r(x, y + 1.5, 7, 4, "sun"); r(x + h_, y + h_, 6, 6, "sun");
    lite(x + 1.5, y + 1, 2, 1, 0.5); shade(x + 4.5, y + 5, 1.5, 1, 0.08);
  };
  const moon = (x, y) => { r(x + 1, y, 4, 6, "cream"); r(x, y + 1, 6, 4, "cream"); r(x + 3, y, 3, 4, "night"); r(x + 2.5, y + h_, h_, 3, "night"); };
  const stars = () => [[8, 6], [20, 12], [40, 4], [70, 9], [86, 15], [56, 14], [30, 9], [62, 3]].forEach(([a, b], i) => {
    r(a, b, h_, h_, "cream"); if (i % 2 === 0) { r(a - h_, b, h_, h_, "sky2"); r(a + h_, b, h_, h_, "sky2"); r(a, b - h_, h_, h_, "sky2"); r(a, b + h_, h_, h_, "sky2"); }
  });
  const tree = (x, y) => {
    r(x + 2, y - 5, 2, 5, "wood"); shade(x + 3.5, y - 5, h_, 5); r(x + 1.5, y - h_, 3, h_, "wood2");
    r(x + 1, y - 13, 4, 1, "grass2"); r(x + h_, y - 12.5, 5, h_, "grass2"); r(x, y - 12, 6, 6.5, "grass2"); r(x + h_, y - 5.5, 5, h_, "grass2");
    r(x + 1, y - 11.5, 2.5, 2, "green"); r(x + 1.5, y - 12, 1, h_, "green"); r(x + 3.5, y - 9, 1.5, 1, "green");
    shade(x + 4, y - 8, 1.5, 2.5, 0.15);
  };
  const win = (x, y, c = "win") => {
    box(x, y, 5, 5, c); shade(x + 1, y + 3, 3, 1, 0.12);
    lite(x + 1, y + 1, 1.5, h_, 0.8); lite(x + 1, y + 1.5, h_, h_, 0.8);
  };
  const door = (x, y, c = "wood") => {
    box(x, y - 8, 6, 8, c); shade(x + 1, y - 7, 1.5, 3, 0.12); shade(x + 3.5, y - 7, 1.5, 3, 0.12);
    r(x + 4.5, y - 4, 1, 1, "sun"); lite(x + 4.5, y - 4, h_, h_, 0.6);
  };
  const flatRoof = (x, y, w, c) => { r(x - 1, y - 3, w + 2, 3, "ink"); r(x, y - 2, w, 2, c); lite(x, y - 2, w, h_, 0.3); shade(x, y - h_, w, h_, 0.15); };
  const peakRoof = (x, y, w, c) => { // 세모 지붕, y는 지붕 밑 (0.5 단위 계단으로 더 매끈하게)
    const hh = Math.ceil(w / 2);
    for (let i = 0; i < hh; i += h_) { r(x + i - 1, y - i - h_, w - 2 * i + 2, h_, "ink"); r(x + i, y - i - h_, Math.max(0, w - 2 * i), h_, c); }
    for (let i = 1; i < hh - 1; i += 2) r(x + i + 1, y - i - 1, w - 2 * i - 2, h_, `rgba(0,0,0,.12)`);
  };
  const building = (x, y, w, h, wall = "paper", roof = "red", rows = 1) => {
    box(x, y - h, w, h, wall); flatRoof(x, y - h, w, roof); shade(x + w - 1.5, y - h + h_, 1, h - 1, 0.1);
    for (let ry = 0; ry < rows; ry++) for (let wx = x + 3; wx + 5 < x + w - 1; wx += 8) win(wx, y - h + 3 + ry * 8);
  };
  const bush = (x, y) => {
    r(x + 1, y - 4, 5, h_, "grass2"); r(x + h_, y - 3.5, 6, h_, "grass2"); r(x, y - 3, 7, 3, "grass2");
    r(x + 1, y - 3, 2, 1, "green"); r(x + 1.5, y - 3.5, 1, h_, "green"); r(x + 4, y - 2, 1, h_, "pink");
  };

  // 사람: x,y는 왼발 아래. kind: baby | kid | teen | adult | elder
  function person(x, y, o = {}) {
    const k = o.kind || "adult", shirt = o.shirt || "blue", pants = o.pants || "ink2";
    const hair = o.hair || (k === "elder" ? "hairG" : "hair");
    const eyes = (ex, ey, w) => { r(ex + 1, ey, h_, 1, "ink"); r(ex + w - 1.5, ey, h_, 1, "ink"); };
    const cheeks = (ex, ey, w) => { r(ex + h_, ey, h_, h_, "pink"); r(ex + w - 1, ey, h_, h_, "pink"); };
    if (k === "baby") {
      const t = y - 6;
      r(x + h_, t, 3, h_, hair); r(x, t + h_, 4, 2.5, "skin"); r(x, t + h_, 4, h_, hair);
      eyes(x, t + 1.5, 4); cheeks(x, t + 2.5, 4);
      r(x - 1, t + 3, 6, 3, shirt); lite(x - h_, t + 3, 2, h_, 0.3); shade(x + 4, t + 3.5, 1, 2.5);
      return;
    }
    if (k === "kid") {
      const t = y - 10;
      r(x + h_, t, 3, h_, hair); r(x, t + h_, 4, 1.5, hair); r(x, t + 1, 4, 3, "skin"); r(x, t + 1, 4, 1, hair); r(x, t + 2, h_, 1, hair);
      eyes(x, t + 2, 4); cheeks(x, t + 3, 4); r(x + 1.5, t + 3.5, 1, h_, "skin2");
      r(x, t + 4, 4, 3, shirt); r(x - 1, t + 4, 1, 2, shirt); r(x + 4, t + 4, 1, 2, shirt);
      shade(x + 3.5, t + 4, h_, 3); lite(x, t + 4, 4, h_, 0.25);
      r(x - 1, t + 6, 1, 1, "skin"); r(x + 4, t + 6, 1, 1, "skin");
      r(x, t + 7, 1.5, 2, pants); r(x + 2.5, t + 7, 1.5, 2, pants);
      r(x - h_, t + 9, 2, 1, "ink"); r(x + 2.5, t + 9, 2, 1, "ink");
      if (o.bag) { r(x + 4, t + 4, 2, 3, o.bag); shade(x + 5.5, t + 4, h_, 3); }
      return;
    }
    const h = k === "teen" ? 13 : 14, t = y - h;
    // 머리
    r(x + h_, t, 4, h_, hair); r(x, t + h_, 5, 1.5, hair); r(x, t + 2, 5, 3, "skin");
    r(x, t + 2, 1, h_, hair); r(x, t + 2, h_, 1.5, hair); r(x + 4.5, t + 2, h_, 1, hair);
    lite(x + 1, t + h_, 1.5, h_, 0.25);
    eyes(x, t + 3, 5); cheeks(x, t + 4, 5); r(x + 2, t + 4.5, 1, h_, "skin2");
    if (o.glasses) {
      r(x + h_, t + 2.5, 1.5, 1.5, "ink"); r(x + 1, t + 3, h_, h_, "win");
      r(x + 3, t + 2.5, 1.5, 1.5, "ink"); r(x + 3.5, t + 3, h_, h_, "win"); r(x + 2, t + 3, 1, h_, "ink");
    }
    // 몸
    const b = t + 5, bh = h - 9;
    r(x, b, 5, bh, shirt); r(x - 1, b, 1, bh - 1, shirt); r(x + 5, b, 1, bh - 1, shirt);
    lite(x, b, 5, h_, 0.25); shade(x + 4, b, 1, bh); shade(x + 5, b, 1, bh - 1, 0.25);
    r(x + 1.5, b, 2, h_, "skin");
    r(x - 1, b + bh - 1, 1, 1, "skin"); r(x + 5, b + bh - 1, 1, 1, "skin");
    if (o.tie) { r(x + 2, b + h_, 1, 3, o.tie); r(x + 2.5, b + 3.5, h_, h_, o.tie); }
    // 다리
    r(x, b + bh, 2, 3, pants); r(x + 3, b + bh, 2, 3, pants); shade(x + 1.5, b + bh, h_, 3); shade(x + 4.5, b + bh, h_, 3);
    r(x - h_, y - 1, 2.5, 1, "ink"); r(x + 3, y - 1, 2.5, 1, "ink");
    if (o.bag) { r(x + 5, b, 2, 4, o.bag); shade(x + 6.5, b, h_, 4); r(x + 5, b, 2, h_, "ink"); }
    if (k === "elder") { r(x + 7, b + 1, 1, h - 6, "wood"); r(x + 6.5, b + 1, 1.5, h_, "wood2"); }
  }

  // ── 장면 ──
  const SCENES = {
    home() {
      sky(); sun(80, 5); cloud(10, 8); cloud(50, 4); ground(44);
      box(24, 26, 34, 18, "paper"); peakRoof(23, 26, 36, "red");
      win(28, 30); win(48, 30); door(38, 44);
      r(53, 12, 3, 6, "ink2"); tree(66, 44); tree(4, 44); bush(14, 44);
      person(64, 52, { kind: "adult", shirt: "orange" }); person(72, 52, { kind: "kid", shirt: "sun" }); person(78, 52, { kind: "adult", shirt: "blue" });
    },
    kinder() {
      sky(); sun(6, 5); cloud(60, 6); ground(44);
      box(8, 24, 40, 20, "cream"); flatRoof(8, 24, 40, "orange");
      for (let i = 0; i < 4; i++) r(10 + i * 10, 21, 8, 2, ["red", "sun", "green", "lblue"][i]);
      win(12, 28, "sun"); win(34, 28, "sun"); door(24, 44, "red");
      // 미끄럼틀
      r(60, 30, 2, 14, "ink"); r(62, 30, 6, 2, "red"); for (let i = 0; i < 12; i++) r(68 + i, 31 + i, 2, 1, "sun");
      r(58, 26, 6, 4, "lblue");
      person(52, 52, { kind: "kid", shirt: "pink" }); person(84, 52, { kind: "kid", shirt: "green" }); person(72, 52, { kind: "baby", shirt: "sun" });
    },
    school() {
      sky(); cloud(6, 6); cloud(70, 4); ground(46);
      building(14, 46, 64, 26, "paper", "teal", 2);
      box(42, 12, 8, 8, "cream"); r(45, 14, 1, 3, "ink"); r(46, 16, 2, 1, "ink"); // 시계
      door(43, 46, "wood");
      r(86, 14, 1, 32, "gray2"); r(87, 14, 7, 5, "red"); r(88, 15, 4, 3, "cream");
      person(4, 54, { kind: "kid", shirt: "blue", bag: "red" }); person(84, 54, { kind: "teen", shirt: "ink2", pants: "ink" });
    },
    academy() {
      sky("night"); stars(); moon(80, 4); r(0, 46, W, 10, "ink2");
      building(10, 46, 22, 36, "wall2", "gray2", 4); building(64, 46, 26, 30, "wall2", "gray2", 3);
      box(36, 10, 24, 36, "paper"); flatRoof(36, 10, 24, "purple");
      box(38, 13, 20, 7, "sun"); r(40, 15, 16, 1, "red"); r(40, 17, 10, 1, "red");
      for (let ry = 0; ry < 3; ry++) { win(39, 23 + ry * 7, "sun"); win(46, 23 + ry * 7, "sun"); win(53, 23 + ry * 7, "sun"); }
      person(30, 55, { kind: "teen", shirt: "blue", bag: "orange" }); person(62, 55, { kind: "teen", shirt: "red", bag: "teal" });
    },
    library() {
      r(0, 0, W, 44, "paper"); r(0, 44, W, 12, "wood"); r(0, 44, W, 1, "wood2");
      for (let s = 0; s < 3; s++) {
        const sx = 6 + s * 30; box(sx, 6, 24, 36, "wood");
        for (let row = 0; row < 4; row++) {
          r(sx + 1, 14 + row * 8, 22, 1, "wood2");
          for (let b = 0; b < 9; b++) r(sx + 2 + b * 2 + (b > 5 ? 1 : 0), 8 + row * 8, 2, 6 - (b % 3), ["red", "blue", "green", "sun", "purple", "teal"][(b + row + s) % 6]);
        }
      }
      box(30, 40, 36, 5, "wood2");
      person(36, 52, { kind: "adult", shirt: "orange" }); person(56, 52, { kind: "kid", shirt: "green" });
      r(44, 38, 6, 3, "cream"); r(46, 38, 1, 3, "ink2");
    },
    university() {
      sky(); cloud(4, 5); cloud(74, 8); ground(46);
      box(16, 22, 64, 24, "cream"); peakRoof(15, 22, 66, "gray");
      for (let i = 0; i < 6; i++) { r(20 + i * 10, 24, 4, 20, "paper"); r(20 + i * 10, 24, 4, 1, "ink"); r(20 + i * 10, 43, 4, 1, "ink"); }
      r(46, 12, 4, 3, "sun");
      person(6, 54, { kind: "adult", shirt: "green", bag: "ink2" }); person(84, 54, { kind: "adult", shirt: "purple" });
      r(40, 50, 16, 2, "lgray"); r(42, 48, 12, 2, "lgray");
    },
    office() {
      r(0, 0, W, 40, "sky2"); r(0, 40, W, 16, "gray"); r(0, 40, W, 1, "gray2");
      box(6, 6, 30, 22, "win"); r(20, 6, 1, 22, "ink"); r(6, 17, 30, 1, "ink"); r(9, 12, 6, 5, "lgray"); r(25, 9, 7, 8, "lgray");
      box(44, 30, 44, 4, "wood"); r(48, 34, 2, 10, "wood2"); r(82, 34, 2, 10, "wood2");
      box(52, 18, 14, 11, "ink2"); r(54, 20, 10, 7, "lblue"); r(58, 29, 2, 1, "ink");
      box(70, 22, 12, 7, "cream"); r(72, 24, 8, 1, "gray"); r(72, 26, 6, 1, "gray");
      person(60, 50, { kind: "adult", shirt: "cream", tie: "red", pants: "ink2" });
      r(10, 34, 6, 10, "green"); r(11, 31, 4, 3, "grass2");
    },
    center() {
      sky(); sun(82, 4); cloud(8, 6); ground(46);
      building(12, 46, 56, 24, "cream", "green", 2);
      box(26, 14, 28, 7, "green"); r(29, 16, 4, 3, "sun"); r(35, 17, 16, 1, "cream");
      door(36, 46, "teal");
      tree(74, 46); bush(84, 46);
      person(28, 54, { kind: "adult", shirt: "orange" }); person(48, 54, { kind: "elder", shirt: "purple" }); person(4, 54, { kind: "adult", shirt: "blue" });
    },
    hospital() {
      sky(); cloud(60, 4); ground(46, "lgray", "gray");
      building(14, 46, 60, 30, "cream", "lblue", 2);
      box(38, 10, 12, 12, "cream"); r(42, 12, 4, 8, "red"); r(40, 14, 8, 4, "red");
      door(41, 46, "lblue");
      person(80, 54, { kind: "adult", shirt: "cream", pants: "lblue" }); person(4, 54, { kind: "adult", shirt: "sun" });
    },
    cafe() {
      r(0, 0, W, 40, "wall2"); r(0, 40, W, 16, "wood"); r(0, 40, W, 1, "wood2");
      for (let i = 0; i < W; i += 12) r(i, 0, 6, 4, "red");
      box(6, 8, 26, 16, "ink2"); r(9, 11, 20, 1, "sun"); r(9, 14, 14, 1, "cream"); r(9, 17, 17, 1, "cream"); r(9, 20, 10, 1, "cream");
      box(10, 30, 76, 10, "wood2");
      box(56, 18, 16, 12, "gray"); r(59, 21, 10, 3, "ink"); r(62, 24, 2, 4, "ink2"); r(60, 28, 6, 2, "cream");
      person(40, 34, { kind: "elder", shirt: "teal" }); r(40, 25, 5, 1, "cream");
      r(78, 26, 4, 4, "cream"); r(82, 27, 1, 2, "cream"); r(79, 23, 1, 2, "lgray");
      person(20, 54, { kind: "adult", shirt: "orange" });
    },
    classroom() {
      r(0, 0, W, 42, "paper"); r(0, 42, W, 14, "wood"); r(0, 42, W, 1, "wood2");
      box(16, 4, 64, 24, "board"); r(16, 27, 64, 2, "wood");
      r(22, 9, 20, 1, "cream"); r(22, 13, 28, 1, "cream"); r(22, 17, 14, 1, "cream"); r(56, 9, 16, 14, "board"); r(58, 10, 12, 1, "sun"); r(58, 21, 12, 1, "sun"); r(63, 11, 2, 10, "sun");
      for (let i = 0; i < 3; i++) { box(8 + i * 30, 44, 20, 4, "wood2"); }
      person(12, 54, { kind: "adult", shirt: "blue" }); person(44, 54, { kind: "elder", shirt: "orange" }); person(74, 54, { kind: "teen", shirt: "green" });
      person(84, 40, { kind: "adult", shirt: "purple", glasses: true });
    },
    storm() {
      sky("gray2"); r(0, 0, W, 12, "ink2");
      for (let i = 0; i < 5; i++) { r(i * 20 - 4, 8 + (i % 2) * 3, 22, 5, "gray"); r(i * 20, 6 + (i % 2) * 3, 14, 2, "gray"); }
      for (let i = 0; i < 26; i++) r((i * 37) % W, 16 + ((i * 13) % 30), 1, 3, "lblue");
      ground(46, "gray", "ink2");
      building(4, 46, 22, 20, "wall2", "ink2", 2); building(70, 46, 22, 24, "wall2", "ink2", 2);
      r(38, 30, 16, 2, "red"); r(40, 28, 12, 2, "red"); r(45, 32, 1, 12, "ink");
      person(43, 54, { kind: "adult", shirt: "teal" });
    },
    phone() {
      r(0, 0, W, 44, "sky2"); r(0, 44, W, 12, "lgray"); r(0, 44, W, 1, "gray");
      box(14, 6, 26, 40, "ink2"); r(17, 9, 20, 28, "lblue"); r(20, 12, 14, 4, "cream"); r(20, 19, 9, 3, "sun"); r(20, 25, 12, 3, "cream"); r(25, 40, 4, 3, "gray");
      box(58, 10, 24, 36, "gray"); r(61, 13, 18, 14, "win"); for (let i = 0; i < 6; i++) r(62 + (i % 3) * 6, 30 + Math.floor(i / 3) * 5, 4, 3, "cream");
      person(46, 54, { kind: "elder", shirt: "red" });
      r(52, 34, 3, 5, "ink2"); r(53, 35, 1, 3, "lblue");
    },
    elder() {
      sky("sky2"); sun(10, 10); r(0, 0, W, 6, "orange"); ground(44);
      tree(70, 44); tree(82, 44); bush(4, 44);
      box(32, 34, 32, 3, "wood"); r(34, 37, 2, 7, "wood2"); r(60, 37, 2, 7, "wood2"); box(32, 28, 32, 3, "wood");
      person(38, 44, { kind: "elder", shirt: "purple" }); person(52, 44, { kind: "elder", shirt: "teal" });
      person(20, 54, { kind: "kid", shirt: "sun" });
    },
    mentor() {
      r(0, 0, W, 42, "cream"); r(0, 42, W, 14, "wood"); r(0, 42, W, 1, "wood2");
      box(8, 4, 52, 28, "board"); r(8, 31, 52, 2, "wood");
      r(14, 10, 12, 1, "sun"); r(14, 14, 26, 1, "cream"); r(14, 18, 20, 1, "cream"); r(14, 22, 30, 1, "cream");
      r(46, 8, 8, 8, "sun"); r(48, 10, 4, 4, "board"); r(49, 11, 2, 2, "sun"); // 반짝 별
      for (let i = 0; i < 8; i++) r(70 + (i % 4) * 6, 4 + Math.floor(i / 4) * 6, 2, 2, "sun");
      person(70, 52, { kind: "adult", shirt: "teal", glasses: true, hair: "hairG", tie: "sun" });
      r(77, 40, 1, 6, "wood2"); r(76, 40, 3, 1, "sun");
      person(20, 54, { kind: "teen", shirt: "blue" }); person(40, 54, { kind: "adult", shirt: "orange" });
    },
  };

  // 이벤트 → 장면
  const SCENE_OF = {
    영어유치원: "kinder", 첫기관: "kinder", 육아지원센터: "kinder",
    초등입학: "school", 고교선택: "school", 자유학기: "school", 장학멘토링: "school",
    대형학원: "academy",
    AI캠프: "classroom", 경력전환: "classroom", 영재교육원: "classroom", 배움나눔: "classroom", 직무워크숍: "classroom",
    진로결정: "university", 고졸후학위: "university", 스무살: "university", 청년해외연수: "university",
    취업준비: "office", 퇴직준비: "office", 회사학습지원: "office", 이직고민: "office",
    자산관리강의: "center", 신중년일자리: "center",
    바리스타자격증: "cafe",
    부모가되다: "home",
    가계위기: "storm", 실직: "storm", 학업중단위기: "storm",
    건강이상: "hospital", 인지건강: "hospital",
    디지털교육: "phone", 금융사기: "phone",
    학습동아리: "library", 늦깎이공부: "library", 자서전: "library",
    웰다잉: "elder",
  };
  const STAGE_SCENE = { 영유아: "home", 청소년: "school", 대학생: "university", 성인: "office", 중장년: "center", 노년: "elder" };

  const cache = {};
  function draw(w, h, fn) {
    const cv = document.createElement("canvas"); cv.width = w * SCALE; cv.height = h * SCALE;
    x0 = cv.getContext("2d"); x0.imageSmoothingEnabled = false; x0.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); return cv.toDataURL();
  }
  function scene(name) {
    if (!SCENES[name]) name = "home";
    return cache[name] || (cache[name] = draw(W, H, SCENES[name]));
  }
  // 이벤트 그림 주소 (ev.image가 있으면 그것)
  function forEvent(ev, stageId, mentor) {
    if (mentor) return scene("mentor");
    if (ev && ev.image) return ev.image;
    return scene((ev && (ev.scene || SCENE_OF[ev.id])) || STAGE_SCENE[stageId] || "home");
  }
  // 시기별 캐릭터 (작은 아이콘)
  const KIND = {
    영유아: { kind: "kid", shirt: "sun" }, 청소년: { kind: "teen", shirt: "blue", bag: "red" },
    대학생: { kind: "adult", shirt: "green", bag: "ink2" }, 성인: { kind: "adult", shirt: "cream", tie: "red" },
    중장년: { kind: "adult", shirt: "purple", hair: "gray" }, 노년: { kind: "elder", shirt: "teal" },
  };
  function sprite(stageId, extra) {
    const key = "s_" + stageId + (extra ? JSON.stringify(extra) : "");
    if (cache[key]) return cache[key];
    const o = Object.assign({}, KIND[stageId] || KIND.성인, extra || {});
    return (cache[key] = draw(12, 16, () => person(o.kind === "kid" ? 4 : 3, 16, o)));
  }
  return { scene, forEvent, sprite, C };
})();

// 첫 화면 그림
(() => { const el = document.getElementById("lobbyArt"); if (el) el.src = Pixel.scene("home"); })();
