# 진행자 힌트 시트(docx): 모든 이벤트의 선택지와 결과를 A4 양면에 정리
# 데이터: 미리보기(localhost:8123)에서 게임 데이터를 뽑아 .claude/tmp/hint.json에 저장한 뒤 실행 (Word 설치된 PC)
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir "진행자_힌트시트.docx"
$json = Join-Path (Split-Path -Parent $dir) ".claude/tmp/hint.json"
try { [IO.File]::Open($out, "Open", "ReadWrite", "None").Close() } catch [IO.FileNotFoundException] {} catch { throw "진행자_힌트시트.docx가 열려 있어요. Word에서 닫은 뒤 다시 실행하세요." }
$data = [IO.File]::ReadAllText($json, [Text.Encoding]::UTF8) | ConvertFrom-Json

$FONT = "맑은 고딕"; $FS = 7.5
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
$doc = $word.Documents.Add()
$ps = $doc.PageSetup; $ps.PaperSize = 7; $ps.TopMargin = 28; $ps.BottomMargin = 28; $ps.LeftMargin = 30; $ps.RightMargin = 30
$st = $doc.Styles.Item(-1); $st.Font.Name = $FONT; $st.Font.Size = $FS; $st.ParagraphFormat.SpaceAfter = 0; $st.ParagraphFormat.SpaceBefore = 0; $st.ParagraphFormat.LineSpacingRule = 0
$sel = $word.Selection

# 제목 + 보는 법
$sel.Font.Size = 13; $sel.Font.Bold = 1; $sel.TypeText("배움의 일생 · 진행자 힌트 시트 (이벤트 선택지와 결과)"); $sel.TypeParagraph()
$sel.Font.Size = $FS; $sel.Font.Bold = 0
$sel.TypeText("보는 법: 숫자 = 가족 자산 변화   ○교육 = 좋은 교육(엔딩 점수, 같은 교육은 한 번만)   ✕교육 = 좋은 교육 아님   ★ = 그 시기 최고 선택(Help가 알려 줌, 옆 숫자는 Help로 고르면 받는 자산)   🎲 = 확률 결과(자산이 많을수록 좋은 쪽이 잘 나옴)   대상: 자녀 0~60세 / 부모 이벤트는 자녀 30세(부모 60세)부터   '%확률'은 그 나이대에 가끔 나오는 이벤트   교육 없이 돈만 버는 선택은 보상 2배 반영됨")
$sel.TypeParagraph()
$sel.ParagraphFormat.SpaceAfter = 3

# 표 내용: 탭으로 이어 붙인 뒤 한 번에 표로 바꾸기 (빠름)
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("나이`t이벤트`t선택지`t결과`t★Help")
$groupStart = New-Object System.Collections.Generic.List[int]
$star = New-Object System.Collections.Generic.List[int]
$clean = { param($s) ($s -replace "[`t`r`n]", " ") }
foreach ($e in $data.rows) {
  $groupStart.Add($lines.Count + 1)
  $first = $true
  foreach ($c in $e.ch) {
    if ($first) {
      $ev = $e.title; if ($e.cond) { $ev += " (" + $e.cond + ")" }
      $ag = $e.age + "`v" + $e.who
    } else { $ev = ""; $ag = "" }
    $h = ""; if ($c.star) { $h = "★ " + $c.h; $star.Add($lines.Count + 1) }
    $lines.Add(((& $clean $ag), (& $clean $ev), (& $clean $c.t), (& $clean $c.r), $h) -join "`t")
    $first = $false
  }
}
$rng = $sel.Range
$rng.Text = ($lines -join "`r")
$t = $rng.ConvertToTable(1, $lines.Count, 5)
$t.Range.Font.Size = $FS
$t.Borders.Enable = $false
$t.TopPadding = 0.5; $t.BottomPadding = 0.5; $t.LeftPadding = 2; $t.RightPadding = 2
$widths = @(34, 118, 190, 150, 43)
for ($c = 0; $c -lt 5; $c++) { $t.Columns.Item($c + 1).PreferredWidthType = 3; $t.Columns.Item($c + 1).PreferredWidth = $widths[$c] }
$t.Rows.AllowBreakAcrossPages = 0
$hdr = $t.Rows.Item(1); $hdr.Range.Font.Bold = 1; $hdr.Shading.BackgroundPatternColor = 0xD6C7EF; $hdr.HeadingFormat = -1
# 이벤트마다 위에 선, 번갈아 연한 배경
$shade = $false
for ($g = 0; $g -lt $groupStart.Count; $g++) {
  $a = $groupStart[$g]; $b = $(if ($g + 1 -lt $groupStart.Count) { $groupStart[$g + 1] - 1 } else { $lines.Count })
  $t.Rows.Item($a).Borders.Item(-1).LineStyle = 1
  $t.Cell($a, 2).Range.Font.Bold = 1
  if ($shade) { for ($r = $a; $r -le $b; $r++) { $t.Rows.Item($r).Shading.BackgroundPatternColor = 0xF5F2F2 } }
  $shade = -not $shade
}
foreach ($r in $star) { $t.Cell($r, 3).Range.Font.Bold = 1; $t.Cell($r, 5).Range.Font.Color = 0x0060C0 }
$t.Borders.Item(-3).LineStyle = 1  # 맨 아래 선

$doc.SaveAs2($out, 16)
"쪽수: " + $doc.ComputeStatistics(2)
$doc.Close()
} finally { if ($word.Documents.Count -eq 0) { $word.Quit() } }
"저장: $out"
