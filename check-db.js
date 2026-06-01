const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

(async () => {
    const SQL = await initSqlJs();
    const data = fs.readFileSync(path.join(__dirname, 'workspace', '实验.cdb'));
    const db = new SQL.Database(data);

    console.log('=== 全部卡片 ===');
    const textsResult = db.exec('SELECT id, name, desc FROM texts');
    if (textsResult.length > 0 && textsResult[0].values) {
        for (const row of textsResult[0].values) {
            console.log(`ID: ${row[0]}`);
            console.log(`Name: ${row[1]}`);
            console.log(`Desc: ${row[2]}`);
            console.log('---');
        }
    }

    console.log('\n=== datas表 ===');
    const datasResult = db.exec('SELECT id, type, setcode FROM datas');
    if (datasResult.length > 0 && datasResult[0].values) {
        for (const row of datasResult[0].values) {
            console.log(`ID: ${row[0]}, Type: ${row[1]}, Setcode: ${row[2]}`);
        }
    }

    db.close();
})();