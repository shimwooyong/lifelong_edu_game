// 게임 기본 설정
const SETTINGS = {
  title: "배움의 일생",
  subtitle: "평생교육과 함께하는 한 사람의 80년",
  maxAge: 80,                       // 이 나이가 되면 엔딩
  stats: ["자산"],                  // 능력치는 자산 하나

  // 시작 자산: 태어난 가정의 소득분위로 정한다 (분위마다 20% 확률)
  // 금액 비율은 통계청 가계금융복지조사의 소득 5분위별 평균 자산 비율을 따름 (3분위 = 100)
  startClasses: [
    { name: "소득 1분위", chance: 0.2, asset: 40,  text: "넉넉하지 않은 집" },
    { name: "소득 2분위", chance: 0.2, asset: 70,  text: "빠듯하지만 정이 많은 집" },
    { name: "소득 3분위", chance: 0.2, asset: 100, text: "평범한 중산층 집" },
    { name: "소득 4분위", chance: 0.2, asset: 140, text: "여유가 있는 집" },
    { name: "소득 5분위", chance: 0.2, asset: 260, text: "부유한 집" },
  ],
  startSpread: 0.1,                 // 시작 자산에 ±10% 무작위 차이

  // 자산이 많을수록 좋은 일이 생길 확률이 커진다
  // 배율 = (자산 ÷ 기준)의 제곱근, 최소~최대 사이로 제한
  luck: { base: 100, min: 0.5, max: 2 },

  // 교육 멘토링(교수님 찬스): 시기마다 한 번, 그 시기의 '가장 좋은 선택'(mentor가 붙은 선택지)이 나올 때 확률 검사
  // 확률 = chance × 운 배율(자산) × repeat^(이미 나온 횟수). 한 일생에 평균 약 1번, 최대 max번
  mentoring: {
    chance: 0.2,
    repeat: 0.35,                   // 한 번 나온 뒤엔 다음 확률이 35%로 줄어듦 (2·3번은 드물게)
    max: 3,
    edge: 0.1,                      // 인생의 처음·마지막 10%(0~7세, 73~80세)에는 멘토링이 나오지 않음
    title: "🎓 교육 멘토링",
    text: `교수님 찬스가 찾아왔다!
교수님이 이 시기에 가장 좋은 선택을 직접 알려 주십니다.
교수님의 설명을 들은 뒤 '다음'을 누르세요.`,
  },

  bgm: "",                          // 예: "assets/sounds/bgm.mp3"
  randomNames: ["김하늘", "이도윤", "박서연", "최지호", "정하린", "강민준", "윤서아", "한지우"],
};

// 조별 멀티플레이 설정
SETTINGS.multi = {
  gap: 30,               // 부모와 자녀의 나이 차이
  independentAge: 30,    // 자녀가 이 나이가 되면 스스로 선택 (그 전엔 부모가 결정)
  childEnd: 60,          // 자녀가 이 나이가 되면 게임 끝
  endingScale: 0.9,      // 엔딩 기준(좋은 교육 가짓수)에 곱하는 값: 80년 기준 22·18·13 → 60년 기준 20·16·12
};

const STAGES = [];
const EVENTS = [];
const ENDINGS = [];
function addStage(s) { STAGES.push(s); }
function addEvent(e) { EVENTS.push(e); }
function addEnding(e) { ENDINGS.push(e); }
