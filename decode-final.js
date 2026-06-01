const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

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

            const nameStr = row[1];
            const descStr = row[2];

            const nameBytes = Buffer.from(nameStr, 'latin1');
            const descBytes = Buffer.from(descStr, 'latin1');

            const nameUTF8 = iconv.decode(nameBytes, 'UTF-8');
            const descUTF8 = iconv.decode(descBytes, 'UTF-8');

            console.log('Name:', nameUTF8);
            console.log('Desc:', descUTF8);
            console.log('');
        }
    }

    db.close();
})();