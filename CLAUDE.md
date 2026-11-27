# 평생교육 인생 시뮬레이션 웹 게임

"80억분의 1"을 레퍼런스로 한 스크립트 중심 시뮬레이션 웹 게임. 주제는 "평생교육"으로, 한 가족의 일생에 평생교육 관련 교육용 이벤트를 배치한다. 세부 기획과 스크립트는 사용자가 계속 추가한다.

## 구조 (빌드 없음)
- **조별 멀티플레이(메인)**: `index.html`(학생) + `admin.html`(관리자). `js/net.js`(Firebase 또는 로컬 테스트), `js/logic.js`(규칙), `js/player.js`, `js/admin.js`, `css/multi.css`, `js/firebase-config.js`(설정·관리자 비번).
  - 한 조=한 가족: 부모 1·2, 자녀 1·2. 자녀 1명(0→60세), 부모(30→90세). 자녀 20세 전엔 부모 둘이, 이후엔 자녀 둘이 자녀 선택(independentAge). 자녀 30세부터 부모 이벤트(부모 나이 60~90)도 진행(parentStart, 같은 해엔 부모 먼저), 부모 둘이 결정. 둘이 같은 선택지를 골라야 확정(결원으로 짝이 비면 혼자 골라도 확정, 두 자리 다 비면 조원 모두가 결정: G.seats). 가족 자산 하나 공유. 엔딩은 자녀 좋은 교육 수 × endingScale(settings.js multi).
  - 새 데이터 파일은 index.html, admin.html, 혼자하기.html 세 곳의 script 목록에 추가. (news.js도 세 곳 모두에 있음)
  - **브레이킹 뉴스**: `data/news.js`(뉴스 5시점×후보, 효과 mods/shock/mentor, 뉴스 세상 전용 이벤트 requires.world, 토론 질문), 관리자 화면의 📡 뉴스 데스크(원고·송출·종료, 앵커 화면은 2026-11-17에 없앰. 학생 화면 뉴스는 송출~종료 동안 한 번만 뜨고 뒤에 다시 뜨는 카드 없음)와 🎤 조별 소식 읽어 주기, `js/breaking.js`(긴급 배너). 방 만들 때 config.news에 후보 번호 저장, 송출 상태는 news/live·news/done. 조가 뉴스 시점에 먼저 도착하면 G.waitNews로 대기.
  - 관리자 '📊 결과 비교' 탭: 자산 그래프(G.hist)·엔딩·배운 이유(외적/내적, logic.js motiveOf)·뉴스 직후 첫 선택(G.afterNews)·토론 질문.
  - 테스트: 주소 뒤 `?local`(서버 대신 브라우저 안), 학생 여러 명은 `?local&p=1`처럼.
- 배경음악: `js/bgm.js`가 코드로 연주하는 잔잔한 8비트 곡(C-Am-F-G 8마디 반복, 80BPM, 멜로디 레가토·16분 분산화음·사인 패드·5도 베이스·메아리(delay) 버스). index·혼자하기에만. 첫 클릭 때 시작, 🔊 버튼으로 켜고 끔(localStorage bgm_on), 속보 배너가 떠 있는 동안은 과장된 속보 테마(184BPM 16분음표, E→F→F#→G 반음씩 상승, 숨 가쁜 고음 경보 멜로디, 옥타브 왕복 저음, 박마다 북·하이햇·스네어 롤, 감7화음 금관 찌르기, 사이렌. 원곡 모방 없이 기법만 사용)로 바뀜(BGM.news, breaking.js show/hide에서 호출).
- **혼자하기.html**: 1인용(js/engine.js, 80세까지). 뉴스(news.js, 나이 되면 자동 송출·8초 자동 닫힘)·Help 버튼 1번·🎲확률·60초 타이머(settings soloChoiceSeconds, 0이면 끔)·마지막 분위·도움말(HELP_MODE="solo"→HELP.soloGuide) 포함. multi.css도 불러옴(body.solo로 통계 2칸). 모바일용.html은 이걸 합친 파일. 백업: `백업/v1_혼자하기`, git 태그 v1-solo.
- `data/` 게임 내용. 사용자 스크립트는 여기만 고친다.
  - `settings.js` 능력치·기본값·BGM / `stages.js` 시기와 일상 문장 / `events.js` 이벤트 / `endings.js` 엔딩
  - 새 데이터 파일을 만들면 `index.html`의 script 목록에 추가.
- `js/engine.js` 엔진, `css/style.css` 디자인(레트로 도트 테마), `js/pixel.js` 코드로 그린 도트 그림(이벤트 id→장면 SCENE_OF), `assets/images|sounds` 애셋.
- 이벤트 필드: id, age 또는 ages:[min,max], chance, good(true/false: 자산 가중치), requires{min,max,flags,notFlags,eduCount,goodEdu}, title, text, image, sound, choices[{text, effects, result, edu, eduGood(false=좋은 교육 아님), flags, requires, next, outcomes[{chance,good,effects,result,...}], mentor{effects,result}(시기별 최고 선택, 교육 멘토링용)}], info
- 능력치는 자산 하나(시작: 소득분위 무작위). 엔딩은 좋은 교육 가짓수(goodEdu)로 결정.
- 텍스트의 `{이름}이(가)` 등은 자동 조사 처리.
- 발표 자료: `발표자료/`(pptx는 만들기.ps1, 진행자 큐시트 docx는 큐시트_만들기.ps1, 힌트 시트 docx는 힌트시트_만들기.ps1(Word 없이 docx XML 직접 생성, 데이터 .claude/tmp/hint.json)로 재생성. Word COM 자동화는 이 PC에서 자주 멈추므로 Start-Job+타임아웃으로만, 안내.md에 받기 링크).
- 밸런스: settings.js `workBoost`(교육 없이 돈만 버는 확정 선택의 자산 증가 배율, 지금 2). 관리자 💾 결과 저장은 admin.js saveResults(CSV, BOM).
- 사용자용 입력 양식: `스크립트_양식.md`. 미리보기: launch.json "game"(localhost:8123).
- 사용자는 코딩 설명을 원하지 않음. 결과만 짧게 알린다.

## 토큰 절약 규칙 (모델 분리)
- 메인 작업(기획 판단, 구조 설계, 핵심 코드 작성)은 메인 모델(Opus)이 직접 한다.
- 단순·반복 작업은 Agent 도구로 하위 에이전트에 맡긴다. 하위 에이전트는 기본적으로 Haiku로 실행된다(`.claude/settings.json`의 `CLAUDE_CODE_SUBAGENT_MODEL`).
  - 예: 여러 파일 검색, 사용자가 준 스크립트를 정해진 데이터 형식으로 옮겨 적기, 오탈자/형식 검사, 반복적인 대량 수정.
  - 맡길 때는 `model: "haiku"`를 명시하고, 지시문을 짧고 구체적으로 쓴다.
- 짧은 작업(파일 한두 개 읽기/수정)은 하위 에이전트 없이 바로 처리한다(에이전트 시작 비용이 더 큼).
- 답변은 짧게. 이미 아는 내용은 다시 읽지 않는다.

## 작업 기록 (기기 간 이어가기)
- 채팅 기록은 기기 간 동기화되지 않으므로, 맥락은 `작업기록.md`로 이어간다.
- 세션 시작 시 `작업기록.md`의 "현재 상태"와 "다음 할 일"을 먼저 읽는다(전체 로그는 필요할 때만).
- 파일을 바꾼 작업을 마칠 때마다 `작업기록.md`를 갱신한다:
  - "현재 상태"와 "다음 할 일"을 최신으로 고쳐 쓴다.
  - "로그" 맨 위에 날짜와 함께 3줄 이내로 추가한다(무엇을 했고, 무엇을 결정했는지).
- 사용자가 정한 기획 결정은 "확정된 결정"에 남긴다. 짧게 쓴다.

## 동기화
- 이 폴더는 GitHub 저장소와 자동 동기화된다(`.claude/hooks/autosync.sh`).
  - 세션 시작 시 자동 pull, Claude 응답이 끝날 때마다 자동 commit + push.
- 직접 git 명령으로 커밋/푸시할 필요 없음.
