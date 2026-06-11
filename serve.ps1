$root = Get-Location
$prefix = 'http://localhost:8000/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix"
Write-Host "Press Ctrl+C to stop."

function Get-MimeType($path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        '.html' { 'text/html' }
        '.htm' { 'text/html' }
        '.css' { 'text/css' }
        '.js' { 'application/javascript' }
        '.json' { 'application/json' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif' { 'image/gif' }
        '.svg' { 'image/svg+xml' }
        '.webp' { 'image/webp' }
        '.mp3' { 'audio/mpeg' }
        '.wav' { 'audio/wav' }
        '.mp4' { 'video/mp4' }
        default { 'application/octet-stream' }
    }
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    Start-Job -ArgumentList $context, $root.Path -ScriptBlock {
        param($context, $rootPath)
        try {
            $req = $context.Request
            $res = $context.Response
            $relative = $req.Url.AbsolutePath.TrimStart('/')
            if ([string]::IsNullOrEmpty($relative)) { $relative = 'index.html' }
            $safePath = Join-Path $rootPath $relative
            if (-not (Test-Path $safePath)) {
                $res.StatusCode = 404
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $res.ContentType = 'text/plain'
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $bytes = [System.IO.File]::ReadAllBytes($safePath)
                $res.ContentType = Get-MimeType $safePath
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.OutputStream.Close()
        } catch {
        }
    } | Out-Null
}
$listener.Stop()