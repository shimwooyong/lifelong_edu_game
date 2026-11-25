# 진행자 힌트 시트(docx): 모든 이벤트의 선택지와 결과를 A4 양면에 정리
# 데이터: 미리보기(localhost:8123)에서 게임 데이터를 뽑아 .claude/tmp/hint.json에 저장한 뒤 실행 (Word 설치된 PC)
# 방법: HTML 표를 만들어 Word로 열고 docx로 저장 (칸마다 Word를 조작하면 너무 느려서)
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir "진행자_힌트시트.docx"
$tmpDir = Join-Path (Split-Path -Parent $dir) ".claude/tmp"
$json = Join-Path $tmpDir "hint.json"
$html = Join-Path $tmpDir "hint.html"
try { [IO.File]::Open($out, "Open", "ReadWrite", "None").Close() } catch [IO.FileNotFoundException] {} catch { throw "진행자_힌트시트.docx가 열려 있어요. Word에서 닫은 뒤 다시 실행하세요." }
$data = [IO.File]::ReadAllText($json, [Text.Encoding]::UTF8) | ConvertFrom-Json
function Get-Esc($s) { [Net.WebUtility]::HtmlEncode([string]$s) }

$sb = New-Object Text.StringBuilder
[void]$sb.Append(@"
<html><head><meta charset="utf-8"><style>
@page { size: 595.3pt 841.9pt; margin: 26pt 28pt 26pt 28pt; }
body { font-family: '맑은 고딕'; font-size: 7.5pt; }
p { margin: 0; }
h1 { font-size: 12.5pt; margin: 0 0 2pt 0; }
.legend { font-size: 7pt; margin-bottom: 3pt; }
table { border-collapse: collapse; width: 100%; }
td, th { font-size: 7.5pt; padding: 0.5pt 2pt; vertical-align: top; line-height: 1.05; }
th { background: #EFC7D6; text-align: left; border-bottom: 1pt solid #555; }
tr.top td { border-top: 0.75pt solid #777; }
tr.alt td { background: #F2F2F5; }
td.ev { font-weight: bold; }
td.star { color: #C06000; font-weight: bold; }
b.s { color: #C06000; }
.ok { color: #1A7A2E; font-weight: bold; } .no { color: #B02020; font-weight: bold; }
</style></head><body>
<h1>배움의 일생 · 진행자 힌트 시트 (이벤트 선택지와 결과)</h1>
<p class="legend"><b>보는 법</b> 숫자 = 가족 자산 변화 · <span class="ok">○교육</span> = 좋은 교육(엔딩 점수, 같은 교육은 한 번만) · <span class="no">✕교육</span> = 좋은 교육 아님 · <b class="s">★</b> = 그 시기 최고 선택(Help가 알려 줌, 숫자는 Help로 고를 때 받는 자산) · 🎲 = 확률 결과(자산이 많을수록 좋은 쪽이 잘 나옴) · 부모 이벤트는 자녀 30세(부모 60세)부터 · '%확률' = 그 나이대에 가끔 나오는 이벤트 · 교육 없이 돈만 버는 선택은 보상 2배 반영</p>
<table><thead><tr><th style="width:34pt">나이</th><th style="width:112pt">이벤트</th><th style="width:196pt">선택지</th><th style="width:150pt">결과</th><th style="width:40pt">★Help</th></tr></thead><tbody>
"@)
$alt = $false
foreach ($e in $data.rows) {
  $first = $true
  foreach ($c in $e.ch) {
    $cls = @(); if ($first) { $cls += "top" }; if ($alt) { $cls += "alt" }
    [void]$sb.Append("<tr class=""$($cls -join ' ')"">")
    if ($first) {
      $ev = Get-Esc $e.title; if ($e.cond) { $ev += "<br><span style=""font-weight:normal"">(" + (Get-Esc $e.cond) + ")</span>" }
      [void]$sb.Append("<td>$(Get-Esc $e.age)<br>$(Get-Esc $e.who)</td><td class=""ev"">$ev</td>")
    } else { [void]$sb.Append("<td></td><td></td>") }
    $r = (Get-Esc $c.r) -replace "○교육", "<span class=""ok"">○교육</span>" -replace "✕교육", "<span class=""no"">✕교육</span>"
    $t = Get-Esc $c.t; if ($c.star) { $t = "<b>$t</b>" }
    $hp = ""; if ($c.star) { $hp = "★ " + (Get-Esc $c.h) }
    [void]$sb.Append("<td>$t</td><td>$r</td><td class=""star"">$hp</td></tr>`n")
    $first = $false
  }
  $alt = -not $alt
}
[void]$sb.Append("</tbody></table></body></html>")
[IO.File]::WriteAllText($html, $sb.ToString(), (New-Object Text.UTF8Encoding $true))

$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($html, $false, $true)
  $doc.ActiveWindow.View.Type = 3   # 인쇄 모양
  $ps = $doc.PageSetup; $ps.PageWidth = 595.3; $ps.PageHeight = 841.9; $ps.TopMargin = 26; $ps.BottomMargin = 26; $ps.LeftMargin = 28; $ps.RightMargin = 28
  $doc.Tables.Item(1).Rows.Item(1).HeadingFormat = -1
  $doc.SaveAs2($out, 16)
  "쪽수: " + $doc.ComputeStatistics(2)
  $doc.Close($false)
} finally { if ($word.Documents.Count -eq 0) { $word.Quit() } }
"저장: $out"
