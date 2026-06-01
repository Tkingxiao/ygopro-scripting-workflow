$ErrorActionPreference = "Stop"

function Get-StringFromBytes {
    param([byte[]]$Bytes, [string]$Encoding = "gb2312")
    try {
        $enc = [System.Text.Encoding]::GetEncoding($Encoding)
        return $enc.GetString($Bytes)
    } catch {
        return [System.Text.Encoding]::ASCII.GetString($Bytes)
    }
}

Add-Type -Path "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\node_modules\sql.js\dist\sql-wasm.wasm"

$filePath = "C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb"
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)

$script = @"
const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
    const SQL = await initSqlJs();
    const data = fs.readFileSync('$($filePath.Replace('\','\\\\'))');
    const db = new SQL.Database(data);
    const result = db.exec('SELECT id, name, `desc` FROM texts');
    if (result.length > 0) {
        for (const row of result[0].values) {
            console.log('=== ID:', row[0], '===');
            console.log('Name:', row[1]);
            console.log('Desc:', row[2]);
            console.log('---');
        }
    }
    db.close();
})();
"@

node -e $script