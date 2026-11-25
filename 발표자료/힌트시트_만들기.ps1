# 진행자 힌트 시트(docx): 모든 이벤트의 선택지와 결과를 A4 양면에 정리
# 데이터: 미리보기(localhost:8123)에서 게임 데이터를 뽑아 .claude/tmp/hint.json에 저장한 뒤 실행
# Word 없이 docx(XML 묶음)를 직접 만든다 (Word 자동 조작은 이 PC에서 자주 멈춤)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir "진행자_힌트시트.docx"
$json = Join-Path (Split-Path -Parent $dir) ".claude/tmp/hint.json"
try { [IO.File]::Open($out, "Open", "ReadWrite", "None").Close() } catch [IO.FileNotFoundException] {} catch { throw "진행자_힌트시트.docx가 열려 있어요. Word에서 닫은 뒤 다시 실행하세요." }
$data = [IO.File]::ReadAllText($json, [Text.Encoding]::UTF8) | ConvertFrom-Json

$SZ = 14          # 글자 크기(반 포인트 단위): 14 = 7pt
$W = @(5900, 3900, 1066)   # 열 너비(twip): 선택지, 결과, Help (이벤트는 한 줄 제목 행)
function Get-Esc($s) { [Security.SecurityElement]::Escape([string]$s) }
# 글자 조각: 굵게/색
function Get-Run($text, $bold = $false, $color = "", $sz = $SZ) {
  $rp = "<w:rFonts w:ascii=""맑은 고딕"" w:eastAsia=""맑은 고딕"" w:hAnsi=""맑은 고딕""/>"
  if ($bold) { $rp += "<w:b/>" }
  if ($color) { $rp += "<w:color w:val=""$color""/>" }
  $rp += "<w:sz w:val=""$sz""/><w:szCs w:val=""$sz""/>"
  "<w:r><w:rPr>$rp</w:rPr><w:t xml:space=""preserve"">$(Get-Esc $text)</w:t></w:r>"
}
$PPR = "<w:pPr><w:spacing w:before=""0"" w:after=""0"" w:line=""170"" w:lineRule=""exact""/></w:pPr>"
function Get-Para($runs, $keep = $false) { $p = $PPR; if ($keep) { $p = $p.Replace("<w:pPr>", "<w:pPr><w:keepNext/>") }; "<w:p>$p$runs</w:p>" }  # keep: 다음 줄과 같은 쪽에
# 결과 글: ○교육은 초록, ✕교육은 빨강
function Get-ResultRuns($r) {
  $o = ""
  foreach ($part in ([regex]::Split($r, "(○교육|✕교육)"))) {
    if ($part -eq "") { continue }
    if ($part -eq "○교육") { $o += Get-Run $part $true "1A7A2E" } elseif ($part -eq "✕교육") { $o += Get-Run $part $true "B02020" } else { $o += Get-Run $part }
  }
  $o
}
function Get-Cell($i, $paras, $fill = "", $topLine = $false, $span = 1) {
  $cw = 0; for ($k = $i; $k -lt $i + $span; $k++) { $cw += $W[$k] }
  $tc = "<w:tcW w:w=""$cw"" w:type=""dxa""/>"
  if ($span -gt 1) { $tc += "<w:gridSpan w:val=""$span""/>" }
  if ($topLine) { $tc += "<w:tcBorders><w:top w:val=""single"" w:sz=""4"" w:color=""777777""/></w:tcBorders>" }
  if ($fill) { $tc += "<w:shd w:val=""clear"" w:color=""auto"" w:fill=""$fill""/>" }
  "<w:tc><w:tcPr>$tc</w:tcPr>$paras</w:tc>"
}

$b = New-Object Text.StringBuilder
# 제목, 보는 법
[void]$b.Append((Get-Para (Get-Run "배움의 일생 · 진행자 힌트 시트 (이벤트 선택지와 결과)" $true "" 25)))
$legend = (Get-Run "보는 법  " $true "" 14) + (Get-Run "숫자 = 가족 자산 변화 · " $false "" 14) + (Get-Run "○교육" $true "1A7A2E" 14) + (Get-Run " = 좋은 교육(엔딩 점수, 같은 교육은 한 번만) · " $false "" 14) + (Get-Run "✕교육" $true "B02020" 14) + (Get-Run " = 좋은 교육 아님 · " $false "" 14) + (Get-Run "★" $true "C06000" 14) + (Get-Run " = 그 시기 최고 선택(Help가 알려 줌, 숫자는 Help로 고를 때 받는 자산) · 🎲 = 확률 결과(자산이 많을수록 좋은 쪽이 잘 나옴) · 부모 이벤트는 자녀 30세(부모 60세)부터 · '%확률' = 그 나이대에 가끔 나오는 이벤트 · 교육 없이 돈만 버는 선택은 보상 2배 반영" $false "" 14)
[void]$b.Append("<w:p><w:pPr><w:spacing w:before=""0"" w:after=""60"" w:line=""228"" w:lineRule=""auto""/></w:pPr>$legend</w:p>")

# 표
$grid = ($W | ForEach-Object { "<w:gridCol w:w=""$_""/>" }) -join ""
[void]$b.Append("<w:tbl><w:tblPr><w:tblW w:w=""$(($W | Measure-Object -Sum).Sum)"" w:type=""dxa""/>")
[void]$b.Append("<w:tblBorders><w:bottom w:val=""single"" w:sz=""6"" w:color=""555555""/></w:tblBorders><w:tblLayout w:type=""fixed""/>")
[void]$b.Append("<w:tblCellMar><w:top w:w=""0"" w:type=""dxa""/><w:left w:w=""40"" w:type=""dxa""/><w:bottom w:w=""0"" w:type=""dxa""/><w:right w:w=""40"" w:type=""dxa""/></w:tblCellMar></w:tblPr><w:tblGrid>$grid</w:tblGrid>")
# 머리줄 (쪽마다 반복)
$hdr = "<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>"
$names = @("선택지", "결과 (자산 변화 · 교육)", "★Help")
for ($i = 0; $i -lt 3; $i++) { $hdr += Get-Cell $i (Get-Para (Get-Run $names[$i] $true)) "EFC7D6" }
[void]$b.Append($hdr + "</w:tr>")

foreach ($e in $data.rows) {
  # 이벤트 제목 행: 나이 · 대상 · 제목 (조건)
  $runs = (Get-Run ("" + $e.age + "세 · " + $e.who + "   ") $true "6040A0") + (Get-Run $e.title $true)
  if ($e.cond) { $runs += Get-Run ("   (" + $e.cond + ")") $false "555555" }
  [void]$b.Append("<w:tr><w:trPr><w:cantSplit/></w:trPr>" + (Get-Cell 0 (Get-Para $runs $true) "E6E2F0" $true 3) + "</w:tr>")
  $n = 0
  foreach ($c in $e.ch) {
    $n++; $kp = $n -lt $e.ch.Count   # 이벤트 하나는 쪽이 갈리지 않게
    $row = "<w:tr><w:trPr><w:cantSplit/></w:trPr>"
    $row += Get-Cell 0 (Get-Para (Get-Run ("  · " + $c.t) ([bool]$c.star)) $kp)
    $row += Get-Cell 1 (Get-Para (Get-ResultRuns $c.r) $kp)
    $hp = $(if ($c.star) { Get-Run ("★ " + $c.h) $true "C06000" } else { "" })
    $row += Get-Cell 2 (Get-Para $hp)
    [void]$b.Append($row + "</w:tr>")
  }
}
[void]$b.Append("</w:tbl>")
[void]$b.Append((Get-Para ""))
# A4, 여백 약 0.9cm
[void]$b.Append("<w:sectPr><w:pgSz w:w=""11906"" w:h=""16838""/><w:pgMar w:top=""500"" w:right=""520"" w:bottom=""500"" w:left=""520"" w:header=""0"" w:footer=""0"" w:gutter=""0""/></w:sectPr>")

$docXml = "<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?><w:document xmlns:w=""http://schemas.openxmlformats.org/wordprocessingml/2006/main""><w:body>" + $b.ToString() + "</w:body></w:document>"
$types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
$rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'

if (Test-Path $out) { Remove-Item $out -Confirm:$false }
$zip = [IO.Compression.ZipFile]::Open($out, "Create")
$enc = New-Object Text.UTF8Encoding $false
foreach ($p in @(@("[Content_Types].xml", $types), @("_rels/.rels", $rels), @("word/document.xml", $docXml))) {
  $en = $zip.CreateEntry($p[0]); $s = $en.Open(); $bytes = $enc.GetBytes($p[1]); $s.Write($bytes, 0, $bytes.Length); $s.Close()
}
$zip.Dispose()
"저장: $out"
