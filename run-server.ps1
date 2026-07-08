# Local Web Server for ELONIX (PowerShell HttpListener)
$port = 3000
$localPath = "D:\ELONIX"

# Create and configure the listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "----------------------------------------------"
    Write-Host "ELONIX Local Web Server started successfully!"
    Write-Host "Access the website at: http://localhost:$port/"
    Write-Host "Press Ctrl+C or stop the task to terminate."
    Write-Host "----------------------------------------------"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Get the relative path
        $urlPath = $request.RawUrl.Split('?')[0]
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }
        
        $filePath = Join-Path $localPath $urlPath.Replace("/", "\").TrimStart('\')

        # Log request
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $($request.HttpMethod) $urlPath"

        if (Test-Path $filePath -PathType Leaf) {
            # Determine content type
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".svg"  { "image/svg+xml" }
                ".json" { "application/json; charset=utf-8" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $contentType

            # Read file and write to stream
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # 404 Not Found
            $response.StatusCode = 404
            $response.ContentType = "text/plain"
            $errorMessage = "File not found: $urlPath"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "404 Not Found: $urlPath" -ForegroundColor Yellow
        }
        $response.Close()
    }
}
catch {
    Write-Error $_
}
finally {
    $listener.Stop()
    $listener.Close()
}
