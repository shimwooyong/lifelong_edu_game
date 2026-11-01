// 게임 기본 설정
const SETTINGS = {
  title: "배움의 일생",
  subtitle: "평생교육과 함께하는 한 사람의 80년",
  maxAge: 80,                       // 이 나이가 되면 엔딩
  stats: ["지식", "건강", "행복", "자산"],
  startStats: { 지식: 30, 건강: 60, 행복: 60, 자산: 50 },
  statColors: { 지식: "#4f7cff", 건강: "#2fb47c", 행복: "#ff9f43", 자산: "#b07cff" },
  bgm: "",                          // 예: "assets/sounds/bgm.mp3"
  randomNames: ["김하늘", "이도윤", "박서연", "최지호", "정하린", "강민준", "윤서아", "한지우"],
};

const STAGES = [];
const EVENTS = [];
const ENDINGS = [];
function addStage(s) { STAGES.push(s); }
function addEvent(e) { EVENTS.push(e); }
function addEnding(e) { ENDINGS.push(e); }
