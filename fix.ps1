$files = Get-ChildItem "c:\Users\Acer\Desktop\FlowPomodoro\blog" -Filter "*.html" -Recurse | Where-Object { $_.FullName -notmatch "\\app\\" }
$locales = @{
    "en" = "en_US"
    "hi" = "hi_IN"
    "ne" = "ne_NP"
    "es" = "es_ES"
    "vi" = "vi_VN"
    "ru" = "ru_RU"
}

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $lang = $f.Directory.Name
    $filename = $f.Name
    if ($lang -eq "blog") { continue } # skip root index if matched
    
    # 1. HTML lang & dir
    $c = $c -replace '(?i)<html[^>]*>', "<html lang=`"$lang`" dir=`"ltr`">"

    # 2. Canonical URLs
    $canonicalUrl = "https://flowpomodoro.xyz/blog/$lang/$filename"
    $c = $c -replace '(?i)<link rel="canonical" href="[^"]+">', "<link rel=`"canonical`" href=`"$canonicalUrl`">"

    # 3. Hreflang
    # Remove existing hreflang link tags safely
    $c = $c -replace '(?i)<link rel="alternate"[^>]+hreflang="[^"]+"[^>]*>\s*', ""
    
    # Inject new hreflang block right before </head>
    $hreflangBlock = ""
    $langs = @("en", "hi", "ne", "es", "vi", "ru")
    foreach ($l in $langs) {
        $hreflangBlock += "  <link rel=`"alternate`" hreflang=`"$l`" href=`"https://flowpomodoro.xyz/blog/$l/$filename`" />`n"
    }
    $hreflangBlock += "  <link rel=`"alternate`" hreflang=`"x-default`" href=`"https://flowpomodoro.xyz/blog/en/$filename`" />`n"
    
    $c = $c -replace '(?i)</head>', "$hreflangBlock</head>"

    # 4. Open Graph & Twitter
    # Correct Open Graph URL
    $c = $c -replace '(?i)<meta property="og:url" content="[^"]+">', "<meta property=`"og:url`" content=`"$canonicalUrl`">"
    
    # Correct Open Graph locale
    $locale = $locales[$lang]
    if ($c -match 'property="og:locale"') {
        $c = $c -replace '(?i)<meta property="og:locale" content="[^"]+">', "<meta property=`"og:locale`" content=`"$locale`">"
    } else {
        $c = $c -replace '(?i)(<meta property="og:url"[^>]+>)', "`$1`n  <meta property=`"og:locale`" content=`"$locale`">"
    }

    # 5. Structured Data JSON-LD URL
    # Replace the "url" property in JSON-LD specifically for the Article schema
    # (Assuming it looks like "url": "https://flowpomodoro.xyz/..." )
    $c = $c -replace '(?i)("url":\s*")https://flowpomodoro.xyz/blog/(en|hi|ne|es|vi|ru)/[^"]+(")', "`$1$canonicalUrl`$3"
    
    # Also fix BreadcrumbList item URL
    $c = $c -replace '(?i)("item":\s*")https://flowpomodoro.xyz/blog/(en|hi|ne|es|vi|ru)/[^"]+(")', "`$1$canonicalUrl`$3"

    [System.IO.File]::WriteAllText($f.FullName, $c)
}
Write-Host "Updated HTML files!"
