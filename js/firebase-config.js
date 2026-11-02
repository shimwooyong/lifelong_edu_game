// ───────── 서버(Firebase) 설정 ─────────
// 비워 두면 '로컬 테스트 모드': 같은 컴퓨터·같은 브라우저의 여러 탭끼리만 연결됩니다.
// Firebase 콘솔에서 받은 설정값을 아래 { } 안에 붙여 넣으면 실제 수업용으로 동작합니다.
window.FIREBASE_CONFIG = {
  databaseURL: "https://lifelong-edu-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifelong-edu-game",
};

// 데이터 저장 위치 이름 (바꾸면 새 저장 공간을 씀)
window.GAME_ROOT = "lifelong";

// 관리자 비밀번호 (admin.html 입장용). 권한을 줄 사람에게만 알려 주세요.
window.ADMIN_PASSWORD = "2607";
