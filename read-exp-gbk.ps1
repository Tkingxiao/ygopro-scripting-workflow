Add-Type -AssemblyName System.Data.SQLite
$conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT id, name, `desc`, str1, str2, str3 FROM texts"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    $nameBytes = [System.Text.Encoding]::GetEncoding("GBK").GetBytes($reader.GetString(1))
    $descBytes = [System.Text.Encoding]::GetEncoding("GBK").GetBytes($reader.GetString(2))
    $name = [System.Text.Encoding]::UTF8.GetString($nameBytes)
    $desc = [System.Text.Encoding]::UTF8.GetString($descBytes)
    Write-Host "=== ID: $($reader.GetInt32(0)) ==="
    Write-Host "Name: $name"
    Write-Host "Desc: $desc"
    Write-Host ""
}
$reader.Close()
$conn.Close()