Add-Type -AssemblyName System.Data.SQLite -ErrorAction SilentlyContinue
if (-not (Test-Path "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace")) {
    Write-Host "Directory not found"
    exit
}

$files = Get-ChildItem "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\*.cdb"
if ($files.Count -eq 0) {
    Write-Host "No .cdb files found"
    exit
}

$dbPath = $files[0].FullName
Write-Host "Reading: $dbPath"

Add-Type -Path "$env:LOCALAPPDATA\Apps\2.0\*.dll" -ErrorAction SilentlyContinue
Add-Type -AssemblyName "System.Data.SQLite" -ErrorAction SilentlyContinue

try {
    $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, name, `desc` FROM texts"
    $reader = $cmd.ExecuteReader()

    $gbk = [System.Text.Encoding]::GetEncoding(936)
    $utf8 = [System.Text.Encoding]::UTF8

    while ($reader.Read()) {
        $id = $reader.GetInt32(0)
        $nameStr = $reader.GetString(1)
        $descStr = $reader.GetString(2)

        $nameBytes = $gbk.GetBytes($nameStr)
        $descBytes = $gbk.GetBytes($descStr)
        $name = $utf8.GetString($nameBytes)
        $desc = $utf8.GetString($descBytes)

        Write-Host "=== ID: $id ==="
        Write-Host "Name: $name"
        Write-Host "Desc: $desc"
        Write-Host ""
    }

    $reader.Close()
    $conn.Close()
} catch {
    Write-Host "SQLite method failed: $_"
    Write-Host "Trying alternative method with sql.js"

    node -e "
    const initSqlJs = require('sql.js');
    const fs = require('fs');
    (async () => {
        const SQL = await initSqlJs();
        const data = fs.readFileFileSync('$($dbPath.Replace('\','\\\\'))');
        const db = new SQL.Database(data);
        const result = db.exec('SELECT id, name, `desc` FROM texts');
        if (result.length > 0) {
            for (const row of result[0].values) {
                console.log('=== ID:', row[0], '===');
                console.log('Name:', row[1]);
                console.log('Desc:', row[2]);
                console.log('');
            }
        }
        db.close();
    })();
    "
}