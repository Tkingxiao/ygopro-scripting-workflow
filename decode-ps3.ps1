$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
$bytes = [System.IO.File]::ReadAllBytes($files[0].FullName)
$encoding = [System.Text.Encoding]::GetEncoding("GBK")

$sampleText = $encoding.GetString($bytes[8000..9000])
Write-Host "Sample decoded text:"
Write-Host $sampleText