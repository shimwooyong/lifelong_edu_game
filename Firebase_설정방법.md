# 수업용 온라인 설정 (처음 한 번만)

## 1. Firebase 프로젝트 만들기 (서버)
1. https://console.firebase.google.com 에 Google 계정으로 로그인
2. **프로젝트 추가** → 이름 `lifelong-edu-game` → Google 애널리틱스는 **사용 안 함** → 만들기
3. 왼쪽 메뉴 **빌드 → Realtime Database** → **데이터베이스 만들기**
   - 위치: **싱가포르(asia-southeast1)**
   - 보안 규칙: **테스트 모드로 시작** → 사용 설정
4. 위쪽 **규칙** 탭에서 내용을 전부 지우고 아래를 붙여 넣은 뒤 **게시**
   ```json
   {
     "rules": {
       "lifelong": { ".read": true, ".write": true }
     }
   }
   ```
   (테스트 모드는 30일 뒤 막히므로 이 규칙으로 바꿔 둡니다.)
5. 왼쪽 위 톱니바퀴 **프로젝트 설정** → 아래 **내 앱**에서 웹 아이콘 `</>` 클릭
   → 앱 닉네임 `game` → **앱 등록**
6. 화면에 나오는 `const firebaseConfig = { ... };` 부분을 **통째로 복사해서 Claude 채팅에 붙여 넣기**
   → Claude가 `js/firebase-config.js`에 넣어 줍니다. (이 값은 공개돼도 괜찮은 값입니다.)

## 2. 학생 접속 주소 만들기 (GitHub Pages)
1. https://github.com/shimwooyong/lifelong_edu_game → **Settings** → 왼쪽 **Pages**
2. Source: **Deploy from a branch**, Branch: **main** / **(root)** → **Save**
3. 1~2분 뒤 주소가 생깁니다: `https://shimwooyong.github.io/lifelong_edu_game/`
   - 학생: 위 주소
   - 관리자: 위 주소 뒤에 `admin.html`
- 저장소가 비공개(Private)면 Pages가 유료입니다. 이 경우 Settings → General 맨 아래에서 **Public**으로 바꾸거나 Claude에게 다른 방법을 물어보세요.

## 수업 진행 순서
1. 관리자 페이지 접속 → 비밀번호 입력 → 조 수 입력 → **새 게임 방 만들기**
2. 학생들이 접속해 조 → 역할(부모 1·2, 자녀 1·2) 선택
3. 4명 모인 조부터 **게임 시작** (또는 **4명 모인 조 모두 시작**)
4. 관리자 화면에서 조별 나이·자산·투표 상황·최근 선택을 실시간으로 확인

## 알아 둘 점
- 관리자 비밀번호는 `js/firebase-config.js`의 `ADMIN_PASSWORD`. 현재 `2607`.
  (간단한 잠금이라 코드를 뜯어보면 보일 수 있습니다. 수업용으로만 쓰세요.)
- 학생이 새로고침하거나 잠깐 나가도 같은 기기·브라우저면 자기 자리로 돌아옵니다.
- Firebase를 설정하기 전에는 '로컬 테스트 모드'로, 같은 브라우저의 여러 탭끼리만 연결됩니다.
  여러 탭으로 시험할 땐 주소 뒤에 `?p=1`, `?p=2`처럼 붙이면 서로 다른 사람으로 취급됩니다.
