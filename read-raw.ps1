$dbPath = "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb"
$bytes = [System.IO.File]::ReadAllBytes($dbPath)

$stream = New-Object System.IO.MemoryStream
$stream.Write($bytes, 0, $bytes.Length)
$stream.Position = 0

$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::GetEncoding(936))

$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()

$tempFile = "$env:TEMP\cdb_content.txt"
[System.IO.File]::WriteAllText($tempFile, $content, [System.Text.Encoding]::UTF8)
Write-Host "Content written to: $tempFile"
Write-Host ""
Write-Host $content