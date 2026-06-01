$bytes = [System.IO.File]::ReadAllBytes("workspace/幻想乡梦游电子界.cdb")
$encoding = [System.Text.Encoding]::GetEncoding("GBK")

$sqliteHeader = [System.Text.Encoding]::ASCII.GetString($bytes[0..15])
Write-Host "SQLite Header: $sqliteHeader"

$textStart = 0
for ($i = 0; $i -lt $bytes.Length - 10; $i++) {
    $chunk = [System.Text.Encoding]::ASCII.GetString($bytes[$i..($i+3)])
    if ($chunk -eq "text") {
        $textStart = $i
        break
    }
}

$sampleText = $encoding.GetString($bytes[8000..8500])
Write-Host "Sample decoded text: $sampleText"