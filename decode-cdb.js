const fs = require('fs');
const path = require('path');

const workspaceDir = path.join(__dirname, 'workspace');
const files = fs.readdirSync(workspaceDir);
const cdbFile = files.find(f => f.endsWith('.cdb'));

if (!cdbFile) {
    console.log('No .cdb file found');
    process.exit(1);
}

console.log('Found file:', cdbFile);
const filePath = path.join(workspaceDir, cdbFile);
console.log('Full path:', filePath);

const initSqlJs = require('sql.js');
(async () => {
    const SQL = await initSqlJs();
    const data = fs.readFileSync(filePath);
    const db = new SQL.Database(data);

    const result = db.exec('SELECT id, name, `desc` FROM texts');
    if (result.length > 0 && result[0].values) {
        for (const row of result[0].values) {
            console.log('\n=== ID:', row[0], '===');
            console.log('Name (raw):', row[1]);
            console.log('Desc (raw):', row[2]);

            const nameBuf = Buffer.from(row[1], 'binary');
            const descBuf = Buffer.from(row[2], 'binary');

            const iconv = require('iconv-lite');
            if (iconv) {
                console.log('Name (GBK):', iconv.decode(nameBuf, 'gbk'));
                console.log('Desc (GBK):', iconv.decode(descBuf, 'gbk'));
            } else {
                console.log('Name (hex):', nameBuf.toString('hex'));
                console.log('Desc (hex):', descBuf.toString('hex'));
            }
        }
    }

    db.close();
})();