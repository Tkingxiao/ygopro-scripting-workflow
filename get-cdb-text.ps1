Add-Type -AssemblyName System.Data.SQLite -ErrorAction SilentlyContinue

$dbPath = "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb"
$tempPath = "$env:TEMP\exp_text.txt"

$conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
$conn.Open()
$cmd = $conn.CreateCommand()

$gbk = [System.Text.Encoding]::GetEncoding(936)
$utf8 = [System.Text.Encoding]::UTF8

$sb = New-Object System.Text.StringBuilder

$cmd.CommandText = "SELECT id, name, `desc` FROM texts"
$reader = $cmd.ExecuteReader()

while ($reader.Read()) {
    $id = $reader.GetInt32(0)
    [void]$sb.AppendLine("=== ID: $id ===")

    $nameStr = $reader.GetString(1)
    $descStr = $reader.GetString(2)

    $nameBytes = $gbk.GetBytes($nameStr)
    $descBytes = $gbk.GetBytes($descStr)
    $name = $utf8.GetString($nameBytes)
    $desc = $utf8.GetString($descBytes)

    [void]$sb.AppendLine("Name: $name")
    [void]$sb.AppendLine("Desc: $desc")
    [void]$sb.AppendLine()
}

$reader.Close()
$conn.Close()

$sb.ToString() | Out-File -FilePath $tempPath -Encoding UTF8
Write-Host "Output saved to: $tempPath"
Get-Content $tempPath