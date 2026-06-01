const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('workspace');
const cdbFile = files.find(f => f.endsWith('.cdb') && f.includes('实验'));
if (!cdbFile) {
    console.log('实验.cdb not found');
    console.log('Files in workspace:', files);
    process.exit(1);
}

const filePath = path.join('workspace', cdbFile);
console.log('Reading:', filePath);

const data = fs.readFileSync(filePath);
console.log('File size:', data.length);

const initSqlJs = require('sql.js');
(async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database(data);

    const textsResult = db.exec('SELECT id, name, desc FROM texts');
    if (textsResult.length > 0) {
        for (const row of textsResult[0].values) {
            console.log('\n=== ID:', row[0], '===');
            console.log('Name:', row[1]);
            console.log('Desc:', row[2]);
        }
    }

    const datasResult = db.exec('SELECT * FROM datas');
    if (datasResult.length > 0) {
        console.log('\n=== Datas ===');
        console.log(JSON.stringify(datasResult[0], null, 2));
    }

    db.close();
})();