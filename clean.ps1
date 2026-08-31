$files = Get-ChildItem "c:\Users\Acer\Desktop\FlowPomodoro\blog" -Filter "*.html" -Recurse | Where-Object { $_.FullName -notmatch "\\app\\" }

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    
    # Remove duplicate og:locale
    $c = $c -replace '(<meta property="og:locale"[^>]+>)\s*\1', "`$1"

    [System.IO.File]::WriteAllText($f.FullName, $c)
}
Write-Host "Cleaned duplicate og:locale!"
