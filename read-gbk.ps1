$fs = [System.IO.File]::OpenRead("C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb")
$reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::GetEncoding(936))

$content = $reader.ReadToEnd()
$reader.Close()
$fs.Close()

$tempFile = "$env:TEMP\exp_gbk.txt"
[System.IO.File]::WriteAllText($tempFile, $content, [System.Text.Encoding]::UTF8)
Write-Host "Written to: $tempFile"
Get-Content $tempFile -Raw