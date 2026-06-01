$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
$bytes = [System.IO.File]::ReadAllBytes($files[0].FullName)
$encoding = [System.Text.Encoding]::UTF8

$sampleText = $encoding.GetString($bytes[8000..9000])
Write-Host "Sample decoded text (UTF-8):"
Write-Host $sampleText

$encoding2 = [System.Text.Encoding]::GetEncoding("GB2312")
$sampleText2 = $encoding2.GetString($bytes[8000..9000])
Write-Host "`nSample decoded text (GB2312):"
Write-Host $sampleText2