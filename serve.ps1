param(
    [int]$Port = 5500,
    [string]$Root = "D:\portfolio"
)

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json; charset=utf-8"
    ".ico"  = "image/x-icon"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Failed to start listener on $prefix - $_"
    exit 1
}

Write-Host "Server running at $prefix"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq "/" -or [string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "/index.html"
        }

        $relPath = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relPath))

        if ($fullPath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($fullPath)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $fileInfo = New-Object System.IO.FileInfo($fullPath)
            $totalLength = $fileInfo.Length
            
            $response.ContentType = $mime
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Accept-Ranges", "bytes")
            
            $rangeHeader = $request.Headers["Range"]
            if (-not [string]::IsNullOrEmpty($rangeHeader) -and $rangeHeader -match "bytes=(\d*)-(\d*)") {
                $startStr = $matches[1]
                $endStr = $matches[2]
                
                $start = if ([string]::IsNullOrEmpty($startStr)) { 0 } else { [int64]$startStr }
                $end = if ([string]::IsNullOrEmpty($endStr)) { $totalLength - 1 } else { [int64]$endStr }
                if ($end -ge $totalLength) { $end = $totalLength - 1 }
                
                $length = $end - $start + 1
                $response.StatusCode = 206
                $response.Headers.Add("Content-Range", "bytes $start-$end/$totalLength")
                $response.ContentLength64 = $length
                
                $fileStream = [System.IO.File]::OpenRead($fullPath)
                $fileStream.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
                
                $buffer = New-Object byte[] 65536
                $bytesRemaining = $length
                while ($bytesRemaining -gt 0) {
                    $toRead = [Math]::Min($bytesRemaining, 65536)
                    $bytesRead = $fileStream.Read($buffer, 0, $toRead)
                    if ($bytesRead -le 0) { break }
                    $response.OutputStream.Write($buffer, 0, $bytesRead)
                    $bytesRemaining -= $bytesRead
                }
                $fileStream.Close()
            } else {
                $response.StatusCode = 200
                $response.ContentLength64 = $totalLength
                $fileStream = [System.IO.File]::OpenRead($fullPath)
                $fileStream.CopyTo($response.OutputStream)
                $fileStream.Close()
            }
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # Continue on client disconnect
    }
}
