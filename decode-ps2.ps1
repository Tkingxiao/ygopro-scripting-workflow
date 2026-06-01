$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\幻想乡梦游电子界.cdb")
$encoding = [System.Text.Encoding]::GetEncoding("GBK")

$sampleText = $encoding.GetString($bytes[8000..9000])
Write-Host "Sample decoded text:"
Write-Host $sampleText