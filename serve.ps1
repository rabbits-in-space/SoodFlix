# ══════════════════════════════════════════════════════════════
#  SoodFlix — local web server
#
#  Browsers block video playback from file:// URLs, so serve the
#  folder over http instead:
#
#      powershell -ExecutionPolicy Bypass -File serve.ps1
#
#  Then open http://localhost:8000  ·  Ctrl+C to stop.
#
#  Supports HTTP range requests, which is what lets you scrub
#  through a video instead of waiting for the whole file.
# ══════════════════════════════════════════════════════════════

param(
    [int]$Port = 8000
)

$root = $PSScriptRoot

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.mp4'  = 'video/mp4'
    '.m4v'  = 'video/mp4'
    '.webm' = 'video/webm'
    '.ogv'  = 'video/ogg'
    '.mkv'  = 'video/x-matroska'
    '.mov'  = 'video/quicktime'
    '.mp3'  = 'audio/mpeg'
    '.m4a'  = 'audio/mp4'
    '.aac'  = 'audio/aac'
    '.wav'  = 'audio/wav'
    '.ogg'  = 'audio/ogg'
    '.oga'  = 'audio/ogg'
    '.flac' = 'audio/flac'
    '.vtt'  = 'text/vtt'
    '.woff2'= 'font/woff2'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "Could not bind to port $Port. Try:  .\serve.ps1 -Port 8080" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  SoodFlix is running" -ForegroundColor Red
Write-Host "  http://localhost:$Port" -ForegroundColor White
Write-Host "  serving $root"
Write-Host "  Ctrl+C to stop"
Write-Host ""

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }

    $req = $context.Request
    $res = $context.Response

    # Map the URL onto a file, defaulting to index.html
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel

    # Keep requests inside the served folder
    $full = [System.IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) {
        $res.StatusCode = 403; $res.Close(); continue
    }

    if ((Test-Path $full) -and (Get-Item $full).PSIsContainer) {
        $full = Join-Path $full 'index.html'
    }

    if (-not (Test-Path $full)) {
        $res.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 - $rel not found")
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $body.Length
        $res.OutputStream.Write($body, 0, $body.Length)
        $res.Close()
        Write-Host "  404  $rel" -ForegroundColor DarkYellow
        continue
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.Headers.Add('Accept-Ranges', 'bytes')
    $res.Headers.Add('Cache-Control', 'no-cache')

    try {
        $stream = [System.IO.File]::OpenRead($full)
        $total  = $stream.Length
        $start  = 0
        $end    = $total - 1

        # Partial content — this is what makes video seeking work
        $range = $req.Headers['Range']
        if ($range -and $range -match 'bytes=(\d*)-(\d*)') {
            if ($matches[1] -ne '') { $start = [int64]$matches[1] }
            if ($matches[2] -ne '') { $end   = [int64]$matches[2] }
            if ($end -ge $total) { $end = $total - 1 }

            $res.StatusCode = 206
            $res.Headers.Add('Content-Range', "bytes $start-$end/$total")
        }

        $length = $end - $start + 1
        $res.ContentLength64 = $length
        $stream.Seek($start, 'Begin') | Out-Null

        $buffer = New-Object byte[] 65536
        $left   = $length
        while ($left -gt 0) {
            $read = $stream.Read($buffer, 0, [Math]::Min($buffer.Length, $left))
            if ($read -le 0) { break }
            $res.OutputStream.Write($buffer, 0, $read)
            $left -= $read
        }
    } catch {
        # Browser hung up mid-stream (normal when seeking) — ignore
    } finally {
        if ($stream) { $stream.Dispose() }
        try { $res.Close() } catch {}
    }
}

$listener.Stop()
