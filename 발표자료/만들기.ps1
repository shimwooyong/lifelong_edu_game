# 게임 규칙 발표 자료(pptx)를 PowerPoint로 만드는 스크립트
# 다시 만들려면: PowerShell에서 이 파일을 실행 (PowerPoint가 설치된 PC)
$ErrorActionPreference = "Stop"
# 발표 파일이 PowerPoint에 열려 있으면 덮어쓸 수 없으니 먼저 닫기
try { [IO.File]::Open((Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "배움의일생_게임규칙.pptx"), "Open", "ReadWrite", "None").Close() } catch [IO.FileNotFoundException] {} catch { throw "배움의일생_게임규칙.pptx가 열려 있어요. PowerPoint에서 닫은 뒤 다시 실행하세요." }
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$img = Join-Path $dir "그림"
$out = Join-Path $dir "배움의일생_게임규칙.pptx"
$FONT = "맑은 고딕"

function C([string]$hex) { [int]("0x" + $hex.Substring(0, 2)) + 256 * [int]("0x" + $hex.Substring(2, 2)) + 65536 * [int]("0x" + $hex.Substring(4, 2)) }
$INK = "241F2E"; $PAPER = "FBF3E0"; $WHITE = "FFFFFF"; $RED = "B13E53"; $YEL = "FFCD75"
$BLUE = "3B5DC9"; $GREEN = "2F8F5B"; $ORANGE = "EF7D57"; $MUTED = "6B6478"; $GRAY = "C9C3CF"

# 도트 게임 느낌의 카드: 굵은 테두리 + 딱딱한 그림자
function Box($s, $x, $y, $w, $h, $fill, $shadow = $INK, $shape = 1) {
  if ($shadow) { $sh = $s.Shapes.AddShape($shape, $x + 6, $y + 6, $w, $h); $sh.Fill.ForeColor.RGB = (C $shadow); $sh.Line.Visible = 0 }
  $b = $s.Shapes.AddShape($shape, $x, $y, $w, $h)
  $b.Fill.ForeColor.RGB = (C $fill); $b.Line.ForeColor.RGB = (C $INK); $b.Line.Weight = 3
  return $b
}
function T($s, $text, $x, $y, $w, $h, $size, $color = $INK, $bold = $false, $align = 1, $anchor = 1) {
  $t = $s.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $t.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = $anchor
  $r = $tf.TextRange; $r.Text = $text
  $r.Font.Name = $FONT; $r.Font.NameFarEast = $FONT; $r.Font.Size = $size
  $r.Font.Bold = $(if ($bold) { -1 } else { 0 }); $r.Font.Color.RGB = (C $color)
  $r.ParagraphFormat.Alignment = $align; $r.ParagraphFormat.SpaceAfter = 4
  $t.Height = $h
  return $t
}
function Bullets($t) { $p = $t.TextFrame.TextRange.ParagraphFormat; $p.Bullet.Visible = -1; $p.Bullet.Character = 9632; $p.Bullet.RelativeSize = 0.7; $t.TextFrame.Ruler.Levels(1).FirstMargin = 0; $t.TextFrame.Ruler.Levels(1).LeftMargin = 16 }
function Pic($s, $name, $x, $y, $w, $h) { $p = $s.Shapes.AddPicture((Join-Path $img $name), 0, -1, $x, $y, $w, $h); $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (C $INK); $p.Line.Weight = 3; return $p }
function Sprite($s, $name, $x, $y, $w, $h) { return $s.Shapes.AddPicture((Join-Path $img $name), 0, -1, $x, $y, $w, $h) }
function NewSlide($bg) { $s = $pres.Slides.Add($pres.Slides.Count + 1, 12); $s.FollowMasterBackground = 0; $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = (C $bg); return $s }
function Title($s, $text, $color = $INK) { T $s $text 40 30 880 50 32 $color $true | Out-Null }
function Notes($s, $text) { $s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text = $text }

$app = New-Object -ComObject PowerPoint.Application
$pres = $app.Presentations.Add(0)
$pres.PageSetup.SlideWidth = 960; $pres.PageSetup.SlideHeight = 540

# ── 1. 표지 ──
$s = NewSlide $INK
T $s "평생교육 인생 시뮬레이션" 50 130 400 30 18 $YEL $true | Out-Null
T $s "배움의 일생" 50 165 420 80 54 $WHITE $true | Out-Null
T $s "한 가족이 함께 살아가는 60년,`v그 속의 배움을 고르는 게임" 50 255 400 60 18 $GRAY | Out-Null
T $s "게임 규칙 안내" 50 340 170 40 20 $INK $true 2 3 | Out-Null
$tag = Box $s 50 340 170 40 $YEL $null; $tag.ZOrder(1)
$p = Pic $s "home.png" 490 120 420 245
$sh = $s.Shapes.AddShape(1, 496, 126, 420, 245); $sh.Fill.ForeColor.RGB = (C $YEL); $sh.Line.Visible = 0; $sh.ZOrder(1)
T $s "4명이 한 가족 · 둘이 같이 골라야 확정 · 브레이킹 뉴스" 490 395 420 30 14 $GRAY | Out-Null
Notes $s "안녕하세요. 오늘 함께할 게임은 '배움의 일생'입니다. 한 조가 한 가족이 되어, 아이 한 명이 태어나서 60세가 될 때까지 어떤 교육을 받으며 살아가는지 직접 골라 보는 평생교육 시뮬레이션이에요. 5분 정도 규칙을 간단히 설명드릴게요."

# ── 2. 우리 조는 한 가족 ──
$s = NewSlide $PAPER
Title $s "우리 조는 한 가족이에요"
$roles = @(
  @("parent.png", "부모 1", "자녀 0~19세: 자녀 교육 결정`r자녀 30세~: 우리 노년 결정", $ORANGE),
  @("parent.png", "부모 2", "자녀 0~19세: 자녀 교육 결정`r자녀 30세~: 우리 노년 결정", $ORANGE),
  @("child.png", "자녀 1", "0~19세: 부모 결정 지켜보기`r20세~: 내 배움 직접 결정", $BLUE),
  @("child.png", "자녀 2", "0~19세: 부모 결정 지켜보기`r20세~: 내 배움 직접 결정", $BLUE)
)
for ($i = 0; $i -lt 4; $i++) {
  $x = 41 + $i * 226; $r = $roles[$i]
  Box $s $x 100 200 250 $WHITE | Out-Null
  $c = $s.Shapes.AddShape(1, $x + 3, 103, 194, 110); $c.Fill.ForeColor.RGB = (C $r[3]); $c.Line.Visible = 0
  Sprite $s $r[0] ($x + 64) 112 72 96 | Out-Null
  T $s $r[1] $x 225 200 30 20 $INK $true 2 | Out-Null
  T $s $r[2] ($x + 14) 262 172 80 13 $MUTED $false 2 | Out-Null
}
$facts = @(@("2026년생", "자녀가 태어난 해"), @("30살", "부모와 자녀의 나이 차이"), @("60세", "자녀가 60세(2086년)가 되면 게임 끝"))
for ($i = 0; $i -lt 3; $i++) {
  $x = 41 + $i * 301
  Box $s $x 395 277 95 $WHITE | Out-Null
  T $s $facts[$i][0] ($x + 18) 405 240 40 28 $RED $true | Out-Null
  T $s $facts[$i][1] ($x + 18) 448 240 30 14 $INK | Out-Null
}
Notes $s "한 조는 네 명, 한 가족입니다. 두 명은 부모, 두 명은 자녀 역할이에요. 게임 속 자녀는 2026년에 태어나고, 부모와는 30살 차이가 납니다. 자녀가 60살, 그러니까 2086년이 되면 게임이 끝나요. 자녀는 한 명이고, 자녀 역할 두 명이 함께 그 한 사람을 맡습니다."

# ── 3. 누가 결정할까 ──
$s = NewSlide $PAPER
Title $s "나이에 따라 결정하는 사람이 바뀌어요"
$x0 = 60; $k = 14
$segs = @(@(0, 20, $ORANGE, "부모가 결정"), @(20, 30, $BLUE, "자녀가 스스로"), @(30, 60, $GREEN, "자녀 + 부모님 노년"))
foreach ($g in $segs) {
  $b = $s.Shapes.AddShape(1, $x0 + $k * $g[0], 175, $k * ($g[1] - $g[0]), 50); $b.Fill.ForeColor.RGB = (C $g[2]); $b.Line.ForeColor.RGB = (C $INK); $b.Line.Weight = 3
  T $s $g[3] ($x0 + $k * $g[0]) 175 ($k * ($g[1] - $g[0])) 50 16 $WHITE $true 2 3 | Out-Null
}
foreach ($a in 0, 10, 20, 30, 40, 50, 60) {
  T $s ("{0}세`r{1}" -f $a, (2026 + $a)) ($x0 + $k * $a - 30) 233 60 40 12 $MUTED $false 2 | Out-Null
}
foreach ($a in 10, 20, 30, 40, 50) {
  $m = $s.Shapes.AddShape(1, $x0 + $k * $a - 9, 145, 18, 18); $m.Fill.ForeColor.RGB = (C $RED); $m.Line.ForeColor.RGB = (C $INK); $m.Line.Weight = 2
}
T $s "■ = 브레이킹 뉴스가 터지는 때" 660 105 260 25 13 $RED $true 3 | Out-Null
$cards = @(
  @("0~19세", $ORANGE, "부모 2명이 자녀의 교육을 골라요.`v자녀 2명은 화면을 같이 보며`v의견을 내요."),
  @("20~29세", $BLUE, "자녀 2명이 자기 배움을`v스스로 골라요.`v부모는 지켜보며 응원해요."),
  @("30~60세", $GREEN, "자녀 이벤트와 부모님(60~90세)`v노년 이벤트가 함께 나와요.`v같은 해면 부모 이벤트가 먼저!")
)
for ($i = 0; $i -lt 3; $i++) {
  $x = 60 + $i * 286
  Box $s $x 300 262 135 $WHITE | Out-Null
  $tg = $s.Shapes.AddShape(1, $x + 16, 316, 90, 28); $tg.Fill.ForeColor.RGB = (C $cards[$i][1]); $tg.Line.Visible = 0
  T $s $cards[$i][0] ($x + 16) 316 90 28 14 $WHITE $true 2 3 | Out-Null
  T $s $cards[$i][2] ($x + 16) 356 230 110 14 $INK | Out-Null
}
Notes $s "누가 고르는지는 자녀 나이에 따라 바뀝니다. 자녀가 스무 살이 되기 전에는 부모 두 명이 자녀의 교육을 골라요. 스무 살부터는 자녀 두 명이 직접 고릅니다. 서른 살부터는 부모님도 예순 살 노년이 되면서 부모님의 이벤트가 함께 나오고, 같은 해에 겹치면 부모 이벤트를 먼저 진행해요. 빨간 표시는 브레이킹 뉴스가 터지는 시점인데, 뒤에서 설명할게요."

# ── 4. 선택하는 법 ──
$s = NewSlide $PAPER
Title $s "선택은 이렇게 해요"
$rules = @(
  @("🤝", $GREEN, "둘이 같은 걸 골라야 확정", "결정하는 두 사람이 같은 선택지를`v눌러야 해요. 다르면 대화해서 맞춰요."),
  @("⏰", $RED, "제한시간 60초", "시간이 끝나면 자동으로 정해져요.`v한 명만 골랐으면 그 선택, 둘이 다르면`v둘 중 하나, 아무도 안 고르면 무작위"),
  @("🎲", $BLUE, "운이 따르는 선택은 확률 공개", "투자처럼 결과가 갈리는 선택지엔`v성공·실패 확률이 적혀 있어요."),
  @("🔒", $ORANGE, "돈이 모자라면 못 골라요", "돈이 드는 선택은 가족 자산이 부족하면`v잠겨요. 무료 공공 교육도 많아요.")
)
for ($i = 0; $i -lt 4; $i++) {
  $x = 40 + ($i % 2) * 460; $y = 115 + [math]::Floor($i / 2) * 180
  Box $s $x $y 420 140 $WHITE | Out-Null
  $o = $s.Shapes.AddShape(9, $x + 20, $y + 22, 58, 58); $o.Fill.ForeColor.RGB = (C $rules[$i][1]); $o.Line.ForeColor.RGB = (C $INK); $o.Line.Weight = 2
  T $s $rules[$i][0] ($x + 20) ($y + 22) 58 58 26 $WHITE $false 2 3 | Out-Null
  T $s $rules[$i][2] ($x + 96) ($y + 24) 305 30 19 $INK $true | Out-Null
  T $s $rules[$i][3] ($x + 96) ($y + 62) 305 90 14 $MUTED | Out-Null
}
Notes $s "선택하는 방법입니다. 결정하는 두 사람이 같은 선택지를 골라야 확정돼요. 의견이 다르면 이야기해서 맞추면 됩니다. 단, 제한시간이 60초예요. 시간이 지나면 자동으로 정해지니 너무 오래 고민하지 마세요. 투자처럼 운이 따르는 선택은 성공 확률이 공개되고, 돈이 드는 선택은 가족 자산이 부족하면 고를 수 없어요."

# ── 5. 가족 자산 ──
$s = NewSlide $PAPER
Title $s "출발선이 다른 가족 자산"
Box $s 40 100 430 390 $WHITE | Out-Null
T $s "소득분위별 출발 자산" 60 115 390 25 15 $INK $true | Out-Null
$vals = 35, 45, 60, 75, 90, 110, 125, 150, 195, 330
for ($i = 0; $i -lt 10; $i++) {
  $h = [math]::Round($vals[$i] / 330 * 250); $x = 62 + $i * 39
  $b = $s.Shapes.AddShape(1, $x, 430 - $h, 30, $h); $b.Line.Visible = 0
  $b.Fill.ForeColor.RGB = (C $(if ($i -ge 8) { $RED } elseif ($i -le 1) { $BLUE } else { $GRAY }))
  T $s ([string]$vals[$i]) ($x - 6) (430 - $h - 20) 42 18 11 $MUTED $false 2 | Out-Null
  T $s ([string]($i + 1)) ($x - 6) 436 42 18 12 $INK $true 2 | Out-Null
}
T $s "분위" 400 456 50 18 11 $MUTED $false 3 | Out-Null
$pts = @(
  @("1", "조마다 출발선이 달라요", "방을 만들 때 조마다 서로 다른`v소득분위를 무작위로 나눠 줘요."),
  @("2", "자산이 운을 바꿔요", "자산이 많을수록 좋은 일은 자주,`v나쁜 일은 드물게 생겨요."),
  @("3", "끝나면 분위를 다시 봐요", "엔딩에서 '출발 ○분위 →`v마지막 ○분위'를 보여 줘요.")
)
for ($i = 0; $i -lt 3; $i++) {
  $y = 110 + $i * 128
  $n = $s.Shapes.AddShape(9, 510, $y, 44, 44); $n.Fill.ForeColor.RGB = (C $YEL); $n.Line.ForeColor.RGB = (C $INK); $n.Line.Weight = 2
  T $s $pts[$i][0] 510 $y 44 44 20 $INK $true 2 3 | Out-Null
  T $s $pts[$i][1] 572 ($y + 2) 350 30 19 $INK $true | Out-Null
  T $s $pts[$i][2] 572 ($y + 38) 350 60 15 $MUTED | Out-Null
}
Notes $s "가족마다 출발선이 다릅니다. 실제 통계를 바탕으로 소득 1분위부터 10분위까지 출발 자산이 정해져 있고, 조마다 서로 다른 분위를 무작위로 받아요. 자산이 많으면 좋은 일이 조금 더 자주 생기고, 나쁜 일은 덜 생겨요. 게임이 끝나면 처음 몇 분위에서 출발해서 마지막에 몇 분위가 되었는지 보여 줍니다."

# ── 6. 특별 장치 ──
$s = NewSlide $PAPER
Title $s "게임을 흔드는 두 가지 장치"
$sp = @(
  @("mentor.png", "💡 Help", "조마다 딱 1번, 그 상황의 최고 선택을 대신 골라 줘요`r결정하는 두 사람이 모두 눌러야 사용돼요`r결과가 뻔한 상황에서는 쓸 수 없어요"),
  @("news.png", "📡 브레이킹 뉴스", "자녀 10·20·30·40·50세에 세상을 바꾸는 뉴스가 터져요`r선생님이 발표하면 모든 화면에 속보!`v먼저 도착한 조는 잠시 기다려요`r가족 자산과 이후 선택의 결과가 달라져요")
)
for ($i = 0; $i -lt 2; $i++) {
  $x = 40 + $i * 460
  Box $s $x 95 420 390 $WHITE | Out-Null
  Pic $s $sp[$i][0] ($x + 20) 113 380 222 | Out-Null
  T $s $sp[$i][1] ($x + 20) 348 380 30 20 $INK $true | Out-Null
  $b = T $s $sp[$i][2] ($x + 20) 384 380 115 14 $MUTED; Bullets $b
}
Notes $s "게임을 흔드는 장치가 두 가지 있어요. 첫째, Help입니다. 조마다 딱 한 번, 어려운 상황에서 가장 좋은 선택을 대신 골라 줘요. 두 사람이 모두 눌러야 쓸 수 있으니 아껴 두세요. 둘째, 브레이킹 뉴스입니다. 자녀가 열 살, 스무 살처럼 10년마다 세상을 바꾸는 뉴스가 터지고, 그 뒤로는 같은 선택이라도 결과가 달라져요. 뉴스는 선생님이 발표하니까, 먼저 도착한 조는 잠시 기다려 주세요."

# ── 7. 엔딩과 결과 ──
$s = NewSlide $PAPER
Title $s "엔딩은 '좋은 교육' 가짓수로 정해져요"
$ends = @(@("20가지+", "평생 배움의 달인", $YEL), @("16가지+", "배우며 자란 삶", "9ED8A8"), @("12가지+", "소박한 배움의 길", "A9C4F5"), @("그 외", "아쉬움이 남는 삶", $GRAY))
for ($i = 0; $i -lt 4; $i++) {
  $y = 100 + $i * 74
  Box $s 40 $y 440 60 $ends[$i][2] | Out-Null
  T $s $ends[$i][0] 60 $y 120 60 20 $INK $true 1 3 | Out-Null
  T $s $ends[$i][1] 185 $y 280 60 19 $INK $false 1 3 | Out-Null
}
T $s "공교육·평생교육은 가짓수에 들어가요.`v학원 같은 사교육은 이력엔 남지만 가짓수엔 안 들어가요." 40 410 440 60 13 $MUTED | Out-Null
Box $s 520 100 400 390 $WHITE | Out-Null
T $s "끝나면 다 같이 비교해요" 545 118 360 30 19 $INK $true | Out-Null
$cmp = @(@("🏆", "조별 순위", "교육 순위 + 자산 순위"), @("📈", "가족 자산 그래프", "뉴스가 터진 때도 함께"), @("💭", "배운 이유", "시험·취업 vs 관심·나눔"), @("💬", "토론 질문", "우리 가족은 왜 그렇게 골랐을까?"))
for ($i = 0; $i -lt 4; $i++) {
  $y = 165 + $i * 76
  T $s $cmp[$i][0] 545 $y 44 44 24 $INK $false 2 3 | Out-Null
  T $s $cmp[$i][1] 600 ($y + 2) 300 24 16 $INK $true | Out-Null
  T $s $cmp[$i][2] 600 ($y + 26) 300 24 13 $MUTED | Out-Null
}
Notes $s "자녀가 60세가 되면 엔딩이 나옵니다. 엔딩은 자녀가 경험한 좋은 교육이 몇 가지인지로 정해져요. 학교와 평생교육 프로그램은 들어가지만, 학원 같은 사교육은 기록에는 남아도 가짓수에는 들어가지 않습니다. 모든 조가 끝나면 선생님 화면에서 조별 순위와 자산 그래프, 그리고 왜 배웠는지를 비교하면서 이야기를 나눠 볼 거예요."

# ── 8. 시작하기 ──
$s = NewSlide $INK
Title $s "시작해 볼까요?" $YEL
$steps = @(@("1", "링크 접속", "휴대폰이나 PC로`v아래 주소에 들어가요"), @("2", "조·역할 선택", "우리 조 → 부모/자녀`v자리 → 이름 입력"), @("3", "대기실", "게임 방법 안내가`v자동으로 떠요"), @("4", "게임 시작!", "선생님이 시작하면`v'▶ 다음 이벤트' 누르기"))
for ($i = 0; $i -lt 4; $i++) {
  $x = 41 + $i * 226
  Box $s $x 120 200 160 $WHITE $YEL | Out-Null
  $n = $s.Shapes.AddShape(9, $x + 18, 138, 44, 44); $n.Fill.ForeColor.RGB = (C $RED); $n.Line.ForeColor.RGB = (C $INK); $n.Line.Weight = 2
  T $s $steps[$i][0] ($x + 18) 138 44 44 20 $WHITE $true 2 3 | Out-Null
  T $s $steps[$i][1] ($x + 18) 194 170 28 18 $INK $true | Out-Null
  T $s $steps[$i][2] ($x + 18) 228 168 50 13 $MUTED | Out-Null
}
# 접속: 휴대폰은 QR, 노트북은 주소
T $s "📱 휴대폰은 오른쪽 QR코드를 카메라로 찍어요" 41 318 680 26 16 $GRAY | Out-Null
T $s "💻 노트북은 주소창에 이 주소를 입력해요" 41 350 680 26 16 $GRAY | Out-Null
T $s "shimwooyong.github.io/lifelong_edu_game" 41 386 680 40 26 $YEL $true | Out-Null
T $s "📖 도움말 버튼  ·  밑줄 친 용어를 누르면 설명  ·  🔊 음악 켜고 끄기" 41 452 680 24 13 $GRAY | Out-Null
Box $s 772 300 148 148 $WHITE $YEL | Out-Null
$s.Shapes.AddPicture((Join-Path $dir "QR_게임접속.png"), 0, -1, 776, 304, 140, 140) | Out-Null
T $s "카메라로 찍으면 바로 접속" 762 460 168 20 12 $GRAY $false 2 | Out-Null

Notes $s "이제 시작해 볼게요. 화면의 주소로 들어가서 우리 조를 고르고, 부모나 자녀 자리를 골라 이름을 입력하세요. 대기실에 들어가면 게임 방법이 자동으로 한 번 뜹니다. 네 명이 다 모이면 제가 게임을 시작할게요. 게임 중에 모르는 용어가 나오면 밑줄 친 글자를 누르거나 도움말 버튼을 눌러 보세요. 그럼 즐겁게 배움의 일생을 살아 봅시다!"

$pres.SaveAs($out, 24)
# 검수용 그림
$qa = Join-Path $dir "..\.claude\tmp"; New-Item -ItemType Directory -Force $qa | Out-Null
for ($i = 1; $i -le $pres.Slides.Count; $i++) { $pres.Slides($i).Export((Join-Path $qa "slide$i.png"), "PNG", 1280, 720) }
$pres.Close()
# 사용자가 따로 열어 둔 PowerPoint 창이 있으면 끄지 않음
if ($app.Presentations.Count -eq 0) { $app.Quit() }
"저장: $out"
