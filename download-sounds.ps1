# PowerShell script to download royalty-free arcade sound effects
$soundsDir = "c:\Users\ROG Michael\Code\Class Engine\public\sounds"
if (!(Test-Path $soundsDir)) { New-Item -ItemType Directory -Path $soundsDir }

$sounds = @{
    "correct.mp3"  = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" # Success Chime
    "wrong.mp3"    = "https://assets.mixkit.co/active_storage/sfx/2105/2105-preview.mp3" # Buzzer/Error
    "tick.mp3"     = "https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3" # Clock Tick
    "times-up.mp3" = "https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3" # Game Over Tune
    "twist.mp3"    = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3" # Sparkle/Magic
}

foreach ($item in $sounds.GetEnumerator()) {
    $dest = Join-Path $soundsDir $item.Key
    Write-Host "Downloading $($item.Key)..."
    Invoke-WebRequest -Uri $item.Value -OutFile $dest
}

Write-Host "All sounds downloaded successfully to /public/sounds/"
