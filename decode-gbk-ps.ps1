$dbPath = "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb"
$bytes = [System.IO.File]::ReadAllBytes($dbPath)

$gbkEnc = [System.Text.Encoding]::GetEncoding("GBK")
$utf8Enc = [System.Text.Encoding]::UTF8

$sql = @"
SELECT id, name, `desc` FROM texts
"@

$ms = New-Object System.IO.MemoryStream
$ms.Write($bytes, 0, $bytes.Length)
$ms.Position = 0

$sqliteDll = Get-ChildItem -Path . -Filter "*.dll" -Recurse | Where-Object { $_.Name -like "*sqlite*" } | Select-Object -First 1
if ($sqliteDll) {
    Add-Type -Path $sqliteDll.FullName
    $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        $id = $reader.GetInt32(0)
        $nameBytes = $gbkEnc.GetBytes($reader.GetString(1))
        $descBytes = $gbkEnc.GetBytes($reader.GetString(2))
        $name = $utf8Enc.GetString($nameBytes)
        $desc = $utf8Enc.GetString($descBytes)
        Write-Host "=== ID: $id ==="
        Write-Host "Name: $name"
        Write-Host "Desc: $desc"
        Write-Host ""
    }
    $reader.Close()
    $conn.Close()
} else {
    Write-Host "SQLite DLL not found. Trying alternative method..."
    Write-Host "File size: $($bytes.Length)"
}