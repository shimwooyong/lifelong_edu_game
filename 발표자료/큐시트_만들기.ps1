# 진행자 큐시트(docx)를 Word로 만드는 스크립트. 다시 만들려면 PowerShell에서 실행 (Word 설치된 PC)
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir "진행자_큐시트.docx"
try { [IO.File]::Open($out, "Open", "ReadWrite", "None").Close() } catch [IO.FileNotFoundException] {} catch { throw "진행자_큐시트.docx가 열려 있어요. Word에서 닫은 뒤 다시 실행하세요." }

$FONT = "맑은 고딕"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
$doc.PageSetup.TopMargin = 50; $doc.PageSetup.BottomMargin = 50; $doc.PageSetup.LeftMargin = 55; $doc.PageSetup.RightMargin = 55
$st = $doc.Styles.Item(-1); $st.Font.Name = $FONT; $st.Font.Size = 10.5; $st.ParagraphFormat.SpaceAfter = 4
foreach ($h in -2, -3) { $s = $doc.Styles.Item($h); $s.Font.Name = $FONT; $s.Font.Color = 0x2E1F24 }
$doc.Styles.Item(-2).Font.Size = 15; $doc.Styles.Item(-3).Font.Size = 12.5

$sel = $word.Selection
function P($text, $style = -1, $bold = $false) {
  $sel.Style = $doc.Styles.Item([int]$style).NameLocal; $sel.Font.Bold = [int]$bold; $sel.TypeText($text); $sel.TypeParagraph()
}
function Bul($items) { foreach ($i in $items) { $sel.Style = $doc.Styles.Item(-49).NameLocal; $sel.TypeText($i); $sel.TypeParagraph() }; $sel.Style = $doc.Styles.Item(-1).NameLocal }  # -49 = 글머리 기호
function Table($rows, $widths, $headFill = 0xD6C7EF) {
  $t = $doc.Tables.Add($sel.Range, $rows.Count, $rows[0].Count)
  $t.Borders.Enable = $true; $t.Range.Font.Size = 9.5; $t.Range.ParagraphFormat.SpaceAfter = 0
  for ($r = 0; $r -lt $rows.Count; $r++) { for ($c = 0; $c -lt $rows[0].Count; $c++) { $t.Cell($r + 1, $c + 1).Range.Text = $rows[$r][$c] } }
  $t.Rows.Item(1).Range.Font.Bold = $true; $t.Rows.Item(1).Shading.BackgroundPatternColor = $headFill; $t.Rows.Item(1).HeadingFormat = -1
  for ($c = 0; $c -lt $widths.Count; $c++) { $t.Columns.Item($c + 1).PreferredWidthType = 2; $t.Columns.Item($c + 1).PreferredWidth = $widths[$c] }
  $t.TopPadding = 2; $t.BottomPadding = 2
  $sel.EndKey(6) | Out-Null; $sel.TypeParagraph()
}

# ── 제목 ──
$sel.Font.Size = 20; $sel.Font.Bold = 1; $sel.Font.Name = $FONT; $sel.TypeText("배움의 일생 · 진행자 큐시트"); $sel.TypeParagraph()
$sel.Font.Size = 10.5; $sel.Font.Bold = 0
P "진행자 A: ____________ (관리자 화면 조작·뉴스 송출)     진행자 B: ____________ (학생 도움·원고 함께 읽기·조별 소식 읽어 주기)"
P "학생 주소: shimwooyong.github.io/lifelong_edu_game   (QR: 발표자료/QR_게임접속.png, 발표 마지막 슬라이드)"
P "관리자 주소: 위 주소 뒤에 /admin.html   ·   관리자 비밀번호: 2607 (진행자만 알기)"

# ── 1. 수업 전 준비 ──
P "1. 수업 전 준비 (10분 전)" -2
Bul @(
  "☐ 교실 PC에서 관리자 화면 열고 비밀번호 입력 (오른쪽 위에 '온라인(Firebase)'이라고 나오는지 확인)",
  "☐ 발표 자료(배움의일생_게임규칙.pptx) 열어 두기 — 마지막 슬라이드에 QR코드",
  "☐ 조 수 확인 (조당 4명: 부모 2 + 자녀 2) · 인원이 모자란 조가 있는지 미리 파악",
  "☐ 스피커 켜기 (학생 화면 음악은 화면을 한 번 누르면 시작, 오른쪽 아래 🔊로 끄고 켬)",
  "☐ 지난번에 만든 방이 남아 있으면 💾 결과 저장 후 새 방 만들기"
)

# ── 2. 진행 순서 ──
P "2. 진행 순서" -2
Table @(
  @("단계", "시간", "진행자 A (관리자 화면)", "진행자 B (교실)", "말할 것 · 주의"),
  @("① 규칙 설명", "5~7분", "발표 자료 넘기기 (슬라이드 노트에 대본)", "학생들 휴대폰 꺼내게 안내", "마지막 슬라이드 QR 띄운 채로 다음 단계"),
  @("② 방 만들기", "1분", "참여 조 수 입력 → '새 게임 방 만들기'", "—", "조마다 소득분위가 자동으로 다르게 정해짐"),
  @("③ 입장", "3~5분", "조 카드에서 4/4명 찼는지 확인", "자리 못 찾는 학생 도와주기", "조 → 역할(부모1·2, 자녀1·2) → 이름. 새로고침해도 자리 유지"),
  @("④ 시작", "—", "'4명 모인 조 모두 시작'", "대기실 '게임 방법' 안내 읽게 하기", "인원 모자란 조는 카드의 '시작(n/4명)'으로 따로 시작"),
  @("⑤ 진행", "약 40분", "뉴스 데스크의 '대기 n조' 지켜보기", "아래 '🎤 조별 소식'에서 결과·알아보기 읽어 주기", "선택 제한 60초 · 둘이 같은 걸 골라야 확정 · 💡 Help는 조마다 1번"),
  @("⑥ 브레이킹 뉴스 ×5", "각 1~2분", "대부분 조가 도착하면 '🔴 속보 송출 시작' → 원고 '읽기 1' → '■ 방송 종료'", "원고 '읽기 2' · 마지막 '바뀌는 세상' 읽기", "실수로 끊겼으면 '🔁 다시 송출' (효과는 한 번만 적용)"),
  @("⑦ 게임 끝", "—", "'📊 결과 비교' 탭 → 💾 결과 저장 (엑셀)", "끝난 조에게 엔딩 화면 보게 하기", "조별 순위 = 교육 순위 + 자산 순위"),
  @("⑧ 토론", "10분", "자산 그래프·순위 화면 띄우기", "토론 질문 진행 (아래 4번)", "엔딩의 '배운 이유'(외적/내적) 같이 보기")
) @(13, 9, 28, 24, 26)

# ── 3. 브레이킹 뉴스 ──
P "3. 브레이킹 뉴스 5개 (순서 고정)" -2
Table @(
  @("게임 연도", "자녀 나이", "헤드라인", "한 줄 요약"),
  @("2036년", "10세", "모든 학생에게 '무료 AI 개인교사'… 학원가 직격탄", "사교육 효과 감소, 스스로 배우는 힘이 중요"),
  @("2046년", "20세", "대학 정원 30% 미달… 지방대 연쇄 폐교", "4년제 학위 가치 하락, 실무·마이크로 학위 인정"),
  @("2056년", "30세", "의사·변호사 업무도 AI가… '전문직 경계' 무너진다", "자격증 하나로는 부족, 분야를 넘나드는 배움"),
  @("2066년", "40세", "'AI 기본소득' 실험 시작… 월급의 시대 저무나", "일해서 버는 돈의 비중 감소, 배움의 의미 변화"),
  @("2076년", "50세", "국민연금 개혁안 통과… '노후는 스스로 준비해야'", "노후 준비 교육(자산관리 강의 등)이 유리")
) @(13, 11, 44, 32) 0xBFD9F5
P "원고는 관리자 화면 뉴스 데스크에서 시점을 누르면 나옵니다. 먼저 도착한 조는 '속보 대기'로 멈춰 있으니, 대부분 모였을 때 송출하세요."

# ── 4. 토론 질문 ──
P "4. 토론 질문" -2
Bul @(
  "뉴스 이후 가치를 잃은 교육은 무엇이었나요? 왜 처음엔 좋아 보였을까요?",
  "자산이 많은 조가 유리했던 순간은 언제였나요? 교육으로 그 격차를 줄일 수 있었나요?",
  "20년 뒤 대학 학위는 지금과 같은 의미일까요?",
  "우리 가족은 왜 배웠나요? 시험·취업 같은 외적 동기였나요, 정말 배우고 싶어서였나요?",
  "직업의 경계가 사라지는 사회에서 평생교육은 선택일까요, 필수일까요?"
)

# ── 5. 돌발 상황 ──
P "5. 이럴 땐 이렇게" -2
Table @(
  @("상황", "대처"),
  @("학생 화면이 꺼지거나 튕김", "같은 휴대폰·같은 브라우저로 주소에 다시 들어가면 자기 자리로 돌아옴"),
  @("조 인원이 모자람", "조 카드의 '시작(n/4명)'으로 시작. 빈 자리의 선택은 60초 뒤 자동 결정 (진행자가 다른 기기로 그 자리에 들어가도 됨)"),
  @("두 사람이 계속 의견이 다름", "60초가 지나면 둘 중 하나로 자동 결정됨. 대화를 유도하기"),
  @("뉴스를 실수로 끊었거나 못 본 조가 있음", "뉴스 데스크에서 그 시점을 눌러 '🔁 다시 송출'"),
  @("화면이 예전 모양으로 보임", "새로고침 (새 버전이 있으면 자동으로 바뀜)"),
  @("음악이 안 나옴 / 너무 시끄러움", "화면을 한 번 누르기 / 오른쪽 아래 🔊 버튼으로 끄기"),
  @("새 방을 만들어야 함", "⚠ 만들면 진행 중 게임이 모두 사라짐 → 먼저 💾 결과 저장"),
  @("모르는 용어 질문", "이벤트 글의 밑줄 친 용어를 누르거나 📖 도움말 → 용어 사전")
) @(32, 68) 0xF5D6BF

$doc.SaveAs2($out, 16)  # docx
$doc.Close()
if ($word.Documents.Count -eq 0) { $word.Quit() }
"저장: $out"
