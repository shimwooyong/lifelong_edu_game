# 로컬 미리보기용 간단한 웹 서버 (http://localhost:8123)
$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8123/")
$listener.Start()
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".png"="image/png"; ".jpg"="image/jpeg"; ".gif"="image/gif"; ".svg"="image/svg+xml"; ".webp"="image/webp";
  ".mp3"="audio/mpeg"; ".wav"="audio/wav"; ".ogg"="audio/ogg"; ".json"="application/json"; ".pdf"="application/pdf" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
  if ($path -eq "") { $path = "index.html" }
  # 개발용: POST /__save/파일이름 → .claude/tmp/ 에 저장 (그림 뽑기 등)
  if ($ctx.Request.HttpMethod -eq "POST" -and $path.StartsWith("__save/")) {
    $dir = Join-Path $root ".claude/tmp"; New-Item -ItemType Directory -Force $dir | Out-Null
    $ms = New-Object System.IO.MemoryStream; $ctx.Request.InputStream.CopyTo($ms)
    [IO.File]::WriteAllBytes((Join-Path $dir ($path.Substring(7))), $ms.ToArray())
    $ctx.Response.StatusCode = 200; $ctx.Response.Close(); continue
  }
  $file = Join-Path $root $path
  if (Test-Path $file -PathType Leaf) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
