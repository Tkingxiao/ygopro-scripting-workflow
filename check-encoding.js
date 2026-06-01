const fs = require('fs');
const path = require('path');

const initSqlJs = require('sql.js');

(async () => {
    const SQL = await initSqlJs();
    const filePath = path.join(__dirname, 'workspace', '实验.cdb');
    const data = fs.readFileSync(filePath);
    const db = new SQL.Database(data);

    const result = db.exec('SELECT id, name, `desc` FROM texts');
    if (result.length > 0 && result[0].values) {
        for (const row of result[0].values) {
            console.log('=== ID:', row[0], '===');
            console.log('Name:', row[1]);
            console.log('Desc:', row[2]);

            const nameStr = row[1];
            console.log('Name bytes (UTF-8):', Buffer.from(nameStr, 'utf8').toString('hex'));
            console.log('Name bytes (Latin1):', Buffer.from(nameStr, 'latin1').toString('hex'));
            console.log('');
        }
    }

    db.close();
})();