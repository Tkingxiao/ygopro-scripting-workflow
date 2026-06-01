$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $text = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
    Write-Host "File: $($f.Name)"
    Write-Host $text.Substring(0, [Math]::Min(5000, $text.Length))
    Write-Host ""
}