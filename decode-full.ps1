$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
$bytes = [System.IO.File]::ReadAllBytes($files[0].FullName)
$encoding = [System.Text.Encoding]::UTF8

$fullText = $encoding.GetString($bytes)
Write-Host $fullText