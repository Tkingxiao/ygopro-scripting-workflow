Add-Type -AssemblyName System.Data.SQLite -ErrorAction SilentlyContinue
$dbPath = "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\sd.cdb"
$conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
$conn.Open()
$cmd = $conn.CreateCommand()
$gbk = [System.Text.Encoding]::GetEncoding(936)
$utf8 = [System.Text.Encoding]::UTF8
$cmd.CommandText = "SELECT id, name, `desc`, str1, str2 FROM texts"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    $id = $reader.GetInt32(0)
    $nameStr = $reader.GetString(1)
    $descStr = $reader.GetString(2)
    $str1 = if (!$reader.IsDBNull(3)) { $reader.GetString(3) } else { "" }
    $str2 = if (!$reader.IsDBNull(4)) { $reader.GetString(4) } else { "" }
    $nameBytes = $gbk.GetBytes($nameStr)
    $descBytes = $gbk.GetBytes($descStr)
    $str1Bytes = $gbk.GetBytes($str1)
    $str2Bytes = $gbk.GetBytes($str2)
    $name = $utf8.GetString($nameBytes)
    $desc = $utf8.GetString($descBytes)
    $str1d = $utf8.GetString($str1Bytes)
    $str2d = $utf8.GetString($str2Bytes)
    Write-Host "=== ID: $id ==="
    Write-Host "Name: $name"
    Write-Host "Str1: $str1d"
    Write-Host "Str2: $str2d"
    Write-Host "Desc: $desc"
}
$reader.Close()
$conn.Close()
