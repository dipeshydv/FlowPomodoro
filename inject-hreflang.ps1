$files = Get-ChildItem "c:\Users\Acer\Desktop\FlowPomodoro\blog" -Filter "*.html" -Recurse
$langs = @("en", "hi", "ne", "es", "vi")

foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  
  if ($c -notmatch 'hreflang="en"') {
    $filename = $f.Name
    $tags = "`n"
    foreach ($lang in $langs) {
      $tags += "  <link rel=`"alternate`" href=`"https://flowpomodoro.xyz/blog/$lang/$filename`" hreflang=`"$lang`" />`n"
    }
    $tags += "  <link rel=`"alternate`" href=`"https://flowpomodoro.xyz/blog/en/$filename`" hreflang=`"x-default`" />`n"
    
    $c = $c -replace '(?i)</head>', "$tags</head>"
    [System.IO.File]::WriteAllText($f.FullName, $c)
  }
}
Write-Host "Injected hreflang tags."