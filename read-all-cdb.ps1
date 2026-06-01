$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $encoding = [System.Text.Encoding]::UTF8
    $fullText = $encoding.GetString($bytes)
    Write-Host "=== $($f.Name) ==="
    Write-Host $fullText
    Write-Host ""
}