# 평생교육 인생 시뮬레이션 웹 게임

"80억분의 1"을 레퍼런스로 한 스크립트 중심 시뮬레이션 웹 게임. 주제는 "평생교육"으로, 한 가족의 일생에 평생교육 관련 교육용 이벤트를 배치한다. 세부 기획과 스크립트는 사용자가 계속 추가한다.

## 구조 (빌드 없음, index.html 더블클릭으로 실행)
- `data/` 게임 내용. 사용자 스크립트는 여기만 고친다.
  - `settings.js` 능력치·기본값·BGM / `stages.js` 시기와 일상 문장 / `events.js` 이벤트 / `endings.js` 엔딩
  - 새 데이터 파일을 만들면 `index.html`의 script 목록에 추가.
- `js/engine.js` 엔진, `css/style.css` 디자인, `assets/images|sounds` 애셋.
- 이벤트 필드: id, age 또는 ages:[min,max], chance, requires{min,max,flags,notFlags,eduCount}, title, text, image, sound, choices[{text, effects, result, edu, flags, requires, next, outcomes[{chance,effects,result,...}]}], info
- 텍스트의 `{이름}이(가)` 등은 자동 조사 처리.
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
